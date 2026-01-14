import os
import numpy as np
import warnings
import pickle
import glob

from tqdm import tqdm
from torch.utils.data import Dataset

warnings.filterwarnings('ignore')


# Teng's comments: Note that we don't rescale the model
def pc_normalize(pc):
    centroid = np.mean(pc, axis=0)
    pc = pc - centroid
    m = np.max(np.sqrt(np.sum(pc**2, axis=1))) # Teng's comments: this line should be marked in our application
    pc = pc / m  # Teng's comments: this line should be marked in our application
    return pc


def farthest_point_sample(point, npoint):
    """
    Input:
        xyz: pointcloud data, [N, D]
        npoint: number of samples
    Return:
        centroids: sampled pointcloud index, [npoint, D]
    """
    N, D = point.shape
    xyz = point[:,:3]
    centroids = np.zeros((npoint,))
    distance = np.ones((N,)) * 1e10
    farthest = np.random.randint(0, N)
    for i in range(npoint):
        centroids[i] = farthest
        centroid = xyz[farthest, :]
        dist = np.sum((xyz - centroid) ** 2, -1)
        mask = dist < distance
        distance[mask] = dist[mask]
        farthest = np.argmax(distance, -1)
    point = point[centroids.astype(np.int32)]
    return point

# The function is included by Teng
def LoadPCFromModelNet(filename):
    '''
    point_set = []
    with open(filename, 'r') as file:
        line = file.readline().rstrip()  # The line should be OFF
        if len(line) > 3: # Somtimes the first line and second line are merged together
            line = line[3:]
        else:
            line = file.readline()  # read the second line. it should be the number of vertices and faces
        for i in range(int(line.split()[0])):
            line = file.readline()  # read the vertex
            xyz = list(map(float, line.split()))
            point_set += [xyz]
    return np.array(point_set)
    '''
    # Modified by Howard
    with np.load(filename) as data:
        point_set = data['pts']  # Load point cloud data
        label = data['car_type']  # Load label
    return point_set, label

def FindFilesFromModelNet(data_dir, target):
    all_files = []
    #search_path = os.path.join(data_dir, '**', target, '*.*')  # 搜索所有類型的文件
    search_path = os.path.join(data_dir, '**', target, '*.npz') # Howard's comments: change to use .npz files
    for file_path in glob.glob(search_path, recursive=True):
        # 獲取檔案名稱並存入列表
        '''
        file_name = os.path.basename(file_path)
        all_files.append(file_name)
        '''
        all_files.append(file_path)
    return all_files

class FETCdataLoader(Dataset):
    def __init__(self, root, args, split='train', process_data=False):
        self.root = root
        self.npoints = args.num_point
        self.process_data = process_data
        self.uniform = args.use_uniform_sample
        self.use_normals = args.use_normals
        self.num_category = args.num_category

        # Modified by Teng
        self.cat = [entry.name for entry in os.scandir(self.root) if entry.is_dir()]
        self.classes = dict(zip(self.cat, range(len(self.cat))))

        self.num_category = len(self.classes) # the num_category should be 10 or 40

        shape_ids = {}
        shape_ids['train'] = FindFilesFromModelNet(self.root, 'train')
        shape_ids['test'] = FindFilesFromModelNet(self.root, 'test')

        assert (split == 'train' or split == 'test')
        '''
        shape_names = ['_'.join(x.split('_')[0:-1]) for x in shape_ids[split]]

        # Modified by Teng
        #self.datapath = [(shape_names[i], os.path.join(self.root, shape_names[i], shape_ids[split][i]) + '.txt') for i
        #                  in range(len(shape_ids[split]))]
        self.datapath = [(shape_names[i], os.path.join(self.root, shape_names[i], split, shape_ids[split][i]) ) for i
                          in range(len(shape_ids[split]))]

        print('The size of %s data is %d' % (split, len(self.datapath)))
        '''
        # Modified by Howard
        self.datapath = shape_ids[split]
        print(f'The size of {split} data is {len(self.datapath)}')

        if self.uniform:
            #self.save_path = os.path.join(root, 'modelnet%d_%s_%dpts_fps.dat' % (self.num_category, split, self.npoints))
            self.save_path = os.path.join(root, f'modelnet{self.num_category}_{split}_{self.npoints}pts_fps.dat')
        else:
            #self.save_path = os.path.join(root, 'modelnet%d_%s_%dpts.dat' % (self.num_category, split, self.npoints))
            self.save_path = os.path.join(root, f'modelnet{self.num_category}_{split}_{self.npoints}pts.dat')

        if self.process_data:
            if not os.path.exists(self.save_path):
                print('Processing data %s (only running in the first time)...' % self.save_path)
                self.list_of_points = [None] * len(self.datapath)
                self.list_of_labels = [None] * len(self.datapath)

                for index in tqdm(range(len(self.datapath)), total=len(self.datapath)):
                    '''
                    fn = self.datapath[index]
                    cls = self.classes[self.datapath[index][0]]
                    cls = np.array([cls]).astype(np.int32)
                    # Modified by Teng
                    # point_set = np.loadtxt(fn[1], delimiter=',').astype(np.float32)
                    point_set = LoadPCFromModelNet(fn[1]).astype(np.float32)

                    if self.uniform:
                        point_set = farthest_point_sample(point_set, self.npoints)
                    else:
                        point_set = point_set[0:self.npoints, :]

                    self.list_of_points[index] = point_set
                    self.list_of_labels[index] = cls
                    '''
                    # Modified by Howard
                    point_set, label = LoadPCFromModelNet(self.datapath[index])

                    if self.uniform:
                        point_set = farthest_point_sample(point_set, self.npoints)
                    else:
                        point_set = point_set[0:self.npoints, :]

                    self.list_of_points[index] = point_set
                    self.list_of_labels[index] = label

                with open(self.save_path, 'wb') as f:
                    pickle.dump([self.list_of_points, self.list_of_labels], f)
            else:
                print('Load processed data from %s...' % self.save_path)
                with open(self.save_path, 'rb') as f:
                    self.list_of_points, self.list_of_labels = pickle.load(f)

    def __len__(self):
        return len(self.datapath)

    def _get_item(self, index):
        '''
        if self.process_data:
            point_set, label = self.list_of_points[index], self.list_of_labels[index]
        else:
            fn = self.datapath[index]
            cls = self.classes[self.datapath[index][0]]
            label = np.array([cls]).astype(np.int32)
            # Modified by Teng
            # point_set = np.loadtxt(fn[1], delimiter=',').astype(np.float32)
            point_set = LoadPCFromModelNet(fn[1]).astype(np.float32)

            if self.uniform:
                point_set = farthest_point_sample(point_set, self.npoints)
            else:
                point_set = point_set[0:self.npoints, :]
                
        point_set[:, 0:3] = pc_normalize(point_set[:, 0:3])
        if not self.use_normals:
            point_set = point_set[:, 0:3]

        return point_set, label[0]
        '''
        # Modified by Howard
        if self.process_data:
            point_set, label = self.list_of_points[index], self.list_of_labels[index]
        else:
            point_set, label = LoadPCFromModelNet(self.datapath[index])

            if self.uniform:
                point_set = farthest_point_sample(point_set, self.npoints)
            else:
                point_set = point_set[0:self.npoints, :]

        point_set[:, 0:3] = pc_normalize(point_set[:, 0:3])
        if not self.use_normals:
            point_set = point_set[:, 0:3]

        return point_set, int(label)

    def __getitem__(self, index):
        return self._get_item(index)


if __name__ == '__main__':
    import torch

    data = FETCdataLoader('/data/modelnet40_normal_resampled/', split='train')
    DataLoader = torch.utils.data.DataLoader(data, batch_size=12, shuffle=True)
    for point, label in DataLoader:
        print(point.shape)
        print(label.shape)

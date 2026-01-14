'''
@author: Xu Yan
@file: ModelNet.py
@time: 2021/3/19 15:51
'''
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
def uniform_sample(point_set, N):
    """
    調整二維陣列的行數：
    - 若行數小於 N，則重複填充直到達到 N 行。
    - 若行數大於 N，則等間距取樣，使其縮小到 N 行。

    參數：
    matrix : np.array (2D)
        原始二維陣列
    N : int
        目標行數

    回傳：
    np.array
        調整後的二維陣列
    """
    new_point_set = np.array(point_set)  # 確保是 numpy 陣列
    num_rows, num_cols = point_set.shape  # 獲取行數和列數

    if num_rows < N:
        # 重複填充直到達到 N 行
        repeats = N // num_rows + 1  # 計算需要複製幾次
        new_point_set = np.tile(point_set, (repeats, 1))[:N, :]  # 只取前 N 行
    elif num_rows > N:
        # 等間距取樣縮減陣列
        indices = np.linspace(0, num_rows - 1, N, dtype=int)  # 產生 N 個等間距的索引
        new_point_set = point_set[indices, :]
    else:
        # 行數剛好等於 N，直接回傳
        new_point_set = point_set

    return new_point_set

# The function is included by Teng
def random_sample(point_set, N):
    point_indexes = np.random.randint(0, point_set.shape[0], N)
    point_set = point_set[point_indexes.astype(np.int32)]
    return point_set

# The function is included by Teng
def LoadPCFromModelNet(filename):
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

def FindFilesFromModelNet(data_dir, target):
    all_files = []
    search_path = os.path.join(data_dir, '**', target, '*.*')  # 搜索所有類型的文件
    for file_path in glob.glob(search_path, recursive=True):
        # 獲取檔案名稱並存入列表
        file_name = os.path.basename(file_path)
        all_files.append(file_name)
    return all_files

class ModelNetDataLoader(Dataset):
    def __init__(self, root, args, split='train', process_data=False):
        self.root = root
        self.npoints = args.num_point
        self.process_data = process_data
        self.uniform = args.use_uniform_sample
        self.use_normals = args.use_normals
        self.num_category = args.num_category

        # Marked by Teng
        # if self.num_category == 10:
        #     self.catfile = os.path.join(self.root, 'modelnet10_shape_names.txt')
        # else:
        #     self.catfile = os.path.join(self.root, 'modelnet40_shape_names.txt')
        #
        # self.cat = [line.rstrip() for line in open(self.catfile)]
        # self.classes = dict(zip(self.cat, range(len(self.cat))))
        #
        # shape_ids = {}
        # if self.num_category == 10:
        #     shape_ids['train'] = [line.rstrip() for line in open(os.path.join(self.root, 'modelnet10_train.txt'))]
        #     shape_ids['test'] = [line.rstrip() for line in open(os.path.join(self.root, 'modelnet10_test.txt'))]
        # else:
        #     shape_ids['train'] = [line.rstrip() for line in open(os.path.join(self.root, 'modelnet40_train.txt'))]
        #     shape_ids['test'] = [line.rstrip() for line in open(os.path.join(self.root, 'modelnet40_test.txt'))]

        # Modified by Teng
        self.cat = [entry.name for entry in os.scandir(self.root) if entry.is_dir()]
        self.classes = dict(zip(self.cat, range(len(self.cat))))

        self.num_category = len(self.classes) # the num_category should be 10 or 40

        shape_ids = {}
        shape_ids['train'] = FindFilesFromModelNet(self.root, 'train')
        shape_ids['test'] = FindFilesFromModelNet(self.root, 'test')

        assert (split == 'train' or split == 'test')
        shape_names = ['_'.join(x.split('_')[0:-1]) for x in shape_ids[split]]

        # Modified by Teng
        #self.datapath = [(shape_names[i], os.path.join(self.root, shape_names[i], shape_ids[split][i]) + '.txt') for i
        #                  in range(len(shape_ids[split]))]
        self.datapath = [(shape_names[i], os.path.join(self.root, shape_names[i], split, shape_ids[split][i]) ) for i
                          in range(len(shape_ids[split]))]

        print('The size of %s data is %d' % (split, len(self.datapath)))

        if self.uniform:
            self.save_path = os.path.join(root, 'modelnet%d_%s_%dpts_fps.dat' % (self.num_category, split, self.npoints))
        else:
            self.save_path = os.path.join(root, 'modelnet%d_%s_%dpts.dat' % (self.num_category, split, self.npoints))

        if self.process_data:
            if not os.path.exists(self.save_path):
                print('Processing data %s (only running in the first time)...' % self.save_path)
                self.list_of_points = [None] * len(self.datapath)
                self.list_of_labels = [None] * len(self.datapath)

                for index in tqdm(range(len(self.datapath)), total=len(self.datapath)):
                    fn = self.datapath[index]
                    cls = self.classes[self.datapath[index][0]]
                    cls = np.array([cls]).astype(np.int32)
                    # Modified by Teng
                    # point_set = np.loadtxt(fn[1], delimiter=',').astype(np.float32)
                    point_set = LoadPCFromModelNet(fn[1]).astype(np.float32)

                    if self.uniform:
                        point_set = farthest_point_sample(point_set, self.npoints)
                    else:
                        # Modified by Teng
                        # point_set = point_set[0:self.npoints, :]
                        point_set = random_sample(point_set, self.npoints)
                        # point_set = uniform_sample(point_set, self.npoints)

                    self.list_of_points[index] = point_set
                    self.list_of_labels[index] = cls

                with open(self.save_path, 'wb') as f:
                    pickle.dump([self.list_of_points, self.list_of_labels], f)
            else:
                print('Load processed data from %s...' % self.save_path)
                with open(self.save_path, 'rb') as f:
                    self.list_of_points, self.list_of_labels = pickle.load(f)

    def __len__(self):
        return len(self.datapath)

    def _get_item(self, index):
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
                # Modified by Teng
                # point_set = point_set[0:self.npoints, :]
                point_set = random_sample(point_set, self.npoints)
                #point_set = uniform_sample(point_set, self.npoints)

        point_set[:, 0:3] = pc_normalize(point_set[:, 0:3])
        if not self.use_normals:
            point_set = point_set[:, 0:3]

        return point_set, label[0]

    def __getitem__(self, index):
        return self._get_item(index)


# Add by Teng
def parse_args():
    '''PARAMETERS'''
    parser = argparse.ArgumentParser('Testing')
    parser.add_argument('--use_cpu', action='store_true', default=False, help='use cpu mode')
    parser.add_argument('--gpu', type=str, default='0', help='specify gpu device')
    parser.add_argument('--batch_size', type=int, default=24, help='batch size in training')
    parser.add_argument('--num_category', default=40, type=int, choices=[10, 40],  help='training on ModelNet10/40')
    parser.add_argument('--num_point', type=int, default=1024, help='Point Number')
    parser.add_argument('--log_dir', type=str, required=True, help='Experiment root')
    parser.add_argument('--use_normals', action='store_true', default=False, help='use normals')
    parser.add_argument('--use_uniform_sample', action='store_true', default=False, help='use uniform sampiling')
    parser.add_argument('--num_votes', type=int, default=3, help='Aggregate classification scores with voting')
    return parser.parse_args()

if __name__ == '__main__':
    import torch
    import argparse # Add by Teng

    # data = ModelNetDataLoader('/data/modelnet40_normal_resampled/', split='train')
    # DataLoader = torch.utils.data.DataLoader(data, batch_size=12, shuffle=True)
    # for point, label in DataLoader:
    #     print(point.shape)
    #     print(label.shape)

    args = parse_args()

    # Add by Teng
    arr = np.array([[1, 1, 1], [2, 2, 2], [3, 3, 3], [4, 4, 4], [5, 5, 5]])
    # centroids = np.random.randint(0, arr.shape[0], 30)
    # arr = arr[centroids.astype(np.int32)]
    arr = uniform_sample(arr, 30)
    print(arr)

    # min_size = 99999999999
    # max_size = 0
    # min_index = -1
    # data = ModelNetDataLoader('E:/ModelNet40/', args = args, split='test', process_data=False)
    # print(data[2124][0][0:26,:])
    # print(data[2124][0].shape)

    # for index in range(len(data)):
    #     fn = data.datapath[index]
    #     point_set = LoadPCFromModelNet(fn[1]).astype(np.float32)
    #     if(point_set.shape[0] < min_size):
    #         min_size = point_set.shape[0]
    #         min_index = index
    #     if(point_set.shape[0] > max_size):
    #         max_size = point_set.shape[0]
    #
    # print(f"Max size: {max_size} Min size: {min_size} at {min_index}")


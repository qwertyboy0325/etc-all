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

        # 掃描所有類別資料夾
        self.cat = [entry.name for entry in os.scandir(self.root) if entry.is_dir()]
        self.classes = dict(zip(self.cat, range(len(self.cat))))
        self.num_category = len(self.classes)  # 推算類別數量

        shape_ids = {}
        shape_ids['train'] = FindFilesFromModelNet(self.root, 'train')
        shape_ids['test'] = FindFilesFromModelNet(self.root, 'test')

        assert split in ['train', 'test']
        shape_names = ['_'.join(x.split('_')[0:-1]) for x in shape_ids[split]]

        # 以 `.npz` 檔案路徑構建 datapath
        self.datapath = [(shape_names[i], os.path.join(self.root, shape_names[i], split, shape_ids[split][i])) 
                         for i in range(len(shape_ids[split])) if shape_ids[split][i].endswith('.npz')]

        print(f'The size of {split} data is {len(self.datapath)}')

        # 預處理結果存檔路徑
        if self.uniform:
            self.save_path = os.path.join(root, f'modelnet{self.num_category}_{split}_{self.npoints}pts_fps.dat')
        else:
            self.save_path = os.path.join(root, f'modelnet{self.num_category}_{split}_{self.npoints}pts.dat')

        if self.process_data:
            if not os.path.exists(self.save_path):
                print(f'Processing data {self.save_path} (only running in the first time)...')
                self.list_of_points = [None] * len(self.datapath)
                self.list_of_labels = [None] * len(self.datapath)

                for index in tqdm(range(len(self.datapath)), total=len(self.datapath)):
                    fn = self.datapath[index]
                    cls = self.classes[fn[0]]
                    cls = np.array([cls]).astype(np.int32)

                    # 從 .npz 載入點雲
                    point_set = self.load_npz(fn[1])

                    if self.uniform:
                        point_set = farthest_point_sample(point_set, self.npoints)
                    else:
                        point_set = point_set[:self.npoints, :]

                    self.list_of_points[index] = point_set
                    self.list_of_labels[index] = cls

                with open(self.save_path, 'wb') as f:
                    pickle.dump([self.list_of_points, self.list_of_labels], f)
            else:
                print(f'Load processed data from {self.save_path}...')
                with open(self.save_path, 'rb') as f:
                    self.list_of_points, self.list_of_labels = pickle.load(f)

    def __len__(self):
        return len(self.datapath)

    def _get_item(self, index):
        if self.process_data:
            point_set, label = self.list_of_points[index], self.list_of_labels[index]
        else:
            fn = self.datapath[index]
            cls = self.classes[fn[0]]
            label = np.array([cls]).astype(np.int32)

            # 從 .npz 載入點雲
            point_set = self.load_npz(fn[1])

            if self.uniform:
                point_set = farthest_point_sample(point_set, self.npoints)
            else:
                point_set = point_set[:self.npoints, :]

        point_set[:, 0:3] = pc_normalize(point_set[:, 0:3])
        if not self.use_normals:
            point_set = point_set[:, 0:3]

        return point_set, label[0]

    def __getitem__(self, index):
        return self._get_item(index)

    @staticmethod
    def load_npz(filename):
        """
        載入 .npz 檔案並返回點雲資料
        """
        with np.load(filename) as data:
            if 'points' in data:
                return data['points']  # 預設鍵名為 'points'
            else:
                raise KeyError(f"No 'points' key found in {filename}")


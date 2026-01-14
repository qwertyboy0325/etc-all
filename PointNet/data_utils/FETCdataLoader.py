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
    # m = np.max(np.sqrt(np.sum(pc**2, axis=1))) # Teng's comments: this line should be marked in our application
    # pc = pc / m  # Teng's comments: this line should be marked in our application
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

# The function is added by Howard
def add_gaussian_noise(pc, mean=0.0, std=0.01):
    """
    對點雲資料 pc (N x D) 加入高斯雜訊。
    參數:
        pc   : shape (N, D) 的點雲資料
        mean : 高斯分布的平均值
        std  : 高斯分布的標準差
    回傳:
        pc_noisy : 加入高斯雜訊後的點雲
    """
    noise = np.random.normal(loc=mean, scale=std, size=pc.shape)
    pc_noisy = pc + noise
    return pc_noisy

# The function is included by Teng
def LoadPCFromFETC(filename):
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
    # with np.load(filename) as data:
    #     point_set = data['pts']  # Load point cloud data
    #     label = data['car_type']  # Load label
    # return point_set, label
    # Modified by Teng
    with np.load(filename) as data:
        point_set = data['pts']  # Load point cloud data
    return point_set

def FindFilesFromFETC(data_dir, target):
    all_files = []
    #search_path = os.path.join(data_dir, '**', target, '*.*')  # 搜索所有類型的文件
    search_path = os.path.join(data_dir, '**', target, '*.npz') # Howard's comments: change to use .npz files
    for file_path in glob.glob(search_path, recursive=True):
        # 獲取檔案名稱並存入列表
        file_name = os.path.basename(file_path)
        all_files.append(file_name)
    return all_files

class FETCdataLoader(Dataset):
    def __init__(self, root, args, split='train', process_data=False):
        self.root = root
        self.npoints = args.num_point
        self.process_data = process_data
        self.sampler = args.sampler # Modified by Teng
        self.use_normals = args.use_normals
        # self.num_category = args.num_category # Marked by Teng

        # Modified by Teng
        self.cat = [entry.name for entry in os.scandir(self.root) if entry.is_dir()]
        self.classes = dict(zip(self.cat, range(len(self.cat))))

        self.num_category = len(self.classes)

        shape_ids = {}
        shape_ids['train'] = FindFilesFromFETC(self.root, 'train') # Modified by Teng
        shape_ids['test'] = FindFilesFromFETC(self.root, 'test') # Modified by Teng

        assert (split == 'train' or split == 'test')

        shape_names = ['_'.join(x.split('_')[0:-1]) for x in shape_ids[split]]

        # Modified by Teng
        #self.datapath = [(shape_names[i], os.path.join(self.root, shape_names[i], shape_ids[split][i]) + '.txt') for i
        #                  in range(len(shape_ids[split]))]
        self.datapath = [(shape_names[i], os.path.join(self.root, shape_names[i], split, shape_ids[split][i]) ) for i
                          in range(len(shape_ids[split]))]

        print('The size of %s data is %d' % (split, len(self.datapath)))

        # Modified by Howard
        # self.datapath = shape_ids[split]
        # print(f'The size of {split} data is {len(self.datapath)}')

        # Modified by Teng
        if self.sampler == 'farthest':
            self.save_path = os.path.join(root, 'FETC%d_%s_%dpts_fps.dat' % (self.num_category, split, self.npoints))
        elif self.sampler == 'random':
            self.save_path = os.path.join(root, 'FETC%d_%s_%dpts_rs.dat' % (self.num_category, split, self.npoints))
        elif self.sampler == 'uniform':
            self.save_path = os.path.join(root, 'FETC%d_%s_%dpts_us.dat' % (self.num_category, split, self.npoints))

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
                    # Modified by Teng
                    fn = self.datapath[index]
                    cls = self.classes[self.datapath[index][0]]
                    cls = np.array([cls]).astype(np.int32)
                    point_set = LoadPCFromFETC(fn[1]).astype(np.float32) # Modified by Teng

                    # Modified by Teng
                    if self.sampler == 'farthest':
                        point_set = farthest_point_sample(point_set, self.npoints)
                    elif self.sampler == 'random':
                        point_set = random_sample(point_set, self.npoints)
                    elif self.sampler == 'uniform':
                         point_set = uniform_sample(point_set, self.npoints)

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
        # 讀取資料 (process_data 若為 True 則從快取取資料；否則直接從 self.datapath 讀 .npz)
        if self.process_data:
            point_set, label = self.list_of_points[index], self.list_of_labels[index]
        else:
            fn = self.datapath[index]
            cls = self.classes[self.datapath[index][0]]
            label = np.array([cls]).astype(np.int32)
            # Modified by Teng
            # point_set = np.loadtxt(fn[1], delimiter=',').astype(np.float32)
            point_set = LoadPCFromFETC(fn[1]).astype(np.float32)

            # Modified by Teng
            if self.sampler == 'farthest':
                point_set = farthest_point_sample(point_set, self.npoints)
            elif self.sampler == 'random':
                point_set = random_sample(point_set, self.npoints)
            elif self.sampler == 'uniform':
                point_set = uniform_sample(point_set, self.npoints)

        point_set[:, 0:3] = pc_normalize(point_set[:, 0:3]) # Add by Teng
        # 若不要 normals，就只保留 xyz
        if not self.use_normals:
            point_set = point_set[:, 0:3]

        return point_set, int(label)

    def __getitem__(self, index):
        return self._get_item(index)

class Argus:
    def __init__(self):
        self.num_point = 1024
        self.sampler = "uniform"
        self.use_normals = False
        self.process_data = False

if __name__ == '__main__':
    # import torch
    #
    # data = FETCdataLoader('/data/modelnet40_normal_resampled/', split='train')
    # DataLoader = torch.utils.data.DataLoader(data, batch_size=12, shuffle=True)
    # for point, label in DataLoader:
    #     print(point.shape)
    #     print(label.shape)

    # rename files
    # directory_path = 'E:/DataSets/FETC_Point_Cloud_Data/pointnet_datasetnew/semitrailer_truck/train'
    #
    # # 取得目錄下的所有檔案（排除子目錄）
    # files = [f for f in os.listdir(directory_path) if os.path.isfile(os.path.join(directory_path, f))]
    #
    # file_ext = 'npz'
    # prefix = 'semitrailer_truck'
    # # 逐一重新命名
    # for index, file_name in enumerate(files, start=0):
    #     # 新檔名
    #     new_name = f"{prefix}_{index:07d}.{file_ext}"
    #     old_path = os.path.join(directory_path, file_name)
    #     new_path = os.path.join(directory_path, new_name)
    #
    #     # print(new_path)
    #
    #     # 重新命名
    #     os.rename(old_path, new_path)

    data_path = 'E:/DataSets/FETC_Point_Cloud_Data/pointnet_datasetnew_40000_N1/'
    args = Argus()
    train_dataset = FETCdataLoader(root=data_path, args = args, split='train', process_data=args.process_data)
    car_type_dict = {v: k for k, v in train_dataset.classes.items()}
    print(len(car_type_dict))
    print(car_type_dict)




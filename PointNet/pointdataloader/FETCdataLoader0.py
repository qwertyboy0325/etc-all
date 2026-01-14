import os
import numpy as np
import warnings
import pickle
import glob

from tqdm import tqdm
from torch.utils.data import Dataset

warnings.filterwarnings('ignore')

# 點雲標準化函數：將點雲平移到中心並縮放到單位球體
def pc_normalize(pc):
    centroid = np.mean(pc, axis=0)  # 計算點雲的重心
    pc = pc - centroid  # 平移到原點
    m = np.max(np.sqrt(np.sum(pc**2, axis=1)))  # 計算點雲的最大距離
    pc = pc / m  # 根據最大距離進行縮放，將點雲縮放到單位球體
    return pc

# 最遠點選擇算法（Farthest Point Sampling, FPS）：選擇最遠的點作為新點雲的代表
def farthest_point_sample(point, npoint):
    N, D = point.shape  # N為點的數量，D為每個點的維度
    xyz = point[:,:3]  # 只取前3維作為點雲坐標
    centroids = np.zeros((npoint,))  # 初始化最遠點的索引
    distance = np.ones((N,)) * 1e10  # 初始化每個點到已選擇點的最小距離為無窮大
    farthest = np.random.randint(0, N)  # 隨機選擇一個起始點
    for i in range(npoint):
        centroids[i] = farthest  # 記錄當前選擇的最遠點
        centroid = xyz[farthest, :]  # 獲取當前最遠點的坐標
        dist = np.sum((xyz - centroid) ** 2, -1)  # 計算所有點到該點的距離
        mask = dist < distance  # 選擇距離較近的點
        distance[mask] = dist[mask]  # 更新距離
        farthest = np.argmax(distance, -1)  # 選擇最遠的點
    point = point[centroids.astype(np.int32)]  # 根據選擇的索引返回最遠點
    return point

# 根據資料夾結構找到所有的npz文件
def FindFilesFromPointDataset(data_dir, split):
    all_files = []
    search_path = os.path.join(data_dir, split, '**', '*.npz')  # 遞歸查找所有的npz文件
    for file_path in glob.glob(search_path, recursive=True):
        file_name = os.path.basename(file_path)
        all_files.append(file_name)
    return all_files

# 點雲資料加載器類
class FETCdataLoader(Dataset):
    def __init__(self, root, args, split='train', process_data=False):
        self.root = root  # 根目錄
        self.npoints = args.num_point  # 每個點雲的點數
        self.process_data = process_data  # 是否處理數據
        self.uniform = args.use_uniform_sample  # 是否使用均勻取樣
        self.use_normals = args.use_normals  # 是否使用法線

        # 獲取分類名稱
        self.cat = [entry.name for entry in os.scandir(self.root) if entry.is_dir()]
        self.classes = dict(zip(self.cat, range(len(self.cat))))  # 將分類名稱映射到索引
        self.num_category = len(self.classes)  # 類別數量

        # 訓練和測試數據集的文件
        shape_ids = {}
        shape_ids['train'] = FindFilesFromPointDataset(self.root, 'train')
        shape_ids['test'] = FindFilesFromPointDataset(self.root, 'test')

        # 確保split參數是'train'或'test'
        assert split in ['train', 'test']
        shape_names = ['_'.join(x.split('_')[0:-1]) for x in shape_ids[split]]  # 提取文件名的類別部分

        # 將每個文件名和路徑配對
        self.datapath = [(shape_names[i], os.path.join(self.root, split, shape_ids[split][i])) 
                         for i in range(len(shape_ids[split])) if shape_ids[split][i].endswith('.npz')]

        print(f'The size of {split} data is {len(self.datapath)}')

        # 設置處理後數據的保存路徑
        if self.uniform:
            self.save_path = os.path.join(root, f'pointdataset_{split}_{self.npoints}pts_fps.dat')
        else:
            self.save_path = os.path.join(root, f'pointdataset_{split}_{self.npoints}pts.dat')

        # 如果需要處理數據，則進行數據處理並保存
        if self.process_data:
            if not os.path.exists(self.save_path):
                print(f'Processing data {self.save_path} (only running in the first time)...')
                self.list_of_points = [None] * len(self.datapath)
                self.list_of_labels = [None] * len(self.datapath)

                # 遍歷每個文件並處理
                for index in tqdm(range(len(self.datapath)), total=len(self.datapath)):
                    fn = self.datapath[index]
                    cls = self.classes[fn[0]]  # 獲取類別標籤
                    cls = np.array([cls]).astype(np.int32)

                    point_set = self.load_npz(fn[1])  # 加載點雲數據

                    # 根據是否使用均勻取樣選擇處理方式
                    if self.uniform:
                        point_set = farthest_point_sample(point_set, self.npoints)
                    else:
                        point_set = point_set[:self.npoints, :]

                    self.list_of_points[index] = point_set
                    self.list_of_labels[index] = cls

                # 將處理後的數據保存為pickle文件
                with open(self.save_path, 'wb') as f:
                    pickle.dump([self.list_of_points, self.list_of_labels], f)
            else:
                # 如果數據已處理，直接加載
                print(f'Load processed data from {self.save_path}...')
                with open(self.save_path, 'rb') as f:
                    self.list_of_points, self.list_of_labels = pickle.load(f)

    # 返回數據集的大小
    def __len__(self):
        return len(self.datapath)

    # 獲取單個數據樣本
    def _get_item(self, index):
        if self.process_data:
            point_set, label = self.list_of_points[index], self.list_of_labels[index]
        else:
            fn = self.datapath[index]
            cls = self.classes[fn[0]]
            label = np.array([cls]).astype(np.int32)

            point_set = self.load_npz(fn[1])  # 加載點雲

            if self.uniform:
                point_set = farthest_point_sample(point_set, self.npoints)  # 使用最遠點選擇
            else:
                point_set = point_set[:self.npoints, :]  # 截取前npoints個點

        # 點雲標準化
        point_set[:, 0:3] = pc_normalize(point_set[:, 0:3])
        if not self.use_normals:
            point_set = point_set[:, 0:3]  # 如果不使用法線，則只保留前三維

        return point_set, label[0]

    # 返回單個樣本
    def __getitem__(self, index):
        return self._get_item(index)

    # 加載npz文件中的點雲數據
    @staticmethod
    def load_npz(filename):
        with np.load(filename) as data:
            if 'pts' in data:
                return data['pts']  # 返回點雲數據
            else:
                raise KeyError(f"No 'pts' key found in {filename}")  # 如果沒有'points'鍵，報錯

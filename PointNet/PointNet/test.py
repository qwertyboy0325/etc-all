import numpy as np
import time
import glob
import os

def LoadPCFromModelNet(filename):
    point_set = []
    with open(filename, 'r') as file:
        line = file.readline()  # read the line OFF
        line = file.readline()  # read the number of vertices and faces
        for i in range(int(line.split()[0])):
            line = file.readline()  # read the vertex
            xyz = list(map(float, line.split()))
            point_set += [xyz]
    return np.array(point_set)

def SearchFilesFromModelNet(data_dir, train_or_test):
    all_files = []
    search_path = os.path.join(data_dir, '**', train_or_test, '*.*')  # 搜索所有類型的文件
    for file_path in glob.glob(search_path, recursive=True):
        # 獲取檔案名稱並存入列表
        file_name = os.path.basename(file_path)
        all_files.append(file_name)
    return all_files


# #filename = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/data/modelnet40_normal_resampled/ModelNet40/airplane/airplane_0001.off'
# filename1 = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/PointNet/testpc.off'
# filename2 = 'D:/Programming/python/Pointnet_Pointnet2_pytorch-master/PointNet/testpc.txt'
#
# start_time = time.time()
# point_set = LoadPCFromModelNet(filename1).astype(np.float32)
# end_time = time.time()
# print(point_set.shape)
# print(end_time-start_time)
#
# start_time = time.time()
# point_set = np.loadtxt(filename2, delimiter=' ').astype(np.float32)
# end_time = time.time()
# print(point_set.shape)
# print(end_time-start_time)
#
# data_dir = "E:/ModelNet40"
# train_files = SearchFilesFromModelNet(data_dir, 'train')
# test_files = SearchFilesFromModelNet(data_dir, 'test')
#
# print(len(train_files))
# print(len(test_files))
#
# shape_names = [entry.name for entry in os.scandir(data_dir) if entry.is_dir()]
#
# print(len(shape_names))
# print("子目錄名稱：", shape_names)

data = np.load("D:/Programming/python/OpenGL/pointnetSEG_Project/021carpt_1.npz")
car_type = data['car_type']
print("Car Type:", car_type)
raw_pts = data['pts']
print(raw_pts.shape)




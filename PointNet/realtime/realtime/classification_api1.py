import numpy as np
import torch
import os
import sys
import importlib

sys.path.append('/opt/yzu/Teng/VehicleClassification/Pointnet_Pointnet2_pytorch-master/models')
'''
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = BASE_DIR
sys.path.append(os.path.join(ROOT_DIR, 'models'))
'''

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

def create_classifier(model_path, use_gpu):
    checkpoint = torch.load(model_path, weights_only=False)
    car_type = {v: k for k, v in checkpoint['classes'].items()}
    num_class = len(car_type)
    model = importlib.import_module('pointnet_cls')
    classifier = model.get_model(num_class, normal_channel=False)

    if use_gpu:
        classifier = classifier.cuda()

    classifier.load_state_dict(checkpoint['model_state_dict'])
    classifier = classifier.eval()
    return classifier, car_type

def classify(classifier, points, use_gpu):
    num_point = 1024
    points = points.astype(np.float32)
    points = uniform_sample(points, num_point)
    points[:, 0:3] = pc_normalize(points[:, 0:3])
    points = points[np.newaxis, :, :]
    points = torch.from_numpy(points)

    if use_gpu:
        points = points.cuda()

    with torch.no_grad():
        points = points.transpose(2, 1)
        pred, _ = classifier(points)
        pred_choice = pred.data.max(1)[1].item() # Transfer from tensor to python variable
    return pred_choice

if __name__ == '__main__':
    # predict(1024, use_cpu=False)

    use_gpu = False
    model_path = 'D:/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
    classifier, car_type = create_classifier(model_path, use_gpu = use_gpu)
    print(car_type)

    data = np.load("D:/pointnet_dataset_huang/bus/train/bus_003535.npz")
    points = data['pts']
    car_index = classify(classifier, points, use_gpu=use_gpu)
    print(f"The type is {car_type[car_index]}")

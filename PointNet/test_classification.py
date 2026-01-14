"""
Author: Benny
Date: Nov 2019
"""
from data_utils.ModelNetDataLoader import ModelNetDataLoader
from data_utils.FETCdataLoader import FETCdataLoader
import argparse
import numpy as np
import os
import torch
import logging
from tqdm import tqdm
import sys
import importlib

import time #Add by Teng

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = BASE_DIR
sys.path.append(os.path.join(ROOT_DIR, 'models'))


def parse_args():
    '''PARAMETERS'''
    parser = argparse.ArgumentParser('Testing')
    parser.add_argument('--use_cpu', action='store_true', default=False, help='use cpu mode')
    parser.add_argument('--gpu', type=str, default='0', help='specify gpu device')
    parser.add_argument('--batch_size', type=int, default=24, help='batch size in training')
    parser.add_argument('--num_category', default=40, type=int, help='number of category')
    parser.add_argument('--num_point', type=int, default=1024, help='Point Number')
    parser.add_argument('--log_dir', type=str, required=True, help='Experiment root')
    parser.add_argument('--use_normals', action='store_true', default=False, help='use normals')
    parser.add_argument('--sampler', default='uniform', help='Sampling approach: farthest sampling, random sampling, or uniform sampling') # Modified by Teng
    parser.add_argument('--num_votes', type=int, default=3, help='Aggregate classification scores with voting')
    return parser.parse_args()


def test(model, loader, num_class=40, vote_num=1):
    mean_correct = []
    classifier = model.eval()
    class_acc = np.zeros((num_class, 3))

    for j, (points, target) in tqdm(enumerate(loader), total=len(loader)):
        if not args.use_cpu:
            points, target = points.cuda(), target.cuda()

        points = points.transpose(2, 1)

        # Modified by Teng
        if args.use_cpu:
            vote_pool = torch.zeros(target.size()[0], num_class)
        else:
            vote_pool = torch.zeros(target.size()[0], num_class).cuda()

        for _ in range(vote_num):
            pred, _ = classifier(points)
            vote_pool += pred

        pred = vote_pool / vote_num
        pred_choice = pred.data.max(1)[1]

        for cat in np.unique(target.cpu()):
            classacc = pred_choice[target == cat].eq(target[target == cat].long().data).cpu().sum()
            class_acc[cat, 0] += classacc.item() / float(points[target == cat].size()[0])
            class_acc[cat, 1] += 1
        correct = pred_choice.eq(target.long().data).cpu().sum()
        mean_correct.append(correct.item() / float(points.size()[0]))

    # print(class_acc)
    class_acc[:, 2] = class_acc[:, 0] / class_acc[:, 1]
    class_acc = np.mean(class_acc[:, 2])
    instance_acc = np.mean(mean_correct)

    return instance_acc, class_acc


def main(args):
    def log_string(str):
        logger.info(str)
        print(str)

    '''HYPER PARAMETER'''
    os.environ["CUDA_VISIBLE_DEVICES"] = args.gpu

    '''CREATE DIR'''
    experiment_dir = 'log/classification/' + args.log_dir

    '''LOG'''
    args = parse_args()
    logger = logging.getLogger("Model")
    logger.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler('%s/eval.txt' % experiment_dir)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    log_string('PARAMETER ...')
    log_string(args)

    '''DATA LOADING'''
    log_string('Load dataset ...')
    # data_path = 'data/modelnet40_normal_resampled/'
    # data_path = 'E:/DataSets/ModelNet40/'
    # data_path = 'E:/DataSets/FETC_Point_Cloud_Data/pointnet_datasetnew_40000_N100/'
    data_path = 'E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/'

    #test_dataset = ModelNetDataLoader(root=data_path, args=args, split='test', process_data=False)
    #test_dataset = ModelNetDataLoader(root=data_path, args=args, split='test', process_data=True)
    test_dataset = FETCdataLoader(root=data_path, args=args, split='test', process_data=False)
    testDataLoader = torch.utils.data.DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=10)

    '''MODEL LOADING'''
    num_class = args.num_category
    model_name = os.listdir(experiment_dir + '/logs')[0].split('.')[0]
    model = importlib.import_module(model_name)

    classifier = model.get_model(num_class, normal_channel=args.use_normals)
    if not args.use_cpu:
        classifier = classifier.cuda()

    #checkpoint = torch.load(str(experiment_dir) + '/checkpoints/best_model.pth')
    checkpoint = torch.load(str(experiment_dir) + '/checkpoints/best_model.pth', weights_only=False) # Modified by Teng
    classifier.load_state_dict(checkpoint['model_state_dict'])

    with torch.no_grad():
        start_time = time.perf_counter()  # Add by Teng
        instance_acc, class_acc = test(classifier.eval(), testDataLoader, vote_num=args.num_votes, num_class=num_class)
        end_time = time.perf_counter()
        execution_time = end_time - start_time
        print(f"Test set 時間: {execution_time:.6f} 秒")
        print(f"Average 時間 for each : {execution_time / len(test_dataset):.6f} 秒")
        log_string('Test Instance Accuracy: %f, Class Accuracy: %f' % (instance_acc, class_acc))


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

def predict(args):
    num_class = args.num_category
    model = importlib.import_module('pointnet_cls')
    car_type = ['bus', 'car', 'delivery_vehicle', 'semitrailer_truck', 'truck']

    classifier = model.get_model(num_class, normal_channel=args.use_normals)

    # data = np.load("E:/DataSets/FETC_Point_Cloud_Data/pointnet_datasetnew_40000_N10/car/test/car_00514.npz")
    # data = np.load("E:/DataSets/FETC_Point_Cloud_Data/pointnet_datasetnew_40000_N10/delivery_vehicle/test/delivery_vehicle_00333.npz")
    # data = np.load("E:/DataSets/FETC_Point_Cloud_Data/pointnet_datasetnew_40000_N10/semitrailer_truck/test/semitrailer_truck_00289.npz")
    data = np.load("E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoNoise/delivery_vehicle/test/delivery_vehicle_00006.npz")
    points = data['pts'].astype(np.float32)
    points = uniform_sample(points, args.num_point)
    points[:, 0:3] = pc_normalize(points[:, 0:3])

    if not args.use_normals:
        points = points[:, 0:3]

    points = points[np.newaxis, :, :]
    points = torch.from_numpy(points)

    if not args.use_cpu:
        classifier = classifier.cuda()
        points = points.cuda()

    checkpoint = torch.load('D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_no_noise/checkpoints/best_model.pth',weights_only=False)
    classifier.load_state_dict(checkpoint['model_state_dict'])

    classifier = classifier.eval()
    with torch.no_grad():
        points = points.transpose(2, 1)
        pred, _ = classifier(points)
        pred_choice = pred.data.max(1)[1]
        print(f"The type is {car_type[pred_choice]}")

def predict_in_a_directory(args):
    num_class = args.num_category
    model = importlib.import_module('pointnet_cls')
    car_type = ['bus', 'car', 'delivery_vehicle', 'semitrailer_truck', 'truck']
    #car_type = ['car', 'delivery_vehicle', 'semitrailer_truck', 'truck']

    classifier = model.get_model(num_class, normal_channel=args.use_normals)
    checkpoint = torch.load('D:/Programming/python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth', weights_only=False)
    classifier.load_state_dict(checkpoint['model_state_dict'])
    classifier = classifier.eval()

    true_car_type = "car"
    error_count =0

    source_dir = f"E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/{true_car_type}/test/"
    files = [f for f in os.listdir(source_dir) if f.endswith(".npz")]
    if not files:
        print("沒有找到任何 .npz 檔案")
        return

    sample_time = 0
    normalize_time = 0
    classification_time = 0
    total_time = 0
    for file in files:
        data = np.load(os.path.join(source_dir, file))
        t1 = time.perf_counter()
        points = data['pts'].astype(np.float32)
        points = uniform_sample(points, args.num_point)
        t2 = time.perf_counter()
        points[:, 0:3] = pc_normalize(points[:, 0:3])
        t3 = time.perf_counter()

        if not args.use_normals:
            points = points[:, 0:3]

        points = points[np.newaxis, :, :]
        points = torch.from_numpy(points)

        if not args.use_cpu:
            classifier = classifier.cuda()
            points = points.cuda()

        with torch.no_grad():
            points = points.transpose(2, 1)
            pred, _ = classifier(points)
            pred_choice = pred.data.max(1)[1]
            # print(f"The type is {car_type[pred_choice]}")
            if car_type[pred_choice] != true_car_type:
                error_count +=1
        t4 = time.perf_counter()
        sample_time += (t2 - t1)
        normalize_time += (t3 - t2)
        classification_time += (t4-t3)
        total_time += (t4-t1)
    print(f"sample_time: {sample_time / len(files)*1000:.6f} ms")
    print(f"normalize_time: {normalize_time / len(files)*1000:.6f} ms")
    print(f"classification_time: {classification_time / len(files)*1000:.6f} ms")
    print(f"total_time: {total_time / len(files)*1000:.6f} ms")
    print(f"{len(files)-error_count}/{len(files)}={1-error_count/len(files)}")

if __name__ == '__main__':
    args = parse_args()
    # main(args)
    # predict(args)
    predict_in_a_directory(args)

    # Teng say: My arguments for test ModelNet40
    # --log_dir pointnet_cls --sampler uniform --gpu 0 --num_votes 1 --num_category 40

    # Teng say: My arguments for test FETC dataset
    # --log_dir pointnet_cls_fetc --sampler uniform --gpu 0 --num_votes 1 --num_category 5

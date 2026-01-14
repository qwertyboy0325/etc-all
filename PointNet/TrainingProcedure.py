import os
import shutil
from operator import truediv

from SplitDataSet import move_train_files_to_test
from dataAugmentation import data_augmentation
from train_classification import training_function

def AugmentingData(source_dir, destination_dir, noise_std, train_size, test_size):
    input_dir = source_dir
    output_dir = destination_dir
    params = {
        "gaussian_noise_std": 0.05,  # 高斯雜訊標準差
        "rotation_angle_range": (-180, 180),  # 旋轉角度範圍 (度)
        "translation_range": (-1, 1),  # 平移範圍 (x, y, z)
        "scaling_range": (0.95, 1.05),  # 縮放範圍
        "total_files_remaining": 9000,  # 使用者設定的總樣本數
        "rotation_axis": None  # 若為 None，則隨機選擇旋轉軸
    }

    shutil.rmtree(output_dir, ignore_errors=True)  # Added by Teng

    params["gaussian_noise_std"] = noise_std

    class_names = [entry.name for entry in os.scandir(input_dir) if entry.is_dir()]

    for class_name in class_names:
        set_name = "train"
        params["total_files_remaining"] = train_size
        input_sub_dir = f"{input_dir}/{class_name}/{set_name}/"
        output_sub_dir = f"{output_dir}/{class_name}/{set_name}/"
        data_augmentation(input_sub_dir, output_sub_dir, class_name, params)
        set_name = "test"
        params["total_files_remaining"] = test_size
        input_sub_dir = f"{input_dir}/{class_name}/{set_name}/"
        output_sub_dir = f"{output_dir}/{class_name}/{set_name}/"
        data_augmentation(input_sub_dir, output_sub_dir, class_name, params)


if __name__ == "__main__":

    # Split data set
    # ratio = 0.1
    # data_directory = 'E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/'
    # move_train_files_to_test(base_dir=data_directory, ratio=ratio)

    # Data Augmentation
    # source_dir = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source"  # 原始數據資料夾
    # destination_dir = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05"  # 增強後的數據存放位置
    # noise_std = 0.05
    # train_size = 9000
    # test_size = 1000
    # AugmentingData(source_dir, destination_dir, noise_std, train_size, test_size)

    # Training
    # 注意，命列列引數會被修改
    data_dir = 'E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05/'
    log_dir = 'pointnet_cls_fetc_noise_std_0.05'
    epoch = '200'
    gpu_device = '0'
    process_data = True
    clear_log = True
    training_function(data_dir, log_dir, epoch, gpu_device, process_data, clear_log)


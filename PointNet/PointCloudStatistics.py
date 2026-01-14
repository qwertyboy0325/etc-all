import numpy as np
import os
import glob

def statistics(directory):
    npz_files = glob.glob(os.path.join(directory, "**", "*.npz"), recursive=True)
    num_files = len(npz_files)  # 計算原始檔案數量
    #print(num_files)
    npoints = []

    for file in npz_files:
        data = np.load(file)
        point_set = data['pts']
        npoints.append(point_set.shape[0])

    npoints = np.array(npoints)

    print(directory)
    print(f"nFiles: {num_files} max: {np.max(npoints)} min: {np.min(npoints)} mean: {np.mean(npoints)} std: {np.std(npoints)}")

def main():
    directory = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/bus/"  # 原始數據資料夾
    statistics(directory)
    directory = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/car/"  # 原始數據資料夾
    statistics(directory)
    directory = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/delivery_vehicle/"  # 原始數據資料夾
    statistics(directory)
    directory = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/semitrailer_truck/"  # 原始數據資料夾
    statistics(directory)
    directory = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/truck/"  # 原始數據資料夾
    statistics(directory)


if __name__ == "__main__":
    main()

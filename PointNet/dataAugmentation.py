import numpy as np
import os
import glob
import argparse
import shutil

# 可調整的參數
default_params = {
    "gaussian_noise_std": 0.05,  # 高斯雜訊標準差
    "rotation_angle_range": (-180, 180),  # 旋轉角度範圍 (度)
    "translation_range": (-1, 1),  # 平移範圍 (x, y, z)
    "scaling_range": (0.95, 1.05),  # 縮放範圍
    "total_files_remaining": 9000,  # 使用者設定的總樣本數
    "rotation_axis": None  # 若為 None，則隨機選擇旋轉軸
}

def parse_args():
    '''PARAMETERS'''
    parser = argparse.ArgumentParser()
    parser.add_argument('--source_dir', type = str, default='E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source', help='The source directory of point cloud files')
    parser.add_argument('--destination_dir', type = str, default='E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05',
                        help='The destination directory for generated point cloud files')
    parser.add_argument('--noise_std', default=0.05, type=float, help='the standard deviation of gaussian noise')
    parser.add_argument('--test_size', type=int, default=1000, help='the size of the test dataset')
    parser.add_argument('--train_size', type=int, default=9000, help='the size of the training dataset')
    return parser.parse_args()

def add_gaussian_noise(points, mean=0, std=0.01):
    """對點雲數據添加高斯雜訊"""
    noise = np.random.normal(mean, std, points.shape)
    return points + noise

def rotate_point_cloud(points, angle_deg, axis=None):
    """繞任意指定軸旋轉點雲"""
    angle_rad = np.radians(angle_deg)
    
    # 如果未指定軸，則隨機生成一個單位向量作為旋轉軸
    if axis is None:
        axis = np.random.uniform(-1, 1, size=3)  # 產生 [-1, 1] 的隨機向量
        axis /= np.linalg.norm(axis)  # 正規化為單位向量
    else:
        axis = np.array(axis, dtype=np.float64)
        axis /= np.linalg.norm(axis)

    # 計算旋轉矩陣 (Rodrigues' Rotation Formula)
    cos_theta = np.cos(angle_rad)
    sin_theta = np.sin(angle_rad)
    ux, uy, uz = axis

    rot_matrix = np.array([
        [cos_theta + ux**2 * (1 - cos_theta),  ux*uy*(1 - cos_theta) - uz*sin_theta, ux*uz*(1 - cos_theta) + uy*sin_theta],
        [uy*ux*(1 - cos_theta) + uz*sin_theta, cos_theta + uy**2 * (1 - cos_theta),  uy*uz*(1 - cos_theta) - ux*sin_theta],
        [uz*ux*(1 - cos_theta) - uy*sin_theta, uz*uy*(1 - cos_theta) + ux*sin_theta, cos_theta + uz**2 * (1 - cos_theta)]
    ])

    mean = np.mean(points, axis=0)
    # 旋轉所有點
    return np.dot((points-mean), rot_matrix.T)+mean

def translate_point_cloud(points, translation):
    """平移點雲數據"""
    return points + translation

def scale_point_cloud(points, scale):
    mean = np.mean(points,axis=0)
    """平移點雲數據"""
    return (points-mean)*scale + mean


def data_augmentation(input_dir, output_dir, class_name, params=default_params):
    """對指定資料夾內的所有 .npz 檔案進行數據增強"""

    os.makedirs(output_dir, exist_ok=True)
    
    npz_files = glob.glob(os.path.join(input_dir, "*.npz"))
    num_original_files = len(npz_files)  # 計算原始檔案數量

    if num_original_files == 0:
        print("錯誤: 找不到任何 .npz 檔案")
        return

    total_files_remaining = params["total_files_remaining"]
    total_created = 0  # 追蹤已生成的增強樣本數

    print(f"讀取的檔案位置: {input_dir}")
    print(f"總共 {num_original_files} 個原始檔案")
    print(f"目標產生 {total_files_remaining} 個增強樣本")

    while total_files_remaining > 0:
        for file_path in npz_files:
            if total_files_remaining <= 0:
                break  # 如果已達到目標數量，立即跳出迴圈
            
            try:
                data = np.load(file_path)
                point_set = data['pts']
                car_type = data['car_type']

                base_filename = os.path.splitext(os.path.basename(file_path))[0]

                # 產生一個新的增強樣本
                augmented_pts = point_set
                augmented_pts = add_gaussian_noise(augmented_pts, std=params["gaussian_noise_std"])
                augmented_pts = rotate_point_cloud(
                    augmented_pts, 
                    angle_deg=np.random.uniform(*params["rotation_angle_range"]), 
                    axis=params["rotation_axis"]
                )
                augmented_pts = scale_point_cloud(
                    augmented_pts,
                    scale = np.random.uniform(params["scaling_range"][0], params["scaling_range"][1])
                )
                augmented_pts = translate_point_cloud(
                    augmented_pts, 
                    translation=np.random.uniform(params["translation_range"][0], params["translation_range"][1], size=(3,))
                )


                total_created += 1
                total_files_remaining -= 1

                #output_file_path = os.path.join(output_dir, f"{base_filename}_new{total_created}.npz")
                output_file_path = os.path.join(output_dir, f"{class_name}_{total_created:05d}.npz")
                np.savez(output_file_path, car_type=car_type, pts=augmented_pts)

            except Exception as e:
                print(f"讀取 {file_path} 或處理增強樣本時發生錯誤: {e}")
                continue

    print(f"總共新增的檔案數量: {total_created}")

def main(args):
    #input_dir = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source"  # 原始數據資料夾
    #output_dir = "E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05"  # 增強後的數據存放位置

    input_dir = args.source_dir
    output_dir = args.destination_dir
    params = {
        "gaussian_noise_std": 0.05,  # 高斯雜訊標準差
        "rotation_angle_range": (-180, 180),  # 旋轉角度範圍 (度)
        "translation_range": (-1, 1),  # 平移範圍 (x, y, z)
        "scaling_range": (0.95, 1.05),  # 縮放範圍
        "total_files_remaining": 9000,  # 使用者設定的總樣本數
        "rotation_axis": None  # 若為 None，則隨機選擇旋轉軸
    }

    shutil.rmtree(output_dir, ignore_errors=True)  # Added by Teng

    params["gaussian_noise_std"] = args.noise_std

    class_names = [entry.name for entry in os.scandir(input_dir) if entry.is_dir()]

    for class_name in class_names:
        set_name = "train"
        params["total_files_remaining"] = args.train_size
        input_sub_dir = f"{input_dir}/{class_name}/{set_name}/"
        output_sub_dir = f"{output_dir}/{class_name}/{set_name}/"
        data_augmentation(input_sub_dir, output_sub_dir, class_name, params)
        set_name = "test"
        params["total_files_remaining"] = args.test_size
        input_sub_dir = f"{input_dir}/{class_name}/{set_name}/"
        output_sub_dir = f"{output_dir}/{class_name}/{set_name}/"
        data_augmentation(input_sub_dir, output_sub_dir, class_name, params)

if __name__ == "__main__":
    args = parse_args()
    main(args)

    # --source_dir E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/ --destination_dir E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_destination/NoiseStd0.05 --noise_std 0.05 --test_size 1000 --train_size 9000
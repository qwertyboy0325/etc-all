import os
import random
import shutil
import argparse

def parse_args():
    '''PARAMETERS'''
    parser = argparse.ArgumentParser()
    parser.add_argument('--ratio', default=0.1, type=float, help='the ratio for test dataset')
    parser.add_argument('--directory', type = str, default='E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/', help='The source directory of point cloud files')
    return parser.parse_args()


def move_train_files_to_test(base_dir, ratio=0.1):
    for subdir in os.listdir(base_dir):
        sub_path = os.path.join(base_dir, subdir)
        if not os.path.isdir(sub_path):
            continue

        train_path = os.path.join(sub_path, 'train')

        if not os.path.exists(train_path):
            print(f"跳過：{sub_path}，train 不存在")
            continue

        train_files = os.listdir(train_path)
        if not train_files:
            continue

        test_path = os.path.join(sub_path, 'test')
        if not os.path.exists(test_path):
            os.mkdir(test_path)

        total_files = len(train_files)

        to_move_count = max(1, round(total_files * ratio))  # ✅ 四捨五入取得應有 test 數量

        files_to_move = random.sample(train_files, to_move_count)

        for file_name in files_to_move:
            src = os.path.join(train_path, file_name)
            dst = os.path.join(test_path, file_name)
            shutil.move(src, dst)
            print(f"已搬移：{src} -> {dst}")

if __name__ == "__main__":
    args = parse_args()

    print(args.ratio, args.directory)

    move_train_files_to_test(base_dir = args.directory, ratio =args.ratio)

    # --ratio 0.1 --directory E:/DataSets/FETC_Point_Cloud_Data/data_augmentation_source/
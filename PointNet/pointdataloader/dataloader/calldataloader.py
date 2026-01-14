import os
from types import SimpleNamespace
from FETCdataLoader import FETCdataLoader

def main():
    # 設定資料夾路徑（請替換為你的實際路徑）
    data_path = 'G:/pointnet_dataset'  # 根據你的資料存放位置進行調整，改成dataset位置
    split = 'train'  # 可選 'train' 或 'test'
    
    # 檢查資料夾是否存在
    if not os.path.exists(data_path):
        print(f"Error: Data path '{data_path}' does not exist.")
        return

    # 設定參數 args
    args = SimpleNamespace(
        num_point=1024,         # 每個點雲的點數
        use_uniform_sample=True,  # 是否使用最遠點採樣
        use_normals=False,       # 是否使用法向量
        num_category=40          # 分類數量
    )

    # 初始化 DataLoader
    print(f"Initializing FETCdataLoader for {split} split...")
    data_loader = FETCdataLoader(root=data_path, args=args, split=split, process_data=False)

    # 確認資料集大小
    dataset_size = len(data_loader)
    print(f"Dataset size: {dataset_size} samples")

    if dataset_size == 0:
        print("No data found. Please check your data path or format.")
        return

    # 測試載入前 5 筆資料
    print("Testing data loading for the first 5 samples...")
    for idx in range(min(5, dataset_size)):
        try:
            points, label = data_loader[idx]
            print(f"Sample {idx}:")
            print(f"  Points shape: {points.shape}")
            print(f"  Label: {label}")
            print(f"  Label: {points}")
        except Exception as e:
            print(f"Error loading sample {idx}: {e}")

if __name__ == '__main__':
    main()

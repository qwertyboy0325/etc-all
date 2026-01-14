import os
import numpy as np
from classification_api import create_classifier, classify
import torch

# === 使用者設定 ===
model_path = 'D:/Programming/Python/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
data_folder = 'E:/DataSets/FETC_Point_Cloud_Data/pointnet_dataset_huang/semitrailer_truck/train'
# data_folder = 'F:/output_npz/'
output_folder = 'E:/DataSets/FETC_Point_Cloud_Data/point_predictresult/'  # ✅ 自訂輸出資料夾
output_file = os.path.join(output_folder, 'classification_results.txt')
use_gpu = True
num_point = 1024

# === 確保輸出資料夾存在 ===
os.makedirs(output_folder, exist_ok=True)

# === 載入模型 ===
classifier, car_type = create_classifier(model_path, use_gpu=use_gpu)
print(car_type)

# === 開始分類與儲存 ===
filename = []
types = []
type_probs = []
for root, _, files in os.walk(data_folder):
    for file in files:
        if file.endswith('.npz'):
            file_path = os.path.join(root, file)
            try:
                data = np.load(file_path)
                points = data['pts']
                car_index, probs = classify(classifier, points, use_gpu=use_gpu)
                types.append(car_index)
                type_probs.append(probs.cpu().numpy()) # For GPU
                filename.append(file)
                #car_label = car_type[car_index]
                #result_line = f"{file}\t{car_label}\t{probs}"  # 使用 tab 分隔
                #results.append(result_line)
                # print(result_line)
            except Exception as e:
                error_line = f"{file}\tError: {str(e)}"
                results.append(error_line)
                print(error_line)

# === 輸出結果 ===
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("Filename\tPrediction\n")  # 標題列
    for i in range(len(types)):
        #if(types[i]==0):
        if (types[i] >= 0): # All classes
            # print(type_probs[i][0][types[i]])
            # formatted = [f"{v:.2%}" for v in type_probs[i][0]]
            line = f"{filename[i]}\t{car_type[types[i]]}\t{type_probs[i][0][types[i]]:.2%}"  # 使用 tab 分隔
            f.write(line + '\n')

print(f"\n✅ 所有預測結果已儲存到：{output_file}")

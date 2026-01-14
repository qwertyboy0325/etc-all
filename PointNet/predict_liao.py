import os
import numpy as np
from classification_api import create_classifier, classify

# === 使用者設定 ===
model_path = 'F:/Pointnet_Pointnet2_pytorch-master/log/classification/pointnet_cls_fetc_noise_std_0.05/checkpoints/best_model.pth'
data_folder = 'F:/output_npz/'
output_folder = 'F:/point_predictresult/'
output_file = os.path.join(output_folder, 'classification_results.txt')
use_gpu = False

# === 確保輸出資料夾存在 ===
os.makedirs(output_folder, exist_ok=True)

# === 載入模型 ===
classifier, car_type = create_classifier(model_path, use_gpu=use_gpu)
print(f"📦 模型已載入，類別對應：{car_type}")

# === 準備檔案列表（包含完整路徑）===
all_files = []
for root, _, files in os.walk(data_folder):
    for file in files:
        if file.endswith('.npz'):
            all_files.append(os.path.join(root, file))

total = len(all_files)
results = []  # 用於紀錄錯誤

# === 執行分類並寫入結果（僅限類別 index = 0） ===
with open(output_file, 'w', encoding='utf-8') as f:
    f.write("Filename\tPrediction\tConfidence\n")  # 標題列

    for i, file_path in enumerate(all_files):
        file = os.path.basename(file_path)
        try:
            data = np.load(file_path)
            points = data['pts']
            car_index, probs = classify(classifier, points, use_gpu=use_gpu)
            prob = probs[0][car_index]

            # 顯示每筆處理狀況
            print(f"[{i+1}/{total}] {file} ➜ {car_type[car_index]} ({prob:.2%})")

            # 只寫入類別為 bus (index = 0)
            if car_index == 0:
                line = f"{file}\t{car_type[car_index]}\t{prob:.2%}"
                f.write(line + '\n')

        except Exception as e:
            error_line = f"{file}\tError: {str(e)}"
            results.append(error_line)
            print(f"[{i+1}/{total}] ❌ 錯誤：{error_line}")

# === 如有錯誤，附加寫入檔案底部 ===
if results:
    with open(output_file, 'a', encoding='utf-8') as f:
        f.write("\n# Errors:\n")
        for err in results:
            f.write(err + '\n')

print(f"\n✅ 所有預測結果已儲存到：{output_file}")

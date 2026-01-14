# PointNet 整合檢查清單

## 1. 數據格式檢查

### ✅ 目錄結構
```bash
# 檢查導出的數據結構
ls -la /path/to/exports/project_uuid_timestamp/

# 應該看到類似的結構：
# vehicle_type_1/
#   ├── train/
#   │   ├── vehicle_type_1_00000.npz
#   │   ├── vehicle_type_1_00001.npz
#   │   └── ...
#   └── test/
#       ├── vehicle_type_1_00000.npz
#       └── ...
```

### ✅ 檔名格式
```bash
# 檢查檔名格式（應從 00000 開始）
ls /path/to/exports/project_uuid_timestamp/*/train/ | head -5

# 正確範例：
# bus_00000.npz
# bus_00001.npz
# bus_00002.npz
```

### ✅ NPZ 文件內容
```python
import numpy as np

# 檢查 NPZ 文件內容
data = np.load('/path/to/exports/vehicle_type/train/vehicle_type_00000.npz')

# 應該只包含 'pts' 欄位
print("Keys:", data.files)  # 應輸出: ['pts']

# 檢查點雲數據形狀
pts = data['pts']
print("Shape:", pts.shape)  # 應輸出: (N, 3) 或 (N, 4) 等
print("Type:", pts.dtype)   # 應為 float32 或 float64
```

## 2. 訓練/測試分割比例

### ✅ 確認 90/10 分割
```bash
# 計算每個類別的 train/test 數量
for dir in /path/to/exports/*/; do
    echo "$(basename $dir):"
    echo "  Train: $(ls $dir/train/*.npz 2>/dev/null | wc -l)"
    echo "  Test:  $(ls $dir/test/*.npz 2>/dev/null | wc -l)"
done

# Train 數量應約為 Test 的 9 倍
```

## 3. PointNet 環境檢查

### ✅ Python 環境
```bash
cd PointNet

# 檢查是否有 environment.yaml
cat environment.yaml

# 創建環境（如果尚未創建）
conda env create -f environment.yaml
conda activate pointnet
```

### ✅ 必要模組檢查
```python
# 檢查是否可以導入 FETCdataLoader
cd PointNet
python -c "from data_utils.FETCdataLoader import FETCdataLoader; print('✅ FETCdataLoader loaded successfully')"
```

## 4. 訓練前測試

### ✅ 數據加載測試
```python
cd PointNet
python -c "
import sys
sys.path.append('.')
from data_utils.FETCdataLoader import FETCdataLoader

class Args:
    num_point = 1024
    sampler = 'uniform'
    use_normals = False
    process_data = False

args = Args()
data_path = '/path/to/exports/project_uuid_timestamp/'

# 測試 train split
train_dataset = FETCdataLoader(root=data_path, args=args, split='train')
print(f'✅ Train dataset: {len(train_dataset)} samples')
print(f'✅ Classes: {train_dataset.classes}')
print(f'✅ Num categories: {train_dataset.num_category}')

# 測試讀取第一個樣本
point_cloud, label = train_dataset[0]
print(f'✅ Sample shape: {point_cloud.shape}')
print(f'✅ Sample label: {label}')
"
```

## 5. 訓練執行

### ✅ 方式 1: 直接使用 PointNet 訓練腳本
```bash
cd PointNet

python train_classification.py \
  --data_dir /path/to/exports/project_uuid_timestamp \
  --log_dir pointnet_cls_fetc \
  --model pointnet_cls \
  --gpu 0 \
  --epoch 200 \
  --batch_size 24 \
  --num_point 1024 \
  --sampler uniform \
  --process_data \
  --clear_log
```

### ✅ 方式 2: 使用整合腳本
```bash
cd backend

python train_model.py \
  --data_dir /path/to/exports/project_uuid_timestamp \
  --epoch 200 \
  --gpu 0 \
  --sampler uniform \
  --process_data \
  --clear_log
```

## 6. 訓練監控

### ✅ 檢查訓練日誌
```bash
# 查看日誌目錄
ls -la PointNet/log/classification/

# 查看最新訓練的日誌
cd PointNet/log/classification/pointnet_cls_fetc/
ls -la

# 應該看到：
# checkpoints/  - 模型檢查點
# logs/         - 訓練日誌
```

### ✅ 監控訓練輸出
訓練過程中應該看到類似的輸出：
```
Epoch 1/200:
Train Instance Accuracy: 0.85
Train Class Accuracy: 0.82
Test Instance Accuracy: 0.75
Test Class Accuracy: 0.73
Best Instance Accuracy: 0.75
```

## 7. 常見問題檢查

### ❌ 問題: 找不到 FETCdataLoader
```bash
# 確保在 PointNet 目錄下執行
cd PointNet
python train_classification.py ...
```

### ❌ 問題: NPZ 文件格式錯誤
```python
# 檢查並修復 NPZ 文件
import numpy as np
import os

data_dir = '/path/to/exports/project_uuid_timestamp/'
for root, dirs, files in os.walk(data_dir):
    for file in files:
        if file.endswith('.npz'):
            filepath = os.path.join(root, file)
            try:
                with np.load(filepath) as data:
                    if 'pts' not in data.files:
                        print(f"❌ Missing 'pts': {filepath}")
                    else:
                        print(f"✅ Valid: {filepath}")
            except Exception as e:
                print(f"❌ Error loading {filepath}: {e}")
```

### ❌ 問題: 檔名編號錯誤
```bash
# 檢查是否從 00000 開始
ls /path/to/exports/*/train/ | grep "_00000.npz"

# 如果沒有找到，表示編號錯誤，需要重新導出
```

### ❌ 問題: Train/Test 比例錯誤
```bash
# 檢查實際比例
for dir in /path/to/exports/*/; do
    train_count=$(ls $dir/train/*.npz 2>/dev/null | wc -l)
    test_count=$(ls $dir/test/*.npz 2>/dev/null | wc -l)
    ratio=$(echo "scale=2; $train_count / $test_count" | bc)
    echo "$(basename $dir): Train/Test = $train_count/$test_count (ratio: $ratio)"
    # ratio 應約為 9.0
done
```

## 8. 整合驗證完成

當以下所有項目都打勾後，表示整合成功：

- [ ] 數據目錄結構正確 (`vehicle_type/train|test/`)
- [ ] 檔名格式正確 (`vehicle_type_00000.npz`)
- [ ] NPZ 文件只包含 `pts` 欄位
- [ ] Train/Test 比例約為 90/10
- [ ] FETCdataLoader 可以成功加載數據
- [ ] 訓練腳本可以正常執行
- [ ] 訓練過程中沒有錯誤
- [ ] 模型檢查點正常保存

---

## 附錄：快速檢查腳本

創建 `check_integration.sh`:

```bash
#!/bin/bash

DATA_DIR=$1

if [ -z "$DATA_DIR" ]; then
    echo "Usage: $0 /path/to/exports/project_uuid_timestamp"
    exit 1
fi

echo "=== Checking PointNet Integration ==="
echo ""

echo "1. Checking directory structure..."
for dir in "$DATA_DIR"/*/; do
    if [ -d "$dir/train" ] && [ -d "$dir/test" ]; then
        echo "✅ $(basename $dir): train/ and test/ exist"
    else
        echo "❌ $(basename $dir): missing train/ or test/"
    fi
done
echo ""

echo "2. Checking file naming (should start with 00000)..."
for dir in "$DATA_DIR"/*/train/; do
    first_file=$(ls "$dir" | head -1)
    if [[ $first_file == *"_00000.npz" ]]; then
        echo "✅ $(basename $(dirname $dir)): starts with 00000"
    else
        echo "❌ $(basename $(dirname $dir)): does not start with 00000 (found: $first_file)"
    fi
done
echo ""

echo "3. Checking train/test split ratio..."
for dir in "$DATA_DIR"/*/; do
    train_count=$(ls "$dir/train"/*.npz 2>/dev/null | wc -l)
    test_count=$(ls "$dir/test"/*.npz 2>/dev/null | wc -l)
    if [ $test_count -gt 0 ]; then
        ratio=$(echo "scale=1; $train_count / $test_count" | bc)
        echo "$(basename $dir): Train=$train_count, Test=$test_count, Ratio=$ratio (should be ~9.0)"
    fi
done
echo ""

echo "4. Checking NPZ file format..."
cd PointNet
python -c "
import numpy as np
import sys
import os

data_dir = '$DATA_DIR'
errors = []
for root, dirs, files in os.walk(data_dir):
    for file in files:
        if file.endswith('.npz'):
            filepath = os.path.join(root, file)
            try:
                with np.load(filepath) as data:
                    if 'pts' not in data.files:
                        errors.append(f'Missing pts: {filepath}')
                    elif len(data.files) > 1:
                        errors.append(f'Extra fields {data.files}: {filepath}')
            except Exception as e:
                errors.append(f'Error loading {filepath}: {e}')

if errors:
    print('❌ Found errors:')
    for err in errors[:5]:  # Show first 5 errors
        print(f'  - {err}')
    if len(errors) > 5:
        print(f'  ... and {len(errors) - 5} more')
    sys.exit(1)
else:
    print('✅ All NPZ files are valid')
"

echo ""
echo "=== Check Complete ==="
```

使用方式：
```bash
chmod +x check_integration.sh
./check_integration.sh /path/to/exports/project_uuid_timestamp
```

# NPZ 文件分析工具使用說明

## 快速開始

### 1. 基本分析
```bash
python simple_analyze_npz.py your_file.npz
```

### 2. 指定輸出目錄
```bash
python simple_analyze_npz.py your_file.npz -o ./my_analysis_output
```

## 輸出文件說明

### 生成的文件
- `{filename}_analysis.json` - 詳細的 JSON 分析報告
- `{filename}_analysis.md` - 人類可讀的 Markdown 報告

### 報告內容
1. **文件基本信息**: 文件名、大小、結構
2. **數組分析**: 每個數組的形狀、類型、統計信息
3. **點雲檢測**: 自動識別點雲數據並分析空間特徵
4. **數據質量**: 數值範圍、異常值檢測

## 支持的數據類型

### 數值數據
- 自動計算統計信息（均值、標準差、範圍）
- 支持所有 NumPy 數值類型

### 字符串數據
- 顯示樣本值
- 不進行數值統計

### 點雲數據
- 自動檢測 3D 點雲（形狀為 N×3 的數組）
- 計算邊界框和空間範圍
- 分析點密度和分布

## 分析示例

### 輸入文件
```
bus_007748.npz
├── pts (7690, 3) - 點雲數據
├── car_type () - 車輛類型
├── raw_file () - 原始文件名
└── image_file () - 圖像文件名
```

### 輸出報告
- 點雲分析：7,690 個 3D 點
- 空間範圍：3.61m × 11.81m × 2.77m
- 數據質量：完整無損壞

## 高級用法

### 在 Python 中使用
```python
from simple_analyze_npz import SimpleNPZAnalyzer

# 創建分析器
analyzer = SimpleNPZAnalyzer('your_file.npz')

# 載入文件
if analyzer.load_file():
    # 分析結構
    structure = analyzer.analyze_structure()
    
    # 分析點雲
    point_cloud = analyzer.analyze_point_cloud()
    
    # 保存報告
    analyzer.save_analysis_report('./output')
```

### 批量處理
```bash
# 處理多個文件
for file in *.npz; do
    python simple_analyze_npz.py "$file" -o "./analysis_${file%.npz}"
done
```

## 故障排除

### 常見問題

1. **文件載入失敗**
   - 檢查文件路徑是否正確
   - 確認文件未損壞
   - 檢查文件權限

2. **內存不足**
   - 對於大型文件，確保有足夠的內存
   - 考慮使用更強大的機器

3. **數據類型錯誤**
   - 工具會自動處理混合數據類型
   - 非數值數據會顯示樣本值

### 性能優化

- 對於大型點雲（>100,000 點），分析可能需要較長時間
- 建議在具有足夠內存的環境中運行
- 可以考慮對大型數據集進行採樣分析

## 擴展功能

### 自定義分析
可以擴展 `SimpleNPZAnalyzer` 類來添加自定義分析功能：

```python
class CustomNPZAnalyzer(SimpleNPZAnalyzer):
    def analyze_custom_feature(self):
        # 添加自定義分析邏輯
        pass
```

### 集成到其他工具
分析結果的 JSON 格式便於集成到其他數據處理管道中。

## 技術要求

- Python 3.7+
- NumPy
- 無需額外依賴（簡化版）

## 更新日誌

- v1.0: 基本分析功能
- v1.1: 添加點雲檢測
- v1.2: 改進錯誤處理和數據類型支持


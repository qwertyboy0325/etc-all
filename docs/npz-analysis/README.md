# NPZ 文件分析工具

這個工具用於分析 NumPy 壓縮文件 (.npz) 的內容和結構，特別適用於點雲數據分析。

## 功能特性

- 📊 **文件結構分析**: 分析 NPZ 文件中所有數組的形狀、數據類型、內存使用等
- 🌐 **點雲數據檢測**: 自動識別和分析點雲數據
- 📈 **可視化生成**: 生成 3D 散點圖和數據分布圖
- 📋 **詳細報告**: 生成 JSON 和 Markdown 格式的分析報告
- 🔍 **統計分析**: 提供完整的統計信息（均值、標準差、範圍等）

## 安裝依賴

```bash
pip install numpy matplotlib pandas
```

## 使用方法

### 基本用法

```bash
python analyze_npz.py path/to/your/file.npz
```

### 指定輸出目錄

```bash
python analyze_npz.py path/to/your/file.npz -o ./output_directory
```

### 在 Python 中使用

```python
from analyze_npz import NPZAnalyzer

# 創建分析器
analyzer = NPZAnalyzer('path/to/your/file.npz')

# 運行完整分析
analyzer.run_full_analysis('./output')

# 或者分步分析
analyzer.load_file()
structure = analyzer.analyze_structure()
point_cloud = analyzer.analyze_point_cloud()
```

## 輸出文件

分析完成後，會在輸出目錄中生成以下文件：

- `{filename}_analysis.json`: 詳細的 JSON 分析報告
- `{filename}_analysis.md`: 人類可讀的 Markdown 報告
- `{array_name}_3d_plot.png`: 3D 點雲可視化圖（如果適用）
- `{array_name}_distribution.png`: 數據分布圖

## 分析內容

### 文件結構分析
- 文件名和大小
- 每個數組的形狀和數據類型
- 內存使用情況
- 數值範圍和統計信息

### 點雲數據分析
- 自動檢測點雲數據
- 點數統計
- 邊界框計算
- 各維度的數值範圍

### 可視化
- 3D 散點圖（適用於點雲數據）
- 數據分布直方圖
- 箱線圖
- 統計信息摘要

## 示例

分析一個包含點雲數據的 NPZ 文件：

```bash
python analyze_npz.py bus_007748.npz -o ./bus_analysis
```

這將生成：
- `bus_007748_analysis.json`
- `bus_007748_analysis.md`
- 各種可視化圖表

## 注意事項

- 對於大型點雲數據（>10,000 點），3D 可視化會自動進行採樣以提高性能
- 確保有足夠的內存來載入 NPZ 文件
- 生成的圖表會保存為高分辨率 PNG 文件


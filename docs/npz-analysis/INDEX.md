# NPZ 文件分析工具集

## 📁 文檔結構

```
docs/npz-analysis/
├── README.md                    # 工具介紹和功能說明
├── USAGE.md                     # 詳細使用說明
├── INDEX.md                     # 本文件 - 文檔索引
├── analyze_npz.py              # 完整版分析工具（需要 matplotlib）
├── simple_analyze_npz.py       # 簡化版分析工具（僅需 numpy）
├── bus_007748_summary.md       # Bus 007748 分析總結
└── bus_007748_output/          # 分析結果輸出
    ├── bus_007748_analysis.json
    └── bus_007748_analysis.md
```

## 🚀 快速開始

### 1. 使用簡化版工具（推薦）
```bash
python simple_analyze_npz.py your_file.npz -o ./output
```

### 2. 使用完整版工具（需要安裝 matplotlib）
```bash
pip install matplotlib pandas
python analyze_npz.py your_file.npz -o ./output
```

## 📊 分析結果

### Bus 007748 文件分析
- **文件類型**: 城市巴士點雲數據
- **點數**: 7,690 個 3D 點
- **空間尺寸**: 3.61m × 11.81m × 2.77m
- **數據質量**: 完整無損壞

詳細分析請查看：
- [分析報告](bus_007748_output/bus_007748_analysis.md)
- [分析總結](bus_007748_summary.md)

## 🛠️ 工具功能

### 簡化版工具 (`simple_analyze_npz.py`)
- ✅ 文件結構分析
- ✅ 點雲數據檢測
- ✅ 統計信息計算
- ✅ JSON/Markdown 報告生成
- ✅ 無額外依賴

### 完整版工具 (`analyze_npz.py`)
- ✅ 簡化版所有功能
- ✅ 3D 可視化圖表
- ✅ 數據分布圖
- ✅ 需要 matplotlib 和 pandas

## 📋 使用場景

1. **點雲數據分析**: 分析 3D 掃描數據
2. **車輛檢測**: 分析車輛點雲數據
3. **數據質量檢查**: 驗證 NPZ 文件完整性
4. **批量處理**: 處理多個 NPZ 文件
5. **研究用途**: 學術研究和數據探索

## 🔧 技術規格

- **Python 版本**: 3.7+
- **核心依賴**: NumPy
- **可選依賴**: Matplotlib, Pandas
- **支持格式**: .npz (NumPy 壓縮文件)
- **輸出格式**: JSON, Markdown, PNG (可視化)

## 📚 文檔導航

- [README.md](README.md) - 工具介紹和安裝說明
- [USAGE.md](USAGE.md) - 詳細使用指南和故障排除
- [bus_007748_summary.md](bus_007748_summary.md) - 示例分析總結

## 🎯 下一步

1. 選擇適合的工具版本
2. 安裝必要的依賴
3. 運行分析工具
4. 查看生成的分析報告
5. 根據需要進行進一步的數據處理

---

*最後更新: 2025-09-05*


# ETC 點雲標注系統 - 前端

🎨 **基於React + Three.js的現代化3D點雲查看器**

[![Deploy to GitHub Pages](https://github.com/Ezra4/ETC/actions/workflows/deploy.yml/badge.svg)](https://github.com/Ezra4/ETC/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://ezra4.github.io/ETC)

## 🌟 功能特色

- 🎮 **3D點雲渲染** - 基於Three.js的高性能渲染引擎
- 🖱️ **交互控制** - 支持旋轉、縮放、平移等完整3D操作
- 📁 **文件管理** - 拖拽上傳、格式驗證、進度顯示
- ⚙️ **可視化選項** - 點大小、顏色、網格等多種顯示設置
- 📱 **響應式設計** - 適配桌面和移動設備
- 🎯 **現代UI** - 基於Ant Design的美觀界面

## 🚀 快速開始

### 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 訪問 http://localhost:3000
```

### 構建部署

```bash
# 本地構建
npm run build

# GitHub Pages構建
npm run build:gh

# 部署到GitHub Pages
npm run deploy
```

## 📦 技術棧

- **框架**: React 18 + TypeScript
- **3D渲染**: Three.js + react-three-fiber
- **UI組件**: Ant Design 
- **路由**: React Router
- **構建工具**: Vite
- **圖標**: Lucide React
- **部署**: GitHub Pages + GitHub Actions

## 🎯 支持的文件格式

- `.npy` - NumPy二進制格式
- `.npz` - NumPy壓縮格式  
- `.ply` - 多邊形文件格式
- `.pcd` - 點雲數據格式

## 🎮 使用說明

1. **載入數據**: 點擊"載入示例數據"或上傳自己的點雲文件
2. **3D交互**: 
   - 左鍵拖拽: 旋轉視角
   - 滾輪: 縮放視角
   - 右鍵拖拽: 平移視角
3. **顯示控制**: 調整點大小、顏色、網格等選項
4. **全屏模式**: 點擊全屏按鈕獲得沉浸式體驗

## 🔗 在線演示

🌐 **Live Demo**: [https://ezra4.github.io/ETC](https://ezra4.github.io/ETC)

## 📊 項目結構

```
frontend/
├── src/
│   ├── components/          # 通用組件
│   │   └── PointCloudViewer.tsx  # 3D渲染核心組件
│   ├── pages/              # 頁面組件
│   │   └── PointCloudViewer.tsx  # 查看器頁面
│   ├── utils/              # 工具函數
│   │   └── pointCloudLoader.ts   # 數據載入工具
│   ├── App.tsx             # 主應用
│   └── main.tsx            # 入口文件
├── public/                 # 靜態資源
└── dist/                   # 構建輸出
```

## 🛠️ 開發指令

```bash
npm run dev          # 啟動開發服務器
npm run build        # 本地構建
npm run build:gh     # GitHub Pages構建
npm run preview      # 預覽構建結果
npm run lint         # 代碼檢查
npm run type-check   # TypeScript類型檢查
npm run deploy       # 部署到GitHub Pages
```

## 🎯 開發路線圖

- [x] **Week 4**: 3D點雲渲染系統
- [ ] **Week 5**: 任務管理系統  
- [ ] **Week 6**: 標注工具
- [ ] **Week 7**: 審核工作流

## 📄 許可證

MIT License - 詳見 [LICENSE](../LICENSE) 文件

---

**ETC Point Cloud Annotation System** ©2024 | [後端項目](../backend) | [文檔](../docs) 
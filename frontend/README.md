# ETC Point Cloud Annotation System - Frontend

React + TypeScript 前端應用，提供點雲標注系統的用戶界面。

## 技術棧

- **React 18** - 用戶界面庫
- **TypeScript** - 類型安全的 JavaScript
- **Vite** - 構建工具和開發服務器
- **Ant Design** - UI 組件庫
- **Three.js** - 3D 圖形渲染
- **React Three Fiber** - React 的 Three.js 渲染器
- **React Router** - 路由管理
- **React Query** - 數據獲取和狀態管理
- **Zustand** - 全局狀態管理
- **Axios** - HTTP 客戶端

## 專案結構

```
frontend/
├── public/               # 靜態資源
├── src/
│   ├── components/       # 可重用組件
│   ├── pages/           # 頁面組件
│   ├── hooks/           # 自定義 React Hooks
│   ├── store/           # 全局狀態管理
│   ├── utils/           # 工具函數
│   ├── types/           # TypeScript 類型定義
│   ├── assets/          # 圖片、字體等資源
│   ├── App.tsx          # 主應用組件
│   ├── main.tsx         # 應用入口
│   └── index.css        # 全局樣式
├── package.json         # 依賴管理
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── Dockerfile.dev       # Docker 開發環境
```

## 功能特性

### 核心功能
- 🔐 用戶認證和授權
- 📊 多專案管理
- 👥 多用戶協作
- 📋 任務分配和管理
- 🏷️ 點雲標注工具
- ✅ 審核工作流
- 📈 統計和報表

### UI/UX 特性
- 📱 響應式設計
- 🌐 國際化支援（繁體中文）
- 🎨 現代化 UI 設計
- ⚡ 快速加載和響應
- 🔄 實時數據更新
- 📱 移動端適配

### 3D 點雲功能
- 🎮 交互式 3D 點雲顯示
- 🔍 縮放、旋轉、平移控制
- 🎯 點雲標注工具
- 📐 測量和分析工具
- 🎨 自定義渲染選項

## 快速開始

### 1. 環境需求

- Node.js 18+
- pnpm (推薦) 或 npm
- Docker (用於容器化開發)

### 2. 本地開發

```bash
# 進入前端目錄
cd frontend

# 安裝依賴
pnpm install

# 啟動開發服務器
pnpm dev

# 在瀏覽器中打開 http://localhost:3000
```

### 3. 使用 Docker 開發

```bash
# 回到專案根目錄
cd ..

# 啟動前端服務（包含在 docker-compose 中）
docker-compose -f docker-compose.dev.yml up -d frontend

# 查看前端日誌
docker-compose -f docker-compose.dev.yml logs -f frontend
```

### 4. 構建生產版本

```bash
# 構建應用
pnpm build

# 預覽構建結果
pnpm preview
```

## 開發指南

### 代碼風格

項目使用 ESLint 和 TypeScript 進行代碼質量控制：

```bash
# 檢查代碼風格
pnpm lint

# 自動修復可修復的問題
pnpm lint:fix

# TypeScript 類型檢查
pnpm type-check
```

### 組件開發

1. **創建組件**
   ```typescript
   // src/components/MyComponent/index.tsx
   import React from 'react';
   
   interface MyComponentProps {
     title: string;
     onAction: () => void;
   }
   
   const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
     return (
       <div>
         <h2>{title}</h2>
         <button onClick={onAction}>Action</button>
       </div>
     );
   };
   
   export default MyComponent;
   ```

2. **使用 Ant Design 組件**
   ```typescript
   import { Button, Modal, Form, Input } from 'antd';
   ```

3. **Three.js 3D 組件**
   ```typescript
   import { Canvas } from '@react-three/fiber';
   import { OrbitControls, Environment } from '@react-three/drei';
   ```

### 狀態管理

使用 Zustand 進行全局狀態管理：

```typescript
// src/store/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: async (credentials) => {
    // 實現登入邏輯
  },
  logout: () => {
    set({ user: null, token: null });
  },
}));
```

### API 調用

使用 React Query 進行數據獲取：

```typescript
// src/hooks/useProjects.ts
import { useQuery } from 'react-query';
import { projectService } from '@/services/projectService';

export const useProjects = () => {
  return useQuery('projects', projectService.getAll);
};
```

### 路徑別名

項目配置了路徑別名，可以使用以下方式導入：

```typescript
import MyComponent from '@/components/MyComponent';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/dateUtils';
```

## 測試

```bash
# 運行測試
pnpm test

# 運行測試並生成覆蓋率報告
pnpm test:coverage
```

## 部署

### 開發環境

```bash
# 使用 Docker Compose
docker-compose -f docker-compose.dev.yml up -d
```

### 生產環境

```bash
# 構建生產映像
docker build -f Dockerfile.prod -t etc-frontend:prod .

# 部署到生產環境
# (具體部署方式依據基礎設施而定)
```

## 配置

### 環境變數

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=ETC Point Cloud Annotation System
VITE_VERSION=1.0.0
```

### Vite 配置

主要配置在 `vite.config.ts` 中：

- API 代理設置
- 路徑別名配置
- 構建優化
- 開發服務器配置

## 常見問題

### 1. 依賴安裝失敗

```bash
# 清理緩存
pnpm store prune

# 重新安裝
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 2. 開發服務器無法啟動

```bash
# 檢查端口是否被占用
lsof -i :3000

# 使用不同端口
pnpm dev --port 3001
```

### 3. Docker 構建失敗

```bash
# 重新構建映像
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

## 瀏覽器支持

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

## 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 創建 Pull Request

## 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](../LICENSE) 文件。 
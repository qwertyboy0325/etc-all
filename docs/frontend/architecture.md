# 前端架構設計

## 前端架構概述

### 整體架構
基於React 18的現代化前端架構，使用Three.js處理3D點雲渲染，Ant Design提供UI組件，採用函數式組件和Hooks的開發模式。

### 架構原則
1. **組件化設計**：可重用的模組化組件
2. **狀態管理**：集中式狀態管理
3. **性能優先**：代碼分割和懶加載
4. **用戶體驗**：響應式設計和友好的交互
5. **可維護性**：清晰的代碼結構和文檔

## 技術棧

### 核心框架
- **React 18**：主要UI框架
- **TypeScript**：類型安全和開發體驗
- **Vite**：快速構建工具

### 3D渲染
- **Three.js**：3D圖形庫
- **react-three-fiber**：React與Three.js的整合
- **react-three-drei**：Three.js的React輔助庫

### UI組件
- **Ant Design**：企業級UI組件庫
- **styled-components**：CSS-in-JS樣式解決方案

### 狀態管理
- **Redux Toolkit**：狀態管理
- **RTK Query**：API數據獲取和緩存

### 路由
- **React Router**：前端路由管理

## 項目結構

```
frontend/
├── public/                 # 靜態資源
├── src/
│   ├── components/         # 可重用組件
│   │   ├── common/         # 通用組件
│   │   ├── pointcloud/     # 點雲相關組件
│   │   ├── annotation/     # 標注相關組件
│   │   ├── task/           # 任務相關組件
│   │   └── user/           # 用戶相關組件
│   ├── pages/             # 頁面組件
│   │   ├── Login/         # 登入頁面
│   │   ├── Dashboard/     # 儀表板
│   │   ├── Annotation/    # 標注頁面
│   │   ├── Review/        # 審核頁面
│   │   └── Admin/         # 管理頁面
│   ├── services/          # API服務
│   ├── store/             # 狀態管理
│   ├── utils/             # 工具函數
│   ├── hooks/             # 自定義Hooks
│   ├── types/             # TypeScript類型定義
│   └── styles/            # 全局樣式
└── package.json
```

## 核心組件設計

### 點雲可視化組件
```
PointCloudViewer/
├── PointCloudViewer.tsx   # 主組件
├── PointCloudCanvas.tsx   # 3D畫布
├── PointCloudControls.tsx # 控制器
├── PointCloudLoader.tsx   # 數據加載器
└── index.ts               # 導出
```

### 標注工具組件
```
AnnotationTools/
├── AnnotationPanel.tsx    # 標注面板
├── VehicleClassifier.tsx  # 車種分類器
├── AnnotationHistory.tsx  # 標注歷史
└── AnnotationSubmit.tsx   # 提交組件
```

### 任務管理組件
```
TaskManagement/
├── TaskList.tsx           # 任務列表
├── TaskCard.tsx           # 任務卡片
├── TaskFilter.tsx         # 任務篩選
└── TaskStatus.tsx         # 任務狀態
```

## 狀態管理設計

### Store結構
```typescript
interface RootState {
  auth: AuthState;           // 認證狀態
  tasks: TaskState;          // 任務狀態
  annotations: AnnotationState; // 標注狀態
  pointcloud: PointCloudState;  // 點雲狀態
  ui: UIState;               // UI狀態
}
```

### 狀態管理模式
- **Redux Toolkit**：統一狀態管理
- **RTK Query**：API數據獲取
- **Local State**：組件內部狀態

## 路由設計

### 路由結構
```typescript
const routes = [
  {
    path: "/",
    element: <Dashboard />,
    protected: true
  },
  {
    path: "/login",
    element: <Login />,
    protected: false
  },
  {
    path: "/annotation/:taskId",
    element: <AnnotationPage />,
    protected: true,
    roles: ["annotator", "admin"]
  },
  {
    path: "/review/:taskId",
    element: <ReviewPage />,
    protected: true,
    roles: ["reviewer", "admin"]
  },
  {
    path: "/admin",
    element: <AdminPage />,
    protected: true,
    roles: ["admin"]
  }
];
```

### 權限控制
- **ProtectedRoute**：路由級別權限控制
- **RoleBasedAccess**：角色基礎訪問控制

## 3D渲染架構

### 點雲渲染流程
```
NumPy數據 → 解析轉換 → Three.js點雲 → WebGL渲染
```

### 渲染優化
- **BufferGeometry**：高效的幾何體
- **InstancedMesh**：批量渲染
- **Frustum Culling**：視錐體剔除

### 交互控制
- **OrbitControls**：軌道控制器
- **鼠標交互**：旋轉、縮放、平移
- **鍵盤快捷鍵**：快速操作

## API整合

### API服務設計
```typescript
// services/api.ts
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = selectAuthToken(getState() as RootState);
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Task', 'Annotation', 'User'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], void>({
      query: () => '/tasks',
      providesTags: ['Task'],
    }),
    // ... 其他endpoints
  }),
});
```

### 錯誤處理
- **全局錯誤邊界**：React Error Boundary
- **API錯誤處理**：統一的錯誤響應處理
- **用戶友好提示**：清晰的錯誤信息

## 性能優化

### 代碼分割
- **路由級別**：按頁面分割
- **組件級別**：懶加載大型組件
- **第三方庫**：分離vendor包

### 渲染優化
- **React.memo**：防止不必要的重渲染
- **useMemo/useCallback**：優化計算和函數
- **虛擬化**：大列表虛擬化

### 資源優化
- **圖片懶加載**：延遲加載圖片
- **字體優化**：字體加載優化
- **靜態資源**：CDN加速

## 用戶體驗設計

### 響應式設計
- **移動端適配**：支援平板和手機
- **彈性布局**：適應不同螢幕尺寸
- **觸控支援**：移動設備觸控操作

### 交互設計
- **加載狀態**：Loading和Skeleton
- **操作反饋**：成功、警告、錯誤提示
- **鍵盤導航**：無障礙訪問

### 主題和樣式
- **設計系統**：統一的視覺語言
- **深色模式**：可選的深色主題
- **自定義主題**：可配置的主題系統

## 測試策略

### 測試分層
- **單元測試**：Jest + React Testing Library
- **集成測試**：組件間交互測試
- **E2E測試**：Playwright端到端測試

### 測試覆蓋
- **組件測試**：UI組件測試
- **Hook測試**：自定義Hook測試
- **API測試**：Mock API測試

## 部署配置

### 構建優化
- **Tree Shaking**：移除未使用代碼
- **壓縮優化**：代碼壓縮和混淆
- **資源優化**：圖片和字體優化

### 部署策略
- **靜態部署**：Nginx服務靜態文件
- **CDN部署**：全球內容分發
- **環境配置**：開發、測試、生產環境

---
*最後更新：2024年12月19日* 
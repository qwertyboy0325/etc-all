# Week 4 Completion Report — 點雲渲染與前後端整合

日期: 2025-08-11

## 核心成果

- 前端全面移除 Mock/Hybrid 模式，統一使用真實 API
  - 刪除 `smartApiCall` 與所有 mock 回退
  - 固定 `frontend/src/config/api.ts` 的 `mode: 'real'`
  - 自 `Navbar`、`Landing` 中移除 `ApiModeSwitch`

- 後端基礎設施恢復並穩定運行
  - 以 Docker Compose 啟動 `db`/`redis`/`minio`
  - 執行 Alembic 遷移並啟動 FastAPI，健康檢查 200

- 點雲查看器 MVP 完成
  - 新增 `PointCloudRenderer`（Three.js + OrbitControls）
  - 新增 `PointCloudViewer` 頁面（文件列表、下載、上傳、示例生成、渲染）
  - 新增 `npyParser.ts`，修正魔術字與 header 解析（shape/descr/fortran_order）
  - 新增 `fileService.ts` 封裝文件 API
  - 提供 `TestNpyParser`、`TestPointCloud` 測試頁面

- 認證流程穩定化
  - 前端登入固定走後端 JSON API（`/auth/login`）
  - Navbar 提供「強制重置認證」以清理 localStorage

## 關鍵修復

- CORS: 明確允許 `localhost/127.0.0.1/192.168.0.104` 多個端口
- NPY 解析: 修正魔術字、header 字典抽取、shape 解析
- AntD 棄用警告: 部分屬性替換（持續清理中）
- TypeScript: 清除未使用變數與舊 mock 介面後，type-check 綠燈

## 仍待事項（轉入 Week 5）

- 任務管理：串接後端任務 API（列表、統計、建立、分配、狀態）
- 註解功能（Week 6）：基礎標注工具與資料結構
- 前端 AntD 棄用屬性全面清理
- 後端型別/安全檢查（mypy、bandit）

## 影響範圍（主要檔案）

- Frontend
  - `src/config/api.ts`、`src/utils/api.ts`
  - `src/components/Navbar.tsx`、`src/pages/Landing.tsx`
  - `src/components/PointCloudRenderer.tsx`
  - `src/pages/PointCloudViewer.tsx`、`src/pages/TestNpyParser.tsx`、`src/pages/TestPointCloud.tsx`
  - `src/utils/npyParser.ts`、`src/services/fileService.ts`

- Backend
  - `app/main.py`（CORS）
  - Docker Compose 啟動基礎服務，Alembic 遷移

## 結論

Week 4 目標「點雲渲染（基礎版）」已達成：真實 API 路徑打通，點雲文件可下載解析並在 Three.js 中渲染，整體可用性達 MVP 標準。


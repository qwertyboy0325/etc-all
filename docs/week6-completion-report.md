# Week 6 Completion Report — 標注功能（基礎版）

日期：2025-08-18（本週啟動）

## 本週目標
- 前端：建立基礎標注流程（選點/標籤/保存/預覽）
- 後端：標注相關 API 打通（建立/更新/刪除/列表/提交審核）
- 權限：ANNOTATOR 可建立/更新自己標注，REVIEWER 可審核，SYSTEM_ADMIN/ADMIN 具越權能力

## 預計交付
- 前端
  - `AnnotationPage` 串接任務與點雲文件，提供最小可用標注工具
  - 標註資料（vehicle_type、confidence、notes、selected_points 索引）序列化送後端
  - 在任務詳情顯示既有標注清單與預覽
- 後端
  - POST `/api/v1/projects/{pid}/tasks/{tid}/annotations` 建立
  - PUT `/api/v1/projects/{pid}/annotations/{aid}` 更新
  - DELETE `/api/v1/projects/{pid}/annotations/{aid}` 刪除
  - GET `/api/v1/projects/{pid}/tasks/{tid}/annotations` 列表
  - POST `/api/v1/projects/{pid}/annotations/{aid}/submit` 提交審核

## 待辦（Sprint Backlog）
- 前端
  - 基礎工具：框選/刷選/取消選擇、車種與信心度輸入、保存/取消
  - 標注清單：列表、刪除、載入到視圖預覽
  - 錯誤與狀態提示（保存中/已保存）
- 後端
  - 權限檢查：作者可編輯、審核權限驗證
  - 數據驗證：selected_points 上限、payload 結構
- 文件
  - 權限矩陣補充（角色 × 操作）

## 風險與緩解
- 點雲選取效能：先以抽樣/批次選擇，必要時限制每次選取點數
- 數據量大：後端限制 payload 大小並壓縮/分頁查詢

## 本週進度（滾動更新）
- 已完成：
  - 前端 `AnnotationPage` 與後端 API 串接，移除本地 mock：
    - 讀取任務詳情 `/projects/{pid}/tasks/{tid}` 取得 `pointcloud_file_id`
    - 透過 `/projects/{pid}/files/{file_id}/download` 取得簽名 URL，下載 .npy 並以 `npyParser` 解析為 Float32Array
    - 保存草稿：`POST /projects/{pid}/annotations`，帶入 `task_id`、`vehicle_type_id`、`confidence`、`notes`、`annotation_data.selected_points`
    - 提交審核：若無草稿先建立，之後 `POST /projects/{pid}/annotations/{aid}/submit`
    - 刪除草稿：`DELETE /projects/{pid}/annotations/{aid}`
  - `AnnotationTools` 保持 UI/資料結構一致，無破壞性變更
- 進行中：
  - 後端車種列表 API 對接（暫以前端靜態表列替代）
  - 依專案內角色控制標注按鈕顯示（PROJECT_ADMIN/REVIEWER/ANNOTATOR）
- 待辦：
  - 載入既有標注清單與在 3D 視圖預覽
  - 失敗情境與錯誤訊息標準化顯示
# Week 5 Completion Report — 任務管理串接與權限

日期：2025-08-11

## 本週目標
- 串接任務 API：列表、統計、建立、分配、狀態更新、刪除
- 專案操作：刪除專案（符合權限）
- 前端權限顯示：依全域角色（system_admin/admin）顯示刪除操作；後續擴充至專案 membership 角色

## 目前成果
- 任務列表/統計：
  - GET `/api/v1/projects/{project_id}/tasks`（支援篩選與基本分頁）
  - GET `/api/v1/projects/{project_id}/tasks/stats`
- 任務操作：
  - POST `/api/v1/projects/{project_id}/tasks`（選擇既有檔 `pointcloud_file_id`）
  - POST `/api/v1/projects/{project_id}/tasks/{task_id}/assign`
  - POST `/api/v1/projects/{project_id}/tasks/{task_id}/status`
  - DELETE `/api/v1/projects/{project_id}/tasks/{task_id}`
- 專案刪除：DELETE `/api/v1/projects/{project_id}`（僅建立者或 system_admin）
- 前端權限顯示：
  - 列表與看板均提供「刪除任務」操作，僅 system_admin/admin 顯示
  - 專案列表提供「刪除專案」，僅具建立者或 system_admin 的使用者可成功刪除（UI 顯示以 system_admin/admin 控制，實際權限由後端判斷）
- 通用修正：
  - 正規化登入回傳的 `user` 結構（`globalRole`/`global_role`、`fullName`/`full_name` 等）
  - API 請求頭統一走 `getAuthHeaders()` 攜帶 Bearer token

## 待辦（Sprint Backlog）
- 依專案 membership 角色（PROJECT_ADMIN/REVIEWER/ANNOTATOR/VIEWER）控制前端操作顯示
- 任務列表：完整分頁控制、編輯/更多操作入口
- AntD 棄用屬性清理（Tabs.items、Card.styles.body 等）
- 文件補充：Projects/Tasks 權限矩陣與前端顯示對照表

## 風險與緩解
- 權限欄位命名不一致 → 已做前端正規化處理並以後端判定為準
- Token 遺失導致 401 → 統一以 `getAuthHeaders()` 產生請求頭

## 驗收建議
- 以 system_admin 帳號登入：
  - 能看到專案與任務的刪除操作並成功執行
- 以一般使用者登入：
  - 看不到刪除操作；若強行呼叫 API，後端返回 403/401 按預期
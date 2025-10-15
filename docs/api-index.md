### API 索引（Swagger /api/v1）

以下為後端目前透過 Swagger 暴露的主要端點，依功能群組整理。基底路徑：`/api/v1`。

#### 系統（System） `/system`
- `GET /system/health`：健康檢查（含 DB）
- `GET /system/database/status`：資料庫狀態
- `GET /system/models/validate`：模型/資料表驗證
- `GET /system/info`：系統資源資訊
- `GET /system/ping`：Ping 測試
- `GET /system/generate-sample-npy`：產生測試 NPY
- `GET /system/download-sample/{filename}`：下載測試檔

#### 認證（Authentication） `/auth`
- `POST /auth/register`：註冊
- `POST /auth/login`：登入（回傳 JWT）
- `POST /auth/refresh`：刷新 Token
- `GET /auth/me`：目前使用者資訊
- `POST /auth/logout`：登出（前端清除 token）
- `POST /auth/change-password`：修改密碼
- `POST /auth/verify-token`：驗證 Token
- `DELETE /auth/deactivate`：停用帳號

#### 專案（Projects） `/projects`
- `POST /projects`：建立專案（建立者為 project_admin）
- `GET /projects`：分頁查詢使用者參與之專案
- `GET /projects/{project_id}`：專案詳情
- `PUT /projects/{project_id}`：更新專案
- `DELETE /projects/{project_id}`：刪除/封存（軟刪）
- `GET /projects/{project_id}/members`：成員列表（分頁）
- `POST /projects/{project_id}/members`：新增成員（指定角色）
- `PUT /projects/{project_id}/members/{member_id}`：更新成員（角色/啟用）
- `DELETE /projects/{project_id}/members/{member_id}`：移除成員（軟刪）
- `GET /projects/admin/all`：系統/全域管理員列出所有專案
- `POST /projects/{project_id}/members/assign-admin?user_id=...`：系統/全域管理員指派使用者為該專案之 `project_admin`

#### 任務（Tasks）
- `POST /projects/{project_id}/tasks`：建立任務
- `GET /projects/{project_id}/tasks`：分頁查詢（狀態/優先級/指派人/建立者/名稱/逾期）
- `GET /projects/{project_id}/tasks/stats`：任務統計
- `GET /projects/{project_id}/tasks/{task_id}`：任務詳情
- `PUT /projects/{project_id}/tasks/{task_id}`：更新任務
- `DELETE /projects/{project_id}/tasks/{task_id}`：刪除/取消（軟刪）
- `POST /projects/{project_id}/tasks/{task_id}/assign`：指派任務
- `POST /projects/{project_id}/tasks/{task_id}/unassign`：解除指派
- `POST /projects/{project_id}/tasks/auto-assign`：自動指派下一個可用任務
- `POST /projects/{project_id}/tasks/{task_id}/status`：更新任務狀態
- `GET /users/me/tasks`：目前使用者的任務（可依專案/狀態分頁）

#### 標注（Annotations）
（此路由模組以 `annotations` 為前綴，實際路徑為 `/api/v1/annotations/projects/...`）
- `POST /annotations/projects/{project_id}/annotations`：建立標注
- `GET /annotations/projects/{project_id}/annotations/{annotation_id}`：標注詳情
- `PUT /annotations/projects/{project_id}/annotations/{annotation_id}`：更新（草稿/需修改）
- `DELETE /annotations/projects/{project_id}/annotations/{annotation_id}`：刪除（草稿）
- `POST /annotations/projects/{project_id}/annotations/{annotation_id}/submit`：提交審核
- `GET /annotations/projects/{project_id}/annotations`：分頁查詢（狀態/任務/人員，權限控管）
- `GET /annotations/projects/{project_id}/tasks/{task_id}/annotations`：任務下所有標注
- `GET /annotations/projects/{project_id}/annotations/stats`：標注統計（可選 annotator）
- `GET /annotations/`：當前使用者可見標注（選擇性過濾）

#### 審核（Reviews） `/reviews`
- `POST /reviews/projects/{project_id}/annotations/{annotation_id}/reviews`：建立審核
- `GET /reviews/projects/{project_id}/annotations/{annotation_id}/reviews`：標注的審核列表
- `GET /reviews/projects/{project_id}/reviews/pending`：專案待審列表
- `PUT /reviews/projects/{project_id}/reviews/{review_id}`：更新審核
- `POST /reviews/projects/{project_id}/reviews/bulk`：批次審核
- `GET /reviews/stats`：目前使用者的審核統計

#### 通知（Notifications） `/notifications`
- `POST /notifications/`：建立通知（自己）
- `GET /notifications/`：通知列表（自己，支援 unread/type/分頁）
- `GET /notifications/stats`：通知統計
- `GET /notifications/unread-count`：未讀數
- `GET /notifications/{notification_id}`：通知詳情
- `PUT /notifications/{notification_id}`：更新（已讀狀態）
- `PUT /notifications/{notification_id}/read`：設為已讀
- `PUT /notifications/read-all`：全部設為已讀
- `DELETE /notifications/{notification_id}`：刪除

#### 車種（Vehicle Types）
- `GET /projects/{project_id}/vehicle-types`：專案內可用車種清單

#### 點雲檔案（Point Cloud Files）
- `POST /projects/{project_id}/files/upload`：上傳（.npy/.npz/.ply/.pcd）
- `GET /projects/{project_id}/files`：檔案列表（分頁/狀態）
- `GET /projects/{project_id}/files/{file_id}`：檔案詳情
- `GET /projects/{project_id}/files/{file_id}/download`：取得暫時下載 URL
- `DELETE /projects/{project_id}/files/{file_id}`：刪除（軟刪 + 移除存儲）
- `GET /projects/{project_id}/files/stats`：檔案統計
- `POST /projects/{project_id}/files/{file_id}/reprocess`：重新處理（TODO 背景化）

#### 本地檔案（Files，開發/測試用途）
- `GET /files`：列出 `uploads/` 內 .npy/.npz
- `GET /files/{file_id}/download`：直接下載本地檔（開發用途；前端預覽需攜帶認證標頭）
- `POST /files/upload`：上傳至本地 `uploads/`



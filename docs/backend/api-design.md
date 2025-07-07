# API 設計文檔

## 概述

本文檔描述了ETC點雲標注系統的REST API設計，採用RESTful架構風格，支援多專案操作和完整的權限控制。

## API 設計原則

### 1. RESTful 設計
- 使用HTTP動詞（GET, POST, PUT, DELETE）表示操作
- 使用資源路徑表示實體
- 無狀態設計，每個請求包含完整的信息

### 2. 統一響應格式
```json
{
  "success": true,
  "message": "操作成功",
  "data": {...},
  "timestamp": "2024-12-19T10:30:00Z"
}
```

### 3. 錯誤響應格式
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "請求數據驗證失敗",
  "details": ["欄位名稱不能為空"],
  "timestamp": "2024-12-19T10:30:00Z"
}
```

## 認證與授權

### 1. JWT Token 認證
```http
Authorization: Bearer <jwt_token>
```

### 2. 權限級別
- **全局權限**：super_admin, system_admin, user
- **專案權限**：project_admin, annotator, reviewer, quality_controller, viewer

## API 端點設計

### 1. 認證相關 API

#### 用戶登入
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "張三",
      "global_role": "user"
    }
  }
}
```

#### 用戶登出
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

#### 刷新Token
```http
POST /api/v1/auth/refresh
Authorization: Bearer <token>
```

#### 獲取當前用戶信息
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### 2. 專案管理 API

#### 獲取用戶專案列表
```http
GET /api/v1/projects
Authorization: Bearer <token>
```

**響應：**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "車輛識別專案A",
      "description": "專案描述",
      "status": "active",
      "role": "annotator",
      "created_at": "2024-01-01T00:00:00Z",
      "member_count": 15,
      "task_count": 120
    }
  ]
}
```

#### 創建專案
```http
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "新專案名稱",
  "description": "專案描述",
  "settings": {
    "max_concurrent_tasks": 5,
    "auto_assignment": true
  }
}
```

#### 獲取專案詳情
```http
GET /api/v1/projects/{project_id}
Authorization: Bearer <token>
```

#### 更新專案
```http
PUT /api/v1/projects/{project_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "更新的專案名稱",
  "description": "更新的專案描述"
}
```

#### 專案成員管理
```http
# 獲取專案成員
GET /api/v1/projects/{project_id}/members

# 添加專案成員
POST /api/v1/projects/{project_id}/members
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "role": "annotator"
}

# 更新成員角色
PUT /api/v1/projects/{project_id}/members/{user_id}
{
  "role": "reviewer"
}

# 移除專案成員
DELETE /api/v1/projects/{project_id}/members/{user_id}
```

### 3. 任務管理 API

#### 獲取任務列表
```http
GET /api/v1/projects/{project_id}/tasks
Authorization: Bearer <token>

Query Parameters:
- status: pending|assigned|in_progress|completed|rejected
- assigned_to: user_id
- priority: low|medium|high|urgent
- page: 1
- size: 20
```

**響應：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "點雲標注任務001",
        "description": "標注車輛類型",
        "status": "assigned",
        "priority": "medium",
        "assigned_to": {
          "id": "user_id",
          "full_name": "張三"
        },
        "created_at": "2024-01-01T00:00:00Z",
        "due_date": "2024-01-15T00:00:00Z",
        "pointcloud_info": {
          "file_size": 10485760,
          "point_count": 50000
        }
      }
    ],
    "total": 150,
    "page": 1,
    "size": 20,
    "pages": 8
  }
}
```

#### 創建任務
```http
POST /api/v1/projects/{project_id}/tasks
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- name: 任務名稱
- description: 任務描述
- priority: medium
- due_date: 2024-01-15T00:00:00Z
- pointcloud_file: (file upload)
```

#### 獲取任務詳情
```http
GET /api/v1/projects/{project_id}/tasks/{task_id}
Authorization: Bearer <token>
```

#### 分配任務
```http
POST /api/v1/projects/{project_id}/tasks/{task_id}/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "assigned_to": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 更新任務狀態
```http
PATCH /api/v1/projects/{project_id}/tasks/{task_id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress"
}
```

#### 自動領取任務
```http
POST /api/v1/projects/{project_id}/tasks/claim
Authorization: Bearer <token>
```

### 4. 標注管理 API

#### 獲取任務的標注列表
```http
GET /api/v1/projects/{project_id}/tasks/{task_id}/annotations
Authorization: Bearer <token>
```

#### 創建標注
```http
POST /api/v1/projects/{project_id}/tasks/{task_id}/annotations
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicle_type_id": "550e8400-e29b-41d4-a716-446655440000",
  "confidence": 0.95,
  "notes": "標注備註",
  "annotation_data": {
    "selected_points": [1, 2, 3, 4, 5],
    "bounding_box": {
      "min": [0, 0, 0],
      "max": [10, 10, 10]
    }
  }
}
```

#### 獲取標注詳情
```http
GET /api/v1/projects/{project_id}/annotations/{annotation_id}
Authorization: Bearer <token>
```

#### 更新標注
```http
PUT /api/v1/projects/{project_id}/annotations/{annotation_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicle_type_id": "550e8400-e29b-41d4-a716-446655440000",
  "confidence": 0.98,
  "notes": "更新的標注備註"
}
```

#### 提交標注進行審核
```http
POST /api/v1/projects/{project_id}/annotations/{annotation_id}/submit
Authorization: Bearer <token>
```

### 5. 審核管理 API

#### 獲取待審核標注列表
```http
GET /api/v1/projects/{project_id}/reviews/pending
Authorization: Bearer <token>

Query Parameters:
- annotator_id: user_id
- vehicle_type_id: type_id
- page: 1
- size: 20
```

#### 審核標注
```http
POST /api/v1/projects/{project_id}/annotations/{annotation_id}/review
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "feedback": "標注準確，品質良好"
}
```

#### 批量審核
```http
POST /api/v1/projects/{project_id}/reviews/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "annotation_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "status": "approved",
  "feedback": "批量審核通過"
}
```

### 6. 車種分類管理 API

#### 獲取全局車種分類
```http
GET /api/v1/vehicle-types/global
Authorization: Bearer <token>
```

#### 獲取專案車種分類
```http
GET /api/v1/projects/{project_id}/vehicle-types
Authorization: Bearer <token>
```

#### 從全局分類導入到專案
```http
POST /api/v1/projects/{project_id}/vehicle-types/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "global_type_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ]
}
```

#### 創建專案特定車種分類
```http
POST /api/v1/projects/{project_id}/vehicle-types
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "特殊車輛類型",
  "description": "專案特定的車輛類型",
  "category": "special",
  "attributes": {
    "color": "red",
    "size": "large"
  }
}
```

### 7. 文件管理 API

#### 上傳點雲文件
```http
POST /api/v1/projects/{project_id}/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- file: (點雲文件 .npy/.npz)
- description: 文件描述
```

**響應：**
```json
{
  "success": true,
  "data": {
    "file_id": "550e8400-e29b-41d4-a716-446655440000",
    "original_filename": "pointcloud_001.npy",
    "file_size": 10485760,
    "upload_url": "https://storage.example.com/...",
    "preview_data": {
      "point_count": 50000,
      "bounds": {
        "min": [-50, -50, 0],
        "max": [50, 50, 20]
      }
    }
  }
}
```

#### 獲取文件信息
```http
GET /api/v1/projects/{project_id}/files/{file_id}
Authorization: Bearer <token>
```

#### 下載點雲文件
```http
GET /api/v1/projects/{project_id}/files/{file_id}/download
Authorization: Bearer <token>
```

#### 獲取點雲預覽數據
```http
GET /api/v1/projects/{project_id}/files/{file_id}/preview
Authorization: Bearer <token>

Query Parameters:
- sample_rate: 0.1 (取樣率，0.1表示取10%的點)
```

### 8. 統計報表 API

#### 獲取專案統計
```http
GET /api/v1/projects/{project_id}/statistics
Authorization: Bearer <token>

Query Parameters:
- start_date: 2024-01-01
- end_date: 2024-01-31
- group_by: day|week|month
```

**響應：**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_tasks": 150,
      "completed_tasks": 120,
      "completion_rate": 0.8,
      "total_annotations": 200,
      "approved_annotations": 180,
      "approval_rate": 0.9
    },
    "timeline": [
      {
        "date": "2024-01-01",
        "tasks_created": 5,
        "tasks_completed": 3,
        "annotations_created": 8,
        "annotations_approved": 6
      }
    ],
    "by_user": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_name": "張三",
        "tasks_completed": 15,
        "annotations_created": 25,
        "avg_confidence": 0.92
      }
    ],
    "by_vehicle_type": [
      {
        "vehicle_type_id": "550e8400-e29b-41d4-a716-446655440000",
        "vehicle_type_name": "轎車",
        "annotation_count": 80,
        "avg_confidence": 0.95
      }
    ]
  }
}
```

#### 獲取用戶統計
```http
GET /api/v1/projects/{project_id}/statistics/users/{user_id}
Authorization: Bearer <token>
```

#### 獲取跨專案統計
```http
GET /api/v1/statistics/cross-project
Authorization: Bearer <token>

Query Parameters:
- project_ids: comma-separated list of project IDs
- start_date: 2024-01-01
- end_date: 2024-01-31
```

### 9. 通知管理 API

#### 獲取用戶通知
```http
GET /api/v1/notifications
Authorization: Bearer <token>

Query Parameters:
- is_read: true|false
- type: task_assigned|review_completed|system_announcement
- page: 1
- size: 20
```

#### 標記通知為已讀
```http
PATCH /api/v1/notifications/{notification_id}/read
Authorization: Bearer <token>
```

#### 批量標記通知為已讀
```http
PATCH /api/v1/notifications/mark-all-read
Authorization: Bearer <token>
```

### 10. 系統管理 API

#### 獲取系統統計（管理員）
```http
GET /api/v1/admin/statistics
Authorization: Bearer <token>
```

#### 用戶管理（管理員）
```http
# 獲取用戶列表
GET /api/v1/admin/users

# 創建用戶
POST /api/v1/admin/users
{
  "email": "newuser@example.com",
  "full_name": "新用戶",
  "global_role": "user"
}

# 更新用戶
PUT /api/v1/admin/users/{user_id}
{
  "full_name": "更新的姓名",
  "global_role": "system_admin",
  "is_active": true
}

# 重置用戶密碼
POST /api/v1/admin/users/{user_id}/reset-password
```

#### 系統設置管理
```http
# 獲取系統設置
GET /api/v1/admin/settings

# 更新系統設置
PUT /api/v1/admin/settings
{
  "max_file_size": 52428800,
  "allowed_file_types": ["npy", "npz"],
  "default_task_priority": "medium"
}
```

## 分頁和排序

### 分頁參數
```http
GET /api/v1/resource?page=1&size=20
```

### 排序參數
```http
GET /api/v1/resource?sort=created_at&order=desc
```

### 響應格式
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "page": 1,
    "size": 20,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## 過濾和搜索

### 過濾參數
```http
GET /api/v1/tasks?status=pending&priority=high&assigned_to=user_id
```

### 搜索參數
```http
GET /api/v1/tasks?search=關鍵字&search_fields=name,description
```

### 日期範圍過濾
```http
GET /api/v1/tasks?created_after=2024-01-01&created_before=2024-01-31
```

## WebSocket API

### 1. 實時通知
```javascript
// 連接WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/notifications?token=<jwt_token>');

// 接收通知
ws.onmessage = function(event) {
    const notification = JSON.parse(event.data);
    console.log('收到通知:', notification);
};
```

### 2. 任務狀態更新
```javascript
// 訂閱專案任務狀態
const ws = new WebSocket('ws://localhost:8000/ws/projects/{project_id}/tasks?token=<jwt_token>');

// 接收任務狀態更新
ws.onmessage = function(event) {
    const update = JSON.parse(event.data);
    // update.type: 'task_created', 'task_assigned', 'task_completed'
    // update.data: 任務數據
};
```

## 錯誤代碼

### HTTP 狀態碼
- **200** - 成功
- **201** - 創建成功
- **400** - 請求錯誤
- **401** - 未認證
- **403** - 權限不足
- **404** - 資源不存在
- **422** - 數據驗證錯誤
- **500** - 服務器錯誤

### 業務錯誤代碼
```json
{
  "success": false,
  "error": "BUSINESS_ERROR_CODE",
  "message": "錯誤描述",
  "details": ["詳細錯誤信息"]
}
```

常見錯誤代碼：
- **AUTH_001** - 無效的認證令牌
- **AUTH_002** - 令牌已過期
- **PERM_001** - 權限不足
- **PROJ_001** - 專案不存在
- **TASK_001** - 任務已被分配
- **FILE_001** - 不支援的文件格式
- **FILE_002** - 文件大小超出限制

## API 版本控制

### URL 版本控制
```http
GET /api/v1/projects
GET /api/v2/projects  # 新版本
```

### Header 版本控制
```http
GET /api/projects
API-Version: v1
```

## 安全考量

### 1. 請求限流
```http
# 每分鐘最多100次請求
Rate-Limit: 100/minute

# 響應頭
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### 2. CORS 設置
```http
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 3. 輸入驗證
- 所有輸入數據都進行嚴格驗證
- 防止SQL注入和XSS攻擊
- 文件上傳安全檢查

## 總結

本API設計提供了：

1. **完整的RESTful API**：涵蓋所有業務功能
2. **多專案支援**：專案級別的資源管理
3. **統一的響應格式**：一致的API體驗
4. **完善的權限控制**：細粒度的訪問控制
5. **實時通信**：WebSocket支援
6. **安全性**：認證、授權、限流等安全措施

這個API設計支援前端應用的所有功能需求，同時保證了安全性和可擴展性。 
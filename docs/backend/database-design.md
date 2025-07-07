# 數據庫設計文檔

## 概述

本文檔描述了ETC點雲標注系統的數據庫設計，採用PostgreSQL作為主數據庫，支援多專案架構的邏輯隔離策略。

## 設計原則

### 1. 多專案邏輯隔離
- 所有核心業務表都包含 `project_id` 欄位
- 通過應用層邏輯確保專案間資料隔離
- 支援跨專案統計查詢

### 2. 資料完整性
- 使用外鍵約束確保資料一致性
- 軟刪除機制保留資料歷史
- 時間戳記錄所有資料變更

### 3. 性能優化
- 合理的索引策略
- 分頁查詢支援
- 查詢優化考量

## 核心資料模型

### 1. 用戶管理模型

#### users - 用戶表
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    global_role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_global_role_check CHECK (global_role IN ('super_admin', 'system_admin', 'user'))
);

-- 索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_global_role ON users(global_role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### user_sessions - 用戶會話表
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT user_sessions_expires_check CHECK (expires_at > created_at)
);

-- 索引
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

### 2. 專案管理模型

#### projects - 專案表
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    
    CONSTRAINT projects_status_check CHECK (status IN ('active', 'completed', 'archived', 'suspended')),
    CONSTRAINT projects_name_length CHECK (length(name) >= 2 AND length(name) <= 255)
);

-- 索引
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

#### project_members - 專案成員表
```sql
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    
    CONSTRAINT project_members_role_check CHECK (role IN ('project_admin', 'annotator', 'reviewer', 'quality_controller', 'viewer')),
    CONSTRAINT project_members_unique_active UNIQUE (project_id, user_id)
);

-- 索引
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);
CREATE INDEX idx_project_members_active ON project_members(is_active);
CREATE INDEX idx_project_members_joined_at ON project_members(joined_at);
```

### 3. 車種分類模型

#### global_vehicle_types - 全局車種分類表
```sql
CREATE TABLE global_vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    attributes JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT global_vehicle_types_name_unique UNIQUE (name),
    CONSTRAINT global_vehicle_types_name_length CHECK (length(name) >= 2 AND length(name) <= 255)
);

-- 索引
CREATE INDEX idx_global_vehicle_types_name ON global_vehicle_types(name);
CREATE INDEX idx_global_vehicle_types_category ON global_vehicle_types(category);
CREATE INDEX idx_global_vehicle_types_active ON global_vehicle_types(is_active);
CREATE INDEX idx_global_vehicle_types_created_by ON global_vehicle_types(created_by);
```

#### project_vehicle_types - 專案車種分類表
```sql
CREATE TABLE project_vehicle_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    attributes JSONB DEFAULT '{}',
    source_global_id UUID REFERENCES global_vehicle_types(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT project_vehicle_types_name_unique UNIQUE (project_id, name),
    CONSTRAINT project_vehicle_types_name_length CHECK (length(name) >= 2 AND length(name) <= 255)
);

-- 索引
CREATE INDEX idx_project_vehicle_types_project_id ON project_vehicle_types(project_id);
CREATE INDEX idx_project_vehicle_types_name ON project_vehicle_types(name);
CREATE INDEX idx_project_vehicle_types_category ON project_vehicle_types(category);
CREATE INDEX idx_project_vehicle_types_source_global_id ON project_vehicle_types(source_global_id);
CREATE INDEX idx_project_vehicle_types_active ON project_vehicle_types(is_active);
```

### 4. 任務管理模型

#### tasks - 任務表
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    pointcloud_file_path VARCHAR(500),
    pointcloud_file_size BIGINT,
    pointcloud_metadata JSONB DEFAULT '{}',
    assigned_to UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    
    CONSTRAINT tasks_status_check CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'rejected', 'cancelled')),
    CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT tasks_name_length CHECK (length(name) >= 2 AND length(name) <= 255),
    CONSTRAINT tasks_file_size_check CHECK (pointcloud_file_size >= 0)
);

-- 索引
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);
```

#### task_assignments - 任務分配歷史表
```sql
CREATE TABLE task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES users(id),
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP,
    reason TEXT,
    
    CONSTRAINT task_assignments_dates_check CHECK (unassigned_at IS NULL OR unassigned_at > assigned_at)
);

-- 索引
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_task_assignments_assigned_by ON task_assignments(assigned_by);
CREATE INDEX idx_task_assignments_assigned_at ON task_assignments(assigned_at);
```

### 5. 標注模型

#### annotations - 標注表
```sql
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    annotator_id UUID NOT NULL REFERENCES users(id),
    vehicle_type_id UUID NOT NULL REFERENCES project_vehicle_types(id),
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    notes TEXT,
    annotation_data JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    
    CONSTRAINT annotations_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'pending_review')),
    CONSTRAINT annotations_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

-- 索引
CREATE INDEX idx_annotations_project_id ON annotations(project_id);
CREATE INDEX idx_annotations_task_id ON annotations(task_id);
CREATE INDEX idx_annotations_annotator_id ON annotations(annotator_id);
CREATE INDEX idx_annotations_vehicle_type_id ON annotations(vehicle_type_id);
CREATE INDEX idx_annotations_status ON annotations(status);
CREATE INDEX idx_annotations_created_at ON annotations(created_at);
CREATE INDEX idx_annotations_submitted_at ON annotations(submitted_at);
```

#### annotation_reviews - 標注審核表
```sql
CREATE TABLE annotation_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    feedback TEXT,
    review_data JSONB DEFAULT '{}',
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT annotation_reviews_status_check CHECK (status IN ('approved', 'rejected', 'needs_revision')),
    CONSTRAINT annotation_reviews_unique_review UNIQUE (annotation_id, reviewer_id)
);

-- 索引
CREATE INDEX idx_annotation_reviews_annotation_id ON annotation_reviews(annotation_id);
CREATE INDEX idx_annotation_reviews_reviewer_id ON annotation_reviews(reviewer_id);
CREATE INDEX idx_annotation_reviews_status ON annotation_reviews(status);
CREATE INDEX idx_annotation_reviews_reviewed_at ON annotation_reviews(reviewed_at);
```

### 6. 文件管理模型

#### file_uploads - 文件上傳記錄表
```sql
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100),
    checksum VARCHAR(64),
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'uploaded',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    
    CONSTRAINT file_uploads_status_check CHECK (status IN ('uploaded', 'processing', 'processed', 'error', 'deleted')),
    CONSTRAINT file_uploads_file_size_check CHECK (file_size > 0),
    CONSTRAINT file_uploads_file_type_check CHECK (file_type IN ('npy', 'npz', 'other'))
);

-- 索引
CREATE INDEX idx_file_uploads_project_id ON file_uploads(project_id);
CREATE INDEX idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
CREATE INDEX idx_file_uploads_status ON file_uploads(status);
CREATE INDEX idx_file_uploads_file_type ON file_uploads(file_type);
CREATE INDEX idx_file_uploads_uploaded_at ON file_uploads(uploaded_at);
CREATE INDEX idx_file_uploads_checksum ON file_uploads(checksum);
```

### 7. 通知系統模型

#### notifications - 通知表
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    
    CONSTRAINT notifications_type_check CHECK (type IN ('task_assigned', 'task_completed', 'review_completed', 'system_announcement', 'project_update')),
    CONSTRAINT notifications_title_length CHECK (length(title) >= 1 AND length(title) <= 255)
);

-- 索引
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_project_id ON notifications(project_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

### 8. 審計日誌模型

#### audit_logs - 審計日誌表
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT audit_logs_action_check CHECK (action IN ('create', 'update', 'delete', 'login', 'logout'))
);

-- 索引
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 9. 系統配置模型

#### system_settings - 系統設置表
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT system_settings_key_length CHECK (length(key) >= 1 AND length(key) <= 255)
);

-- 索引
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);
```

## 數據庫視圖

### 1. 用戶專案視圖
```sql
CREATE VIEW user_projects_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    pm.role as project_role,
    pm.joined_at,
    pm.is_active as membership_active
FROM users u
JOIN project_members pm ON u.id = pm.user_id
JOIN projects p ON pm.project_id = p.id
WHERE u.is_active = TRUE AND pm.is_active = TRUE;
```

### 2. 任務統計視圖
```sql
CREATE VIEW task_statistics_view AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.assigned_to IS NOT NULL THEN 1 END) as assigned_tasks,
    AVG(CASE WHEN t.completed_at IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600 
    END) as avg_completion_hours
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name;
```

### 3. 標注統計視圖
```sql
CREATE VIEW annotation_statistics_view AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    u.id as user_id,
    u.full_name as annotator_name,
    COUNT(a.id) as total_annotations,
    COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_annotations,
    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_annotations,
    COUNT(CASE WHEN a.status = 'pending_review' THEN 1 END) as pending_review_annotations,
    AVG(a.confidence) as avg_confidence,
    MIN(a.created_at) as first_annotation_date,
    MAX(a.created_at) as last_annotation_date
FROM projects p
JOIN annotations a ON p.id = a.project_id
JOIN users u ON a.annotator_id = u.id
GROUP BY p.id, p.name, u.id, u.full_name;
```

## 函數和觸發器

### 1. 更新時間戳觸發器
```sql
-- 創建更新時間戳函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 為需要的表添加觸發器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_members_updated_at 
    BEFORE UPDATE ON project_members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annotations_updated_at 
    BEFORE UPDATE ON annotations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. 審計日誌觸發器
```sql
-- 創建審計日誌函數
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values)
        VALUES (TG_TABLE_NAME, OLD.id, 'delete', row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'update', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values)
        VALUES (TG_TABLE_NAME, NEW.id, 'create', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 為重要表添加審計觸發器
CREATE TRIGGER audit_projects_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_tasks_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_annotations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON annotations
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 3. 專案成員權限檢查函數
```sql
-- 檢查用戶是否有專案訪問權限
CREATE OR REPLACE FUNCTION check_project_access(
    p_user_id UUID,
    p_project_id UUID,
    p_required_role VARCHAR DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role VARCHAR;
    user_global_role VARCHAR;
BEGIN
    -- 檢查全局管理員權限
    SELECT global_role INTO user_global_role
    FROM users 
    WHERE id = p_user_id AND is_active = TRUE;
    
    IF user_global_role IN ('super_admin', 'system_admin') THEN
        RETURN TRUE;
    END IF;
    
    -- 檢查專案成員權限
    SELECT role INTO user_role
    FROM project_members
    WHERE user_id = p_user_id 
    AND project_id = p_project_id 
    AND is_active = TRUE;
    
    IF user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 權限層級檢查
    CASE p_required_role
        WHEN 'viewer' THEN
            RETURN user_role IN ('viewer', 'annotator', 'reviewer', 'quality_controller', 'project_admin');
        WHEN 'annotator' THEN
            RETURN user_role IN ('annotator', 'reviewer', 'quality_controller', 'project_admin');
        WHEN 'reviewer' THEN
            RETURN user_role IN ('reviewer', 'quality_controller', 'project_admin');
        WHEN 'quality_controller' THEN
            RETURN user_role IN ('quality_controller', 'project_admin');
        WHEN 'project_admin' THEN
            RETURN user_role = 'project_admin';
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;
```

## 索引優化策略

### 1. 複合索引
```sql
-- 專案任務複合索引
CREATE INDEX idx_tasks_project_status_assigned ON tasks(project_id, status, assigned_to);

-- 標注查詢複合索引
CREATE INDEX idx_annotations_project_task_status ON annotations(project_id, task_id, status);

-- 專案成員複合索引
CREATE INDEX idx_project_members_project_active_role ON project_members(project_id, is_active, role);

-- 通知查詢複合索引
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);
```

### 2. 部分索引
```sql
-- 只為活躍用戶建立索引
CREATE INDEX idx_users_active_email ON users(email) WHERE is_active = TRUE;

-- 只為待處理任務建立索引
CREATE INDEX idx_tasks_pending_due_date ON tasks(due_date) WHERE status = 'pending';

-- 只為未讀通知建立索引
CREATE INDEX idx_notifications_unread_created ON notifications(user_id, created_at) WHERE is_read = FALSE;
```

### 3. 表達式索引
```sql
-- 用戶email的小寫索引
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- 任務名稱的文本搜索索引
CREATE INDEX idx_tasks_name_gin ON tasks USING gin(to_tsvector('english', name));

-- 標注數據的JSON索引
CREATE INDEX idx_annotations_data_gin ON annotations USING gin(annotation_data);
```

## 數據庫遷移策略

### 1. 版本控制
```sql
-- 創建遷移版本表
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 遷移腳本結構
```sql
-- 遷移腳本模板
-- Migration: 001_create_initial_schema.sql
-- Description: 創建初始數據庫結構

BEGIN;

-- 創建表結構
-- ... 表創建語句 ...

-- 創建索引
-- ... 索引創建語句 ...

-- 創建函數和觸發器
-- ... 函數和觸發器創建語句 ...

-- 插入初始數據
-- ... 初始數據插入語句 ...

-- 記錄遷移版本
INSERT INTO schema_migrations (version) VALUES ('001_create_initial_schema');

COMMIT;
```

### 3. 多專案架構遷移
```sql
-- Migration: 002_add_multi_project_support.sql
-- Description: 添加多專案支援

BEGIN;

-- 創建專案相關表
CREATE TABLE projects (...);
CREATE TABLE project_members (...);

-- 為現有表添加專案ID
ALTER TABLE tasks ADD COLUMN project_id UUID;
ALTER TABLE annotations ADD COLUMN project_id UUID;

-- 創建預設專案
INSERT INTO projects (id, name, description, created_by) 
VALUES (gen_random_uuid(), 'Default Project', 'Initial project for existing data', 
        (SELECT id FROM users WHERE global_role = 'super_admin' LIMIT 1));

-- 將現有數據遷移到預設專案
UPDATE tasks SET project_id = (SELECT id FROM projects WHERE name = 'Default Project');
UPDATE annotations SET project_id = (SELECT id FROM projects WHERE name = 'Default Project');

-- 添加NOT NULL約束
ALTER TABLE tasks ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE annotations ALTER COLUMN project_id SET NOT NULL;

-- 添加外鍵約束
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project_id FOREIGN KEY (project_id) REFERENCES projects(id);
ALTER TABLE annotations ADD CONSTRAINT fk_annotations_project_id FOREIGN KEY (project_id) REFERENCES projects(id);

-- 記錄遷移版本
INSERT INTO schema_migrations (version) VALUES ('002_add_multi_project_support');

COMMIT;
```

## 性能監控

### 1. 慢查詢監控
```sql
-- 啟用慢查詢日誌
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1秒以上的查詢
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

### 2. 索引使用情況監控
```sql
-- 檢查索引使用情況
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename IN ('users', 'projects', 'tasks', 'annotations')
ORDER BY tablename, attname;

-- 檢查未使用的索引
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_tup_read = 0
ORDER BY tablename, indexname;
```

### 3. 表統計信息
```sql
-- 獲取表大小統計
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 備份和恢復策略

### 1. 定期備份
```bash
#!/bin/bash
# 數據庫備份腳本

DB_NAME="etc_pointcloud"
BACKUP_DIR="/backup/postgres"
DATE=$(date +"%Y%m%d_%H%M%S")

# 全量備份
pg_dump -h localhost -U postgres -d $DB_NAME > $BACKUP_DIR/full_backup_$DATE.sql

# 壓縮備份
gzip $BACKUP_DIR/full_backup_$DATE.sql

# 保留最近7天的備份
find $BACKUP_DIR -name "full_backup_*.sql.gz" -mtime +7 -delete
```

### 2. 增量備份
```bash
#!/bin/bash
# WAL歸檔備份

# 配置WAL歸檔
echo "wal_level = replica" >> /etc/postgresql/14/main/postgresql.conf
echo "archive_mode = on" >> /etc/postgresql/14/main/postgresql.conf
echo "archive_command = 'cp %p /backup/wal_archive/%f'" >> /etc/postgresql/14/main/postgresql.conf
```

### 3. 恢復程序
```bash
#!/bin/bash
# 數據庫恢復腳本

BACKUP_FILE=$1
DB_NAME="etc_pointcloud"

# 停止應用服務
systemctl stop gunicorn
systemctl stop celery

# 恢復數據庫
dropdb $DB_NAME
createdb $DB_NAME
gunzip -c $BACKUP_FILE | psql -h localhost -U postgres -d $DB_NAME

# 重啟服務
systemctl start gunicorn
systemctl start celery
```

## 數據安全和隱私

### 1. 敏感數據加密
```sql
-- 安裝pgcrypto擴展
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 密碼哈希存儲
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql;

-- 驗證密碼
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql;
```

### 2. 行級安全性
```sql
-- 啟用行級安全性
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- 創建安全策略
CREATE POLICY annotation_access_policy ON annotations
    FOR ALL TO application_user
    USING (
        project_id IN (
            SELECT project_id 
            FROM project_members 
            WHERE user_id = current_setting('app.current_user_id')::UUID
            AND is_active = TRUE
        )
    );
```

### 3. 數據脫敏
```sql
-- 創建脫敏視圖
CREATE VIEW users_public_view AS
SELECT 
    id,
    CASE 
        WHEN length(email) > 0 THEN 
            substring(email from 1 for 2) || '***@' || 
            substring(email from position('@' in email) + 1)
        ELSE email 
    END as email,
    initcap(substring(full_name from 1 for 1)) || '***' as full_name,
    global_role,
    is_active,
    created_at
FROM users;
```

## 總結

本數據庫設計文檔涵蓋了ETC點雲標注系統的完整數據結構，包括：

1. **完整的多專案支援**：通過邏輯隔離實現專案間的資料分離
2. **豐富的索引策略**：確保查詢性能
3. **完善的觸發器機制**：自動化資料維護
4. **安全性考量**：加密、行級安全性、審計日誌
5. **性能監控**：慢查詢監控、索引使用情況分析
6. **備份恢復**：完整的備份和恢復策略

這個設計支援大規模的多專案並行運作，同時確保數據的完整性、安全性和高性能。 
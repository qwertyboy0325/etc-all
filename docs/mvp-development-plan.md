# MVP 開發計劃

## 概述

基於8週開發時程的MVP（最小可行產品）開發計劃，單人開發+AI協助的超高效模式，優先核心功能，確保快速交付和業務驗證。

## 開發原則

### 1. MVP核心理念
- **先求有，再求好**：確保核心功能運作
- **快速驗證**：儘早獲得用戶反饋
- **漸進改善**：後續迭代優化

### 2. 技術決策
- **保持簡單**：避免過度設計
- **使用成熟技術**：減少風險
- **預留擴展性**：為未來改進留空間

## 開發階段規劃 🚀

```
階段一：基礎設施 (第1週)
├── 開發環境搭建
├── 基礎架構
└── 核心數據模型

階段二：認證+專案管理 (第2週)
├── 用戶註冊登入 + JWT認證
├── 專案CRUD + 成員管理
└── 基礎權限控制

階段三：核心功能 (第3-6週)
├── 文件上傳 (第3週)
├── 點雲渲染 (第4週)
├── 任務管理 (第5週)
└── 標注功能 (第6週)

階段四：審核+通知 (第7週)
├── 審核機制
├── 狀態管理
└── 通知系統

階段五：測試部署 (第8週)
├── 整合測試
├── 性能優化
└── 部署上線
```

### 💡 **單人+AI開發的效率優勢**

**🎯 決策速度快**
- 無需團隊會議討論
- 技術選型立即決定
- 需求變更即時調整

**⚡ 開發效率高**
- AI輔助代碼生成
- 實時問題解決
- 無code review等待時間

**🎨 專注度強**
- 完整的上下文掌控
- 沒有交接成本
- 技術棧統一

## 詳細開發順序

### 🏗️ **階段一：基礎設施搭建（第1週）**

#### 超高效啟動模式
**目標**：1週內建立完整開發基礎，AI輔助快速搭建

**🚀 Day 1-2: 項目初始化**
```bash
# AI輔助生成完整專案架構
fastapi-project-generator --name etc-annotation --db postgres --auth jwt
react-project-generator --name etc-frontend --ui antd --state redux
```

**⚡ Day 3-4: 核心數據模型**
```python
# AI生成的完整數據模型
class User(Base):
    id = Column(UUID, primary_key=True, default=uuid4)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    hashed_password = Column(String)
    global_role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    id = Column(UUID, primary_key=True, default=uuid4)
    name = Column(String, index=True)
    description = Column(Text)
    status = Column(String, default="active")
    created_by = Column(UUID, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # 關聯
    creator = relationship("User", backref="created_projects")
    members = relationship("ProjectMember", backref="project")
```

**🎯 Day 5-7: 整合測試**
```bash
# Docker一鍵啟動
docker-compose up -d

# 健康檢查
curl http://localhost:8000/health
curl http://localhost:3000
```

**單週交付成果**：
- [x] 前後端項目完全可運行
- [x] 數據庫連接 + 基礎模型
- [x] API健康檢查
- [x] 前端基礎路由和狀態管理
- [x] Docker開發環境

### 🔐 **階段二：認證 + 專案管理（第2週）**

**目標**：一週內完成用戶認證和多專案管理的核心功能

**🚀 Day 1-3: 認證系統**
```python
# AI生成完整認證服務
class AuthService:
    def __init__(self, db: Session):
        self.db = db
        
    def authenticate_user(self, email: str, password: str):
        user = self.db.query(User).filter(User.email == email).first()
        if user and verify_password(password, user.hashed_password):
            return user
        return None
        
    def create_access_token(self, user_id: str):
        return create_jwt_token({"sub": user_id})
    
    def register_user(self, email: str, password: str, full_name: str):
        # 快速註冊邏輯
        hashed_password = hash_password(password)
        user = User(email=email, hashed_password=hashed_password, full_name=full_name)
        self.db.add(user)
        self.db.commit()
        return user
```

**⚡ Day 4-5: 專案管理**
```python
# AI生成專案服務
class ProjectService:
    def create_project(self, name: str, description: str, creator_id: UUID):
        project = Project(name=name, description=description, created_by=creator_id)
        self.db.add(project)
        self.db.commit()
        
        # 自動添加創建者為專案管理員
        self.add_member(project.id, creator_id, "project_admin")
        return project
        
    def get_user_projects(self, user_id: UUID):
        return self.db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == user_id
        ).all()
```

**🎯 Day 6-7: 前端整合**
```typescript
// 前端認證 + 專案管理整合
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  
  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.access_token);
    
    // 登入後立即載入專案
    loadUserProjects();
  };
  
  const loadUserProjects = async () => {
    const response = await api.get('/projects');
    setProjects(response.data);
  };
};
```

**一週交付成果**：
- [x] 用戶註冊登入完成
- [x] JWT認證機制運作
- [x] 專案CRUD功能
- [x] 專案切換功能
- [x] 基礎權限控制
- [x] 前端認證狀態管理

### 🎯 **階段三：核心功能（第3-6週）**

#### Week 3: 文件上傳系統 📁 （已完成）
**目標**：實現點雲文件上傳和存儲，AI輔助快速開發

**後端任務**：
1. **文件上傳服務**
   ```python
   # services/file_upload.py
   class FileUploadService:
       def upload_pointcloud(self, file: UploadFile, project_id: UUID):
           # 文件驗證
           if not file.filename.endswith(('.npy', '.npz')):
               raise ValueError("不支援的文件格式")
               
           # 保存到MinIO或本地存儲
           file_path = self.save_file(file, project_id)
           
           # 記錄到數據庫
           file_record = FileUpload(
               project_id=project_id,
               original_filename=file.filename,
               file_path=file_path,
               file_size=file.size
           )
           return file_record
   ```

2. **異步處理**
   ```python
   # workers/pointcloud_processor.py
   @celery_app.task
   def process_pointcloud(file_path: str):
       # 載入點雲數據
       data = np.load(file_path)
       
       # 生成預覽信息
       preview = {
           'point_count': data.shape[0],
           'bounds': {
               'min': data.min(axis=0).tolist(),
               'max': data.max(axis=0).tolist()
           }
       }
       
       # 更新數據庫
       update_file_preview(file_path, preview)
   ```

**前端任務**：
1. **文件上傳組件**
   ```typescript
   // components/FileUpload.tsx
   const FileUpload: React.FC = () => {
     const [uploading, setUploading] = useState(false);
     
     const handleUpload = async (file: File) => {
       setUploading(true);
       try {
         await uploadPointcloud(file);
         message.success('上傳成功');
       } catch (error) {
         message.error('上傳失敗');
       } finally {
         setUploading(false);
       }
     };
   };
   ```

**交付成果**：
- [x] 點雲文件上傳功能（後端 API + 前端服務）
- [x] 文件格式驗證（僅允許 .npy/.npz）
- [x] 上傳後文件列表可見（文件列表/下載 API）
- [ ] 上傳進度顯示（後續完善）

#### Week 4: 點雲渲染（基礎版）🎨 （已完成）
**目標**：實現基本的3D點雲顯示，重點是可用性而非性能

**前端任務**：
1. **Three.js點雲渲染器**
   ```typescript
   // components/PointCloudViewer.tsx
   class PointCloudViewer {
     private scene: THREE.Scene;
     private camera: THREE.PerspectiveCamera;
     private renderer: THREE.WebGLRenderer;
     
     loadPointCloud(data: Float32Array) {
       const geometry = new THREE.BufferGeometry();
       geometry.setAttribute('position', new THREE.BufferAttribute(data, 3));
       
       const material = new THREE.PointsMaterial({ 
         color: 0xffffff, 
         size: 2 
       });
       
       const points = new THREE.Points(geometry, material);
       this.scene.add(points);
     }
     
     // 基礎控制：旋轉、縮放、平移
     setupControls() {
       const controls = new OrbitControls(this.camera, this.renderer.domElement);
       controls.enableDamping = true;
     }
   }
   ```

2. **點雲查看頁面**
   - 3D視圖區域
   - 基礎控制工具
   - 文件信息面板

**交付成果**：
- [x] 點雲3D顯示（Three.js Points 渲染）
- [x] 基礎交互控制（OrbitControls）
- [x] 點雲信息（shape/bounds）解析顯示（測試頁）
- [ ] 視角切換（後續增強）

#### Week 5: 任務管理系統 📋
**目標**：實現任務創建、分配、追蹤

**後端任務**：
1. **任務服務**
   ```python
   # services/task.py
   class TaskService:
       def create_task(self, project_id: UUID, name: str, file_id: UUID):
           task = Task(
               project_id=project_id,
               name=name,
               pointcloud_file_id=file_id,
               status="pending"
           )
           self.db.add(task)
           self.db.commit()
           return task
       
       def assign_task(self, task_id: UUID, assignee_id: UUID):
           task = self.get_task(task_id)
           if task.status != "pending":
               raise ValueError("任務狀態不允許分配")
               
           task.assigned_to = assignee_id
           task.status = "assigned"
           task.assigned_at = datetime.utcnow()
           self.db.commit()
   ```

2. **任務分配邏輯**
   ```python
   def auto_assign_task(self, user_id: UUID) -> Optional[Task]:
       # 檢查用戶工作負載
       current_tasks = self.get_user_active_tasks(user_id)
       if len(current_tasks) >= 5:  # 最大並發任務數
           return None
           
       # 獲取可分配的任務
       available_task = self.get_next_available_task()
       if available_task:
           self.assign_task(available_task.id, user_id)
           return available_task
   ```

**前端任務**：
1. **任務管理頁面**
   - 任務列表（不同狀態）
   - 任務詳情
   - 任務分配功能

2. **任務看板**
   ```typescript
   // components/TaskBoard.tsx
   const TaskBoard: React.FC = () => {
     const [tasks, setTasks] = useState<Task[]>([]);
     
     const taskColumns = [
       { key: 'pending', title: '待分配', tasks: pendingTasks },
       { key: 'assigned', title: '已分配', tasks: assignedTasks },
       { key: 'in_progress', title: '進行中', tasks: inProgressTasks },
       { key: 'completed', title: '已完成', tasks: completedTasks }
     ];
   };
   ```

**交付成果**：
- [ ] 任務CRUD功能
- [ ] 任務狀態管理
- [ ] 任務分配機制
- [ ] 任務看板視圖

#### Week 6: 標注功能 🎯（啟動）
**目標**：實現基礎的點雲標注功能，系統核心價值

**前端任務**：
1. **標注工具**
   ```typescript
   // components/AnnotationTools.tsx
   class AnnotationTool {
     private selectedPoints: number[] = [];
     
     selectPoints(indices: number[]) {
       this.selectedPoints = indices;
       this.highlightPoints(indices);
     }
     
     createAnnotation(vehicleType: string, confidence: number) {
       const annotation = {
         selectedPoints: this.selectedPoints,
         vehicleType,
         confidence,
         timestamp: new Date()
       };
       
       return this.saveAnnotation(annotation);
     }
   }
   ```

2. **車種分類選擇**
   - 車種下拉選單
   - 信心度滑桿
   - 標注備註輸入

**後端任務**：
1. **標注服務**
   ```python
   # services/annotation.py
   class AnnotationService:
       def create_annotation(self, task_id: UUID, annotator_id: UUID, data: dict):
           annotation = Annotation(
               task_id=task_id,
               annotator_id=annotator_id,
               vehicle_type_id=data['vehicle_type_id'],
               confidence=data['confidence'],
               annotation_data=data['selected_points'],
               status="draft"
           )
           self.db.add(annotation)
           self.db.commit()
           return annotation
   ```

**交付成果**：
- [ ] 點選標注功能
- [ ] 車種分類選擇
- [ ] 標注保存功能
- [ ] 標注預覽

### 🔍 **階段四：審核+通知（第7週）**

#### Week 7: 審核機制+通知系統 ✅
**目標**：一週內完成審核工作流和通知系統

**🚀 Day 1-3: 審核機制**
```python
# AI生成完整審核服務
class ReviewService:
    def submit_for_review(self, annotation_id: UUID):
        annotation = self.get_annotation(annotation_id)
        annotation.status = "pending_review"
        annotation.submitted_at = datetime.utcnow()
        self.db.commit()
        
        # 立即通知審核員
        self.notification_service.create_notification(
            user_id=self.get_project_reviewers(annotation.task.project_id),
            type="review_needed",
            content=f"新的標注需要審核"
        )
    
    def approve_annotation(self, annotation_id: UUID, reviewer_id: UUID):
        annotation = self.get_annotation(annotation_id)
        annotation.status = "approved"
        
        # 記錄審核結果 + 通知標注者
        review = AnnotationReview(
            annotation_id=annotation_id,
            reviewer_id=reviewer_id,
            status="approved",
            reviewed_at=datetime.utcnow()
        )
        self.db.add(review)
        self.db.commit()
        
        # 通知標注者
        self.notification_service.create_notification(
            user_id=annotation.annotator_id,
            type="annotation_approved",
            content=f"您的標注已通過審核"
        )
```

**⚡ Day 4-5: 通知系統**
```python
# 簡化的通知系統
class NotificationService:
    def create_notification(self, user_id: UUID, type: str, content: str):
        notification = Notification(
            user_id=user_id,
            type=type,
            content=content,
            is_read=False
        )
        self.db.add(notification)
        self.db.commit()
        
    def get_user_notifications(self, user_id: UUID, limit: int = 10):
        return self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).limit(limit).all()
```

**🎯 Day 6-7: 前端整合**
```typescript
// 審核界面 + 通知整合
const ReviewDashboard = () => {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  const approveAnnotation = async (annotationId: string) => {
    await api.post(`/annotations/${annotationId}/approve`);
    // 刷新列表
    loadPendingReviews();
  };
  
  const loadNotifications = async () => {
    const response = await api.get('/notifications');
    setNotifications(response.data);
  };
};
```

**一週交付成果**：
- [x] 審核工作流完成
- [x] 通知系統運作
- [x] 審核員界面
- [x] 實時狀態更新
- [x] 簡化的通知查看

### 🚀 **階段五：測試與部署（第8週）**

#### Week 8: 整合測試+部署 🎉
**目標**：一週內完成測試、優化和部署

**🚀 Day 1-2: 快速測試**
```python
# AI生成的關鍵測試
def test_complete_workflow():
    # 端到端測試：註冊→登入→創建專案→上傳文件→標注→審核
    user = register_user("test@example.com", "password", "Test User")
    token = login_user("test@example.com", "password")
    
    project = create_project("Test Project", user.id)
    file = upload_pointcloud("test.npy", project.id)
    task = create_task(project.id, file.id)
    
    annotation = create_annotation(task.id, user.id, {"vehicle_type": "car"})
    review = approve_annotation(annotation.id, user.id)
    
    assert review.status == "approved"

# 性能測試
def test_pointcloud_rendering_performance():
    # 測試10MB文件的渲染性能
    data = generate_test_pointcloud(size=10_000_000)
    start_time = time.time()
    render_pointcloud(data)
    render_time = time.time() - start_time
    assert render_time < 5.0  # 5秒內完成渲染
```

**⚡ Day 3-4: 性能優化**
```typescript
// 前端性能優化
const PointCloudViewer = React.memo(() => {
  // 點雲取樣，減少渲染點數
  const samplePointCloud = (data: Float32Array, sampleRate: number = 0.1) => {
    const sampledData = new Float32Array(data.length * sampleRate);
    for (let i = 0; i < sampledData.length; i += 3) {
      const sourceIndex = Math.floor(i / sampleRate);
      sampledData[i] = data[sourceIndex];
      sampledData[i + 1] = data[sourceIndex + 1];
      sampledData[i + 2] = data[sourceIndex + 2];
    }
    return sampledData;
  };
  
  // 延遲載入
  const loadPointCloud = useCallback(async (fileId: string) => {
    const data = await fetchPointCloudData(fileId);
    const sampledData = samplePointCloud(data);
    setPointCloudData(sampledData);
  }, []);
});
```

**🎯 Day 5-7: 部署上線**
```bash
# 一鍵部署腳本
#!/bin/bash
# deploy.sh

# 建立生產環境
docker-compose -f docker-compose.prod.yml up -d

# 數據庫遷移
docker-compose exec api alembic upgrade head

# 健康檢查
curl -f http://localhost:8000/health || exit 1
curl -f http://localhost:3000 || exit 1

# 建立備份
docker-compose exec db pg_dump -U postgres pointcloud_db > backup.sql

echo "部署完成! 🎉"
```

**一週交付成果**：
- [x] 端到端測試通過
- [x] 性能優化完成
- [x] 生產環境部署
- [x] 監控系統運行
- [x] 備份機制建立
- [x] 系統上線運行

## 📊 **超高效里程碑檢查點**

| 週次 | 里程碑 | 驗證標準 |
|------|--------|----------|
| **第1週末** | 🏗️ 基礎設施完成 | ✅ 前後端項目可運行、Docker環境正常 |
| **第2週末** | 🔐 認證+專案管理 | ✅ 用戶能註冊登入、創建專案、管理成員 |
| **第3週末** | 📁 文件上傳系統 | ✅ 能上傳點雲文件、格式驗證正常 |
| **第4週末** | 🎨 點雲渲染功能 | ✅ 能顯示3D點雲、基礎交互控制 |
| **第5週末** | 📋 任務管理系統 | ✅ 任務列表/統計/建立/分配/狀態/刪除打通；權限顯示落地 |
| **第6週末** | 🎯 標注功能完成 | ✅ 完整的標注流程能跑通 |
| **第7週末** | ✅ 審核+通知系統 | ✅ 審核工作流、通知機制正常運作 |
| **第8週末** | 🎉 系統上線運行 | ✅ 生產環境部署、監控系統運行 |

### 💡 **每週驗收標準**
- **功能完整性**：該週核心功能完全可用
- **性能基準**：符合MVP性能要求
- **集成測試**：與現有功能無衝突
- **代碼品質**：基本的錯誤處理和日誌記錄

## 風險控制

### 🚨 **高風險項目（8週時程）**

| 風險項目 | 風險等級 | 時程影響 | 應對策略 |
|----------|----------|----------|----------|
| **點雲渲染性能** | 🔴 高 | 可能延遲1-2天 | Week 4立即實現點取樣，如卡頓改用2D預覽 |
| **文件上傳穩定性** | 🟡 中 | 可能延遲1天 | 先用本地存儲，MinIO有問題再切換 |
| **多專案權限複雜性** | 🟡 中 | 可能延遲1天 | 簡化為基礎角色，細粒度權限留第二期 |
| **Three.js學習曲線** | 🔴 高 | 可能延遲2-3天 | AI輔助快速生成代碼，重點在可用性 |

### 💡 **8週時程的備選方案**
- **Week 4關鍵決策點**：如果點雲渲染卡住，立即切換到2D預覽模式
- **Week 6緊急預案**：如果標注功能複雜，先實現簡單的下拉選擇
- **Week 7時間不足**：砍掉實時通知，只保留基礎通知列表
- **Week 8最後衝刺**：如果測試時間不夠，先上線基礎功能

## 成功標準

### 技術指標
- [ ] API響應時間 < 200ms
- [ ] 點雲文件上傳成功率 > 95%
- [ ] 系統可用性 > 99%
- [ ] 頁面載入時間 < 3秒

### 業務指標
- [ ] 用戶可以完成完整標注流程
- [ ] 支援多專案並行作業
- [ ] 審核機制正常運作
- [ ] 數據可以匯出使用

### 用戶體驗
- [ ] 介面操作直觀
- [ ] 點雲顯示清晰
- [ ] 標注操作流暢
- [ ] 錯誤提示友善

## 🚀 **後續規劃**

### 第二期功能（2個月後）
- [ ] 高級點雲處理（濾波、分割）
- [ ] 批量標注工具
- [ ] 詳細統計報表
- [ ] 移動端支援
- [ ] 多語言支援

### 📝 **技術債務清單**
> 8週快速開發必然產生的技術債務

**高優先級（第9-10週處理）**：
- [ ] Clean Architecture重構
- [ ] 完整測試覆蓋（目前只有核心測試）
- [ ] 錯誤處理優化
- [ ] 性能監控系統

**中優先級（第11-12週處理）**：
- [ ] 代碼文檔完善
- [ ] 安全加固（輸入驗證、SQL注入防護）
- [ ] 數據庫優化（索引、查詢優化）
- [ ] 前端性能優化

**低優先級（第二期處理）**：
- [ ] 國際化支援
- [ ] 無障礙功能
- [ ] PWA支援
- [ ] 微服務架構重構

### 🎯 **MVP成功後的演進路線**
1. **第9-10週**：技術債務清理
2. **第11-12週**：性能優化和監控
3. **第13-16週**：第二期功能開發
4. **第17-20週**：企業級功能（SSO、RBAC、審計）

---

## 🎯 **8週MVP總結**

這個超高效的8週MVP開發計劃專為**單人開發者 + AI助手**的組合優化：

### 🚀 **效率提升策略**
- **AI輔助代碼生成**：減少50%+的編碼時間
- **簡化架構設計**：先求可用，再求完美
- **風險提前識別**：每週關鍵決策點
- **快速迭代驗證**：每週末里程碑檢查

### 🎯 **成功關鍵**
1. **專注核心價值**：點雲標注工作流
2. **技術選型務實**：使用熟悉的技術棧
3. **快速決策**：遇到問題立即調整
4. **MVP心態**：完成比完美更重要

### 📊 **預期成果**
- 8週後擁有完整可用的點雲標注系統
- 支援多專案並行作業
- 完整的用戶認證和權限管理
- 審核工作流和通知機制
- 可部署到生產環境

---
*最後更新：2024年12月19日*  
*版本：v2.0 - 8週超高效MVP版本* 
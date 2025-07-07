# 後端架構設計

## 後端架構概述

### 整體架構
基於FastAPI的現代化後端架構，採用異步處理和微服務設計理念，使用PostgreSQL作為主數據庫，Redis處理緩存和任務隊列，MinIO處理文件存儲。

**重要更新：** 本系統支援多專案架構，採用邏輯隔離策略，每個專案擁有獨立的成員、權限、任務和配置。

### 架構原則
1. **API優先**：RESTful API設計
2. **異步處理**：高並發異步操作
3. **分層架構**：清晰的職責分離
4. **多專案支援**：支援多個獨立專案並行運作
5. **邏輯隔離**：採用資料庫層面的邏輯隔離策略
6. **容器化**：Docker容器化部署
7. **可觀測性**：完整的監控和日誌

## 技術棧

### 核心框架
- **FastAPI**：高性能異步Web框架
- **Python 3.11**：現代化Python版本
- **Pydantic**：數據驗證和序列化
- **SQLAlchemy**：ORM框架
- **Alembic**：數據庫遷移工具

### 數據存儲
- **PostgreSQL**：主數據庫
- **Redis**：緩存和任務隊列
- **MinIO**：對象存儲（S3兼容）

### 任務隊列
- **Celery**：分布式任務隊列
- **Celery Beat**：定時任務調度
- **Flower**：任務監控

### 認證授權
- **FastAPI-Users**：用戶認證管理
- **JWT**：無狀態認證
- **bcrypt**：密碼哈希

### 監控和日誌
- **Prometheus**：監控指標
- **Grafana**：監控視覺化
- **Sentry**：錯誤追踪
- **structlog**：結構化日誌

## 項目結構

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI應用入口
│   ├── core/                  # 核心配置
│   │   ├── __init__.py
│   │   ├── config.py          # 配置管理
│   │   ├── database.py        # 數據庫連接
│   │   ├── security.py        # 安全配置
│   │   └── logging.py         # 日誌配置
│   ├── api/                   # API路由
│   │   ├── __init__.py
│   │   ├── deps.py            # API依賴
│   │   ├── v1/                # API版本1
│   │   │   ├── __init__.py
│   │   │   ├── auth.py        # 認證路由
│   │   │   ├── projects.py    # 專案路由
│   │   │   ├── tasks.py       # 任務路由
│   │   │   ├── annotations.py # 標注路由
│   │   │   ├── users.py       # 用戶路由
│   │   │   ├── vehicle_types.py # 車種分類路由
│   │   │   ├── statistics.py  # 統計路由
│   │   │   └── admin.py       # 管理路由
│   ├── models/                # 數據模型
│   │   ├── __init__.py
│   │   ├── base.py            # 基礎模型
│   │   ├── user.py            # 用戶模型
│   │   ├── project.py         # 專案模型
│   │   ├── task.py            # 任務模型
│   │   ├── annotation.py      # 標注模型
│   │   ├── vehicle_type.py    # 車種分類模型
│   │   └── pointcloud.py      # 點雲模型
│   ├── schemas/               # Pydantic模式
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── task.py
│   │   ├── annotation.py
│   │   ├── vehicle_type.py
│   │   └── pointcloud.py
│   ├── services/              # 業務邏輯
│   │   ├── __init__.py
│   │   ├── auth.py            # 認證服務
│   │   ├── project.py         # 專案服務
│   │   ├── task.py            # 任務服務
│   │   ├── annotation.py      # 標注服務
│   │   ├── pointcloud.py      # 點雲服務
│   │   ├── vehicle_type.py    # 車種分類服務
│   │   ├── permission.py      # 權限服務
│   │   ├── statistics.py      # 統計服務
│   │   └── notification.py    # 通知服務
│   ├── workers/               # 背景任務
│   │   ├── __init__.py
│   │   ├── celery_app.py      # Celery應用
│   │   ├── task_processor.py  # 任務處理
│   │   └── data_processor.py  # 數據處理
│   ├── utils/                 # 工具函數
│   │   ├── __init__.py
│   │   ├── pointcloud.py      # 點雲工具
│   │   ├── file_handler.py    # 文件處理
│   │   └── validators.py      # 驗證工具
│   └── tests/                 # 測試代碼
├── migrations/                # 數據庫遷移
├── requirements/              # 依賴文件
├── scripts/                   # 腳本文件
├── docker/                    # Docker配置
├── .env.example              # 環境變數範例
├── alembic.ini               # Alembic配置
├── pyproject.toml            # 項目配置
└── README.md
```

## 數據庫設計

### 核心數據模型
```python
# 用戶模型
class User(Base):
    id = Column(UUID, primary_key=True, default=uuid4)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(Enum(UserRole))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 任務模型
class Task(Base):
    id = Column(UUID, primary_key=True, default=uuid4)
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus))
    priority = Column(Enum(TaskPriority))
    pointcloud_file_path = Column(String)
    assigned_to = Column(UUID, ForeignKey("users.id"))
    created_by = Column(UUID, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
    annotations = relationship("Annotation", back_populates="task")

# 標注模型
class Annotation(Base):
    id = Column(UUID, primary_key=True, default=uuid4)
    task_id = Column(UUID, ForeignKey("tasks.id"))
    annotator_id = Column(UUID, ForeignKey("users.id"))
    vehicle_type = Column(String)
    confidence = Column(Float)
    notes = Column(Text)
    status = Column(Enum(AnnotationStatus))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    task = relationship("Task", back_populates="annotations")
    annotator = relationship("User")
```

### 數據庫索引策略
```sql
-- 性能優化索引
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_annotations_task_id ON annotations(task_id);
CREATE INDEX idx_annotations_annotator_id ON annotations(annotator_id);
```

## API設計

### RESTful API結構
```python
# 路由組織
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])
app.include_router(annotations.router, prefix="/api/v1/annotations", tags=["annotations"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
```

### API響應格式
```python
# 統一響應格式
class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
    errors: Optional[List[str]] = None

# 分頁響應
class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
```

### 認證和授權
```python
# 權限依賴
def require_roles(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# 使用範例
@router.get("/admin/users")
async def get_all_users(
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    pass
```

## 業務邏輯設計

### 任務分發系統
```python
class TaskDistributionService:
    def __init__(self, db: Session, redis: Redis):
        self.db = db
        self.redis = redis
    
    async def assign_task(self, user_id: UUID) -> Optional[Task]:
        """智能任務分配"""
        # 1. 檢查用戶當前任務負載
        current_tasks = await self.get_user_active_tasks(user_id)
        if len(current_tasks) >= MAX_CONCURRENT_TASKS:
            return None
        
        # 2. 獲取可用任務
        available_tasks = await self.get_available_tasks()
        if not available_tasks:
            return None
        
        # 3. 任務分配算法（優先級、用戶專長等）
        selected_task = self.select_optimal_task(available_tasks, user_id)
        
        # 4. 分配任務並更新狀態
        await self.assign_task_to_user(selected_task.id, user_id)
        
        return selected_task
```

### 審核工作流
```python
class ReviewWorkflowService:
    def __init__(self, db: Session):
        self.db = db
    
    async def submit_for_review(self, annotation_id: UUID) -> bool:
        """提交標注供審核"""
        annotation = await self.get_annotation(annotation_id)
        annotation.status = AnnotationStatus.PENDING_REVIEW
        
        # 自動分配審核員
        reviewer = await self.assign_reviewer(annotation)
        
        # 發送通知
        await self.notify_reviewer(reviewer, annotation)
        
        await self.db.commit()
        return True
    
    async def approve_annotation(self, annotation_id: UUID, reviewer_id: UUID) -> bool:
        """批准標注"""
        annotation = await self.get_annotation(annotation_id)
        annotation.status = AnnotationStatus.APPROVED
        annotation.reviewed_by = reviewer_id
        annotation.reviewed_at = datetime.utcnow()
        
        # 更新任務狀態
        await self.update_task_status(annotation.task_id)
        
        await self.db.commit()
        return True
```

## 異步處理架構

### Celery任務配置
```python
# celery_app.py
from celery import Celery

celery_app = Celery(
    "pointcloud_annotation",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=["app.workers.tasks"]
)

# 配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30分鐘
    task_soft_time_limit=25 * 60,  # 25分鐘
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)
```

### 背景任務
```python
# 點雲處理任務
@celery_app.task(bind=True)
def process_pointcloud_file(self, file_path: str, task_id: str):
    try:
        # 載入點雲文件
        pointcloud_data = load_numpy_file(file_path)
        
        # 驗證數據格式
        validate_pointcloud_data(pointcloud_data)
        
        # 生成預覽圖
        preview_image = generate_preview(pointcloud_data)
        
        # 存儲到MinIO
        preview_url = upload_to_minio(preview_image, f"previews/{task_id}.png")
        
        # 更新任務狀態
        update_task_status(task_id, TaskStatus.READY_FOR_ANNOTATION)
        
        return {"success": True, "preview_url": preview_url}
    
    except Exception as exc:
        self.retry(exc=exc, countdown=60, max_retries=3)
```

## 文件存儲架構

### MinIO配置
```python
from minio import Minio

class MinIOService:
    def __init__(self):
        self.client = Minio(
            endpoint="localhost:9000",
            access_key="minioadmin",
            secret_key="minioadmin",
            secure=False
        )
    
    async def upload_pointcloud(self, file_path: str, object_name: str) -> str:
        """上傳點雲文件"""
        try:
            self.client.fput_object(
                bucket_name="pointclouds",
                object_name=object_name,
                file_path=file_path,
                content_type="application/octet-stream"
            )
            return f"pointclouds/{object_name}"
        except Exception as e:
            raise FileUploadError(f"Failed to upload file: {str(e)}")
    
    async def get_pointcloud_url(self, object_name: str) -> str:
        """生成臨時訪問URL"""
        return self.client.presigned_get_object(
            bucket_name="pointclouds",
            object_name=object_name,
            expires=timedelta(hours=1)
        )
```

## 監控和日誌

### 結構化日誌
```python
import structlog

# 配置結構化日誌
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
```

### 監控指標
```python
from prometheus_client import Counter, Histogram, Gauge

# 定義指標
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ACTIVE_TASKS = Gauge('active_tasks_total', 'Number of active tasks')
ANNOTATION_RATE = Counter('annotations_completed_total', 'Total completed annotations')

# 使用指標
@REQUEST_DURATION.time()
def process_request():
    REQUEST_COUNT.labels(method='GET', endpoint='/api/v1/tasks').inc()
    # 處理邏輯
```

## 測試策略

### 測試結構
```python
# 測試配置
@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///./test.db")
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

# API測試
class TestTaskAPI:
    def test_create_task(self, test_db, client):
        response = client.post("/api/v1/tasks", json={
            "name": "Test Task",
            "description": "Test Description"
        })
        assert response.status_code == 201
        assert response.json()["data"]["name"] == "Test Task"
```

## 部署配置

### Docker配置
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements/production.txt .
RUN pip install --no-cache-dir -r production.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/pointcloud_db
      - REDIS_URL=redis://redis:6379

  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=pointcloud_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 相關文檔

- [技術棧選擇](../tech-stack.md)
- [多專案架構設計](../multi-project-architecture.md)
- [數據庫設計](database-design.md)
- [服務層設計](services.md)
- [API設計](api-design.md)
- [Clean Architecture設計](clean-architecture.md)
- [前端架構設計](../frontend/architecture.md)
- [開發環境配置](../development-environment.md)

---
*最後更新：2024年12月19日* 
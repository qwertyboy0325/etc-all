# 後端服務層設計文檔

## 概述

本文檔描述了ETC點雲標注系統的後端服務層設計，採用分層架構和依賴注入的設計模式，支援多專案架構。

## 服務架構設計

### 1. 服務分層架構

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (FastAPI)                      │
├─────────────────────────────────────────────────────────────┤
│                 Service Layer (業務邏輯)                    │
├─────────────────────────────────────────────────────────────┤
│                Repository Layer (資料存取)                  │
├─────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL)                │
└─────────────────────────────────────────────────────────────┘
```

### 2. 核心服務模塊

#### 認證與權限服務
- **AuthService** - 用戶認證和會話管理
- **PermissionService** - 權限檢查和授權
- **TokenService** - JWT令牌管理

#### 專案管理服務
- **ProjectService** - 專案CRUD操作
- **ProjectMemberService** - 專案成員管理
- **ProjectAccessService** - 專案訪問控制

#### 任務管理服務
- **TaskService** - 任務管理
- **TaskDistributionService** - 任務分配
- **TaskTrackingService** - 任務追蹤

#### 標注服務
- **AnnotationService** - 標注管理
- **ReviewService** - 審核工作流
- **QualityControlService** - 品質控制

#### 文件管理服務
- **FileUploadService** - 文件上傳
- **PointCloudService** - 點雲處理
- **StorageService** - 存儲管理

## 核心服務實現

### 1. 基礎服務類

```python
# services/base.py
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from uuid import UUID

class BaseService(ABC):
    """基礎服務類，所有服務都繼承此類"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def commit(self):
        """提交事務"""
        self.db.commit()
    
    def rollback(self):
        """回滾事務"""
        self.db.rollback()
    
    def refresh(self, obj):
        """刷新對象"""
        self.db.refresh(obj)

class ProjectAwareService(BaseService):
    """專案感知服務基類"""
    
    def __init__(self, db: Session, current_project_id: Optional[UUID] = None):
        super().__init__(db)
        self.current_project_id = current_project_id
    
    def ensure_project_access(self, entity, user_id: UUID):
        """確保實體屬於當前專案"""
        if hasattr(entity, 'project_id') and entity.project_id != self.current_project_id:
            raise UnauthorizedError("Access denied to entity from different project")
```

### 2. 認證服務

```python
# services/auth.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

class AuthService(BaseService):
    """認證服務"""
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """驗證密碼"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """生成密碼哈希"""
        return self.pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """創建訪問令牌"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """驗證令牌"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            return None
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """用戶身份驗證"""
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
```

### 3. 專案管理服務

```python
# services/project.py
from typing import List, Optional
from sqlalchemy.orm import Session
from models.project import Project, ProjectMember, ProjectRole

class ProjectService(BaseService):
    """專案管理服務"""
    
    def create_project(self, name: str, description: str, creator_id: UUID) -> Project:
        """創建專案"""
        project = Project(
            name=name,
            description=description,
            created_by=creator_id
        )
        self.db.add(project)
        self.db.flush()
        
        # 自動將創建者設為專案管理員
        self.add_project_member(project.id, creator_id, ProjectRole.PROJECT_ADMIN)
        
        self.commit()
        return project
    
    def get_project(self, project_id: UUID) -> Optional[Project]:
        """獲取專案"""
        return self.db.query(Project).filter(Project.id == project_id).first()
    
    def get_user_projects(self, user_id: UUID) -> List[Project]:
        """獲取用戶的專案列表"""
        return self.db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == user_id,
            ProjectMember.is_active == True
        ).all()
    
    def update_project(self, project_id: UUID, **kwargs) -> Project:
        """更新專案"""
        project = self.get_project(project_id)
        if not project:
            raise NotFoundError("Project not found")
        
        for key, value in kwargs.items():
            setattr(project, key, value)
        
        self.commit()
        return project
    
    def delete_project(self, project_id: UUID) -> bool:
        """刪除專案（軟刪除）"""
        project = self.get_project(project_id)
        if not project:
            return False
        
        project.status = ProjectStatus.ARCHIVED
        project.archived_at = datetime.utcnow()
        self.commit()
        return True

class ProjectMemberService(BaseService):
    """專案成員管理服務"""
    
    def add_project_member(self, project_id: UUID, user_id: UUID, role: ProjectRole) -> ProjectMember:
        """添加專案成員"""
        # 檢查是否已經是成員
        existing_member = self.db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        
        if existing_member:
            existing_member.role = role
            existing_member.is_active = True
            existing_member.updated_at = datetime.utcnow()
            self.commit()
            return existing_member
        
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role
        )
        self.db.add(member)
        self.commit()
        return member
    
    def get_project_members(self, project_id: UUID) -> List[ProjectMember]:
        """獲取專案成員列表"""
        return self.db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.is_active == True
        ).all()
    
    def update_member_role(self, project_id: UUID, user_id: UUID, role: ProjectRole) -> ProjectMember:
        """更新成員角色"""
        member = self.db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        
        if not member:
            raise NotFoundError("Project member not found")
        
        member.role = role
        member.updated_at = datetime.utcnow()
        self.commit()
        return member
    
    def remove_project_member(self, project_id: UUID, user_id: UUID) -> bool:
        """移除專案成員"""
        member = self.db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id
        ).first()
        
        if not member:
            return False
        
        member.is_active = False
        member.left_at = datetime.utcnow()
        self.commit()
        return True
```

### 4. 任務管理服務

```python
# services/task.py
from typing import List, Optional
from sqlalchemy.orm import Session
from models.task import Task, TaskStatus, TaskPriority

class TaskService(ProjectAwareService):
    """任務管理服務"""
    
    def create_task(self, name: str, description: str, creator_id: UUID, **kwargs) -> Task:
        """創建任務"""
        task = Task(
            project_id=self.current_project_id,
            name=name,
            description=description,
            created_by=creator_id,
            **kwargs
        )
        self.db.add(task)
        self.commit()
        return task
    
    def get_task(self, task_id: UUID) -> Optional[Task]:
        """獲取任務"""
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if task:
            self.ensure_project_access(task, None)
        return task
    
    def get_tasks(self, 
                  status: Optional[TaskStatus] = None,
                  assigned_to: Optional[UUID] = None,
                  priority: Optional[TaskPriority] = None,
                  limit: int = 50,
                  offset: int = 0) -> List[Task]:
        """獲取任務列表"""
        query = self.db.query(Task).filter(Task.project_id == self.current_project_id)
        
        if status:
            query = query.filter(Task.status == status)
        if assigned_to:
            query = query.filter(Task.assigned_to == assigned_to)
        if priority:
            query = query.filter(Task.priority == priority)
        
        return query.offset(offset).limit(limit).all()
    
    def assign_task(self, task_id: UUID, assignee_id: UUID) -> Task:
        """分配任務"""
        task = self.get_task(task_id)
        if not task:
            raise NotFoundError("Task not found")
        
        # 檢查被分配者是否是專案成員
        member = self.db.query(ProjectMember).filter(
            ProjectMember.user_id == assignee_id,
            ProjectMember.project_id == self.current_project_id,
            ProjectMember.is_active == True
        ).first()
        
        if not member:
            raise ValidationError("User is not a member of this project")
        
        task.assigned_to = assignee_id
        task.assigned_at = datetime.utcnow()
        task.status = TaskStatus.ASSIGNED
        self.commit()
        return task
    
    def update_task_status(self, task_id: UUID, status: TaskStatus) -> Task:
        """更新任務狀態"""
        task = self.get_task(task_id)
        if not task:
            raise NotFoundError("Task not found")
        
        task.status = status
        if status == TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
        
        self.commit()
        return task

class TaskDistributionService(ProjectAwareService):
    """任務分配服務"""
    
    def __init__(self, db: Session, current_project_id: UUID):
        super().__init__(db, current_project_id)
        self.max_concurrent_tasks = 5
    
    def get_available_annotators(self) -> List[UUID]:
        """獲取可用的標注員"""
        return self.db.query(ProjectMember.user_id).filter(
            ProjectMember.project_id == self.current_project_id,
            ProjectMember.role == ProjectRole.ANNOTATOR,
            ProjectMember.is_active == True
        ).all()
    
    def get_user_workload(self, user_id: UUID) -> int:
        """獲取用戶工作負載"""
        return self.db.query(Task).filter(
            Task.project_id == self.current_project_id,
            Task.assigned_to == user_id,
            Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])
        ).count()
    
    def auto_assign_task(self, user_id: UUID) -> Optional[Task]:
        """自動分配任務"""
        # 檢查用戶當前工作負載
        current_workload = self.get_user_workload(user_id)
        if current_workload >= self.max_concurrent_tasks:
            return None
        
        # 獲取可用任務
        available_task = self.db.query(Task).filter(
            Task.project_id == self.current_project_id,
            Task.status == TaskStatus.PENDING,
            Task.assigned_to.is_(None)
        ).order_by(Task.priority.desc(), Task.created_at.asc()).first()
        
        if not available_task:
            return None
        
        # 分配任務
        task_service = TaskService(self.db, self.current_project_id)
        return task_service.assign_task(available_task.id, user_id)
```

### 5. 標注服務

```python
# services/annotation.py
from typing import List, Optional
from sqlalchemy.orm import Session
from models.annotation import Annotation, AnnotationStatus

class AnnotationService(ProjectAwareService):
    """標注管理服務"""
    
    def create_annotation(self, 
                         task_id: UUID,
                         annotator_id: UUID,
                         vehicle_type_id: UUID,
                         confidence: float,
                         notes: Optional[str] = None) -> Annotation:
        """創建標注"""
        annotation = Annotation(
            project_id=self.current_project_id,
            task_id=task_id,
            annotator_id=annotator_id,
            vehicle_type_id=vehicle_type_id,
            confidence=confidence,
            notes=notes
        )
        self.db.add(annotation)
        self.commit()
        return annotation
    
    def get_annotation(self, annotation_id: UUID) -> Optional[Annotation]:
        """獲取標注"""
        annotation = self.db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if annotation:
            self.ensure_project_access(annotation, None)
        return annotation
    
    def get_task_annotations(self, task_id: UUID) -> List[Annotation]:
        """獲取任務的標注列表"""
        return self.db.query(Annotation).filter(
            Annotation.project_id == self.current_project_id,
            Annotation.task_id == task_id
        ).all()
    
    def update_annotation(self, annotation_id: UUID, **kwargs) -> Annotation:
        """更新標注"""
        annotation = self.get_annotation(annotation_id)
        if not annotation:
            raise NotFoundError("Annotation not found")
        
        for key, value in kwargs.items():
            setattr(annotation, key, value)
        
        self.commit()
        return annotation
    
    def submit_annotation(self, annotation_id: UUID) -> Annotation:
        """提交標注進行審核"""
        annotation = self.get_annotation(annotation_id)
        if not annotation:
            raise NotFoundError("Annotation not found")
        
        annotation.status = AnnotationStatus.SUBMITTED
        annotation.submitted_at = datetime.utcnow()
        self.commit()
        
        # 觸發審核流程
        review_service = ReviewService(self.db, self.current_project_id)
        review_service.auto_assign_reviewer(annotation_id)
        
        return annotation

class ReviewService(ProjectAwareService):
    """審核服務"""
    
    def get_pending_reviews(self, reviewer_id: UUID) -> List[Annotation]:
        """獲取待審核的標注"""
        return self.db.query(Annotation).filter(
            Annotation.project_id == self.current_project_id,
            Annotation.status == AnnotationStatus.PENDING_REVIEW
        ).all()
    
    def approve_annotation(self, annotation_id: UUID, reviewer_id: UUID, feedback: Optional[str] = None) -> bool:
        """批准標注"""
        annotation = self.db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if not annotation:
            return False
        
        annotation.status = AnnotationStatus.APPROVED
        
        # 記錄審核結果
        review = AnnotationReview(
            annotation_id=annotation_id,
            reviewer_id=reviewer_id,
            status='approved',
            feedback=feedback
        )
        self.db.add(review)
        self.commit()
        
        # 更新任務狀態
        task_service = TaskService(self.db, self.current_project_id)
        task_service.update_task_status(annotation.task_id, TaskStatus.COMPLETED)
        
        return True
    
    def reject_annotation(self, annotation_id: UUID, reviewer_id: UUID, feedback: str) -> bool:
        """拒絕標注"""
        annotation = self.db.query(Annotation).filter(Annotation.id == annotation_id).first()
        if not annotation:
            return False
        
        annotation.status = AnnotationStatus.REJECTED
        
        # 記錄審核結果
        review = AnnotationReview(
            annotation_id=annotation_id,
            reviewer_id=reviewer_id,
            status='rejected',
            feedback=feedback
        )
        self.db.add(review)
        self.commit()
        
        # 將任務重新分配
        task_service = TaskService(self.db, self.current_project_id)
        task_service.update_task_status(annotation.task_id, TaskStatus.PENDING)
        
        return True
```

### 6. 文件管理服務

```python
# services/file.py
import numpy as np
from typing import Optional, BinaryIO
from pathlib import Path

class FileUploadService(ProjectAwareService):
    """文件上傳服務"""
    
    def __init__(self, db: Session, current_project_id: UUID):
        super().__init__(db, current_project_id)
        self.allowed_extensions = {'.npy', '.npz'}
        self.max_file_size = 50 * 1024 * 1024  # 50MB
    
    def validate_file(self, file: BinaryIO, filename: str) -> bool:
        """驗證文件"""
        # 檢查文件擴展名
        file_ext = Path(filename).suffix.lower()
        if file_ext not in self.allowed_extensions:
            raise ValidationError(f"Unsupported file type: {file_ext}")
        
        # 檢查文件大小
        file.seek(0, 2)  # 移動到文件末尾
        file_size = file.tell()
        file.seek(0)  # 重置文件指針
        
        if file_size > self.max_file_size:
            raise ValidationError(f"File too large: {file_size} bytes")
        
        return True
    
    def upload_pointcloud(self, file: BinaryIO, filename: str, uploaded_by: UUID) -> FileUpload:
        """上傳點雲文件"""
        self.validate_file(file, filename)
        
        # 生成存儲路徑
        file_ext = Path(filename).suffix.lower()
        stored_filename = f"{uuid4()}{file_ext}"
        storage_path = f"projects/{self.current_project_id}/pointclouds/{stored_filename}"
        
        # 上傳到存儲服務
        storage_service = StorageService()
        storage_service.upload_file(file, storage_path)
        
        # 記錄上傳信息
        file_upload = FileUpload(
            project_id=self.current_project_id,
            uploaded_by=uploaded_by,
            original_filename=filename,
            stored_filename=stored_filename,
            file_path=storage_path,
            file_size=file.tell(),
            file_type=file_ext[1:]  # 去掉點
        )
        self.db.add(file_upload)
        self.commit()
        
        return file_upload

class PointCloudService(BaseService):
    """點雲處理服務"""
    
    def load_pointcloud(self, file_path: str) -> np.ndarray:
        """載入點雲數據"""
        try:
            if file_path.endswith('.npy'):
                return np.load(file_path)
            elif file_path.endswith('.npz'):
                data = np.load(file_path)
                # 假設點雲數據在'points'鍵中
                return data['points']
            else:
                raise ValueError("Unsupported file format")
        except Exception as e:
            raise ProcessingError(f"Failed to load pointcloud: {str(e)}")
    
    def validate_pointcloud(self, pointcloud: np.ndarray) -> bool:
        """驗證點雲數據格式"""
        if pointcloud.ndim != 2:
            raise ValidationError("Point cloud must be 2D array")
        
        if pointcloud.shape[1] < 3:
            raise ValidationError("Point cloud must have at least 3 columns (x, y, z)")
        
        if pointcloud.shape[0] == 0:
            raise ValidationError("Point cloud cannot be empty")
        
        # 檢查數據範圍
        if np.any(np.isnan(pointcloud)) or np.any(np.isinf(pointcloud)):
            raise ValidationError("Point cloud contains invalid values")
        
        return True
    
    def generate_preview(self, pointcloud: np.ndarray) -> dict:
        """生成點雲預覽信息"""
        return {
            'point_count': pointcloud.shape[0],
            'dimensions': pointcloud.shape[1],
            'bounds': {
                'min': pointcloud.min(axis=0).tolist(),
                'max': pointcloud.max(axis=0).tolist()
            },
            'center': pointcloud.mean(axis=0).tolist(),
            'std': pointcloud.std(axis=0).tolist()
        }
```

### 7. 統計服務

```python
# services/statistics.py
from typing import Dict, List, Optional
from sqlalchemy import func, desc
from datetime import datetime, timedelta

class StatisticsService(ProjectAwareService):
    """統計服務"""
    
    def get_project_stats(self) -> Dict:
        """獲取專案統計"""
        total_tasks = self.db.query(Task).filter(
            Task.project_id == self.current_project_id
        ).count()
        
        completed_tasks = self.db.query(Task).filter(
            Task.project_id == self.current_project_id,
            Task.status == TaskStatus.COMPLETED
        ).count()
        
        total_annotations = self.db.query(Annotation).filter(
            Annotation.project_id == self.current_project_id
        ).count()
        
        approved_annotations = self.db.query(Annotation).filter(
            Annotation.project_id == self.current_project_id,
            Annotation.status == AnnotationStatus.APPROVED
        ).count()
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'completion_rate': completed_tasks / total_tasks if total_tasks > 0 else 0,
            'total_annotations': total_annotations,
            'approved_annotations': approved_annotations,
            'approval_rate': approved_annotations / total_annotations if total_annotations > 0 else 0
        }
    
    def get_user_stats(self, user_id: UUID) -> Dict:
        """獲取用戶統計"""
        user_tasks = self.db.query(Task).filter(
            Task.project_id == self.current_project_id,
            Task.assigned_to == user_id
        ).count()
        
        user_annotations = self.db.query(Annotation).filter(
            Annotation.project_id == self.current_project_id,
            Annotation.annotator_id == user_id
        ).count()
        
        return {
            'assigned_tasks': user_tasks,
            'total_annotations': user_annotations,
            'avg_confidence': self.db.query(func.avg(Annotation.confidence)).filter(
                Annotation.project_id == self.current_project_id,
                Annotation.annotator_id == user_id
            ).scalar() or 0
        }

class CrossProjectStatisticsService(BaseService):
    """跨專案統計服務"""
    
    def get_global_stats(self) -> Dict:
        """獲取全局統計"""
        return {
            'total_projects': self.db.query(Project).count(),
            'active_projects': self.db.query(Project).filter(
                Project.status == ProjectStatus.ACTIVE
            ).count(),
            'total_users': self.db.query(User).count(),
            'total_tasks': self.db.query(Task).count(),
            'total_annotations': self.db.query(Annotation).count()
        }
    
    def get_user_cross_project_stats(self, user_id: UUID) -> Dict:
        """獲取用戶跨專案統計"""
        user_projects = self.db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == user_id,
            ProjectMember.is_active == True
        ).all()
        
        stats = {
            'total_projects': len(user_projects),
            'projects_breakdown': []
        }
        
        for project in user_projects:
            project_stats = StatisticsService(self.db, project.id).get_user_stats(user_id)
            stats['projects_breakdown'].append({
                'project_id': project.id,
                'project_name': project.name,
                **project_stats
            })
        
        return stats
```

## 服務依賴注入

### 1. 依賴注入配置

```python
# services/dependencies.py
from functools import lru_cache
from sqlalchemy.orm import Session
from fastapi import Depends
from core.database import get_db
from core.security import get_current_user

@lru_cache()
def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """獲取認證服務"""
    return AuthService(db)

@lru_cache()
def get_project_service(db: Session = Depends(get_db)) -> ProjectService:
    """獲取專案服務"""
    return ProjectService(db)

def get_project_aware_service(
    service_class,
    db: Session = Depends(get_db),
    current_project_id: UUID = Depends(get_current_project_id)
):
    """獲取專案感知服務"""
    return service_class(db, current_project_id)

def get_task_service(
    db: Session = Depends(get_db),
    current_project_id: UUID = Depends(get_current_project_id)
) -> TaskService:
    """獲取任務服務"""
    return TaskService(db, current_project_id)
```

### 2. 事務管理

```python
# services/transaction.py
from contextlib import contextmanager
from sqlalchemy.orm import Session

@contextmanager
def transaction_scope(db: Session):
    """事務上下文管理器"""
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

class TransactionalService:
    """事務性服務裝飾器"""
    
    def __init__(self, service_class):
        self.service_class = service_class
    
    def __call__(self, db: Session):
        service = self.service_class(db)
        return TransactionalWrapper(service, db)

class TransactionalWrapper:
    """事務包裝器"""
    
    def __init__(self, service, db: Session):
        self.service = service
        self.db = db
    
    def __getattr__(self, name):
        attr = getattr(self.service, name)
        if callable(attr):
            return self._wrap_method(attr)
        return attr
    
    def _wrap_method(self, method):
        def wrapper(*args, **kwargs):
            with transaction_scope(self.db):
                return method(*args, **kwargs)
        return wrapper
```

## 錯誤處理

### 1. 自定義異常

```python
# exceptions.py
class ServiceError(Exception):
    """服務基礎異常"""
    pass

class ValidationError(ServiceError):
    """驗證錯誤"""
    pass

class NotFoundError(ServiceError):
    """資源未找到"""
    pass

class UnauthorizedError(ServiceError):
    """未授權錯誤"""
    pass

class ProcessingError(ServiceError):
    """處理錯誤"""
    pass
```

### 2. 異常處理中間件

```python
# middleware/error_handler.py
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from exceptions import ServiceError, ValidationError, NotFoundError

async def service_exception_handler(request: Request, exc: ServiceError):
    """服務異常處理器"""
    if isinstance(exc, ValidationError):
        return JSONResponse(
            status_code=400,
            content={"error": "Validation Error", "detail": str(exc)}
        )
    elif isinstance(exc, NotFoundError):
        return JSONResponse(
            status_code=404,
            content={"error": "Not Found", "detail": str(exc)}
        )
    elif isinstance(exc, UnauthorizedError):
        return JSONResponse(
            status_code=403,
            content={"error": "Unauthorized", "detail": str(exc)}
        )
    else:
        return JSONResponse(
            status_code=500,
            content={"error": "Internal Server Error", "detail": str(exc)}
        )
```

## 總結

本服務層設計提供了：

1. **清晰的分層架構**：API層、服務層、資料層分離
2. **多專案支援**：專案感知服務和權限控制
3. **完整的業務邏輯**：涵蓋認證、專案管理、任務分配、標注審核等
4. **依賴注入**：便於測試和擴展
5. **事務管理**：確保數據一致性
6. **錯誤處理**：統一的異常處理機制

這個設計支援大規模的多專案應用，同時保持代碼的可維護性和可測試性。 
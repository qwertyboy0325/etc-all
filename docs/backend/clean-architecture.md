# Clean Architecture 設計文檔

## 概述

本文檔描述如何將ETC點雲標注系統重構為符合Clean Architecture原則的設計，確保業務邏輯獨立於技術實現細節。

## Clean Architecture 原則

### 1. 依賴倒置原則
- 高層模塊不應依賴低層模塊，兩者都應該依賴抽象
- 抽象不應依賴細節，細節應該依賴抽象

### 2. 分層結構
```
┌─────────────────────────────────────────────────────────────┐
│           Frameworks & Drivers (最外層)                     │
│  FastAPI, SQLAlchemy, Redis, MinIO, Celery                 │
├─────────────────────────────────────────────────────────────┤
│           Interface Adapters (介面適配器)                   │
│  Controllers, Gateways, Presenters, Repositories           │
├─────────────────────────────────────────────────────────────┤
│           Use Cases (應用業務規則)                          │
│  Application Services, Interactors                         │
├─────────────────────────────────────────────────────────────┤
│           Entities (最內層)                                 │
│  Business Objects, Domain Rules                            │
└─────────────────────────────────────────────────────────────┘
```

### 3. 依賴方向
- 依賴關係只能指向內層
- 內層不能知道外層的任何信息

## 改進後的架構設計

### 1. Entities 層（領域實體）

```python
# domain/entities/user.py
from dataclasses import dataclass
from typing import Optional
from uuid import UUID
from datetime import datetime
from enum import Enum

class GlobalRole(Enum):
    SUPER_ADMIN = "super_admin"
    SYSTEM_ADMIN = "system_admin"
    USER = "user"

@dataclass
class User:
    """用戶領域實體"""
    id: UUID
    email: str
    full_name: str
    global_role: GlobalRole
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    
    def can_access_admin_panel(self) -> bool:
        """業務規則：是否能訪問管理面板"""
        return self.global_role in [GlobalRole.SUPER_ADMIN, GlobalRole.SYSTEM_ADMIN]
    
    def is_super_admin(self) -> bool:
        """業務規則：是否為超級管理員"""
        return self.global_role == GlobalRole.SUPER_ADMIN
    
    def update_login_time(self, login_time: datetime):
        """業務規則：更新登入時間"""
        self.last_login_at = login_time

# domain/entities/project.py
@dataclass
class Project:
    """專案領域實體"""
    id: UUID
    name: str
    description: str
    status: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None
    
    def is_active(self) -> bool:
        """業務規則：專案是否活躍"""
        return self.status == "active" and self.archived_at is None
    
    def can_be_archived(self) -> bool:
        """業務規則：是否可以歸檔"""
        return self.status in ["completed", "suspended"]
    
    def archive(self):
        """業務規則：歸檔專案"""
        if not self.can_be_archived():
            raise ValueError("Project cannot be archived in current status")
        self.status = "archived"
        self.archived_at = datetime.utcnow()

# domain/entities/task.py
@dataclass
class Task:
    """任務領域實體"""
    id: UUID
    project_id: UUID
    name: str
    description: str
    status: str
    priority: str
    assigned_to: Optional[UUID] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    
    def can_be_assigned(self) -> bool:
        """業務規則：是否可以分配"""
        return self.status == "pending" and self.assigned_to is None
    
    def assign_to(self, user_id: UUID):
        """業務規則：分配任務"""
        if not self.can_be_assigned():
            raise ValueError("Task cannot be assigned in current status")
        self.assigned_to = user_id
        self.assigned_at = datetime.utcnow()
        self.status = "assigned"
    
    def start_work(self):
        """業務規則：開始工作"""
        if self.status != "assigned":
            raise ValueError("Task must be assigned before starting")
        self.status = "in_progress"
    
    def complete(self):
        """業務規則：完成任務"""
        if self.status != "in_progress":
            raise ValueError("Task must be in progress to complete")
        self.status = "completed"
        self.completed_at = datetime.utcnow()
```

### 2. Use Cases 層（用例）

```python
# application/use_cases/user_authentication.py
from abc import ABC, abstractmethod
from typing import Optional
from domain.entities.user import User

class UserRepositoryInterface(ABC):
    """用戶儲存庫介面"""
    
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        pass
    
    @abstractmethod
    def save(self, user: User) -> User:
        pass

class PasswordServiceInterface(ABC):
    """密碼服務介面"""
    
    @abstractmethod
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        pass
    
    @abstractmethod
    def hash_password(self, password: str) -> str:
        pass

class TokenServiceInterface(ABC):
    """令牌服務介面"""
    
    @abstractmethod
    def create_access_token(self, user_id: str) -> str:
        pass

class AuthenticateUserUseCase:
    """用戶認證用例"""
    
    def __init__(
        self,
        user_repository: UserRepositoryInterface,
        password_service: PasswordServiceInterface,
        token_service: TokenServiceInterface
    ):
        self.user_repository = user_repository
        self.password_service = password_service
        self.token_service = token_service
    
    def execute(self, email: str, password: str) -> Optional[dict]:
        """執行用戶認證"""
        # 獲取用戶
        user = self.user_repository.get_by_email(email)
        if not user:
            return None
        
        # 驗證密碼
        if not self.password_service.verify_password(password, user.hashed_password):
            return None
        
        # 更新登入時間
        user.update_login_time(datetime.utcnow())
        self.user_repository.save(user)
        
        # 生成令牌
        access_token = self.token_service.create_access_token(str(user.id))
        
        return {
            "access_token": access_token,
            "user": user
        }

# application/use_cases/task_management.py
class TaskRepositoryInterface(ABC):
    """任務儲存庫介面"""
    
    @abstractmethod
    def get_by_id(self, task_id: UUID) -> Optional[Task]:
        pass
    
    @abstractmethod
    def get_pending_tasks(self, project_id: UUID) -> List[Task]:
        pass
    
    @abstractmethod
    def save(self, task: Task) -> Task:
        pass

class CreateTaskUseCase:
    """創建任務用例"""
    
    def __init__(
        self,
        task_repository: TaskRepositoryInterface,
        project_repository: ProjectRepositoryInterface
    ):
        self.task_repository = task_repository
        self.project_repository = project_repository
    
    def execute(self, project_id: UUID, name: str, description: str, creator_id: UUID) -> Task:
        """執行創建任務"""
        # 驗證專案存在且活躍
        project = self.project_repository.get_by_id(project_id)
        if not project or not project.is_active():
            raise ValueError("Project not found or not active")
        
        # 創建任務實體
        task = Task(
            id=uuid4(),
            project_id=project_id,
            name=name,
            description=description,
            status="pending",
            priority="medium",
            created_by=creator_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # 保存任務
        return self.task_repository.save(task)

class AssignTaskUseCase:
    """分配任務用例"""
    
    def __init__(
        self,
        task_repository: TaskRepositoryInterface,
        user_repository: UserRepositoryInterface,
        project_member_repository: ProjectMemberRepositoryInterface
    ):
        self.task_repository = task_repository
        self.user_repository = user_repository
        self.project_member_repository = project_member_repository
    
    def execute(self, task_id: UUID, assignee_id: UUID) -> Task:
        """執行任務分配"""
        # 獲取任務
        task = self.task_repository.get_by_id(task_id)
        if not task:
            raise ValueError("Task not found")
        
        # 檢查用戶是否為專案成員
        if not self.project_member_repository.is_member(task.project_id, assignee_id):
            raise ValueError("User is not a project member")
        
        # 分配任務
        task.assign_to(assignee_id)
        
        # 保存任務
        return self.task_repository.save(task)
```

### 3. Interface Adapters 層（介面適配器）

```python
# infrastructure/repositories/user_repository.py
from typing import Optional, List
from sqlalchemy.orm import Session
from application.use_cases.user_authentication import UserRepositoryInterface
from domain.entities.user import User
from infrastructure.database.models import UserModel

class SQLAlchemyUserRepository(UserRepositoryInterface):
    """SQLAlchemy用戶儲存庫實現"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_email(self, email: str) -> Optional[User]:
        """根據郵箱獲取用戶"""
        user_model = self.db.query(UserModel).filter(UserModel.email == email).first()
        if not user_model:
            return None
        return self._to_entity(user_model)
    
    def save(self, user: User) -> User:
        """保存用戶"""
        user_model = self.db.query(UserModel).filter(UserModel.id == user.id).first()
        if user_model:
            self._update_model(user_model, user)
        else:
            user_model = self._to_model(user)
            self.db.add(user_model)
        
        self.db.commit()
        self.db.refresh(user_model)
        return self._to_entity(user_model)
    
    def _to_entity(self, model: UserModel) -> User:
        """模型轉實體"""
        return User(
            id=model.id,
            email=model.email,
            full_name=model.full_name,
            global_role=GlobalRole(model.global_role),
            is_active=model.is_active,
            is_verified=model.is_verified,
            created_at=model.created_at,
            updated_at=model.updated_at,
            last_login_at=model.last_login_at
        )
    
    def _to_model(self, entity: User) -> UserModel:
        """實體轉模型"""
        return UserModel(
            id=entity.id,
            email=entity.email,
            full_name=entity.full_name,
            global_role=entity.global_role.value,
            is_active=entity.is_active,
            is_verified=entity.is_verified,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
            last_login_at=entity.last_login_at
        )
    
    def _update_model(self, model: UserModel, entity: User):
        """更新模型"""
        model.email = entity.email
        model.full_name = entity.full_name
        model.global_role = entity.global_role.value
        model.is_active = entity.is_active
        model.is_verified = entity.is_verified
        model.updated_at = entity.updated_at
        model.last_login_at = entity.last_login_at

# infrastructure/services/password_service.py
from passlib.context import CryptContext
from application.use_cases.user_authentication import PasswordServiceInterface

class BCryptPasswordService(PasswordServiceInterface):
    """BCrypt密碼服務實現"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """驗證密碼"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def hash_password(self, password: str) -> str:
        """哈希密碼"""
        return self.pwd_context.hash(password)

# infrastructure/services/jwt_token_service.py
from jose import jwt
from datetime import datetime, timedelta
from application.use_cases.user_authentication import TokenServiceInterface

class JWTTokenService(TokenServiceInterface):
    """JWT令牌服務實現"""
    
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_access_token(self, user_id: str) -> str:
        """創建訪問令牌"""
        expire = datetime.utcnow() + timedelta(minutes=30)
        to_encode = {"sub": user_id, "exp": expire}
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
```

### 4. Frameworks & Drivers 層（框架與驅動）

```python
# api/controllers/auth_controller.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from application.use_cases.user_authentication import AuthenticateUserUseCase
from infrastructure.dependencies import get_auth_use_case

router = APIRouter()
security = HTTPBearer()

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    auth_use_case: AuthenticateUserUseCase = Depends(get_auth_use_case)
):
    """用戶登入"""
    result = auth_use_case.execute(request.email, request.password)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    return LoginResponse(
        access_token=result["access_token"],
        user={
            "id": str(result["user"].id),
            "email": result["user"].email,
            "full_name": result["user"].full_name,
            "global_role": result["user"].global_role.value
        }
    )

# infrastructure/dependencies.py
from functools import lru_cache
from sqlalchemy.orm import Session
from fastapi import Depends
from core.database import get_db
from application.use_cases.user_authentication import AuthenticateUserUseCase
from infrastructure.repositories.user_repository import SQLAlchemyUserRepository
from infrastructure.services.password_service import BCryptPasswordService
from infrastructure.services.jwt_token_service import JWTTokenService
from core.config import settings

@lru_cache()
def get_password_service():
    return BCryptPasswordService()

@lru_cache()
def get_token_service():
    return JWTTokenService(settings.SECRET_KEY)

def get_user_repository(db: Session = Depends(get_db)):
    return SQLAlchemyUserRepository(db)

def get_auth_use_case(
    user_repository: SQLAlchemyUserRepository = Depends(get_user_repository),
    password_service: BCryptPasswordService = Depends(get_password_service),
    token_service: JWTTokenService = Depends(get_token_service)
):
    return AuthenticateUserUseCase(user_repository, password_service, token_service)
```

## 重構步驟

### 1. 第一階段：提取領域實體
- [ ] 定義核心業務實體（User, Project, Task, Annotation等）
- [ ] 將業務規則從Service移到Entity
- [ ] 創建值對象（Value Objects）

### 2. 第二階段：定義用例
- [ ] 創建用例介面
- [ ] 實現具體用例
- [ ] 移除Service中的業務邏輯

### 3. 第三階段：建立儲存庫抽象
- [ ] 定義儲存庫介面
- [ ] 實現具體儲存庫
- [ ] 替換直接的SQLAlchemy使用

### 4. 第四階段：重構控制器
- [ ] 控制器只處理HTTP相關邏輯
- [ ] 使用依賴注入注入用例
- [ ] 移除業務邏輯

### 5. 第五階段：測試
- [ ] 單元測試領域實體
- [ ] 單元測試用例
- [ ] 整合測試
- [ ] 端到端測試

## 測試策略

### 1. 單元測試
```python
# tests/domain/entities/test_user.py
import pytest
from domain.entities.user import User, GlobalRole
from datetime import datetime

class TestUser:
    def test_super_admin_can_access_admin_panel(self):
        user = User(
            id=uuid4(),
            email="admin@example.com",
            full_name="Admin User",
            global_role=GlobalRole.SUPER_ADMIN
        )
        assert user.can_access_admin_panel() is True
    
    def test_regular_user_cannot_access_admin_panel(self):
        user = User(
            id=uuid4(),
            email="user@example.com",
            full_name="Regular User",
            global_role=GlobalRole.USER
        )
        assert user.can_access_admin_panel() is False

# tests/application/use_cases/test_authenticate_user.py
import pytest
from unittest.mock import Mock
from application.use_cases.user_authentication import AuthenticateUserUseCase

class TestAuthenticateUserUseCase:
    def test_successful_authentication(self):
        # 設置模擬
        user_repository = Mock()
        password_service = Mock()
        token_service = Mock()
        
        user = User(id=uuid4(), email="test@example.com", ...)
        user_repository.get_by_email.return_value = user
        password_service.verify_password.return_value = True
        token_service.create_access_token.return_value = "fake_token"
        
        # 執行用例
        use_case = AuthenticateUserUseCase(user_repository, password_service, token_service)
        result = use_case.execute("test@example.com", "password")
        
        # 驗證結果
        assert result is not None
        assert result["access_token"] == "fake_token"
        assert result["user"] == user
```

### 2. 整合測試
```python
# tests/infrastructure/repositories/test_user_repository.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from infrastructure.repositories.user_repository import SQLAlchemyUserRepository
from domain.entities.user import User, GlobalRole

class TestSQLAlchemyUserRepository:
    @pytest.fixture
    def db_session(self):
        engine = create_engine("sqlite:///:memory:")
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    def test_save_and_get_user(self, db_session):
        repository = SQLAlchemyUserRepository(db_session)
        
        user = User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            global_role=GlobalRole.USER
        )
        
        saved_user = repository.save(user)
        retrieved_user = repository.get_by_email("test@example.com")
        
        assert saved_user.id == user.id
        assert retrieved_user.email == user.email
```

## 遷移計劃

### 1. 漸進式重構
- 不需要一次性重寫整個系統
- 可以逐模塊進行重構
- 保持系統的可運行狀態

### 2. 雙寫模式
- 新功能使用Clean Architecture
- 舊功能逐步遷移
- 保持API的兼容性

### 3. 測試覆蓋
- 重構前確保測試覆蓋率
- 重構後驗證功能不變
- 逐步提高測試品質

## 優點分析

### 1. 可測試性
- 業務邏輯獨立於外部依賴
- 容易進行單元測試
- 測試速度快

### 2. 可維護性
- 清晰的分層結構
- 單一職責原則
- 高內聚低耦合

### 3. 可擴展性
- 新增功能只需添加新的用例
- 不影響現有代碼
- 支援不同的技術實現

### 4. 業務邏輯保護
- 業務規則集中在實體中
- 不依賴外部框架
- 易於理解和維護

## 總結

Clean Architecture為我們的ETC點雲標注系統提供了：

1. **穩固的業務邏輯**：核心業務規則不受技術變化影響
2. **高度可測試**：每一層都可以獨立測試
3. **技術無關性**：可以隨時替換技術實現
4. **清晰的職責分離**：每一層都有明確的責任
5. **可維護性**：代碼結構清晰，易於理解和修改

通過這種架構，我們能夠構建一個既能滿足當前需求，又能適應未來變化的系統。

---
*最後更新：2024年12月19日* 
# 多專案架構設計

## 概述

本文檔描述了點雲標注系統的多專案架構設計，支援多個獨立專案的並行運作，每個專案擁有獨立的成員、權限、任務和配置。

## 設計原則

### 1. 專案隔離原則
- **邏輯隔離**：採用資料庫層面的邏輯隔離，而非物理隔離
- **權限隔離**：每個專案擁有獨立的權限體系
- **資料隔離**：專案間的資料預設不可互相訪問

### 2. 靈活性原則
- **跨專案統計**：支援跨專案的統計分析
- **資源共享**：全局資源（如車種分類）可在專案間共享
- **角色獨立**：用戶在不同專案中可擁有不同角色

### 3. 可擴展性原則
- **水平擴展**：支援大量專案的並行運作
- **垂直擴展**：支援專案內的大量資料處理

## 資料庫設計

### 核心資料模型

#### 專案模型
```python
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.ACTIVE)
    settings = Column(JSON)  # 專案特定配置
    created_by = Column(UUID, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    creator = relationship("User", back_populates="created_projects")
    members = relationship("ProjectMember", back_populates="project")
    tasks = relationship("Task", back_populates="project")
    annotations = relationship("Annotation", back_populates="project")
    vehicle_types = relationship("ProjectVehicleType", back_populates="project")

class ProjectStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"
    SUSPENDED = "suspended"
```

#### 專案成員模型
```python
class ProjectMember(Base):
    __tablename__ = "project_members"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    project_id = Column(UUID, ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(ProjectRole), nullable=False)
    permissions = Column(JSON)  # 專案特定權限
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 複合唯一約束
    __table_args__ = (UniqueConstraint('project_id', 'user_id'),)
    
    # 關聯
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")

class ProjectRole(str, Enum):
    PROJECT_ADMIN = "project_admin"          # 專案管理員
    ANNOTATOR = "annotator"                  # 標注員
    REVIEWER = "reviewer"                    # 審核員
    QUALITY_CONTROLLER = "quality_controller" # 品質控制員
    VIEWER = "viewer"                        # 查看者
```

#### 更新後的核心模型
```python
class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    project_id = Column(UUID, ForeignKey("projects.id"), nullable=False)  # 新增
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    pointcloud_file_path = Column(String(500))
    assigned_to = Column(UUID, ForeignKey("users.id"))
    created_by = Column(UUID, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
    annotations = relationship("Annotation", back_populates="task")

class Annotation(Base):
    __tablename__ = "annotations"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    project_id = Column(UUID, ForeignKey("projects.id"), nullable=False)  # 新增
    task_id = Column(UUID, ForeignKey("tasks.id"), nullable=False)
    annotator_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    vehicle_type_id = Column(UUID, ForeignKey("project_vehicle_types.id"))
    confidence = Column(Float)
    notes = Column(Text)
    status = Column(Enum(AnnotationStatus), default=AnnotationStatus.DRAFT)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    project = relationship("Project", back_populates="annotations")
    task = relationship("Task", back_populates="annotations")
    annotator = relationship("User")
    vehicle_type = relationship("ProjectVehicleType")
```

### 車種分類系統

#### 全局車種分類
```python
class GlobalVehicleType(Base):
    __tablename__ = "global_vehicle_types"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))  # 分類群組
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    project_types = relationship("ProjectVehicleType", back_populates="source_global")
```

#### 專案車種分類
```python
class ProjectVehicleType(Base):
    __tablename__ = "project_vehicle_types"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    project_id = Column(UUID, ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(100))
    source_global_id = Column(UUID, ForeignKey("global_vehicle_types.id"))  # 來源全局分類
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    project = relationship("Project", back_populates="vehicle_types")
    source_global = relationship("GlobalVehicleType", back_populates="project_types")
    annotations = relationship("Annotation", back_populates="vehicle_type")
```

### 資料庫索引策略

```sql
-- 專案相關索引
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_members_active ON project_members(is_active);

-- 任務相關索引
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- 標注相關索引
CREATE INDEX idx_annotations_project_id ON annotations(project_id);
CREATE INDEX idx_annotations_task_id ON annotations(task_id);
CREATE INDEX idx_annotations_annotator_id ON annotations(annotator_id);
CREATE INDEX idx_annotations_status ON annotations(status);

-- 車種分類索引
CREATE INDEX idx_project_vehicle_types_project_id ON project_vehicle_types(project_id);
CREATE INDEX idx_project_vehicle_types_active ON project_vehicle_types(is_active);
```

## 權限系統設計

### 全局權限層級
```python
class GlobalRole(str, Enum):
    SUPER_ADMIN = "super_admin"     # 系統超級管理員
    SYSTEM_ADMIN = "system_admin"   # 系統管理員
    USER = "user"                   # 一般用戶

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    global_role = Column(Enum(GlobalRole), default=GlobalRole.USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 關聯
    project_memberships = relationship("ProjectMember", back_populates="user")
    created_projects = relationship("Project", back_populates="creator")
```

### 權限檢查邏輯
```python
class ProjectPermissionService:
    def __init__(self, db: Session):
        self.db = db
    
    def check_project_access(self, user_id: UUID, project_id: UUID, required_permission: str) -> bool:
        """檢查用戶對專案的訪問權限"""
        # 1. 檢查全局管理員權限
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and user.global_role in [GlobalRole.SUPER_ADMIN, GlobalRole.SYSTEM_ADMIN]:
            return True
        
        # 2. 檢查專案成員權限
        member = self.db.query(ProjectMember).filter(
            ProjectMember.user_id == user_id,
            ProjectMember.project_id == project_id,
            ProjectMember.is_active == True
        ).first()
        
        if not member:
            return False
        
        # 3. 檢查角色權限
        return self._check_role_permission(member.role, required_permission)
    
    def _check_role_permission(self, role: ProjectRole, permission: str) -> bool:
        """檢查角色是否擁有特定權限"""
        role_permissions = {
            ProjectRole.PROJECT_ADMIN: [
                "project.manage", "task.create", "task.assign", "task.delete",
                "annotation.review", "annotation.approve", "user.invite", "settings.modify"
            ],
            ProjectRole.ANNOTATOR: [
                "task.view", "task.annotate", "annotation.create", "annotation.edit"
            ],
            ProjectRole.REVIEWER: [
                "task.view", "annotation.view", "annotation.review", "annotation.approve"
            ],
            ProjectRole.QUALITY_CONTROLLER: [
                "task.view", "annotation.view", "annotation.review", "quality.analyze"
            ],
            ProjectRole.VIEWER: [
                "task.view", "annotation.view"
            ]
        }
        
        return permission in role_permissions.get(role, [])
```

## 服務層設計

### 專案管理服務
```python
class ProjectService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_project(self, name: str, description: str, creator_id: UUID) -> Project:
        """創建新專案"""
        project = Project(
            name=name,
            description=description,
            created_by=creator_id
        )
        self.db.add(project)
        await self.db.flush()
        
        # 自動將創建者設為專案管理員
        await self.add_project_member(
            project.id, creator_id, ProjectRole.PROJECT_ADMIN
        )
        
        await self.db.commit()
        return project
    
    async def add_project_member(self, project_id: UUID, user_id: UUID, role: ProjectRole) -> ProjectMember:
        """添加專案成員"""
        member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role
        )
        self.db.add(member)
        await self.db.commit()
        return member
    
    async def get_user_projects(self, user_id: UUID) -> List[Project]:
        """獲取用戶參與的專案"""
        return self.db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == user_id,
            ProjectMember.is_active == True
        ).all()
```

### 專案感知服務基類
```python
class ProjectAwareService:
    """專案感知服務基類，所有業務服務都應繼承此類"""
    
    def __init__(self, db: Session, current_project_id: UUID):
        self.db = db
        self.current_project_id = current_project_id
    
    def _filter_by_project(self, query):
        """自動添加專案過濾條件"""
        return query.filter_by(project_id=self.current_project_id)
    
    def _ensure_project_access(self, entity):
        """確保實體屬於當前專案"""
        if hasattr(entity, 'project_id') and entity.project_id != self.current_project_id:
            raise UnauthorizedError("Access denied to entity from different project")
```

### 任務服務（專案感知）
```python
class TaskService(ProjectAwareService):
    async def create_task(self, name: str, description: str, creator_id: UUID) -> Task:
        """創建任務"""
        task = Task(
            project_id=self.current_project_id,
            name=name,
            description=description,
            created_by=creator_id
        )
        self.db.add(task)
        await self.db.commit()
        return task
    
    async def get_tasks(self, status: Optional[TaskStatus] = None) -> List[Task]:
        """獲取專案任務"""
        query = self.db.query(Task).filter(Task.project_id == self.current_project_id)
        if status:
            query = query.filter(Task.status == status)
        return query.all()
    
    async def assign_task(self, task_id: UUID, assignee_id: UUID) -> Task:
        """分配任務"""
        task = self.db.query(Task).filter(
            Task.id == task_id,
            Task.project_id == self.current_project_id
        ).first()
        
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
        await self.db.commit()
        return task
```

## 跨專案統計系統

### 跨專案統計服務
```python
class CrossProjectStatisticsService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_user_cross_project_stats(self, user_id: UUID) -> Dict:
        """獲取用戶跨專案統計"""
        # 獲取用戶參與的專案
        projects = self.db.query(Project).join(ProjectMember).filter(
            ProjectMember.user_id == user_id,
            ProjectMember.is_active == True
        ).all()
        
        stats = {
            "total_projects": len(projects),
            "projects_breakdown": [],
            "total_annotations": 0,
            "total_tasks_completed": 0
        }
        
        for project in projects:
            project_stats = await self._get_project_stats_for_user(project.id, user_id)
            stats["projects_breakdown"].append({
                "project_id": project.id,
                "project_name": project.name,
                "role": project_stats["role"],
                "annotations_count": project_stats["annotations_count"],
                "tasks_completed": project_stats["tasks_completed"]
            })
            stats["total_annotations"] += project_stats["annotations_count"]
            stats["total_tasks_completed"] += project_stats["tasks_completed"]
        
        return stats
    
    async def get_global_system_stats(self) -> Dict:
        """獲取全系統統計"""
        return {
            "total_projects": self.db.query(Project).count(),
            "active_projects": self.db.query(Project).filter(
                Project.status == ProjectStatus.ACTIVE
            ).count(),
            "total_users": self.db.query(User).count(),
            "total_annotations": self.db.query(Annotation).count(),
            "total_tasks": self.db.query(Task).count(),
            "projects_by_status": self._get_projects_by_status(),
            "annotations_by_project": self._get_annotations_by_project()
        }
    
    async def generate_cross_project_report(self, report_type: str, user_id: UUID) -> Dict:
        """生成跨專案報表"""
        # 檢查用戶是否有跨專案報表權限
        user = self.db.query(User).filter(User.id == user_id).first()
        if user.global_role not in [GlobalRole.SUPER_ADMIN, GlobalRole.SYSTEM_ADMIN]:
            # 只能看自己參與的專案
            projects = self.db.query(Project).join(ProjectMember).filter(
                ProjectMember.user_id == user_id,
                ProjectMember.is_active == True
            ).all()
        else:
            # 管理員可以看所有專案
            projects = self.db.query(Project).all()
        
        if report_type == "productivity":
            return await self._generate_productivity_report(projects)
        elif report_type == "quality":
            return await self._generate_quality_report(projects)
        else:
            raise ValueError(f"Unknown report type: {report_type}")
```

## 車種分類管理

### 車種分類服務
```python
class VehicleTypeService:
    def __init__(self, db: Session):
        self.db = db
    
    async def get_global_vehicle_types(self) -> List[GlobalVehicleType]:
        """獲取全局車種分類"""
        return self.db.query(GlobalVehicleType).filter(
            GlobalVehicleType.is_active == True
        ).all()
    
    async def create_global_vehicle_type(self, name: str, description: str) -> GlobalVehicleType:
        """創建全局車種分類"""
        vehicle_type = GlobalVehicleType(
            name=name,
            description=description
        )
        self.db.add(vehicle_type)
        await self.db.commit()
        return vehicle_type
    
    async def get_project_vehicle_types(self, project_id: UUID) -> List[ProjectVehicleType]:
        """獲取專案車種分類"""
        return self.db.query(ProjectVehicleType).filter(
            ProjectVehicleType.project_id == project_id,
            ProjectVehicleType.is_active == True
        ).all()
    
    async def import_from_global(self, project_id: UUID, global_type_id: UUID) -> ProjectVehicleType:
        """從全局分類導入到專案"""
        global_type = self.db.query(GlobalVehicleType).filter(
            GlobalVehicleType.id == global_type_id
        ).first()
        
        if not global_type:
            raise NotFoundError("Global vehicle type not found")
        
        # 檢查是否已存在
        existing = self.db.query(ProjectVehicleType).filter(
            ProjectVehicleType.project_id == project_id,
            ProjectVehicleType.source_global_id == global_type_id
        ).first()
        
        if existing:
            raise ValidationError("Vehicle type already imported")
        
        project_type = ProjectVehicleType(
            project_id=project_id,
            name=global_type.name,
            description=global_type.description,
            category=global_type.category,
            source_global_id=global_type_id
        )
        self.db.add(project_type)
        await self.db.commit()
        return project_type
    
    async def create_custom_vehicle_type(self, project_id: UUID, name: str, description: str) -> ProjectVehicleType:
        """創建專案特定車種分類"""
        project_type = ProjectVehicleType(
            project_id=project_id,
            name=name,
            description=description,
            source_global_id=None  # 標記為專案特定
        )
        self.db.add(project_type)
        await self.db.commit()
        return project_type
```

## API設計

### 專案相關API
```python
# 專案管理路由
@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """創建新專案"""
    project = await project_service.create_project(
        project_data.name,
        project_data.description,
        current_user.id
    )
    return ProjectResponse.from_orm(project)

@router.get("/projects", response_model=List[ProjectResponse])
async def get_user_projects(
    current_user: User = Depends(get_current_user)
):
    """獲取用戶的專案列表"""
    projects = await project_service.get_user_projects(current_user.id)
    return [ProjectResponse.from_orm(p) for p in projects]

@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(require_project_access("project.view"))
):
    """獲取專案詳情"""
    project = await project_service.get_project(project_id)
    return ProjectResponse.from_orm(project)
```

### 專案感知API依賴
```python
def get_current_project(
    project_id: UUID = Path(...),
    current_user: User = Depends(get_current_user)
) -> Project:
    """獲取當前專案並檢查訪問權限"""
    # 檢查專案存在性
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 檢查用戶是否有訪問權限
    if not permission_service.check_project_access(current_user.id, project_id, "project.view"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return project

def require_project_permission(permission: str):
    """專案權限檢查裝飾器"""
    def permission_checker(
        current_project: Project = Depends(get_current_project),
        current_user: User = Depends(get_current_user)
    ):
        if not permission_service.check_project_access(current_user.id, current_project.id, permission):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return permission_checker
```

## 前端架構調整

### 專案上下文管理
```tsx
// 專案上下文
interface ProjectContextType {
  currentProject: Project | null;
  userProjects: Project[];
  switchProject: (projectId: string) => void;
  userProjectRole: ProjectRole | null;
  hasPermission: (permission: string) => boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [userProjectRole, setUserProjectRole] = useState<ProjectRole | null>(null);
  
  const switchProject = useCallback((projectId: string) => {
    const project = userProjects.find(p => p.id === projectId);
    if (project) {
      setCurrentProject(project);
      // 獲取用戶在該專案的角色
      fetchUserProjectRole(projectId);
    }
  }, [userProjects]);
  
  const hasPermission = useCallback((permission: string) => {
    if (!currentProject || !userProjectRole) return false;
    return checkRolePermission(userProjectRole, permission);
  }, [currentProject, userProjectRole]);
  
  const value = {
    currentProject,
    userProjects,
    switchProject,
    userProjectRole,
    hasPermission
  };
  
  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
```

### 路由結構
```tsx
// 主路由結構
const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 全局路由 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/projects" element={<ProjectListPage />} />
        
        {/* 專案特定路由 */}
        <Route path="/projects/:projectId" element={<ProjectLayout />}>
          <Route index element={<ProjectDashboard />} />
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="annotations" element={<AnnotationListPage />} />
          <Route path="annotations/:annotationId" element={<AnnotationDetailPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<ProjectSettingsPage />} />
        </Route>
        
        {/* 系統管理路由 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="cross-project-stats" element={<CrossProjectStatsPage />} />
          <Route path="global-vehicle-types" element={<GlobalVehicleTypesPage />} />
          <Route path="users" element={<UserManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
```

## 部署考量

### 環境變數
```env
# 多專案相關配置
ENABLE_MULTI_PROJECT=true
DEFAULT_PROJECT_QUOTA=1000  # 預設專案配額
MAX_PROJECTS_PER_USER=10   # 每用戶最大專案數
CROSS_PROJECT_STATS_ENABLED=true
```

### 資料庫遷移
```python
# 遷移腳本示例
def upgrade():
    # 創建專案表
    op.create_table(
        'projects',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('settings', sa.JSON()),
        sa.Column('created_by', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'])
    )
    
    # 為現有表添加專案ID
    op.add_column('tasks', sa.Column('project_id', sa.UUID(), nullable=True))
    op.add_column('annotations', sa.Column('project_id', sa.UUID(), nullable=True))
    
    # 創建預設專案並遷移現有資料
    # ... 遷移邏輯
```

## 監控和日誌

### 專案相關監控指標
```python
# 新增專案相關監控指標
PROJECT_COUNT = Gauge('projects_total', 'Total number of projects')
PROJECT_MEMBERS_COUNT = Gauge('project_members_total', 'Total project members', ['project_id'])
CROSS_PROJECT_QUERIES = Counter('cross_project_queries_total', 'Cross-project queries')
```

## 總結

此多專案架構設計提供了：

1. **完整的專案隔離**：採用邏輯隔離確保資料安全
2. **靈活的權限管理**：支援專案級別的角色和權限
3. **跨專案統計能力**：滿足管理需求
4. **車種分類共享**：提高配置效率
5. **可擴展性**：支援大量專案並行運作

這個設計既保證了專案間的獨立性，又提供了必要的跨專案功能，是一個平衡的解決方案。 
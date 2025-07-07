# ETC Point Cloud Annotation System

🎯 **專業的點雲標注系統**，用於車種辨識 AI 模型訓練，支援多人協作、智能任務分配和完整審核工作流。

## 🚀 快速開始

### 前置需求

- Docker Desktop
- Git
- 至少 8GB 記憶體

### 一鍵啟動

```bash
# 克隆專案
git clone <repository-url>
cd ETC

# 啟動所有服務
docker-compose -f docker-compose.dev.yml up -d

# 等待服務啟動（約 2-3 分鐘）
docker-compose -f docker-compose.dev.yml logs -f
```

### 訪問服務

| 服務 | 地址 | 說明 |
|------|------|------|
| 🌐 **主應用** | http://localhost | 完整的前後端應用 |
| 🎨 **前端** | http://localhost:3000 | React 用戶界面 |
| 🔌 **後端 API** | http://localhost:8000 | FastAPI 服務 |
| 📚 **API 文檔** | http://localhost:8000/api/v1/docs | Swagger UI |
| 💾 **MinIO 控制台** | http://localhost:9001 | 文件存儲管理 |
| 🌸 **Celery Flower** | http://localhost:5555 | 任務監控 |

### 預設帳號

| 服務 | 帳號 | 密碼 |
|------|------|------|
| MinIO | minioadmin | minioadmin |
| PostgreSQL | root | root |

## 🏗️ 系統架構

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx (80)    │    │  Frontend (3000)│    │  Backend (8000) │
│   反向代理       │◄──►│  React + Vite   │◄──►│  FastAPI        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │ Celery Worker   │◄───────────┤
                       │ 背景任務處理      │            │
                       └─────────────────┘            │
                                                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ PostgreSQL      │◄──►│ Redis (6379)    │◄──►│ MinIO (9000)    │
│ 主資料庫        │    │ 緩存 + 消息佇列  │    │ 對象存儲        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 核心功能

### 🔐 用戶管理
- **多級權限控制**：管理員、標注員、審核員、查看者
- **多專案支援**：每個專案獨立的權限管理
- **JWT 認證**：安全的用戶身份驗證

### 📊 專案管理
- **專案創建與配置**：靈活的專案設置
- **車種分類管理**：動態可調整的分類系統
- **成員管理**：邀請和管理專案成員

### 📋 任務分配
- **智能分發**：自動化任務分配算法
- **負載均衡**：確保工作量均勻分配
- **任務狀態追蹤**：實時監控任務進度

### 🏷️ 點雲標注
- **3D 點雲渲染**：基於 Three.js 的高性能顯示
- **交互式標注**：直觀的車種分類操作
- **標注歷史**：完整的操作記錄追蹤

### ✅ 審核工作流
- **多級審核**：確保標注品質
- **爭議處理**：處理標注不一致問題
- **品質控制**：統計和分析標注品質

### 📈 統計報表
- **工作統計**：用戶和專案的工作量統計
- **品質分析**：標注準確率和一致性分析
- **跨專案報表**：多專案數據匯總

## 🛠️ 技術棧

### 前端
- **React 18** + **TypeScript** - 現代化用戶界面
- **Vite** - 快速構建工具
- **Ant Design** - 企業級 UI 組件庫
- **Three.js** + **React Three Fiber** - 3D 點雲渲染
- **React Router** - 路由管理
- **React Query** - 數據狀態管理
- **Zustand** - 全局狀態管理

### 後端
- **Python 3.11** + **FastAPI** - 高性能 Web 框架
- **SQLAlchemy** + **Alembic** - ORM 和資料庫遷移
- **PostgreSQL** - 關聯式資料庫
- **Redis** - 緩存和消息佇列
- **Celery** - 異步任務處理
- **MinIO** - 對象存儲

### 基礎設施
- **Docker** + **Docker Compose** - 容器化部署
- **Nginx** - 反向代理和負載均衡
- **pre-commit** - 代碼品質控制

## 📚 開發指南

### 選擇開發環境

#### 🐳 Docker 開發環境（推薦用於全棧開發）
```bash
# 一鍵啟動完整環境
./start-dev.sh

# 或手動啟動
docker-compose -f docker-compose.dev.yml up -d
```

#### 💻 本地虛擬環境（推薦用於單獨開發）
```bash
# 1. 設置虛擬環境
./setup-dev-env.sh

# 2. 啟動本地開發服務器
./start-local-dev.sh

# 或手動啟動
cd backend && poetry shell && uvicorn app.main:app --reload &
cd frontend && pnpm dev &
```

### 開發環境對比

| 特性 | Docker 環境 | 本地虛擬環境 |
|------|------------|-------------|
| **環境一致性** | ✅ 完全一致 | ⚠️ 依賴本地環境 |
| **啟動速度** | ⚠️ 較慢（~2-3分鐘） | ✅ 快速（~30秒） |
| **IDE 支持** | ⚠️ 需要配置 | ✅ 原生支持 |
| **調試體驗** | ⚠️ 需要額外配置 | ✅ 直接斷點調試 |
| **資源使用** | ⚠️ 較高 | ✅ 較低 |
| **完整服務** | ✅ 包含所有服務 | ⚠️ 需要 Docker 數據庫 |

### 開發工具設置

```bash
# 查看服務狀態
docker-compose -f docker-compose.dev.yml ps

# 查看特定服務日誌
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f api
```

### 停止和清理

```bash
# 停止所有服務
docker-compose -f docker-compose.dev.yml down

# 停止並刪除數據卷（重置數據）
docker-compose -f docker-compose.dev.yml down -v

# 重建所有映像
docker-compose -f docker-compose.dev.yml build --no-cache
```

### 單獨操作服務

```bash
# 只啟動資料庫服務
docker-compose -f docker-compose.dev.yml up -d db redis minio

# 重建並重啟前端
docker-compose -f docker-compose.dev.yml up -d --build frontend

# 進入後端容器
docker-compose -f docker-compose.dev.yml exec api bash

# 執行資料庫遷移
docker-compose -f docker-compose.dev.yml exec api alembic upgrade head
```

## 📁 專案結構

```
ETC/
├── frontend/                # React 前端應用
│   ├── src/
│   │   ├── components/      # 可重用組件
│   │   ├── pages/          # 頁面組件
│   │   ├── hooks/          # 自定義 Hooks
│   │   ├── store/          # 狀態管理
│   │   └── utils/          # 工具函數
│   ├── package.json        # 前端依賴
│   └── Dockerfile.dev      # 前端容器
├── backend/                 # FastAPI 後端服務
│   ├── app/
│   │   ├── api/v1/         # API 路由
│   │   ├── core/           # 核心配置
│   │   ├── models/         # 資料庫模型
│   │   ├── services/       # 業務邏輯
│   │   └── schemas/        # Pydantic 模型
│   ├── requirements.txt    # 後端依賴
│   └── Dockerfile.dev      # 後端容器
├── docs/                   # 專案文檔
├── docker-compose.dev.yml  # 開發環境編排
├── nginx.dev.conf          # Nginx 配置
└── README.md              # 專案說明
```

## 🔧 配置說明

### 虛擬環境配置

#### 後端虛擬環境 (Poetry)
```bash
# 安裝 Poetry
curl -sSL https://install.python-poetry.org | python3 -

# 設置項目虛擬環境
cd backend
poetry config virtualenvs.in-project true
poetry install

# 激活虛擬環境
poetry shell

# 運行服務
poetry run uvicorn app.main:app --reload
```

#### 前端虛擬環境 (pnpm)
```bash
# 安裝 pnpm
npm install -g pnpm

# 安裝依賴
cd frontend
pnpm install

# 運行服務
pnpm dev
```

#### IDE 配置
- **VSCode**: 自動配置 `.vscode/settings.json`
- **PyCharm**: 設置解釋器為 `backend/.venv/bin/python`
- **其他**: 參考 `DEV_GUIDE.md`

### 環境變數

主要配置透過環境變數管理，詳見：
- `backend/env.example` - 後端環境變數範例
- `frontend/.env.local` - 前端環境變數（可選）

### 資料庫配置

開發環境預設設置：
- **Host**: localhost:5432
- **Database**: etc_pointcloud_dev
- **User/Password**: root/root

### 對象存儲配置

MinIO 開發環境設置：
- **Console**: http://localhost:9001
- **API**: http://localhost:9000
- **Access Key**: minioadmin
- **Secret Key**: minioadmin

## 🚀 部署

### 開發環境
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 生產環境
```bash
# 構建生產映像
docker-compose -f docker-compose.prod.yml build

# 啟動生產服務
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 監控和日誌

### 健康檢查

```bash
# 檢查所有服務健康狀態
curl http://localhost/health
curl http://localhost:8000/api/v1/health
```

### 日誌查看

```bash
# 查看所有服務日誌
docker-compose -f docker-compose.dev.yml logs

# 查看特定服務日誌並跟隨
docker-compose -f docker-compose.dev.yml logs -f api
```

### 性能監控

- **Celery Flower**: http://localhost:5555 - 任務執行監控
- **MinIO 監控**: http://localhost:9001 - 存儲使用情況
- **Nginx 日誌**: 容器內 `/var/log/nginx/`

## 🐛 故障排除

### 常見問題

1. **容器無法啟動**
   ```bash
   # 檢查 Docker 狀態
   docker ps -a
   
   # 查看容器日誌
   docker-compose logs [service-name]
   ```

2. **端口衝突**
   ```bash
   # 檢查端口使用情況
   lsof -i :80 -i :3000 -i :8000 -i :5432
   
   # 修改 docker-compose.dev.yml 中的端口映射
   ```

3. **資料庫連接失敗**
   ```bash
   # 重置資料庫
   docker-compose -f docker-compose.dev.yml down -v
   docker-compose -f docker-compose.dev.yml up -d db
   ```

4. **前端無法連接後端**
   ```bash
   # 檢查網絡連接
   docker-compose -f docker-compose.dev.yml exec frontend ping api
   
   # 檢查 API 是否正常
   curl http://localhost:8000/health
   ```

### 重置指令

```bash
# 完全重置（刪除所有數據）
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a
docker-compose -f docker-compose.dev.yml up -d --build
```

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 創建 Pull Request

### 代碼規範

- **後端**: 使用 Black、isort、flake8、mypy
- **前端**: 使用 ESLint、TypeScript
- **提交**: 使用 pre-commit hooks

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 文件。

## 📞 支援

- **文檔**: [查看完整文檔](docs/)
- **問題追蹤**: [GitHub Issues](https://github.com/etc/pointcloud/issues)
- **郵件**: dev@etc.com

---

**ETC Point Cloud Annotation System** - 讓點雲標注變得簡單高效 🚀 
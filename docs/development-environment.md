# 開發環境

## 環境需求

### 系統需求
> 描述開發環境的系統需求

### 硬體需求
> 描述硬體需求和建議配置

## 開發工具

### 必備工具
| 工具 | 版本 | 用途 | 下載連結 |
|------|------|------|----------|
| Git | 最新版 | 版本控制 | [git-scm.com](https://git-scm.com/) |
| Node.js | - | 前端開發 | [nodejs.org](https://nodejs.org/) |
| Python | - | 後端開發 | [python.org](https://python.org/) |
| Docker | 最新版 | 容器化 | [docker.com](https://docker.com/) |

### 推薦工具
| 工具 | 版本 | 用途 | 下載連結 |
|------|------|------|----------|
| VS Code | 最新版 | 代碼編輯器 | [code.visualstudio.com](https://code.visualstudio.com/) |
| Postman | 最新版 | API 測試 | [postman.com](https://postman.com/) |
| DBeaver | 最新版 | 資料庫管理 | [dbeaver.io](https://dbeaver.io/) |

## 環境配置

### 前端環境配置
```bash
# 安裝 Node.js 和 npm
# 安裝專案依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 後端環境配置
```bash
# 建立虛擬環境
python -m venv venv

# 啟動虛擬環境
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 安裝依賴
pip install -r requirements.txt

# 啟動開發伺服器
python manage.py runserver
```

### 資料庫環境配置
```bash
# 使用 Docker 啟動資料庫
docker-compose up -d

# 執行資料庫遷移
python manage.py migrate
```

## VS Code 配置

### 推薦擴展
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "formulahendry.auto-rename-tag",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### 工作區配置
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "python.defaultInterpreterPath": "./venv/bin/python"
}
```

## 代碼規範工具

### 前端代碼規範
```javascript
// .eslintrc.js
module.exports = {
  // ESLint 配置
};

// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2
}
```

### 後端代碼規範
```python
# pyproject.toml
[tool.black]
line-length = 88

[tool.isort]
profile = "black"
```

## 環境變數配置

### 開發環境變數
```bash
# .env.development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=project_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
```

### 生產環境變數
```bash
# .env.production
DB_HOST=prod_host
DB_PORT=5432
DB_NAME=project_prod
DB_USER=prod_user
DB_PASSWORD=prod_password
```

## Docker 配置

### 開發環境 Docker
```dockerfile
# Dockerfile.dev
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: project_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
```

## 測試環境

### 單元測試
```bash
# 前端測試
npm run test

# 後端測試
python -m pytest
```

### 集成測試
```bash
# 啟動測試環境
docker-compose -f docker-compose.test.yml up -d

# 執行集成測試
npm run test:integration
```

## 故障排除

### 常見問題
> 列出常見的環境配置問題和解決方法

### 除錯工具
> 描述除錯工具和使用方法

---
*最後更新：待填入* 

# 開發環境配置

## 技術配置決策

### 後端技術棧
| 技術 | 版本/配置 | 說明 |
|------|-----------|------|
| Python | 3.11 | 後端開發語言 |
| FastAPI | 最新穩定版 | Web 框架 |
| PostgreSQL | 13+ | 主資料庫 |
| Redis | 7+ | 緩存和消息佇列 |
| MinIO | 最新版 | 對象存儲 |
| Docker | 最新版 | 容器化部署 |

### 開發工具
| 工具 | 版本 | 用途 |
|------|------|------|
| Cursor | 最新版 | 主要 IDE |
| Docker Desktop | 最新版 | 容器管理 |
| Git | 最新版 | 版本控制 |

### 代碼規範
| 工具 | 配置 | 用途 |
|------|------|------|
| Black | Google Style | 代碼格式化 |
| isort | Black 兼容 | 導入排序 |
| flake8 | Google Style | 代碼檢查 |
| mypy | 嚴格模式 | 類型檢查 |
| pre-commit | 全套 hooks | 提交前檢查 |

## 資料庫配置

### PostgreSQL 配置
```bash
# 開發環境配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=etc_pointcloud_dev
DB_USER=root
DB_PASSWORD=root  # 暫時使用，後續改為配置文件
```

### Redis 配置
```bash
# 開發環境配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

### MinIO 配置
```bash
# 開發環境配置
MINIO_HOST=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=pointcloud-files
```

## API 設計規範

### 版本策略
- 基礎路徑：`/api/v1/`
- 自動文檔：Swagger UI 啟用
- 文檔路徑：`/api/v1/docs`

### 認證策略
- JWT Token 認證
- 多級權限控制
- 專案級別權限

## 環境變數配置

### 開發環境 (.env.development)
```bash
# 資料庫配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=etc_pointcloud_dev
DB_USER=root
DB_PASSWORD=root

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# MinIO 配置
MINIO_HOST=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=pointcloud-files

# JWT 配置
JWT_SECRET_KEY=your-super-secret-key-here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# 應用配置
APP_NAME=ETC Point Cloud Annotation System
APP_VERSION=1.0.0
DEBUG=True
```

### 測試環境 (.env.test)
```bash
# 測試資料庫
DB_NAME=etc_pointcloud_test
DEBUG=False
```

### 生產環境 (.env.production)
```bash
# 生產環境配置（從外部配置管理系統載入）
DEBUG=False
```

## Docker 配置

### 開發環境 Docker Compose
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: etc_pointcloud_dev
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
      - minio
    environment:
      - DB_HOST=db
      - REDIS_HOST=redis
      - MINIO_HOST=minio
    volumes:
      - ./backend:/app
      - /app/__pycache__

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

## 後端專案結構

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 應用入口
│   │   ├── __init__.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py          # 配置管理
│   │   │   ├── database.py        # 資料庫連接
│   │   │   ├── security.py        # 認證安全
│   │   │   └── exceptions.py      # 異常處理
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth.py        # 認證 API
│   │   │   │   ├── projects.py    # 專案 API
│   │   │   │   ├── tasks.py       # 任務 API
│   │   │   │   ├── annotations.py # 標注 API
│   │   │   │   └── users.py       # 用戶 API
│   │   │   └── deps.py            # 依賴注入
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py           # 用戶模型
│   │   │   ├── project.py        # 專案模型
│   │   │   ├── task.py           # 任務模型
│   │   │   └── annotation.py     # 標注模型
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # 認證服務
│   │   │   ├── project.py        # 專案服務
│   │   │   ├── task.py           # 任務服務
│   │   │   └── file_storage.py   # 文件存儲服務
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── user.py           # 用戶 Pydantic 模型
│   │   │   ├── project.py        # 專案 Pydantic 模型
│   │   │   └── task.py           # 任務 Pydantic 模型
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── helpers.py        # 工具函數
│   │       └── constants.py      # 常數定義
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_projects.py
│   │   └── conftest.py
│   ├── migrations/                # Alembic 遷移文件
│   ├── requirements.txt
│   ├── pyproject.toml            # Python 專案配置
│   ├── .env.example              # 環境變數範例
│   ├── .pre-commit-config.yaml   # Pre-commit 配置
│   ├── Dockerfile.dev            # 開發環境 Dockerfile
│   ├── Dockerfile.prod           # 生產環境 Dockerfile
│   └── README.md
```

## 代碼風格配置

### pyproject.toml
```toml
[tool.black]
line-length = 88
target-version = ['py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''

[tool.isort]
profile = "black"
multi_line_output = 3
line_length = 88
include_trailing_comma = true
force_grid_wrap = 0
use_parentheses = true
ensure_newline_before_comments = true

[tool.flake8]
max-line-length = 88
extend-ignore = ["E203", "E501", "W503"]
exclude = [".git", "__pycache__", ".venv", "migrations"]

[tool.mypy]
python_version = "3.11"
check_untyped_defs = true
disallow_any_generics = true
disallow_incomplete_defs = true
disallow_untyped_defs = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
```

### .pre-commit-config.yaml
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/psf/black
    rev: 22.10.0
    hooks:
      - id: black

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.0.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
```

## 開發流程

### 1. 環境啟動
```bash
# 啟動所有服務
docker-compose -f docker-compose.dev.yml up -d

# 查看服務狀態
docker-compose -f docker-compose.dev.yml ps
```

### 2. 資料庫遷移
```bash
# 進入 API 容器
docker-compose -f docker-compose.dev.yml exec api bash

# 初始化遷移
alembic init migrations

# 創建遷移
alembic revision --autogenerate -m "Initial migration"

# 執行遷移
alembic upgrade head
```

### 3. 開發測試
```bash
# 執行測試
docker-compose -f docker-compose.dev.yml exec api pytest

# 代碼格式化
docker-compose -f docker-compose.dev.yml exec api black .

# 類型檢查
docker-compose -f docker-compose.dev.yml exec api mypy .
```

### 4. 服務訪問
- API 文檔：http://localhost:8000/api/v1/docs
- MinIO 控制台：http://localhost:9001
- 資料庫：localhost:5432

## 故障排除

### 常見問題
1. **容器無法啟動**：檢查 Docker Desktop 是否運行
2. **資料庫連接失敗**：確認 PostgreSQL 容器正常運行
3. **文件上傳失敗**：檢查 MinIO 服務狀態和權限

### 除錯工具
- Docker logs：`docker-compose logs [service_name]`
- 容器內部：`docker-compose exec [service_name] bash`
- 資料庫查詢：使用 DBeaver 或 pgAdmin

---
*最後更新：2024年12月19日* 
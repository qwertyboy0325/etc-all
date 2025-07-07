#!/bin/bash

# ETC Point Cloud Annotation System - 開發環境設置腳本
# 該腳本用於設置本地開發虛擬環境

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：打印有顏色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 函數：檢查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 函數：檢查 Python 版本
check_python() {
    if ! command_exists python3; then
        print_error "Python 3 未安裝，請先安裝 Python 3.11+"
        exit 1
    fi
    
    python_version=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    required_version="3.11"
    
    if [[ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]]; then
        print_error "Python 版本 $python_version 太舊，需要 $required_version 或更新版本"
        exit 1
    fi
    
    print_success "Python $python_version 已安裝"
}

# 函數：檢查 Node.js 版本
check_node() {
    if ! command_exists node; then
        print_error "Node.js 未安裝，請先安裝 Node.js 18+"
        exit 1
    fi
    
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    required_version="18"
    
    if [[ $node_version -lt $required_version ]]; then
        print_error "Node.js 版本 $node_version 太舊，需要 $required_version 或更新版本"
        exit 1
    fi
    
    print_success "Node.js v$(node --version | cut -d'v' -f2) 已安裝"
}

# 函數：安裝 Poetry
install_poetry() {
    if command_exists poetry; then
        print_success "Poetry 已安裝"
        return
    fi
    
    print_info "安裝 Poetry..."
    curl -sSL https://install.python-poetry.org | python3 -
    
    # 添加到 PATH
    export PATH="$HOME/.local/bin:$PATH"
    
    if command_exists poetry; then
        print_success "Poetry 安裝成功"
    else
        print_error "Poetry 安裝失敗，請手動安裝"
        exit 1
    fi
}

# 函數：安裝 pnpm
install_pnpm() {
    if command_exists pnpm; then
        print_success "pnpm 已安裝"
        return
    fi
    
    print_info "安裝 pnpm..."
    npm install -g pnpm
    
    if command_exists pnpm; then
        print_success "pnpm 安裝成功"
    else
        print_error "pnpm 安裝失敗，請手動安裝"
        exit 1
    fi
}

# 函數：設置後端虛擬環境
setup_backend() {
    print_info "設置後端虛擬環境..."
    
    cd backend
    
    # 配置 Poetry 在項目目錄創建虛擬環境
    poetry config virtualenvs.in-project true
    
    # 安裝依賴
    print_info "安裝後端依賴..."
    poetry install
    
    # 創建 .env 文件
    if [[ ! -f .env ]]; then
        print_info "創建 .env 文件..."
        cp env.example .env
        print_warning "請根據需要修改 .env 文件中的配置"
    fi
    
    # 激活虛擬環境並顯示信息
    print_success "後端虛擬環境設置完成"
    print_info "虛擬環境位置: $(poetry env info --path)"
    print_info "啟動虛擬環境: poetry shell"
    print_info "運行後端服務: poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    
    cd ..
}

# 函數：設置前端虛擬環境
setup_frontend() {
    print_info "設置前端虛擬環境..."
    
    cd frontend
    
    # 安裝依賴
    print_info "安裝前端依賴..."
    pnpm install
    
    # 創建 .env.local 文件
    if [[ ! -f .env.local ]]; then
        print_info "創建 .env.local 文件..."
        cat > .env.local << 'EOF'
# 前端環境變數
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=ETC Point Cloud Annotation System
VITE_VERSION=1.0.0
VITE_NODE_ENV=development
EOF
        print_warning "請根據需要修改 .env.local 文件中的配置"
    fi
    
    print_success "前端虛擬環境設置完成"
    print_info "運行前端服務: pnpm dev"
    print_info "類型檢查: pnpm type-check"
    print_info "代碼檢查: pnpm lint"
    
    cd ..
}

# 函數：設置 IDE 配置
setup_ide() {
    print_info "設置 IDE 配置..."
    
    # VSCode 配置
    if [[ ! -d .vscode ]]; then
        mkdir -p .vscode
        
        # 工作區設置
        cat > .vscode/settings.json << 'EOF'
{
    "python.defaultInterpreterPath": "./backend/.venv/bin/python",
    "python.terminal.activateEnvironment": false,
    "python.formatting.provider": "black",
    "python.formatting.blackArgs": ["--line-length", "88"],
    "python.linting.enabled": true,
    "python.linting.flake8Enabled": true,
    "python.linting.mypyEnabled": true,
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["tests"],
    "typescript.preferences.importModuleSpecifier": "relative",
    "typescript.suggest.autoImports": true,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    },
    "files.associations": {
        "*.yml": "yaml",
        "*.yaml": "yaml"
    },
    "yaml.schemas": {
        "https://json.schemastore.org/docker-compose.json": ["docker-compose*.yml", "docker-compose*.yaml"]
    }
}
EOF
        
        # 推薦的擴展
        cat > .vscode/extensions.json << 'EOF'
{
    "recommendations": [
        "ms-python.python",
        "ms-python.black-formatter",
        "ms-python.flake8",
        "ms-python.mypy-type-checker",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-typescript-next",
        "esbenp.prettier-vscode",
        "ms-vscode.vscode-json",
        "redhat.vscode-yaml",
        "ms-vscode-remote.remote-containers",
        "ms-vscode.vscode-docker",
        "mhutchie.git-graph",
        "eamodio.gitlens"
    ]
}
EOF

        # 啟動配置
        cat > .vscode/launch.json << 'EOF'
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: FastAPI",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/backend/.venv/bin/uvicorn",
            "args": ["app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
            "cwd": "${workspaceFolder}/backend",
            "env": {
                "PYTHONPATH": "${workspaceFolder}/backend"
            },
            "console": "integratedTerminal",
            "justMyCode": false
        },
        {
            "name": "Python: Current File",
            "type": "python",
            "request": "launch",
            "program": "${file}",
            "cwd": "${workspaceFolder}/backend",
            "env": {
                "PYTHONPATH": "${workspaceFolder}/backend"
            },
            "console": "integratedTerminal",
            "justMyCode": false
        }
    ]
}
EOF
        
        print_success "VSCode 配置已創建"
    fi
    
    # 創建開發指南
    cat > DEV_GUIDE.md << 'EOF'
# 開發環境指南

## 🚀 快速開始

### 1. 設置虛擬環境
```bash
# 運行設置腳本
./setup-dev-env.sh

# 或手動設置
cd backend && poetry install && cd ..
cd frontend && pnpm install && cd ..
```

### 2. 啟動開發服務器

#### 後端開發
```bash
cd backend
poetry shell                    # 激活虛擬環境
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 前端開發
```bash
cd frontend
pnpm dev                        # 啟動開發服務器
```

### 3. 數據庫設置
```bash
# 使用 Docker 啟動數據庫
docker-compose -f docker-compose.dev.yml up -d db redis minio

# 運行數據庫遷移
cd backend
poetry run alembic upgrade head
```

## 🛠️ 開發工具

### 後端工具
- **代碼格式化**: `poetry run black app/`
- **導入排序**: `poetry run isort app/`
- **代碼檢查**: `poetry run flake8 app/`
- **類型檢查**: `poetry run mypy app/`
- **測試**: `poetry run pytest`
- **測試覆蓋率**: `poetry run pytest --cov=app`

### 前端工具
- **代碼檢查**: `pnpm lint`
- **類型檢查**: `pnpm type-check`
- **格式化**: `pnpm lint:fix`
- **測試**: `pnpm test`
- **構建**: `pnpm build`

## 🔧 IDE 配置

### VSCode
- 已自動配置 Python 解釋器路徑
- 已配置代碼格式化和檢查
- 已配置調試啟動配置
- 推薦安裝擴展列表

### PyCharm
- 設置 Python 解釋器: `backend/.venv/bin/python`
- 設置工作目錄: `backend/`
- 配置代碼風格: Black

## 🐳 Docker vs 本地開發

### 使用 Docker 開發
- **優點**: 環境一致、完整的服務棧
- **適用**: 全棧開發、集成測試
- **啟動**: `./start-dev.sh`

### 使用本地虛擬環境
- **優點**: 快速啟動、IDE 支持好、調試方便
- **適用**: 單獨開發前端或後端
- **啟動**: 分別啟動前後端服務

## 📋 常見任務

### 添加新的依賴
```bash
# 後端
cd backend
poetry add package_name
poetry add --group dev package_name  # 開發依賴

# 前端
cd frontend
pnpm add package_name
pnpm add -D package_name  # 開發依賴
```

### 數據庫遷移
```bash
cd backend
poetry run alembic revision --autogenerate -m "描述"
poetry run alembic upgrade head
```

### 運行測試
```bash
# 後端測試
cd backend
poetry run pytest tests/

# 前端測試
cd frontend
pnpm test
```

## 🔍 調試

### 後端調試
- 使用 VSCode 調試配置
- 或在代碼中添加 `import pdb; pdb.set_trace()`

### 前端調試
- 使用瀏覽器開發者工具
- 使用 React DevTools 擴展

## 🚨 常見問題

1. **虛擬環境路徑問題**
   - 確保使用 `poetry shell` 激活環境
   - 檢查 IDE 中的 Python 解釋器路徑

2. **依賴安裝問題**
   - 刪除 `node_modules/` 或 `.venv/` 重新安裝
   - 確保 Python 和 Node.js 版本正確

3. **端口衝突**
   - 檢查端口是否被其他服務占用
   - 修改配置文件中的端口設置
EOF

    print_success "開發指南已創建: DEV_GUIDE.md"
}

# 函數：顯示完成信息
show_completion() {
    echo
    print_success "🎉 開發環境設置完成！"
    echo
    echo "📋 下一步："
    echo "  1. 閱讀開發指南: cat DEV_GUIDE.md"
    echo "  2. 配置 IDE（推薦 VSCode）"
    echo "  3. 啟動數據庫服務: docker-compose -f docker-compose.dev.yml up -d db redis minio"
    echo "  4. 運行數據庫遷移: cd backend && poetry run alembic upgrade head"
    echo "  5. 啟動開發服務器:"
    echo "     - 後端: cd backend && poetry shell && uvicorn app.main:app --reload"
    echo "     - 前端: cd frontend && pnpm dev"
    echo
    echo "🛠️ 開發工具："
    echo "  - 後端虛擬環境: backend/.venv"
    echo "  - 前端依賴: frontend/node_modules"
    echo "  - IDE 配置: .vscode/"
    echo
    echo "📚 文檔："
    echo "  - 開發指南: DEV_GUIDE.md"
    echo "  - 專案文檔: docs/"
    echo
}

# 主函數
main() {
    echo "======================================"
    echo "ETC Point Cloud Annotation System"
    echo "開發環境設置腳本"
    echo "======================================"
    echo
    
    # 檢查依賴
    check_python
    check_node
    
    # 安裝工具
    install_poetry
    install_pnpm
    
    # 設置虛擬環境
    setup_backend
    setup_frontend
    
    # 設置 IDE 配置
    setup_ide
    
    # 顯示完成信息
    show_completion
}

# 處理中斷信號
trap 'echo -e "\n${YELLOW}[INFO]${NC} 腳本已中斷"; exit 0' INT

# 執行主函數
main "$@" 
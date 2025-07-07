#!/bin/bash

# ETC Point Cloud Annotation System - 本地開發環境啟動腳本
# 該腳本用於在本地虛擬環境中啟動開發服務器

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

# 函數：檢查虛擬環境是否存在
check_virtual_envs() {
    if [[ ! -d "backend/.venv" ]]; then
        print_error "後端虛擬環境不存在，請先運行 ./setup-dev-env.sh"
        exit 1
    fi
    
    if [[ ! -d "frontend/node_modules" ]]; then
        print_error "前端依賴不存在，請先運行 ./setup-dev-env.sh"
        exit 1
    fi
    
    print_success "虛擬環境檢查通過"
}

# 函數：檢查數據庫服務
check_database() {
    print_info "檢查數據庫服務..."
    
    if ! docker ps | grep -q "etc_postgres_dev"; then
        print_warning "數據庫服務未運行，嘗試啟動..."
        docker-compose -f docker-compose.dev.yml up -d db redis minio
        
        # 等待數據庫啟動
        print_info "等待數據庫服務啟動..."
        sleep 10
        
        if ! docker ps | grep -q "etc_postgres_dev"; then
            print_error "數據庫服務啟動失敗"
            exit 1
        fi
    fi
    
    print_success "數據庫服務正在運行"
}

# 函數：運行數據庫遷移
run_migrations() {
    print_info "運行數據庫遷移..."
    
    cd backend
    if ! poetry run alembic upgrade head; then
        print_error "數據庫遷移失敗"
        exit 1
    fi
    cd ..
    
    print_success "數據庫遷移完成"
}

# 函數：啟動後端服務
start_backend() {
    print_info "啟動後端服務..."
    
    cd backend
    
    # 在後台啟動後端服務
    poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    
    cd ..
    
    print_success "後端服務已啟動 (PID: $BACKEND_PID)"
    
    # 等待後端服務就緒
    print_info "等待後端服務就緒..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            print_success "後端服務就緒"
            break
        fi
        
        print_info "等待後端服務就緒 ($attempt/$max_attempts)..."
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "後端服務啟動超時"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
}

# 函數：啟動前端服務
start_frontend() {
    print_info "啟動前端服務..."
    
    cd frontend
    
    # 在後台啟動前端服務
    pnpm dev &
    FRONTEND_PID=$!
    
    cd ..
    
    print_success "前端服務已啟動 (PID: $FRONTEND_PID)"
    
    # 等待前端服務就緒
    print_info "等待前端服務就緒..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            print_success "前端服務就緒"
            break
        fi
        
        print_info "等待前端服務就緒 ($attempt/$max_attempts)..."
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "前端服務啟動超時"
        kill $FRONTEND_PID 2>/dev/null || true
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
}

# 函數：顯示服務信息
show_services() {
    echo
    print_success "🚀 本地開發環境已啟動！"
    echo
    echo "📋 服務訪問地址："
    echo "  🎨 前端:        http://localhost:3000"
    echo "  🔌 後端 API:    http://localhost:8000"
    echo "  📚 API 文檔:    http://localhost:8000/api/v1/docs"
    echo "  💾 MinIO 控制台: http://localhost:9001"
    echo
    echo "🔐 預設帳號："
    echo "  MinIO:       minioadmin / minioadmin"
    echo "  PostgreSQL:  root / root"
    echo
    echo "🛠️ 開發工具："
    echo "  - 後端日誌: tail -f backend/logs/app.log"
    echo "  - 前端熱重載: 代碼變更自動刷新"
    echo "  - IDE 調試: 使用 VSCode 調試配置"
    echo
    echo "⚡ 常用指令："
    echo "  - 重啟後端: kill $BACKEND_PID && cd backend && poetry run uvicorn app.main:app --reload"
    echo "  - 重啟前端: kill $FRONTEND_PID && cd frontend && pnpm dev"
    echo "  - 查看日誌: docker-compose -f docker-compose.dev.yml logs -f db"
    echo
    echo "🔍 調試："
    echo "  - 使用 VSCode 調試配置進行斷點調試"
    echo "  - 查看瀏覽器開發者工具"
    echo "  - 檢查 API 文檔進行接口測試"
    echo
}

# 函數：等待用戶輸入並清理
wait_and_cleanup() {
    echo
    print_info "按 Ctrl+C 停止服務"
    
    # 等待用戶中斷
    while true; do
        sleep 1
    done
}

# 函數：清理進程
cleanup() {
    echo
    print_info "正在停止服務..."
    
    # 停止後端服務
    if [[ -n "$BACKEND_PID" ]]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_info "後端服務已停止"
    fi
    
    # 停止前端服務
    if [[ -n "$FRONTEND_PID" ]]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_info "前端服務已停止"
    fi
    
    # 清理後台進程
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    print_success "服務已停止"
    exit 0
}

# 主函數
main() {
    echo "======================================"
    echo "ETC Point Cloud Annotation System"
    echo "本地開發環境啟動腳本"
    echo "======================================"
    echo
    
    # 檢查虛擬環境
    check_virtual_envs
    
    # 檢查數據庫服務
    check_database
    
    # 運行數據庫遷移
    run_migrations
    
    # 啟動後端服務
    start_backend
    
    # 啟動前端服務
    start_frontend
    
    # 顯示服務信息
    show_services
    
    # 等待用戶輸入並清理
    wait_and_cleanup
}

# 處理中斷信號
trap cleanup INT TERM

# 執行主函數
main "$@" 
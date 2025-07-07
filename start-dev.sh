#!/bin/bash

# ETC Point Cloud Annotation System - 開發環境啟動腳本
# 該腳本用於快速啟動開發環境

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

# 函數：檢查 Docker 是否運行
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker 未運行，請先啟動 Docker Desktop"
        exit 1
    fi
    print_success "Docker 已運行"
}

# 函數：檢查端口是否被佔用
check_ports() {
    local ports=(80 3000 8000 5432 6379 9000 9001 5555)
    local occupied_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -i :$port >/dev/null 2>&1; then
            occupied_ports+=($port)
        fi
    done
    
    if [ ${#occupied_ports[@]} -gt 0 ]; then
        print_warning "以下端口被佔用，可能會導致服務無法正常啟動："
        for port in "${occupied_ports[@]}"; do
            echo "  - $port"
        done
        echo
        read -p "是否繼續啟動？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "已取消啟動"
            exit 0
        fi
    fi
}

# 函數：清理舊的容器和映像
cleanup() {
    print_info "清理舊的容器和映像..."
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    docker system prune -f >/dev/null 2>&1 || true
    print_success "清理完成"
}

# 函數：構建和啟動服務
start_services() {
    print_info "構建和啟動服務..."
    
    # 構建映像
    print_info "構建 Docker 映像..."
    docker-compose -f docker-compose.dev.yml build --no-cache
    
    # 啟動服務
    print_info "啟動服務..."
    docker-compose -f docker-compose.dev.yml up -d
    
    print_success "服務已啟動"
}

# 函數：等待服務就緒
wait_for_services() {
    print_info "等待服務就緒..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:8000/health >/dev/null 2>&1; then
            print_success "後端服務已就緒"
            break
        fi
        
        print_info "等待後端服務就緒 ($attempt/$max_attempts)..."
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "後端服務啟動超時"
        print_info "查看日誌："
        docker-compose -f docker-compose.dev.yml logs api
        exit 1
    fi
    
    # 等待前端服務
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            print_success "前端服務已就緒"
            break
        fi
        
        print_info "等待前端服務就緒 ($attempt/$max_attempts)..."
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "前端服務啟動超時"
        print_info "查看日誌："
        docker-compose -f docker-compose.dev.yml logs frontend
        exit 1
    fi
}

# 函數：顯示服務信息
show_services() {
    echo
    print_success "🚀 ETC Point Cloud Annotation System 開發環境已啟動！"
    echo
    echo "📋 服務訪問地址："
    echo "  🌐 主應用:      http://localhost"
    echo "  🎨 前端:        http://localhost:3000"
    echo "  🔌 後端 API:    http://localhost:8000"
    echo "  📚 API 文檔:    http://localhost:8000/api/v1/docs"
    echo "  💾 MinIO 控制台: http://localhost:9001"
    echo "  🌸 Celery 監控: http://localhost:5555"
    echo
    echo "🔐 預設帳號："
    echo "  MinIO:       minioadmin / minioadmin"
    echo "  PostgreSQL:  root / root"
    echo
    echo "🛠️ 常用指令："
    echo "  查看服務狀態: docker-compose -f docker-compose.dev.yml ps"
    echo "  查看日誌:     docker-compose -f docker-compose.dev.yml logs -f"
    echo "  停止服務:     docker-compose -f docker-compose.dev.yml down"
    echo "  重新構建:     docker-compose -f docker-compose.dev.yml build --no-cache"
    echo
}

# 主函數
main() {
    echo "======================================"
    echo "ETC Point Cloud Annotation System"
    echo "開發環境啟動腳本"
    echo "======================================"
    echo
    
    # 檢查 Docker
    check_docker
    
    # 檢查端口
    check_ports
    
    # 詢問是否清理
    echo
    read -p "是否清理舊的容器和映像？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup
    fi
    
    # 啟動服務
    start_services
    
    # 等待服務就緒
    wait_for_services
    
    # 顯示服務信息
    show_services
    
    # 詢問是否查看日誌
    echo
    read -p "是否查看實時日誌？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "按 Ctrl+C 退出日誌查看"
        docker-compose -f docker-compose.dev.yml logs -f
    fi
}

# 處理中斷信號
trap 'echo -e "\n${YELLOW}[INFO]${NC} 腳本已中斷"; exit 0' INT

# 執行主函數
main "$@" 
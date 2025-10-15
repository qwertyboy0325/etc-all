#!/bin/bash

# Local Deployment Script
# 本地部署腳本

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏠 本地部署 ETC 點雲註釋系統${NC}"
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安裝${NC}"
    echo "請先安裝 Docker Desktop:"
    echo "https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安裝${NC}"
    echo "請先安裝 Docker Compose"
    exit 1
fi

echo -e "${GREEN}✅ Docker 和 Docker Compose 已安裝${NC}"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker 未運行${NC}"
    echo "請先啟動 Docker Desktop"
    exit 1
fi

echo -e "${GREEN}✅ Docker 正在運行${NC}"
echo ""

# Create environment file for local deployment
echo -e "${YELLOW}📝 創建本地環境配置文件...${NC}"

cat > .env.local << EOF
# Local Development Environment Variables
POSTGRES_DB=etc_pointcloud_local
POSTGRES_USER=root
POSTGRES_PASSWORD=root

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

MINIO_HOST=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=pointcloud-files
MINIO_SECURE=false

SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DEBUG=True
ENVIRONMENT=development

BACKEND_CORS_ORIGINS=http://localhost:3000
EOF

echo -e "${GREEN}✅ 環境配置文件已創建: .env.local${NC}"

# Create local docker-compose file
echo -e "${YELLOW}📝 創建本地 Docker Compose 文件...${NC}"

cat > docker-compose.local.yml << EOF
version: '3.8'

services:
  # PostgreSQL Database
  db:
    image: postgres:13-alpine
    container_name: etc_postgres_local
    environment:
      POSTGRES_DB: etc_pointcloud_local
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d etc_pointcloud_local"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache and Message Broker
  redis:
    image: redis:7-alpine
    container_name: etc_redis_local
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

  # MinIO Object Storage
  minio:
    image: minio/minio:latest
    container_name: etc_minio_local
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # FastAPI Backend
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: etc_api_local
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=etc_pointcloud_local
      - DB_USER=root
      - DB_PASSWORD=root
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_DB=0
      - MINIO_HOST=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - MINIO_BUCKET=pointcloud-files
      - MINIO_SECURE=false
      - DEBUG=True
      - ENVIRONMENT=development
      - SECRET_KEY=your-secret-key-here
      - BACKEND_CORS_ORIGINS=http://localhost:3000
    volumes:
      - ./backend:/app
      - /app/__pycache__
      - /app/.pytest_cache
    networks:
      - app_network
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Celery Worker
  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: etc_celery_worker_local
    command: celery -A app.celery_app worker --loglevel=info
    environment:
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=etc_pointcloud_local
      - DB_USER=root
      - DB_PASSWORD=root
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_DB=0
      - MINIO_HOST=minio
      - MINIO_PORT=9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
      - MINIO_BUCKET=pointcloud-files
      - MINIO_SECURE=false
      - DEBUG=True
      - ENVIRONMENT=development
      - SECRET_KEY=your-secret-key-here
    volumes:
      - ./backend:/app
      - /app/__pycache__
    networks:
      - app_network
    depends_on:
      - db
      - redis
      - minio
    restart: unless-stopped

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: etc_frontend_local
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - CHOKIDAR_USEPOLLING=true
      - VITE_API_BASE_URL=http://localhost:8000
      - VITE_APP_NAME=ETC Point Cloud Annotation System
      - VITE_VERSION=1.0.0
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/dist
    networks:
      - app_network
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local

networks:
  app_network:
    driver: bridge
EOF

echo -e "${GREEN}✅ Docker Compose 文件已創建: docker-compose.local.yml${NC}"

# Start services
echo -e "${YELLOW}🚀 啟動服務...${NC}"
docker-compose -f docker-compose.local.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
sleep 30

# Check service status
echo -e "${YELLOW}🔍 檢查服務狀態...${NC}"
docker-compose -f docker-compose.local.yml ps

# Check if services are healthy
echo -e "${YELLOW}🏥 檢查服務健康狀態...${NC}"

# Check database
if docker-compose -f docker-compose.local.yml exec -T db pg_isready -U root -d etc_pointcloud_local; then
    echo -e "${GREEN}✅ 數據庫已就緒${NC}"
else
    echo -e "${RED}❌ 數據庫未就緒${NC}"
fi

# Check Redis
if docker-compose -f docker-compose.local.yml exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✅ Redis 已就緒${NC}"
else
    echo -e "${RED}❌ Redis 未就緒${NC}"
fi

# Check MinIO
if docker-compose -f docker-compose.local.yml exec -T minio curl -f http://localhost:9000/minio/health/live; then
    echo -e "${GREEN}✅ MinIO 已就緒${NC}"
else
    echo -e "${RED}❌ MinIO 未就緒${NC}"
fi

# Check backend
if curl -f http://localhost:8000/api/v1/health; then
    echo -e "${GREEN}✅ 後端 API 已就緒${NC}"
else
    echo -e "${RED}❌ 後端 API 未就緒${NC}"
fi

# Check frontend
if curl -f http://localhost:3000; then
    echo -e "${GREEN}✅ 前端已就緒${NC}"
else
    echo -e "${RED}❌ 前端未就緒${NC}"
fi

echo ""
echo -e "${GREEN}🎉 本地部署完成！${NC}"
echo ""
echo -e "${BLUE}📋 訪問地址:${NC}"
echo "前端界面: http://localhost:3000"
echo "後端 API: http://localhost:8000"
echo "API 文檔: http://localhost:8000/docs"
echo "MinIO 控制台: http://localhost:9001"
echo "數據庫: localhost:5432"
echo "Redis: localhost:6379"
echo ""
echo -e "${BLUE}🔧 管理命令:${NC}"
echo "查看日誌: docker-compose -f docker-compose.local.yml logs -f"
echo "停止服務: docker-compose -f docker-compose.local.yml down"
echo "重啟服務: docker-compose -f docker-compose.local.yml restart"
echo "查看狀態: docker-compose -f docker-compose.local.yml ps"
echo ""
echo -e "${BLUE}📊 默認帳戶:${NC}"
echo "MinIO 控制台:"
echo "  用戶名: minioadmin"
echo "  密碼: minioadmin"
echo ""
echo -e "${GREEN}🎉 系統已準備就緒！${NC}"




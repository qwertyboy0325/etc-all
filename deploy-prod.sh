#!/bin/bash
# ETC Production Deployment Script
# One-command deployment for production servers

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   ETC Point Cloud Annotation System - Production Deployment   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}❌ Please do not run this script as root${NC}"
   echo "   Run as regular user with sudo access"
   exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found${NC}"
    echo "   Install: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found${NC}"
    echo "   Install: sudo curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "   sudo chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Function to generate secure random string
generate_secret() {
    openssl rand -hex ${1:-32}
}

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 .env file not found, creating from template...${NC}"
    
    # Prompt for domain
    read -p "Enter your domain/IP (e.g., example.com or leave empty for localhost): " DOMAIN
    if [ -z "$DOMAIN" ]; then
        DOMAIN="localhost"
    fi
    
    # Generate secure passwords
    DB_PASSWORD=$(generate_secret 16)
    MINIO_SECRET=$(generate_secret 20)
    SECRET_KEY=$(generate_secret 32)
    
    # Create .env file
    cat > .env << EOF
# Auto-generated production environment configuration
# Generated on: $(date)

# Database Configuration
POSTGRES_DB=etc_pointcloud_prod
POSTGRES_USER=root
POSTGRES_PASSWORD=${DB_PASSWORD}

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0

# MinIO Object Storage
MINIO_HOST=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=${MINIO_SECRET}
MINIO_BUCKET=pointcloud-files
MINIO_SECURE=false

# Application Security
SECRET_KEY=${SECRET_KEY}

# CORS Configuration
BACKEND_CORS_ORIGINS=["http://${DOMAIN}","http://localhost","https://${DOMAIN}"]

# Application Settings
DEBUG=False
ENVIRONMENT=production

# Admin User
FIRST_SUPERUSER_EMAIL=admin@${DOMAIN}
FIRST_SUPERUSER_PASSWORD=admin123
FIRST_SUPERUSER_NAME=Admin

# Dataset Export Path
DATASET_EXPORT_PATH=/data/datasets
EOF
    
    echo -e "${GREEN}✅ .env file created with secure random passwords${NC}"
    echo -e "${YELLOW}⚠️  Default admin password is 'admin123' - PLEASE CHANGE IT after first login!${NC}"
    echo ""
    
    # Show generated credentials
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo -e "${BLUE}Generated Credentials (save these securely):${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo "Admin Email: admin@${DOMAIN}"
    echo "Admin Password: admin123"
    echo -e "${YELLOW}Database Password: ${DB_PASSWORD}${NC}"
    echo -e "${YELLOW}MinIO Secret: ${MINIO_SECRET}${NC}"
    echo -e "${YELLOW}JWT Secret: ${SECRET_KEY}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════${NC}"
    echo ""
    
    read -p "Press Enter to continue with deployment..."
else
    echo -e "${GREEN}✅ .env file found${NC}"
    
    # Validate required variables
    REQUIRED_VARS=("POSTGRES_DB" "POSTGRES_USER" "POSTGRES_PASSWORD" "MINIO_SECRET_KEY" "SECRET_KEY" "BACKEND_CORS_ORIGINS")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}=" .env; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        printf '   - %s\n' "${MISSING_VARS[@]}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment configuration validated${NC}"
fi
echo ""

# Ask for deployment confirmation
echo -e "${YELLOW}🚀 Ready to deploy. This will:${NC}"
echo "   1. Stop existing containers (if any)"
echo "   2. Build/pull latest images"
echo "   3. Start all services"
echo "   4. Run health checks"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
echo ""

# Clean up option
read -p "Clean up old data volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Removing all data volumes...${NC}"
    docker-compose -f docker-compose.prod.yml down -v
    echo -e "${GREEN}✅ Data volumes cleaned${NC}"
fi
echo ""

# Pull/build images
echo -e "${BLUE}🔨 Building/pulling images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache
echo ""

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo ""

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Service Status:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

SERVICES=("etc_postgres_prod" "etc_redis_prod" "etc_minio_prod" "etc_api_prod" "etc_celery_worker_prod" "etc_nginx_prod")
ALL_HEALTHY=true

for service in "${SERVICES[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' ${service} 2>/dev/null || echo "running")
        if [ "$STATUS" == "healthy" ] || [ "$STATUS" == "running" ]; then
            echo -e "${GREEN}✅ ${service}${NC}"
        else
            echo -e "${RED}❌ ${service} (${STATUS})${NC}"
            ALL_HEALTHY=false
        fi
    else
        echo -e "${RED}❌ ${service} (not running)${NC}"
        ALL_HEALTHY=false
    fi
done

echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo ""

# Health check endpoints
echo -e "${BLUE}🔍 Testing health endpoints...${NC}"
sleep 5

# Test API health
if curl -sf http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  API health check failed (may need more time)${NC}"
    ALL_HEALTHY=false
fi

# Test Nginx
if curl -sf http://localhost/nginx-health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx health check failed${NC}"
    ALL_HEALTHY=false
fi

echo ""

# Final status
if [ "$ALL_HEALTHY" = true ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   🎉 Deployment Successful!               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Access your application:${NC}"
    echo "   Frontend: http://localhost"
    echo "   API: http://localhost/api/v1"
    echo "   API Docs: http://localhost/api/v1/docs"
    echo ""
    echo -e "${BLUE}View logs:${NC}"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
    echo ""
    echo -e "${BLUE}Stop services:${NC}"
    echo "   docker-compose -f docker-compose.prod.yml down"
else
    echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║   ⚠️  Deployment completed with warnings  ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Some services may need more time to start.${NC}"
    echo ""
    echo -e "${BLUE}Check logs for details:${NC}"
    echo "   docker-compose -f docker-compose.prod.yml logs -f api"
    echo "   docker-compose -f docker-compose.prod.yml logs -f celery_worker"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo "View all logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Check service status:"
echo "  docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "Restart a service:"
echo "  docker-compose -f docker-compose.prod.yml restart api"
echo ""
echo "Stop all services:"
echo "  docker-compose -f docker-compose.prod.yml down"
echo ""
echo "Update deployment:"
echo "  git pull && ./deploy-prod.sh"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"

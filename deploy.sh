#!/bin/bash

# Deployment Script for ETC Point Cloud Annotation System

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment setup...${NC}"

# 1. Create necessary directories
echo -e "${YELLOW}Creating data directories...${NC}"
mkdir -p ./data/postgres
mkdir -p ./data/redis
mkdir -p ./data/minio
mkdir -p ./training-data

# 2. Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Generating one with secure defaults...${NC}"
    
    # Generate random passwords
    POSTGRES_PASSWORD=$(openssl rand -hex 16)
    MINIO_SECRET_KEY=$(openssl rand -hex 16)
    SECRET_KEY=$(openssl rand -hex 32)
    FIRST_SUPERUSER_PASSWORD="admin" # Default for initial login
    
    cat > .env <<EOL
# Database Configuration
POSTGRES_DB=etc_pointcloud_prod
POSTGRES_USER=root
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# MinIO Configuration
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_BUCKET=pointcloud-files

# Application Security
SECRET_KEY=${SECRET_KEY}

# Initial Admin User (Change after first login!)
FIRST_SUPERUSER_EMAIL=admin@etc.com
FIRST_SUPERUSER_PASSWORD=${FIRST_SUPERUSER_PASSWORD}
FIRST_SUPERUSER_NAME=Admin

# CORS (Allow all for local network access, restrict in public production)
BACKEND_CORS_ORIGINS=["*"]

# Export Path (Inside Container)
DATASET_EXPORT_PATH=/data/datasets
EOL
    echo -e "${GREEN}.env file created successfully.${NC}"
else
    echo -e "${GREEN}Existing .env file found.${NC}"
fi

# 3. Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down

# 4. Build and Start
echo -e "${YELLOW}Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Wait for health checks
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
# Simple wait, real health check loop is complex in bash
sleep 15

# 6. Final Status
echo -e "${GREEN}Deployment completed!${NC}"
echo -e "Access the application at: ${GREEN}http://localhost${NC}"
echo -e "Default Admin: ${GREEN}admin@etc.com${NC}"
echo -e "Default Password: ${GREEN}admin${NC}"
echo -e "Exported Data will appear in: ${GREEN}./training-data${NC}"




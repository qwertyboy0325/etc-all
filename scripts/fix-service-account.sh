#!/bin/bash

# Fix Service Account Issues Script
# 修復服務帳戶問題

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 修復服務帳戶問題${NC}"
echo "================================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI 未安裝${NC}"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ 未設置 GCP 專案${NC}"
    echo "請先設置 GCP 專案:"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}當前專案: $PROJECT_ID${NC}"
echo ""

SERVICE_ACCOUNT="etc-service-account"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"

# Check if service account exists
echo -e "${YELLOW}🔍 檢查服務帳戶狀態...${NC}"
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 服務帳戶已存在: $SERVICE_ACCOUNT_EMAIL${NC}"
else
    echo -e "${YELLOW}⚠️  服務帳戶不存在，正在創建...${NC}"
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --display-name="ETC Point Cloud Service Account" \
        --description="Service account for ETC Point Cloud Annotation System"
    
    # Wait for service account to be fully created
    echo -e "${YELLOW}⏳ 等待服務帳戶創建完成...${NC}"
    sleep 15
    
    # Verify service account exists
    if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL >/dev/null 2>&1; then
        echo -e "${RED}❌ 服務帳戶創建失敗${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 服務帳戶創建成功${NC}"
fi

# Grant necessary permissions
echo -e "${YELLOW}🔐 授予權限...${NC}"

# Container Developer role
echo "授予 Container Developer 權限..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/container.developer" || echo "權限可能已存在"

# Container Registry Service Agent role
echo "授予 Container Registry Service Agent 權限..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/containerregistry.ServiceAgent" || echo "權限可能已存在"

# Compute Instance Admin role
echo "授予 Compute Instance Admin 權限..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/compute.instanceAdmin" || echo "權限可能已存在"

# Service Account User role
echo "授予 Service Account User 權限..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/iam.serviceAccountUser" || echo "權限可能已存在"

# Storage Admin role (for MinIO)
echo "授予 Storage Admin 權限..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.admin" || echo "權限可能已存在"

# Cloud Build Editor role
echo "授予 Cloud Build Editor 權限..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/cloudbuild.builds.editor" || echo "權限可能已存在"

echo -e "${GREEN}✅ 權限授予完成${NC}"

# Verify permissions
echo -e "${YELLOW}🔍 驗證權限...${NC}"
gcloud projects get-iam-policy $PROJECT_ID \
    --flatten="bindings[].members" \
    --format="table(bindings.role)" \
    --filter="bindings.members:$SERVICE_ACCOUNT_EMAIL"

echo ""
echo -e "${GREEN}🎉 服務帳戶修復完成！${NC}"
echo ""
echo -e "${BLUE}📋 服務帳戶信息:${NC}"
echo "服務帳戶: $SERVICE_ACCOUNT_EMAIL"
echo "專案: $PROJECT_ID"
echo ""
echo -e "${BLUE}🔧 下一步操作:${NC}"
echo "1. 繼續運行部署腳本:"
echo "   ./scripts/deploy-to-gcp.sh $PROJECT_ID asia-east1-a etc-pointcloud-cluster"
echo ""
echo "2. 或運行快速開始腳本:"
echo "   ./quick-start.sh"
echo ""
echo -e "${GREEN}🎉 修復完成！${NC}"




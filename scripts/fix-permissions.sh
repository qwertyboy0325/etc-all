#!/bin/bash

# Fix GCP Permissions Script
# 修復 GCP 權限問題

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 修復 GCP 權限問題${NC}"
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

# Check current user
CURRENT_USER=$(gcloud config get-value account 2>/dev/null || echo "")
echo -e "${GREEN}當前用戶: $CURRENT_USER${NC}"
echo ""

# Check if user is owner or has necessary permissions
echo -e "${YELLOW}🔍 檢查權限...${NC}"

# Check if user has Owner role
if gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:$CURRENT_USER" | grep -q "roles/owner"; then
    echo -e "${GREEN}✅ 用戶具有 Owner 權限${NC}"
    HAS_OWNER=true
else
    echo -e "${YELLOW}⚠️  用戶沒有 Owner 權限${NC}"
    HAS_OWNER=false
fi

# Check if user has Editor role
if gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:$CURRENT_USER" | grep -q "roles/editor"; then
    echo -e "${GREEN}✅ 用戶具有 Editor 權限${NC}"
    HAS_EDITOR=true
else
    echo -e "${YELLOW}⚠️  用戶沒有 Editor 權限${NC}"
    HAS_EDITOR=false
fi

# Check if user has Service Usage Admin role
if gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:$CURRENT_USER" | grep -q "roles/serviceusage.serviceUsageAdmin"; then
    echo -e "${GREEN}✅ 用戶具有 Service Usage Admin 權限${NC}"
    HAS_SERVICE_USAGE=true
else
    echo -e "${YELLOW}⚠️  用戶沒有 Service Usage Admin 權限${NC}"
    HAS_SERVICE_USAGE=false
fi

echo ""

# Provide solutions based on permissions
if [ "$HAS_OWNER" = true ]; then
    echo -e "${GREEN}✅ 用戶具有足夠權限，可以繼續部署${NC}"
    echo ""
    echo -e "${YELLOW}🔧 嘗試啟用必要的 API...${NC}"
    
    # Enable APIs one by one
    echo "啟用 Container API..."
    gcloud services enable container.googleapis.com || echo -e "${YELLOW}⚠️  Container API 啟用失敗${NC}"
    
    echo "啟用 Container Registry API..."
    gcloud services enable containerregistry.googleapis.com || echo -e "${YELLOW}⚠️  Container Registry API 啟用失敗${NC}"
    
    echo "啟用 Compute API..."
    gcloud services enable compute.googleapis.com || echo -e "${YELLOW}⚠️  Compute API 啟用失敗${NC}"
    
    echo "啟用 DNS API..."
    gcloud services enable dns.googleapis.com || echo -e "${YELLOW}⚠️  DNS API 啟用失敗${NC}"
    
    echo "啟用 Cloud Build API..."
    gcloud services enable cloudbuild.googleapis.com || echo -e "${YELLOW}⚠️  Cloud Build API 啟用失敗${NC}"
    
    echo "啟用 Source Repositories API..."
    gcloud services enable sourcerepo.googleapis.com || echo -e "${YELLOW}⚠️  Source Repositories API 啟用失敗${NC}"
    
    echo ""
    echo -e "${GREEN}✅ API 啟用完成${NC}"
    
elif [ "$HAS_EDITOR" = true ] || [ "$HAS_SERVICE_USAGE" = true ]; then
    echo -e "${YELLOW}⚠️  用戶權限不足，需要額外權限${NC}"
    echo ""
    echo -e "${BLUE}📋 解決方案:${NC}"
    echo "1. 請聯繫專案管理員授予以下權限："
    echo "   - Service Usage Admin (roles/serviceusage.serviceUsageAdmin)"
    echo "   - Project Editor (roles/editor)"
    echo "   - 或 Project Owner (roles/owner)"
    echo ""
    echo "2. 或者使用具有足夠權限的服務帳戶："
    echo "   gcloud auth activate-service-account --key-file=path/to/service-account-key.json"
    echo ""
    echo "3. 或者請求管理員啟用以下 API："
    echo "   - container.googleapis.com"
    echo "   - containerregistry.googleapis.com"
    echo "   - compute.googleapis.com"
    echo "   - dns.googleapis.com"
    echo "   - cloudbuild.googleapis.com"
    echo "   - sourcerepo.googleapis.com"
    
else
    echo -e "${RED}❌ 用戶權限嚴重不足${NC}"
    echo ""
    echo -e "${BLUE}📋 解決方案:${NC}"
    echo "1. 請聯繫專案管理員授予以下權限："
    echo "   - Project Owner (roles/owner)"
    echo "   - 或 Project Editor (roles/editor)"
    echo "   - 或 Service Usage Admin (roles/serviceusage.serviceUsageAdmin)"
    echo ""
    echo "2. 或者使用具有足夠權限的服務帳戶："
    echo "   gcloud auth activate-service-account --key-file=path/to/service-account-key.json"
    echo ""
    echo "3. 或者創建新的 GCP 專案："
    echo "   gcloud projects create your-new-project-id --name='ETC Point Cloud'"
    echo "   gcloud config set project your-new-project-id"
    echo "   gcloud billing projects link your-new-project-id --billing-account=YOUR_BILLING_ACCOUNT"
fi

echo ""

# Check billing
echo -e "${YELLOW}💳 檢查計費狀態...${NC}"
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "False")
if [ "$BILLING_ENABLED" = "False" ]; then
    echo -e "${RED}❌ 計費未啟用${NC}"
    echo "請在 GCP Console 中啟用計費："
    echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
else
    echo -e "${GREEN}✅ 計費已啟用${NC}"
fi

echo ""

# Provide alternative deployment options
echo -e "${BLUE}🔄 替代部署選項:${NC}"
echo "1. 使用 Docker Compose 在本地部署："
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "2. 使用現有的 GCP 專案（如果有足夠權限）："
echo "   gcloud config set project YOUR_EXISTING_PROJECT_ID"
echo "   ./scripts/setup-gcp-project.sh"
echo ""
echo "3. 創建新的 GCP 專案："
echo "   gcloud projects create your-new-project-id --name='ETC Point Cloud'"
echo "   gcloud config set project your-new-project-id"
echo "   gcloud billing projects link your-new-project-id --billing-account=YOUR_BILLING_ACCOUNT"
echo "   ./scripts/setup-gcp-project.sh"
echo ""

echo -e "${GREEN}🎉 權限檢查完成！${NC}"




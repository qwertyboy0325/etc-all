#!/bin/bash

# Setup GitHub + Cloud Build CI/CD Script
# 設置 GitHub + Cloud Build CI/CD

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 設置 GitHub + Cloud Build CI/CD${NC}"
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

# Check if GitHub repository exists
echo -e "${YELLOW}📋 請提供 GitHub 倉庫信息:${NC}"
read -p "GitHub 用戶名或組織名: " GITHUB_USER
read -p "倉庫名稱: " GITHUB_REPO
read -p "倉庫分支 (默認: main): " GITHUB_BRANCH
GITHUB_BRANCH=${GITHUB_BRANCH:-main}

echo ""
echo -e "${BLUE}GitHub 倉庫: https://github.com/$GITHUB_USER/$GITHUB_REPO${NC}"
echo -e "${BLUE}分支: $GITHUB_BRANCH${NC}"
echo ""

# Enable required APIs
echo -e "${YELLOW}🔧 啟用必要的 API...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable dns.googleapis.com

echo -e "${GREEN}✅ APIs 已啟用${NC}"

# Create Cloud Build trigger
echo -e "${YELLOW}🔨 創建 Cloud Build 觸發器...${NC}"

# Create trigger configuration
cat > cloudbuild-trigger.yaml << EOF
name: etc-pointcloud-deploy
description: Deploy ETC Point Cloud Annotation System
github:
  owner: $GITHUB_USER
  name: $GITHUB_REPO
  push:
    branch: $GITHUB_BRANCH
filename: cloudbuild.yaml
disabled: false
substitutions:
  _PROJECT_ID: $PROJECT_ID
  _REGION: asia-east1
  _ZONE: asia-east1-a
  _CLUSTER_NAME: etc-pointcloud-cluster
EOF

# Create the trigger
gcloud builds triggers create --trigger-config=cloudbuild-trigger.yaml

echo -e "${GREEN}✅ Cloud Build 觸發器已創建${NC}"

# Create GitHub App connection (if needed)
echo -e "${YELLOW}🔗 設置 GitHub 連接...${NC}"

# Check if GitHub App connection exists
if ! gcloud builds connections list --region=asia-east1 | grep -q "github"; then
    echo "創建 GitHub App 連接..."
    gcloud builds connections create github github-connection \
        --region=asia-east1 \
        --github-enterprise-host=github.com
    echo -e "${GREEN}✅ GitHub 連接已創建${NC}"
else
    echo -e "${GREEN}✅ GitHub 連接已存在${NC}"
fi

# Create service account for Cloud Build
echo -e "${YELLOW}👤 創建 Cloud Build 服務帳戶...${NC}"
SERVICE_ACCOUNT="etc-cloudbuild-sa"
gcloud iam service-accounts create $SERVICE_ACCOUNT \
    --display-name="ETC Cloud Build Service Account" \
    --description="Service account for ETC Cloud Build" || echo "Service account already exists"

# Grant necessary permissions
echo -e "${YELLOW}🔐 授予權限...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/containerregistry.ServiceAgent"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/compute.instanceAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

echo -e "${GREEN}✅ 權限已授予${NC}"

# Create GitHub Actions workflow
echo -e "${YELLOW}📝 創建 GitHub Actions 工作流程...${NC}"

mkdir -p .github/workflows

cat > .github/workflows/deploy.yml << EOF
name: Deploy to GCP

on:
  push:
    branches: [ $GITHUB_BRANCH ]
  pull_request:
    branches: [ $GITHUB_BRANCH ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v2
      with:
        project_id: $PROJECT_ID
        service_account_key: \${{ secrets.GCP_SA_KEY }}
        export_default_credentials: true
        
    - name: Configure Docker for GCR
      run: gcloud auth configure-docker
      
    - name: Build and push images
      run: |
        # Build backend image
        docker build -t gcr.io/$PROJECT_ID/etc-backend:latest ./backend
        docker push gcr.io/$PROJECT_ID/etc-backend:latest
        
        # Build frontend image
        docker build -t gcr.io/$PROJECT_ID/etc-frontend:latest ./frontend
        docker push gcr.io/$PROJECT_ID/etc-frontend:latest
        
    - name: Deploy to GKE
      run: |
        gcloud container clusters get-credentials etc-pointcloud-cluster --zone asia-east1-a
        kubectl apply -f k8s/
        kubectl rollout restart deployment/backend
        kubectl rollout restart deployment/frontend
EOF

echo -e "${GREEN}✅ GitHub Actions 工作流程已創建${NC}"

# Create deployment instructions
echo -e "${YELLOW}📋 創建部署說明...${NC}"

cat > GITHUB-SETUP.md << EOF
# GitHub + Cloud Build 設置說明

## 已完成的設置

1. ✅ Cloud Build 觸發器已創建
2. ✅ GitHub 連接已設置
3. ✅ 服務帳戶已創建並授予權限
4. ✅ GitHub Actions 工作流程已創建

## 下一步操作

### 1. 設置 GitHub Secrets

在 GitHub 倉庫設置中添加以下 secrets：

\`\`\`
GCP_SA_KEY: 服務帳戶密鑰 (JSON 格式)
\`\`\`

### 2. 獲取服務帳戶密鑰

\`\`\`bash
# 創建服務帳戶密鑰
gcloud iam service-accounts keys create gcp-sa-key.json \\
    --iam-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com

# 將 gcp-sa-key.json 的內容複製到 GitHub Secrets 中的 GCP_SA_KEY
\`\`\`

### 3. 推送代碼到 GitHub

\`\`\`bash
git add .
git commit -m "Add GitHub + Cloud Build CI/CD"
git push origin $GITHUB_BRANCH
\`\`\`

### 4. 觸發部署

推送代碼後，Cloud Build 會自動觸發部署。

## 手動觸發部署

\`\`\`bash
# 手動觸發 Cloud Build
gcloud builds triggers run etc-pointcloud-deploy --branch=$GITHUB_BRANCH
\`\`\`

## 檢查部署狀態

\`\`\`bash
# 查看 Cloud Build 歷史
gcloud builds list --limit=10

# 查看 GKE 集群狀態
gcloud container clusters get-credentials etc-pointcloud-cluster --zone asia-east1-a
kubectl get pods
kubectl get services
\`\`\`

## 訪問應用

部署完成後，應用將在以下地址可用：
- 前端: https://your-domain.com
- 後端 API: https://your-domain.com/api
- API 文檔: https://your-domain.com/docs

## 故障排除

### 如果 Cloud Build 失敗

1. 檢查 GitHub 連接狀態
2. 檢查服務帳戶權限
3. 查看 Cloud Build 日誌

### 如果部署失敗

1. 檢查 GKE 集群狀態
2. 檢查 Kubernetes 資源
3. 查看 Pod 日誌

## 有用的命令

\`\`\`bash
# 查看觸發器
gcloud builds triggers list

# 查看連接
gcloud builds connections list --region=asia-east1

# 查看服務帳戶
gcloud iam service-accounts list

# 查看權限
gcloud projects get-iam-policy $PROJECT_ID
\`\`\`
EOF

echo -e "${GREEN}✅ 部署說明已創建: GITHUB-SETUP.md${NC}"

# Create service account key
echo -e "${YELLOW}🔑 創建服務帳戶密鑰...${NC}"
gcloud iam service-accounts keys create gcp-sa-key.json \
    --iam-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com

echo -e "${GREEN}✅ 服務帳戶密鑰已創建: gcp-sa-key.json${NC}"

echo ""
echo -e "${GREEN}🎉 GitHub + Cloud Build CI/CD 設置完成！${NC}"
echo ""
echo -e "${BLUE}📋 下一步操作:${NC}"
echo "1. 將 gcp-sa-key.json 的內容添加到 GitHub Secrets 中的 GCP_SA_KEY"
echo "2. 推送代碼到 GitHub: git push origin $GITHUB_BRANCH"
echo "3. Cloud Build 會自動觸發部署"
echo ""
echo -e "${BLUE}📚 詳細說明:${NC}"
echo "- 查看 GITHUB-SETUP.md 獲取完整說明"
echo "- 運行 ./scripts/check-deployment.sh 檢查部署狀態"
echo ""
echo -e "${GREEN}🎉 設置完成！${NC}"




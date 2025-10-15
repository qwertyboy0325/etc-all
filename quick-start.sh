#!/bin/bash

# ETC Point Cloud Annotation System - Quick Start Script
# 快速開始腳本

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ETC 點雲註釋系統 - 快速開始${NC}"
echo "================================================"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI 未安裝${NC}"
    echo "請先安裝 gcloud CLI:"
    echo "curl https://sdk.cloud.google.com | bash"
    echo "exec -l \$SHELL"
    echo "gcloud init"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl 未安裝${NC}"
    echo "請先安裝 kubectl:"
    echo "gcloud components install kubectl"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安裝${NC}"
    echo "請先安裝 Docker Desktop"
    exit 1
fi

echo -e "${GREEN}✅ 所有必要工具已安裝${NC}"
echo ""

# Get project ID
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${YELLOW}⚠️  未設置 GCP 專案${NC}"
    echo "請先設置 GCP 專案:"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}當前專案: $CURRENT_PROJECT${NC}"
echo ""

# Confirm project
read -p "是否使用此專案進行部署？(y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "請先設置正確的專案:"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

PROJECT_ID=$CURRENT_PROJECT

echo ""
echo -e "${BLUE}📋 部署選項:${NC}"
echo "1. 自動部署到 GCP（推薦）- 一鍵完成所有設置"
echo "2. 手動部署到 GCP - 逐步指導"
echo "3. 本地部署（無需 GCP 權限）- 使用 Docker Compose"
echo "4. GitHub + Cloud Build CI/CD（推薦）- 現代化部署"
echo "5. GCP 免費額度部署（推薦）- 使用免費資源"
echo "6. 僅設置 GCP 專案"
echo "7. 僅部署應用"
echo "8. 檢查部署狀態"
echo "9. 修復 GCP 權限問題"
echo ""

read -p "請選擇選項 (1-9): " -n 1 -r
echo
echo ""

case $REPLY in
    1)
        echo -e "${YELLOW}🚀 開始自動部署到 GCP...${NC}"
        echo ""
        
        # Step 1: Setup GCP project
        echo -e "${YELLOW}步驟 1: 設置 GCP 專案${NC}"
        ./scripts/setup-gcp-project.sh
        
        # Step 2: Deploy to GCP
        echo -e "${YELLOW}步驟 2: 部署到 GCP${NC}"
        ./scripts/deploy-to-gcp.sh $PROJECT_ID asia-east1-a etc-pointcloud-cluster
        
        # Step 3: Check status
        echo -e "${YELLOW}步驟 3: 檢查部署狀態${NC}"
        ./scripts/check-deployment.sh
        
        echo -e "${GREEN}🎉 自動部署完成！${NC}"
        ;;
    2)
        echo -e "${YELLOW}📖 手動部署到 GCP 指導${NC}"
        echo ""
        echo "1. 設置 GCP 專案:"
        echo "   ./scripts/setup-gcp-project.sh"
        echo ""
        echo "2. 部署到 GCP:"
        echo "   ./scripts/deploy-to-gcp.sh $PROJECT_ID asia-east1-a etc-pointcloud-cluster"
        echo ""
        echo "3. 檢查狀態:"
        echo "   ./scripts/check-deployment.sh"
        echo ""
        echo "4. 設置 CI/CD (可選):"
        echo "   ./scripts/setup-cicd.sh"
        ;;
    3)
        echo -e "${YELLOW}🏠 開始本地部署...${NC}"
        echo ""
        echo "這將在本地使用 Docker Compose 部署系統，無需 GCP 權限"
        echo ""
        read -p "是否繼續？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./scripts/deploy-local.sh
        else
            echo -e "${YELLOW}取消本地部署${NC}"
        fi
        ;;
    4)
        echo -e "${YELLOW}🚀 設置 GitHub + Cloud Build CI/CD...${NC}"
        echo ""
        echo "這將設置現代化的 CI/CD 流程，使用 GitHub 倉庫和 Cloud Build"
        echo ""
        read -p "是否繼續？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./scripts/setup-github-cicd.sh
        else
            echo -e "${YELLOW}取消 GitHub CI/CD 設置${NC}"
        fi
        ;;
    5)
        echo -e "${YELLOW}🆓 開始 GCP 免費額度部署...${NC}"
        echo ""
        echo "這將使用 GCP 免費額度資源部署系統，不會產生費用"
        echo ""
        read -p "是否繼續？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./scripts/deploy-free-tier.sh
        else
            echo -e "${YELLOW}取消免費額度部署${NC}"
        fi
        ;;
    6)
        echo -e "${YELLOW}🔧 設置 GCP 專案...${NC}"
        ./scripts/setup-gcp-project.sh
        echo -e "${GREEN}✅ GCP 專案設置完成${NC}"
        ;;
    7)
        echo -e "${YELLOW}🚀 部署應用...${NC}"
        ./scripts/deploy-to-gcp.sh $PROJECT_ID asia-east1-a etc-pointcloud-cluster
        echo -e "${GREEN}✅ 應用部署完成${NC}"
        ;;
    8)
        echo -e "${YELLOW}🔍 檢查部署狀態...${NC}"
        ./scripts/check-deployment.sh
        ;;
    9)
        echo -e "${YELLOW}🔧 修復 GCP 權限問題...${NC}"
        ./scripts/fix-permissions.sh
        ;;
    *)
        echo -e "${RED}❌ 無效選項${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}📚 有用資源:${NC}"
echo "- 詳細部署指南: DEPLOYMENT-GUIDE.md"
echo "- 檢查狀態: ./scripts/check-deployment.sh"
echo "- 更新部署: ./scripts/update-deployment.sh"
echo "- 生成密鑰: ./scripts/generate-secrets.sh"
echo ""
echo -e "${GREEN}🎉 完成！${NC}"

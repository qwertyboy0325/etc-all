#!/bin/bash

# Check deployment status script
# 檢查部署狀態腳本

set -e

# Configuration
PROJECT_ID=${1:-$(gcloud config get-value project 2>/dev/null || echo "")}
CLUSTER_NAME=${2:-"etc-pointcloud-cluster"}
ZONE=${3:-"asia-east1-a"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 檢查 ETC 點雲註釋系統部署狀態${NC}"
echo "================================================"
echo "專案 ID: $PROJECT_ID"
echo "集群: $CLUSTER_NAME"
echo "區域: $ZONE"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI 未安裝${NC}"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl 未安裝${NC}"
    exit 1
fi

# Set project
if [ -n "$PROJECT_ID" ]; then
    gcloud config set project $PROJECT_ID
fi

# Get cluster credentials
echo -e "${YELLOW}🔑 獲取集群憑證...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Check cluster status
echo -e "${YELLOW}🏗️  檢查集群狀態...${NC}"
gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --format="value(status)"

# Check nodes
echo -e "${YELLOW}🖥️  檢查節點...${NC}"
kubectl get nodes

echo ""

# Check namespace
echo -e "${YELLOW}📦 檢查命名空間...${NC}"
kubectl get namespace etc-pointcloud 2>/dev/null || echo -e "${RED}❌ 命名空間不存在${NC}"

# Check pods
echo -e "${YELLOW}📦 檢查 Pods...${NC}"
kubectl get pods -n etc-pointcloud

echo ""

# Check services
echo -e "${YELLOW}🌐 檢查服務...${NC}"
kubectl get services -n etc-pointcloud

echo ""

# Check deployments
echo -e "${YELLOW}🚀 檢查部署...${NC}"
kubectl get deployments -n etc-pointcloud

echo ""

# Check ingress
echo -e "${YELLOW}🚪 檢查 Ingress...${NC}"
kubectl get ingress -n etc-pointcloud

echo ""

# Check external IP
echo -e "${YELLOW}🌍 檢查外部 IP...${NC}"
EXTERNAL_IP=$(kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "未設置")
if [ "$EXTERNAL_IP" = "未設置" ]; then
    echo -e "${RED}❌ 外部 IP 未設置${NC}"
else
    echo -e "${GREEN}✅ 外部 IP: $EXTERNAL_IP${NC}"
fi

echo ""

# Check deployment status
echo -e "${YELLOW}📊 檢查部署狀態...${NC}"
kubectl rollout status deployment/backend -n etc-pointcloud --timeout=30s || echo -e "${RED}❌ 後端部署未就緒${NC}"
kubectl rollout status deployment/frontend -n etc-pointcloud --timeout=30s || echo -e "${RED}❌ 前端部署未就緒${NC}"
kubectl rollout status deployment/celery-worker -n etc-pointcloud --timeout=30s || echo -e "${RED}❌ Celery 工作器部署未就緒${NC}"

echo ""

# Check resource usage
echo -e "${YELLOW}📈 檢查資源使用情況...${NC}"
kubectl top pods -n etc-pointcloud 2>/dev/null || echo -e "${YELLOW}⚠️  無法獲取資源使用情況（可能需要安裝 metrics-server）${NC}"

echo ""

# Check logs for errors
echo -e "${YELLOW}📋 檢查最近的事件...${NC}"
kubectl get events -n etc-pointcloud --sort-by='.lastTimestamp' | tail -10

echo ""

# Summary
echo -e "${BLUE}📋 部署摘要:${NC}"
echo "專案 ID: $PROJECT_ID"
echo "集群: $CLUSTER_NAME"
echo "區域: $ZONE"
echo "外部 IP: $EXTERNAL_IP"
echo ""

# Check if all pods are running
POD_COUNT=$(kubectl get pods -n etc-pointcloud --no-headers | wc -l)
RUNNING_PODS=$(kubectl get pods -n etc-pointcloud --no-headers | grep "Running" | wc -l)

if [ "$POD_COUNT" -eq "$RUNNING_PODS" ] && [ "$POD_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ 所有 Pods 正在運行${NC}"
else
    echo -e "${RED}❌ 部分 Pods 未運行${NC}"
    echo "總 Pods: $POD_COUNT"
    echo "運行中: $RUNNING_PODS"
fi

echo ""

# Useful commands
echo -e "${BLUE}🔧 有用命令:${NC}"
echo "查看所有資源: kubectl get all -n etc-pointcloud"
echo "查看日誌: kubectl logs -f deployment/backend -n etc-pointcloud"
echo "進入 Pod: kubectl exec -it POD_NAME -n etc-pointcloud -- /bin/bash"
echo "重啟部署: kubectl rollout restart deployment/backend -n etc-pointcloud"
echo ""

if [ "$EXTERNAL_IP" != "未設置" ]; then
    echo -e "${GREEN}🎉 系統已部署完成！${NC}"
    echo "訪問地址: http://$EXTERNAL_IP"
    echo "API 地址: http://$EXTERNAL_IP/api"
else
    echo -e "${YELLOW}⚠️  系統正在部署中，請稍後再檢查${NC}"
fi




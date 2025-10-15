#!/bin/bash

# Emergency Stop Script - 緊急停止腳本
# 停止 GCP 資源以避免費用

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🚨 緊急停止 GCP 資源${NC}"
echo "================================================"
echo ""

CLUSTER_NAME="etc-pointcloud-cluster"
ZONE="asia-east1-a"
PROJECT_ID="etc-point-clound-labelling"

echo -e "${YELLOW}正在檢查集群狀態...${NC}"

# Check if cluster exists
if gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE >/dev/null 2>&1; then
    echo -e "${YELLOW}集群存在，正在檢查狀態...${NC}"
    
    # Get cluster status
    STATUS=$(gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --format="value(status)")
    echo -e "${BLUE}集群狀態: $STATUS${NC}"
    
    if [ "$STATUS" = "RUNNING" ]; then
        echo -e "${RED}⚠️  集群正在運行，會產生費用！${NC}"
        echo -e "${YELLOW}正在刪除集群...${NC}"
        
        # Delete cluster
        gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE --quiet
        
        echo -e "${GREEN}✅ 集群已刪除${NC}"
    elif [ "$STATUS" = "PROVISIONING" ]; then
        echo -e "${YELLOW}⚠️  集群正在創建中，請等待完成後再刪除${NC}"
        echo -e "${BLUE}正在監控創建進度...${NC}"
        
        # Monitor creation progress
        while true; do
            STATUS=$(gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --format="value(status)" 2>/dev/null || echo "NOT_FOUND")
            
            if [ "$STATUS" = "RUNNING" ]; then
                echo -e "${YELLOW}集群創建完成，正在刪除...${NC}"
                gcloud container clusters delete $CLUSTER_NAME --zone=$ZONE --quiet
                echo -e "${GREEN}✅ 集群已刪除${NC}"
                break
            elif [ "$STATUS" = "NOT_FOUND" ]; then
                echo -e "${GREEN}✅ 集群已不存在${NC}"
                break
            else
                echo -e "${BLUE}等待中... 狀態: $STATUS${NC}"
                sleep 10
            fi
        done
    else
        echo -e "${YELLOW}集群狀態: $STATUS${NC}"
    fi
else
    echo -e "${GREEN}✅ 集群不存在${NC}"
fi

# Check for other resources
echo -e "${YELLOW}檢查其他可能產生費用的資源...${NC}"

# Check for compute instances
echo "檢查計算實例..."
gcloud compute instances list --filter="name~etc" --format="table(name,zone,status)" || echo "無計算實例"

# Check for persistent disks
echo "檢查持久磁盤..."
gcloud compute disks list --filter="name~etc" --format="table(name,zone,sizeGb,status)" || echo "無持久磁盤"

# Check for load balancers
echo "檢查負載均衡器..."
gcloud compute forwarding-rules list --filter="name~etc" --format="table(name,region,IPAddress,status)" || echo "無負載均衡器"

echo ""
echo -e "${GREEN}🎉 緊急停止完成！${NC}"
echo ""
echo -e "${BLUE}💡 建議使用本地部署（完全免費）：${NC}"
echo "   ./scripts/deploy-local.sh"
echo ""
echo -e "${BLUE}📊 檢查費用：${NC}"
echo "   https://console.cloud.google.com/billing"




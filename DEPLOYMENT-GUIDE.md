# 🚀 ETC 點雲註釋系統 - GCP 部署使用指南

## 📋 前置準備

### 1. 安裝必要工具

```bash
# 安裝 gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# 安裝 kubectl
gcloud components install kubectl

# 安裝 Docker
# macOS: 下載 Docker Desktop
# Linux: sudo apt-get install docker.io
```

### 2. 設置 GCP 專案

```bash
# 登入 GCP
gcloud auth login

# 創建新專案（可選）
gcloud projects create your-project-id --name="ETC Point Cloud"

# 設置專案
gcloud config set project your-project-id

# 啟用計費（在 GCP Console 中完成）
```

## 🎯 快速部署（推薦）

### 步驟 1: 自動設置 GCP 專案

```bash
# 運行設置腳本
./scripts/setup-gcp-project.sh

# 這會自動：
# ✅ 啟用必要的 API
# ✅ 創建服務帳戶
# ✅ 生成安全密鑰
# ✅ 創建存儲桶
# ✅ 創建靜態 IP
# ✅ 生成環境配置文件
```

### 步驟 2: 一鍵部署

```bash
# 部署整個系統
./scripts/deploy-to-gcp.sh your-project-id asia-east1-a etc-pointcloud-cluster

# 這會自動：
# ✅ 創建 GKE 集群
# ✅ 構建並推送 Docker 鏡像
# ✅ 部署所有服務到 Kubernetes
# ✅ 配置負載均衡器
```

### 步驟 3: 檢查部署狀態

```bash
# 檢查部署狀態
./scripts/check-deployment.sh

# 或手動檢查
kubectl get pods -n etc-pointcloud
kubectl get services -n etc-pointcloud
kubectl get ingress -n etc-pointcloud
```

## 🔧 手動部署（進階用戶）

### 步驟 1: 創建 GKE 集群

```bash
# 設置變數
export PROJECT_ID="your-project-id"
export ZONE="asia-east1-a"
export CLUSTER_NAME="etc-pointcloud-cluster"

# 創建集群
gcloud container clusters create $CLUSTER_NAME \
    --zone=$ZONE \
    --num-nodes=3 \
    --machine-type=e2-standard-2 \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=10 \
    --disk-size=50GB

# 獲取憑證
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE
```

### 步驟 2: 構建並推送鏡像

```bash
# 配置 Docker 認證
gcloud auth configure-docker

# 構建後端鏡像
docker build -t gcr.io/$PROJECT_ID/etc-backend:latest ./backend
docker push gcr.io/$PROJECT_ID/etc-backend:latest

# 構建前端鏡像
docker build -t gcr.io/$PROJECT_ID/etc-frontend:latest ./frontend
docker push gcr.io/$PROJECT_ID/etc-frontend:latest
```

### 步驟 3: 部署到 Kubernetes

```bash
# 更新配置文件中的專案 ID
sed -i "s/YOUR_PROJECT_ID/$PROJECT_ID/g" k8s/backend.yaml
sed -i "s/YOUR_PROJECT_ID/$PROJECT_ID/g" k8s/frontend.yaml

# 部署所有服務
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

## 🔐 安全配置

### 生成安全密鑰

```bash
# 生成新的安全密鑰
./scripts/generate-secrets.sh

# 這會創建：
# - k8s/secrets-generated.yaml
# - .env.generated
```

### 更新密鑰

```bash
# 應用生成的密鑰
kubectl apply -f k8s/secrets-generated.yaml

# 或手動編輯 k8s/secrets.yaml
```

## 🌐 域名配置

### 獲取外部 IP

```bash
# 獲取外部 IP 地址
kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### 配置 DNS

1. 在你的域名提供商處設置 A 記錄：
   - `your-domain.com` → `EXTERNAL_IP`
   - `www.your-domain.com` → `your-domain.com`

2. 更新 Kubernetes 配置：

```bash
# 更新 CORS 設置
kubectl patch configmap etc-config -n etc-pointcloud --patch '{
  "data": {
    "BACKEND_CORS_ORIGINS": "https://your-domain.com"
  }
}'

# 更新 Ingress 配置
kubectl patch ingress etc-ingress -n etc-pointcloud --patch '{
  "spec": {
    "tls": [{
      "hosts": ["your-domain.com"],
      "secretName": "etc-tls-secret"
    }],
    "rules": [{
      "host": "your-domain.com",
      "http": {
        "paths": [{
          "path": "/api",
          "pathType": "Prefix",
          "backend": {
            "service": {
              "name": "backend-service",
              "port": {"number": 8000}
            }
          }
        }]
      }
    }]
  }
}'
```

## 🔄 CI/CD 設置

### GitHub Actions

```bash
# 設置 CI/CD
./scripts/setup-cicd.sh

# 這會：
# ✅ 創建 Cloud Build 觸發器
# ✅ 設置 GitHub Actions
# ✅ 配置自動化部署
```

### 手動設置 GitHub Secrets

1. 在 GitHub 倉庫中進入 Settings → Secrets and variables → Actions
2. 添加以下 secrets：
   - `GCP_PROJECT_ID`: 你的 GCP 專案 ID
   - `GCP_SA_KEY`: 服務帳戶密鑰 JSON

## 📊 監控和管理

### 檢查系統狀態

```bash
# 檢查所有資源
kubectl get all -n etc-pointcloud

# 檢查特定部署
kubectl get deployments -n etc-pointcloud
kubectl get services -n etc-pointcloud
kubectl get ingress -n etc-pointcloud

# 檢查日誌
kubectl logs -f deployment/backend -n etc-pointcloud
kubectl logs -f deployment/frontend -n etc-pointcloud
kubectl logs -f deployment/celery-worker -n etc-pointcloud
```

### 擴展服務

```bash
# 擴展後端服務
kubectl scale deployment backend --replicas=5 -n etc-pointcloud

# 擴展前端服務
kubectl scale deployment frontend --replicas=3 -n etc-pointcloud
```

### 更新部署

```bash
# 使用腳本更新
./scripts/update-deployment.sh

# 或手動更新鏡像標籤
kubectl set image deployment/backend backend=gcr.io/$PROJECT_ID/etc-backend:new-tag -n etc-pointcloud
```

## 🛠️ 故障排除

### 常見問題

1. **Pod 無法啟動**
   ```bash
   # 檢查 Pod 狀態
   kubectl describe pod POD_NAME -n etc-pointcloud
   
   # 檢查日誌
   kubectl logs POD_NAME -n etc-pointcloud
   ```

2. **服務無法訪問**
   ```bash
   # 檢查服務端點
   kubectl get endpoints -n etc-pointcloud
   
   # 檢查服務詳情
   kubectl describe service SERVICE_NAME -n etc-pointcloud
   ```

3. **Ingress 不工作**
   ```bash
   # 檢查 Ingress 狀態
   kubectl describe ingress etc-ingress -n etc-pointcloud
   
   # 檢查事件
   kubectl get events -n etc-pointcloud
   ```

### 日誌查看

```bash
# 應用日誌
kubectl logs -f deployment/backend -n etc-pointcloud
kubectl logs -f deployment/frontend -n etc-pointcloud
kubectl logs -f deployment/celery-worker -n etc-pointcloud

# 系統日誌
kubectl logs -f deployment/postgres -n etc-pointcloud
kubectl logs -f deployment/redis -n etc-pointcloud
kubectl logs -f deployment/minio -n etc-pointcloud
```

## 💰 成本優化

### 資源限制

系統已配置資源限制以控制成本：
- **後端**: 1 CPU, 1GB RAM
- **前端**: 200m CPU, 256MB RAM
- **數據庫**: 500m CPU, 512MB RAM
- **Redis**: 200m CPU, 256MB RAM
- **MinIO**: 200m CPU, 512MB RAM

### 自動擴展

集群配置了自動擴展：
- **最小節點**: 1
- **最大節點**: 10
- **擴展依據**: CPU 和內存使用率

## 📚 常用命令

```bash
# 檢查集群狀態
kubectl cluster-info

# 檢查節點
kubectl get nodes

# 檢查命名空間
kubectl get namespaces

# 檢查所有資源
kubectl get all -n etc-pointcloud

# 進入 Pod
kubectl exec -it POD_NAME -n etc-pointcloud -- /bin/bash

# 重啟部署
kubectl rollout restart deployment/backend -n etc-pointcloud

# 查看部署歷史
kubectl rollout history deployment/backend -n etc-pointcloud

# 回滾部署
kubectl rollout undo deployment/backend -n etc-pointcloud
```

## 🆘 獲取幫助

如果遇到問題：

1. **檢查日誌**: 使用上面的日誌查看命令
2. **檢查事件**: `kubectl get events -n etc-pointcloud`
3. **檢查資源**: `kubectl get pods -n etc-pointcloud`
4. **檢查使用率**: `kubectl top pods -n etc-pointcloud`

## 🎉 完成！

部署完成後，你將擁有一個完全可擴展、高可用的點雲註釋系統！

- **前端**: 通過 Ingress 訪問
- **後端 API**: `/api/` 路徑
- **管理界面**: MinIO Console
- **監控**: Kubernetes Dashboard

記住定期備份數據庫和檢查系統狀態！




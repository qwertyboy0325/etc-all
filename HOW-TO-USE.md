# 🎯 如何使用 ETC 點雲註釋系統

## 🚀 最簡單的開始方式

### 1. 一鍵快速開始

```bash
# 運行快速開始腳本
./quick-start.sh
```

這個腳本會引導你完成整個部署過程！

### 2. 手動步驟（如果你喜歡控制每個步驟）

#### 步驟 1: 設置 GCP 專案
```bash
./scripts/setup-gcp-project.sh
```

#### 步驟 2: 部署到 GCP
```bash
./scripts/deploy-to-gcp.sh your-project-id asia-east1-a etc-pointcloud-cluster
```

#### 步驟 3: 檢查部署狀態
```bash
./scripts/check-deployment.sh
```

## 📋 部署前準備

### 1. 安裝必要工具

```bash
# 安裝 gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# 安裝 kubectl
gcloud components install kubectl

# 安裝 Docker Desktop
# 從 https://www.docker.com/products/docker-desktop 下載
```

### 2. 設置 GCP 專案

```bash
# 登入 GCP
gcloud auth login

# 創建專案（可選）
gcloud projects create your-project-id --name="ETC Point Cloud"

# 設置專案
gcloud config set project your-project-id

# 啟用計費（在 GCP Console 中完成）
```

## 🔧 部署選項

### 選項 1: 自動部署（推薦新手）

```bash
# 一鍵完成所有設置
./quick-start.sh
# 選擇選項 1
```

### 選項 2: 手動部署（推薦進階用戶）

```bash
# 步驟 1: 設置 GCP
./scripts/setup-gcp-project.sh

# 步驟 2: 部署應用
./scripts/deploy-to-gcp.sh your-project-id asia-east1-a etc-pointcloud-cluster

# 步驟 3: 檢查狀態
./scripts/check-deployment.sh
```

### 選項 3: 僅設置 GCP 專案

```bash
./scripts/setup-gcp-project.sh
```

### 選項 4: 僅部署應用

```bash
./scripts/deploy-to-gcp.sh your-project-id asia-east1-a etc-pointcloud-cluster
```

## 🌐 訪問系統

部署完成後，你可以通過以下方式訪問系統：

### 1. 獲取外部 IP

```bash
# 獲取外部 IP
kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### 2. 訪問地址

- **前端界面**: `http://EXTERNAL_IP`
- **API 接口**: `http://EXTERNAL_IP/api`
- **健康檢查**: `http://EXTERNAL_IP/health`

### 3. 設置域名（可選）

1. 將你的域名指向外部 IP
2. 更新 Kubernetes 配置：

```bash
# 更新 CORS 設置
kubectl patch configmap etc-config -n etc-pointcloud --patch '{
  "data": {
    "BACKEND_CORS_ORIGINS": "https://your-domain.com"
  }
}'
```

## 🔍 監控和管理

### 檢查系統狀態

```bash
# 快速檢查
./scripts/check-deployment.sh

# 詳細檢查
kubectl get all -n etc-pointcloud
kubectl get pods -n etc-pointcloud
kubectl get services -n etc-pointcloud
kubectl get ingress -n etc-pointcloud
```

### 查看日誌

```bash
# 後端日誌
kubectl logs -f deployment/backend -n etc-pointcloud

# 前端日誌
kubectl logs -f deployment/frontend -n etc-pointcloud

# 數據庫日誌
kubectl logs -f deployment/postgres -n etc-pointcloud
```

### 擴展服務

```bash
# 擴展後端服務
kubectl scale deployment backend --replicas=5 -n etc-pointcloud

# 擴展前端服務
kubectl scale deployment frontend --replicas=3 -n etc-pointcloud
```

## 🔄 更新系統

### 更新部署

```bash
# 使用腳本更新
./scripts/update-deployment.sh

# 或手動更新
kubectl set image deployment/backend backend=gcr.io/your-project-id/etc-backend:new-tag -n etc-pointcloud
```

### 重啟服務

```bash
# 重啟後端
kubectl rollout restart deployment/backend -n etc-pointcloud

# 重啟前端
kubectl rollout restart deployment/frontend -n etc-pointcloud
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

### 獲取幫助

```bash
# 檢查所有資源
kubectl get all -n etc-pointcloud

# 檢查事件
kubectl get events -n etc-pointcloud

# 檢查資源使用情況
kubectl top pods -n etc-pointcloud
```

## 📚 有用資源

- **詳細部署指南**: `DEPLOYMENT-GUIDE.md`
- **快速開始腳本**: `./quick-start.sh`
- **檢查狀態腳本**: `./scripts/check-deployment.sh`
- **更新部署腳本**: `./scripts/update-deployment.sh`
- **生成密鑰腳本**: `./scripts/generate-secrets.sh`

## 🎉 完成！

部署完成後，你將擁有一個完全可擴展、高可用的點雲註釋系統！

- **前端**: 通過 Ingress 訪問
- **後端 API**: `/api/` 路徑
- **管理界面**: MinIO Console
- **監控**: Kubernetes Dashboard

記住定期備份數據庫和檢查系統狀態！




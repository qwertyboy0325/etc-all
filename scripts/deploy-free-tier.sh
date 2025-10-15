#!/bin/bash

# Deploy to GCP using Free Tier resources
# 使用 GCP 免費額度部署

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🆓 使用 GCP 免費額度部署 ETC 點雲註釋系統${NC}"
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

# Check billing
echo -e "${YELLOW}💳 檢查計費狀態...${NC}"
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "False")
if [ "$BILLING_ENABLED" = "False" ]; then
    echo -e "${RED}❌ 計費未啟用${NC}"
    echo "請在 GCP Console 中啟用計費："
    echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    exit 1
else
    echo -e "${GREEN}✅ 計費已啟用${NC}"
fi

echo ""

# Enable required APIs
echo -e "${YELLOW}🔧 啟用必要的 API...${NC}"
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable cloudbuild.googleapis.com

echo -e "${GREEN}✅ APIs 已啟用${NC}"

# Create GKE cluster using free tier resources
echo -e "${YELLOW}🚀 創建 GKE 集群（使用免費額度）...${NC}"

# Use e2-micro instances (free tier)
gcloud container clusters create etc-pointcloud-free \
    --zone=asia-east1-a \
    --num-nodes=1 \
    --machine-type=e2-micro \
    --disk-size=20GB \
    --disk-type=pd-standard \
    --enable-autoscaling \
    --min-nodes=0 \
    --max-nodes=1 \
    --enable-autorepair \
    --enable-autoupgrade \
    --addons=HttpLoadBalancing,HorizontalPodAutoscaling \
    --no-enable-ip-alias \
    --no-enable-network-policy

echo -e "${GREEN}✅ GKE 集群已創建${NC}"

# Get cluster credentials
echo -e "${YELLOW}🔐 獲取集群憑證...${NC}"
gcloud container clusters get-credentials etc-pointcloud-free --zone=asia-east1-a

echo -e "${GREEN}✅ 集群憑證已獲取${NC}"

# Create namespace
echo -e "${YELLOW}📁 創建命名空間...${NC}"
kubectl create namespace etc-pointcloud || echo "命名空間已存在"

echo -e "${GREEN}✅ 命名空間已創建${NC}"

# Create ConfigMap
echo -e "${YELLOW}⚙️  創建配置映射...${NC}"
cat > k8s-free/configmap.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: etc-config
  namespace: etc-pointcloud
data:
  # Database configuration
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "etc_pointcloud"
  DB_USER: "root"
  DB_PASSWORD: "root"
  
  # Redis configuration
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  REDIS_DB: "0"
  
  # MinIO configuration
  MINIO_HOST: "minio-service"
  MINIO_PORT: "9000"
  MINIO_ACCESS_KEY: "minioadmin"
  MINIO_SECRET_KEY: "minioadmin"
  MINIO_BUCKET: "pointcloud-files"
  MINIO_SECURE: "false"
  
  # Application configuration
  DEBUG: "True"
  ENVIRONMENT: "production"
  SECRET_KEY: "your-secret-key-here"
  JWT_SECRET_KEY: "your-jwt-secret-key-here"
  
  # CORS configuration
  BACKEND_CORS_ORIGINS: "http://localhost:3000,http://localhost:3001"
EOF

kubectl apply -f k8s-free/configmap.yaml

echo -e "${GREEN}✅ 配置映射已創建${NC}"

# Create Secrets
echo -e "${YELLOW}🔐 創建密鑰...${NC}"
cat > k8s-free/secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: etc-secrets
  namespace: etc-pointcloud
type: Opaque
data:
  # Base64 encoded secrets
  postgres-password: cm9vdA==  # root
  redis-password: ""  # empty
  minio-access-key: bWluaW9hZG1pbg==  # minioadmin
  minio-secret-key: bWluaW9hZG1pbg==  # minioadmin
  secret-key: eW91ci1zZWNyZXQta2V5LWhlcmU=  # your-secret-key-here
  jwt-secret-key: eW91ci1qd3Qtc2VjcmV0LWtleS1oZXJl  # your-jwt-secret-key-here
EOF

kubectl apply -f k8s-free/secrets.yaml

echo -e "${GREEN}✅ 密鑰已創建${NC}"

# Create PostgreSQL deployment
echo -e "${YELLOW}🗄️  創建 PostgreSQL 部署...${NC}"
cat > k8s-free/postgres.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: etc-pointcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:13-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "etc_pointcloud"
        - name: POSTGRES_USER
          value: "root"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: postgres-password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: etc-pointcloud
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
EOF

kubectl apply -f k8s-free/postgres.yaml

echo -e "${GREEN}✅ PostgreSQL 已部署${NC}"

# Create Redis deployment
echo -e "${YELLOW}🔄 創建 Redis 部署...${NC}"
cat > k8s-free/redis.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: etc-pointcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command: ["redis-server", "--appendonly", "yes"]
        volumeMounts:
        - name: redis-storage
          mountPath: /data
      volumes:
      - name: redis-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: etc-pointcloud
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
EOF

kubectl apply -f k8s-free/redis.yaml

echo -e "${GREEN}✅ Redis 已部署${NC}"

# Create MinIO deployment
echo -e "${YELLOW}📦 創建 MinIO 部署...${NC}"
cat > k8s-free/minio.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: etc-pointcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        ports:
        - containerPort: 9000
        - containerPort: 9001
        command: ["minio", "server", "/data", "--console-address", ":9001"]
        env:
        - name: MINIO_ROOT_USER
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: minio-access-key
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: minio-secret-key
        volumeMounts:
        - name: minio-storage
          mountPath: /data
      volumes:
      - name: minio-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: minio-service
  namespace: etc-pointcloud
spec:
  selector:
    app: minio
  ports:
  - port: 9000
    targetPort: 9000
    name: api
  - port: 9001
    targetPort: 9001
    name: console
  type: ClusterIP
EOF

kubectl apply -f k8s-free/minio.yaml

echo -e "${GREEN}✅ MinIO 已部署${NC}"

# Wait for services to be ready
echo -e "${YELLOW}⏳ 等待服務啟動...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n etc-pointcloud
kubectl wait --for=condition=available --timeout=300s deployment/redis -n etc-pointcloud
kubectl wait --for=condition=available --timeout=300s deployment/minio -n etc-pointcloud

echo -e "${GREEN}✅ 基礎服務已就緒${NC}"

# Create backend deployment
echo -e "${YELLOW}🔧 創建後端部署...${NC}"
cat > k8s-free/backend.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: etc-pointcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: gcr.io/$PROJECT_ID/etc-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: DB_HOST
        - name: DB_PORT
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: DB_PORT
        - name: DB_NAME
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: DB_NAME
        - name: DB_USER
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: postgres-password
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: REDIS_HOST
        - name: REDIS_PORT
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: REDIS_PORT
        - name: MINIO_HOST
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: MINIO_HOST
        - name: MINIO_PORT
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: MINIO_PORT
        - name: MINIO_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: minio-access-key
        - name: MINIO_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: minio-secret-key
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: secret-key
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: etc-secrets
              key: jwt-secret-key
        - name: DEBUG
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: DEBUG
        - name: ENVIRONMENT
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: ENVIRONMENT
        - name: BACKEND_CORS_ORIGINS
          valueFrom:
            configMapKeyRef:
              name: etc-config
              key: BACKEND_CORS_ORIGINS
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: etc-pointcloud
spec:
  selector:
    app: backend
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
EOF

kubectl apply -f k8s-free/backend.yaml

echo -e "${GREEN}✅ 後端已部署${NC}"

# Create frontend deployment
echo -e "${YELLOW}🎨 創建前端部署...${NC}"
cat > k8s-free/frontend.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: etc-pointcloud
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: gcr.io/$PROJECT_ID/etc-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: VITE_API_BASE_URL
          value: "http://backend-service:8000"
        resources:
          requests:
            memory: "128Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: etc-pointcloud
spec:
  selector:
    app: frontend
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP
EOF

kubectl apply -f k8s-free/frontend.yaml

echo -e "${GREEN}✅ 前端已部署${NC}"

# Create Ingress
echo -e "${YELLOW}🌐 創建入口...${NC}"
cat > k8s-free/ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etc-ingress
  namespace: etc-pointcloud
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "etc-pointcloud-ip"
spec:
  rules:
  - http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 3000
EOF

kubectl apply -f k8s-free/ingress.yaml

echo -e "${GREEN}✅ 入口已創建${NC}"

# Wait for deployments to be ready
echo -e "${YELLOW}⏳ 等待應用部署完成...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/backend -n etc-pointcloud
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n etc-pointcloud

echo -e "${GREEN}✅ 應用部署完成${NC}"

# Get external IP
echo -e "${YELLOW}🌐 獲取外部 IP...${NC}"
EXTERNAL_IP=$(kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

if [ "$EXTERNAL_IP" = "pending" ]; then
    echo -e "${YELLOW}⏳ 等待外部 IP 分配...${NC}"
    while [ "$EXTERNAL_IP" = "pending" ]; do
        sleep 10
        EXTERNAL_IP=$(kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
        echo "等待中... 當前狀態: $EXTERNAL_IP"
    done
fi

echo -e "${GREEN}✅ 外部 IP: $EXTERNAL_IP${NC}"

# Check deployment status
echo -e "${YELLOW}🔍 檢查部署狀態...${NC}"
kubectl get pods -n etc-pointcloud
kubectl get services -n etc-pointcloud
kubectl get ingress -n etc-pointcloud

echo ""
echo -e "${GREEN}🎉 免費額度部署完成！${NC}"
echo ""
echo -e "${BLUE}📋 訪問地址:${NC}"
echo "前端: http://$EXTERNAL_IP"
echo "後端 API: http://$EXTERNAL_IP/api"
echo "API 文檔: http://$EXTERNAL_IP/api/docs"
echo ""
echo -e "${BLUE}💰 費用說明:${NC}"
echo "✅ 使用 e2-micro 實例（免費額度）"
echo "✅ 使用空磁盤（免費）"
echo "✅ 使用負載均衡器（免費額度）"
echo "✅ 總費用: $0/月"
echo ""
echo -e "${BLUE}🔧 管理命令:${NC}"
echo "查看 Pod: kubectl get pods -n etc-pointcloud"
echo "查看日誌: kubectl logs -f deployment/backend -n etc-pointcloud"
echo "刪除部署: kubectl delete namespace etc-pointcloud"
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"

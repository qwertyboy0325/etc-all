# ETC Point Cloud Annotation System - GCP Deployment Guide

This guide will help you deploy the ETC Point Cloud Annotation System to Google Cloud Platform (GCP) using Kubernetes.

## 🏗️ Architecture Overview

The system consists of:
- **Frontend**: React application served by Nginx
- **Backend**: FastAPI application with Celery workers
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)
- **Load Balancer**: Nginx with SSL termination

## 📋 Prerequisites

1. **GCP Account** with billing enabled
2. **gcloud CLI** installed and configured
3. **kubectl** installed
4. **Docker** installed
5. **Domain name** (optional, for production)

## 🚀 Quick Start

### 1. Setup GCP Project

```bash
# Run the setup script
./scripts/setup-gcp-project.sh

# This will:
# - Enable required APIs
# - Create service accounts
# - Generate secure secrets
# - Create storage bucket
# - Create static IP
```

### 2. Deploy to GCP

```bash
# Deploy the entire system
./scripts/deploy-to-gcp.sh YOUR_PROJECT_ID asia-east1-a etc-pointcloud-cluster

# This will:
# - Create GKE cluster
# - Build and push Docker images
# - Deploy all services to Kubernetes
# - Configure load balancer
```

### 3. Setup CI/CD (Optional)

```bash
# Setup automated deployment
./scripts/setup-cicd.sh

# This will:
# - Create Cloud Build triggers
# - Setup GitHub Actions
# - Configure automated deployments
```

## 🔧 Manual Deployment Steps

### 1. Create GCP Project

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
```

### 2. Create GKE Cluster

```bash
# Create cluster
gcloud container clusters create etc-pointcloud-cluster \
    --zone=asia-east1-a \
    --num-nodes=3 \
    --machine-type=e2-standard-2 \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=10

# Get credentials
gcloud container clusters get-credentials etc-pointcloud-cluster --zone=asia-east1-a
```

### 3. Build and Push Images

```bash
# Configure Docker
gcloud auth configure-docker

# Build and push backend
docker build -t gcr.io/YOUR_PROJECT_ID/etc-backend:latest ./backend
docker push gcr.io/YOUR_PROJECT_ID/etc-backend:latest

# Build and push frontend
docker build -t gcr.io/YOUR_PROJECT_ID/etc-frontend:latest ./frontend
docker push gcr.io/YOUR_PROJECT_ID/etc-frontend:latest
```

### 4. Deploy to Kubernetes

```bash
# Apply all manifests
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

## 🔐 Security Configuration

### 1. Generate Secrets

```bash
# Generate secure secrets
./scripts/generate-secrets.sh

# This creates:
# - k8s/secrets-generated.yaml
# - .env.generated
```

### 2. Update Secrets

```bash
# Apply generated secrets
kubectl apply -f k8s/secrets-generated.yaml

# Or manually update k8s/secrets.yaml with your values
```

### 3. Configure SSL

```bash
# Create SSL certificate
gcloud compute ssl-certificates create etc-ssl-cert \
    --domains=your-domain.com

# Update ingress.yaml with your domain
```

## 📊 Monitoring and Management

### Check Deployment Status

```bash
# Check all resources
kubectl get all -n etc-pointcloud

# Check specific deployments
kubectl get deployments -n etc-pointcloud
kubectl get services -n etc-pointcloud
kubectl get ingress -n etc-pointcloud

# Check logs
kubectl logs -f deployment/backend -n etc-pointcloud
kubectl logs -f deployment/frontend -n etc-pointcloud
```

### Scale Services

```bash
# Scale backend
kubectl scale deployment backend --replicas=5 -n etc-pointcloud

# Scale frontend
kubectl scale deployment frontend --replicas=3 -n etc-pointcloud
```

### Update Deployment

```bash
# Update with new images
./scripts/update-deployment.sh

# Or manually update image tags
kubectl set image deployment/backend backend=gcr.io/YOUR_PROJECT_ID/etc-backend:new-tag -n etc-pointcloud
```

## 🌐 Domain Configuration

### 1. Get External IP

```bash
# Get the external IP
kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### 2. Configure DNS

Point your domain to the external IP:
- A record: `your-domain.com` → `EXTERNAL_IP`
- CNAME record: `www.your-domain.com` → `your-domain.com`

### 3. Update Configuration

```bash
# Update domain in configmap
kubectl patch configmap etc-config -n etc-pointcloud --patch '{
  "data": {
    "BACKEND_CORS_ORIGINS": "https://your-domain.com"
  }
}'

# Update ingress
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

## 🔄 CI/CD Pipeline

### GitHub Actions

The system includes GitHub Actions workflow for automated deployment:

1. **Trigger**: Push to main branch
2. **Tests**: Run backend and frontend tests
3. **Build**: Build Docker images
4. **Deploy**: Deploy to GKE cluster

### Cloud Build

Alternative CI/CD using Google Cloud Build:

1. **Trigger**: Push to Cloud Source Repository
2. **Build**: Build and push images
3. **Deploy**: Deploy to Kubernetes

## 🛠️ Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod POD_NAME -n etc-pointcloud
   kubectl logs POD_NAME -n etc-pointcloud
   ```

2. **Services not accessible**
   ```bash
   kubectl get endpoints -n etc-pointcloud
   kubectl describe service SERVICE_NAME -n etc-pointcloud
   ```

3. **Ingress not working**
   ```bash
   kubectl describe ingress etc-ingress -n etc-pointcloud
   kubectl get events -n etc-pointcloud
   ```

### Logs

```bash
# Application logs
kubectl logs -f deployment/backend -n etc-pointcloud
kubectl logs -f deployment/frontend -n etc-pointcloud
kubectl logs -f deployment/celery-worker -n etc-pointcloud

# System logs
kubectl logs -f deployment/postgres -n etc-pointcloud
kubectl logs -f deployment/redis -n etc-pointcloud
kubectl logs -f deployment/minio -n etc-pointcloud
```

## 💰 Cost Optimization

### Resource Limits

The deployment includes resource limits to control costs:

- **Backend**: 1 CPU, 1GB RAM
- **Frontend**: 200m CPU, 256MB RAM
- **Database**: 500m CPU, 512MB RAM
- **Redis**: 200m CPU, 256MB RAM
- **MinIO**: 200m CPU, 512MB RAM

### Auto-scaling

The cluster is configured with auto-scaling:
- **Min nodes**: 1
- **Max nodes**: 10
- **Scale based on**: CPU and memory usage

### Storage

- **Database**: 10GB persistent disk
- **Redis**: 1GB persistent disk
- **MinIO**: 20GB persistent disk

## 📚 Additional Resources

- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)

## 🆘 Support

If you encounter issues:

1. Check the logs using the commands above
2. Review the Kubernetes events: `kubectl get events -n etc-pointcloud`
3. Verify all services are running: `kubectl get pods -n etc-pointcloud`
4. Check resource usage: `kubectl top pods -n etc-pointcloud`

For additional help, please refer to the main project documentation or create an issue in the repository.




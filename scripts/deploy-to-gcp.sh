#!/bin/bash

# GCP Deployment Script for ETC Point Cloud Annotation System
# Usage: ./scripts/deploy-to-gcp.sh [PROJECT_ID] [ZONE] [CLUSTER_NAME]

set -e

# Configuration
PROJECT_ID=${1:-"your-gcp-project-id"}
ZONE=${2:-"asia-east1-a"}
CLUSTER_NAME=${3:-"etc-pointcloud-cluster"}
REGION="asia-east1"
SERVICE_ACCOUNT="etc-service-account"
BUCKET_NAME="etc-pointcloud-storage"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting GCP deployment for ETC Point Cloud Annotation System${NC}"
echo "Project ID: $PROJECT_ID"
echo "Zone: $ZONE"
echo "Cluster: $CLUSTER_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed. Please install it first.${NC}"
    exit 1
fi

# Set project
echo -e "${YELLOW}📋 Setting GCP project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable dns.googleapis.com

# Create service account
echo -e "${YELLOW}👤 Creating service account...${NC}"
gcloud iam service-accounts create $SERVICE_ACCOUNT \
    --display-name="ETC Point Cloud Service Account" \
    --description="Service account for ETC Point Cloud Annotation System" || true

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create GKE cluster
echo -e "${YELLOW}🏗️  Creating GKE cluster...${NC}"
gcloud container clusters create $CLUSTER_NAME \
    --zone=$ZONE \
    --num-nodes=3 \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=10 \
    --machine-type=e2-standard-2 \
    --disk-size=50GB \
    --disk-type=pd-standard \
    --enable-autorepair \
    --enable-autoupgrade \
    --service-account="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --addons=HttpLoadBalancing,HorizontalPodAutoscaling

# Get cluster credentials
echo -e "${YELLOW}🔑 Getting cluster credentials...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Configure Docker to use gcloud as a credential helper
echo -e "${YELLOW}🐳 Configuring Docker authentication...${NC}"
gcloud auth configure-docker

# Build and push Docker images
echo -e "${YELLOW}🔨 Building and pushing Docker images...${NC}"

# Build backend image
echo "Building backend image..."
docker build -t gcr.io/$PROJECT_ID/etc-backend:latest ./backend
docker push gcr.io/$PROJECT_ID/etc-backend:latest

# Build frontend image
echo "Building frontend image..."
docker build -t gcr.io/$PROJECT_ID/etc-frontend:latest ./frontend
docker push gcr.io/$PROJECT_ID/etc-frontend:latest

# Create static IP
echo -e "${YELLOW}🌐 Creating static IP address...${NC}"
gcloud compute addresses create etc-pointcloud-ip --global || true
STATIC_IP=$(gcloud compute addresses describe etc-pointcloud-ip --global --format="value(address)")
echo "Static IP: $STATIC_IP"

# Update Kubernetes manifests with project ID
echo -e "${YELLOW}📝 Updating Kubernetes manifests...${NC}"
find ./k8s -name "*.yaml" -exec sed -i "s/YOUR_PROJECT_ID/$PROJECT_ID/g" {} \;

# Apply Kubernetes manifests
echo -e "${YELLOW}🚀 Deploying to Kubernetes...${NC}"

# Create namespace
kubectl apply -f ./k8s/namespace.yaml

# Apply secrets and configmaps
kubectl apply -f ./k8s/secrets.yaml
kubectl apply -f ./k8s/configmap.yaml

# Deploy database
kubectl apply -f ./k8s/postgres.yaml

# Deploy Redis
kubectl apply -f ./k8s/redis.yaml

# Deploy MinIO
kubectl apply -f ./k8s/minio.yaml

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n etc-pointcloud
kubectl wait --for=condition=available --timeout=300s deployment/redis -n etc-pointcloud
kubectl wait --for=condition=available --timeout=300s deployment/minio -n etc-pointcloud

# Deploy backend
kubectl apply -f ./k8s/backend.yaml

# Deploy frontend
kubectl apply -f ./k8s/frontend.yaml

# Wait for applications to be ready
echo -e "${YELLOW}⏳ Waiting for applications to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/backend -n etc-pointcloud
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n etc-pointcloud

# Deploy ingress
kubectl apply -f ./k8s/ingress.yaml

# Wait for ingress to be ready
echo -e "${YELLOW}⏳ Waiting for ingress to be ready...${NC}"
kubectl wait --for=condition=ready --timeout=300s ingress/etc-ingress -n etc-pointcloud

# Get external IP
EXTERNAL_IP=$(kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$EXTERNAL_IP" ]; then
    EXTERNAL_IP="Pending"
fi

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${GREEN}📊 Deployment Summary:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Cluster: $CLUSTER_NAME"
echo "Zone: $ZONE"
echo "Static IP: $STATIC_IP"
echo "External IP: $EXTERNAL_IP"
echo ""
echo -e "${YELLOW}🔍 To check the status:${NC}"
echo "kubectl get pods -n etc-pointcloud"
echo "kubectl get services -n etc-pointcloud"
echo "kubectl get ingress -n etc-pointcloud"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Update your DNS to point to the external IP: $EXTERNAL_IP"
echo "2. Update the domain in k8s/ingress.yaml and k8s/configmap.yaml"
echo "3. Reapply the ingress and configmap:"
echo "   kubectl apply -f ./k8s/ingress.yaml"
echo "   kubectl apply -f ./k8s/configmap.yaml"
echo ""
echo -e "${GREEN}🎉 Your ETC Point Cloud Annotation System is now running on GCP!${NC}"




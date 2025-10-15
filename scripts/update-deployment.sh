#!/bin/bash

# Update Deployment Script
# This script updates the existing deployment with new images

set -e

# Configuration
PROJECT_ID=${1:-$(gcloud config get-value project)}
ZONE=${2:-"asia-east1-a"}
CLUSTER_NAME=${3:-"etc-pointcloud-cluster"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Updating ETC Point Cloud Annotation System deployment${NC}"
echo "Project ID: $PROJECT_ID"
echo "Zone: $ZONE"
echo "Cluster: $CLUSTER_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed.${NC}"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed.${NC}"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Get cluster credentials
echo -e "${YELLOW}🔑 Getting cluster credentials...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Configure Docker to use gcloud as a credential helper
echo -e "${YELLOW}🐳 Configuring Docker authentication...${NC}"
gcloud auth configure-docker

# Build and push new Docker images
echo -e "${YELLOW}🔨 Building and pushing new Docker images...${NC}"

# Build backend image
echo "Building backend image..."
docker build -t gcr.io/$PROJECT_ID/etc-backend:latest ./backend
docker push gcr.io/$PROJECT_ID/etc-backend:latest

# Build frontend image
echo "Building frontend image..."
docker build -t gcr.io/$PROJECT_ID/etc-frontend:latest ./frontend
docker push gcr.io/$PROJECT_ID/etc-frontend:latest

# Update deployments
echo -e "${YELLOW}🚀 Updating deployments...${NC}"

# Update backend deployment
kubectl set image deployment/backend backend=gcr.io/$PROJECT_ID/etc-backend:latest -n etc-pointcloud
kubectl set image deployment/celery-worker celery-worker=gcr.io/$PROJECT_ID/etc-backend:latest -n etc-pointcloud

# Update frontend deployment
kubectl set image deployment/frontend frontend=gcr.io/$PROJECT_ID/etc-frontend:latest -n etc-pointcloud

# Wait for rollouts to complete
echo -e "${YELLOW}⏳ Waiting for rollouts to complete...${NC}"
kubectl rollout status deployment/backend -n etc-pointcloud
kubectl rollout status deployment/celery-worker -n etc-pointcloud
kubectl rollout status deployment/frontend -n etc-pointcloud

# Check status
echo -e "${YELLOW}🔍 Checking deployment status...${NC}"
kubectl get pods -n etc-pointcloud
kubectl get services -n etc-pointcloud

echo -e "${GREEN}✅ Deployment updated successfully!${NC}"
echo ""
echo -e "${YELLOW}🔍 To check logs:${NC}"
echo "kubectl logs -f deployment/backend -n etc-pointcloud"
echo "kubectl logs -f deployment/frontend -n etc-pointcloud"
echo "kubectl logs -f deployment/celery-worker -n etc-pointcloud"




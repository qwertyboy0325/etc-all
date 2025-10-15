#!/bin/bash

# GCP Project Setup Script
# This script helps you set up a new GCP project for the ETC Point Cloud Annotation System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  GCP Project Setup for ETC Point Cloud Annotation System${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed.${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${YELLOW}⚠️  No default project set. Please set one first:${NC}"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}Current project: $CURRENT_PROJECT${NC}"
echo ""

# Confirm project
read -p "Do you want to use this project? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the correct project first:"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

PROJECT_ID=$CURRENT_PROJECT

# Enable billing
echo -e "${YELLOW}💳 Checking billing...${NC}"
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "False")
if [ "$BILLING_ENABLED" = "False" ]; then
    echo -e "${RED}❌ Billing is not enabled for this project.${NC}"
    echo "Please enable billing in the GCP Console:"
    echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✅ Billing is enabled${NC}"

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable dns.googleapis.com
gcloud services enable cloudbuild.googleapis.com
# Skip Source Repositories API (deprecated for new customers since 2024-06-17)
echo "跳過 Source Repositories API (新客戶已停用，將使用 GitHub + Cloud Build)"

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create service account
echo -e "${YELLOW}👤 Creating service account...${NC}"
SERVICE_ACCOUNT="etc-service-account"
gcloud iam service-accounts create $SERVICE_ACCOUNT \
    --display-name="ETC Point Cloud Service Account" \
    --description="Service account for ETC Point Cloud Annotation System" || echo "Service account already exists"

# Wait for service account to be fully created
echo -e "${YELLOW}⏳ Waiting for service account to be ready...${NC}"
sleep 10

# Verify service account exists
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com >/dev/null 2>&1; then
    echo -e "${RED}❌ Service account creation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Service account is ready${NC}"

# Grant necessary permissions
echo -e "${YELLOW}🔐 Granting permissions...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

echo -e "${GREEN}✅ Permissions granted${NC}"

# Create storage bucket
echo -e "${YELLOW}🪣 Creating storage bucket...${NC}"
BUCKET_NAME="$PROJECT_ID-etc-pointcloud-storage"
gsutil mb gs://$BUCKET_NAME || echo "Bucket already exists"

echo -e "${GREEN}✅ Storage bucket created: gs://$BUCKET_NAME${NC}"

# Create static IP
echo -e "${YELLOW}🌐 Creating static IP address...${NC}"
gcloud compute addresses create etc-pointcloud-ip --global || echo "Static IP already exists"
STATIC_IP=$(gcloud compute addresses describe etc-pointcloud-ip --global --format="value(address)")
echo -e "${GREEN}✅ Static IP created: $STATIC_IP${NC}"

# Generate secrets
echo -e "${YELLOW}🔑 Generating secrets...${NC}"
SECRET_KEY=$(openssl rand -base64 32)
JWT_SECRET_KEY=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
MINIO_SECRET_KEY=$(openssl rand -base64 32)

# Create secrets file
cat > .env.production << EOF
# GCP Production Environment Variables
PROJECT_ID=$PROJECT_ID
ZONE=asia-east1-a
CLUSTER_NAME=etc-pointcloud-cluster
REGION=asia-east1

# Database
POSTGRES_DB=etc_pointcloud_prod
POSTGRES_USER=root
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_BUCKET=pointcloud-files

# Application
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
DEBUG=False
ENVIRONMENT=production

# CORS
BACKEND_CORS_ORIGINS=https://your-domain.com

# Storage
BUCKET_NAME=$BUCKET_NAME
STATIC_IP=$STATIC_IP
EOF

echo -e "${GREEN}✅ Environment file created: .env.production${NC}"

# Update Kubernetes secrets
echo -e "${YELLOW}📝 Updating Kubernetes secrets...${NC}"
cat > k8s/secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: etc-secrets
  namespace: etc-pointcloud
type: Opaque
data:
  POSTGRES_PASSWORD: $(echo -n "$POSTGRES_PASSWORD" | base64)
  MINIO_ACCESS_KEY: $(echo -n "minioadmin" | base64)
  MINIO_SECRET_KEY: $(echo -n "$MINIO_SECRET_KEY" | base64)
  SECRET_KEY: $(echo -n "$SECRET_KEY" | base64)
  JWT_SECRET_KEY: $(echo -n "$JWT_SECRET_KEY" | base64)
EOF

echo -e "${GREEN}✅ Kubernetes secrets updated${NC}"

echo ""
echo -e "${GREEN}🎉 GCP project setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Service Account: $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo "Storage Bucket: gs://$BUCKET_NAME"
echo "Static IP: $STATIC_IP"
echo "Environment File: .env.production"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Update your domain in .env.production and k8s/ingress.yaml"
echo "2. Run the deployment script:"
echo "   ./scripts/deploy-to-gcp.sh $PROJECT_ID asia-east1-a etc-pointcloud-cluster"
echo ""
echo -e "${BLUE}🔍 Useful commands:${NC}"
echo "gcloud container clusters list"
echo "gcloud compute addresses list"
echo "gsutil ls"
echo ""

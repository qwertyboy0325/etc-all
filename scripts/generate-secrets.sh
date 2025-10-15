#!/bin/bash

# Generate Secrets Script
# This script generates secure secrets for the ETC Point Cloud Annotation System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Generating secure secrets for ETC Point Cloud Annotation System${NC}"
echo ""

# Check if openssl is installed
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ openssl is not installed. Please install it first.${NC}"
    exit 1
fi

# Generate secrets
echo -e "${YELLOW}🔑 Generating secrets...${NC}"

SECRET_KEY=$(openssl rand -base64 32)
JWT_SECRET_KEY=$(openssl rand -base64 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32)
MINIO_SECRET_KEY=$(openssl rand -base64 32)

echo -e "${GREEN}✅ Secrets generated successfully${NC}"
echo ""

# Display secrets
echo -e "${BLUE}📋 Generated Secrets:${NC}"
echo "SECRET_KEY: $SECRET_KEY"
echo "JWT_SECRET_KEY: $JWT_SECRET_KEY"
echo "POSTGRES_PASSWORD: $POSTGRES_PASSWORD"
echo "MINIO_SECRET_KEY: $MINIO_SECRET_KEY"
echo ""

# Create base64 encoded versions for Kubernetes
echo -e "${YELLOW}🔧 Creating base64 encoded versions for Kubernetes...${NC}"

SECRET_KEY_B64=$(echo -n "$SECRET_KEY" | base64)
JWT_SECRET_KEY_B64=$(echo -n "$JWT_SECRET_KEY" | base64)
POSTGRES_PASSWORD_B64=$(echo -n "$POSTGRES_PASSWORD" | base64)
MINIO_SECRET_KEY_B64=$(echo -n "$MINIO_SECRET_KEY" | base64)

echo -e "${GREEN}✅ Base64 encoded secrets created${NC}"
echo ""

# Display base64 encoded secrets
echo -e "${BLUE}📋 Base64 Encoded Secrets (for Kubernetes):${NC}"
echo "SECRET_KEY_B64: $SECRET_KEY_B64"
echo "JWT_SECRET_KEY_B64: $JWT_SECRET_KEY_B64"
echo "POSTGRES_PASSWORD_B64: $POSTGRES_PASSWORD_B64"
echo "MINIO_SECRET_KEY_B64: $MINIO_SECRET_KEY_B64"
echo ""

# Create Kubernetes secrets file
echo -e "${YELLOW}📝 Creating Kubernetes secrets file...${NC}"

cat > k8s/secrets-generated.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: etc-secrets
  namespace: etc-pointcloud
type: Opaque
data:
  POSTGRES_PASSWORD: $POSTGRES_PASSWORD_B64
  MINIO_ACCESS_KEY: $(echo -n "minioadmin" | base64)
  MINIO_SECRET_KEY: $MINIO_SECRET_KEY_B64
  SECRET_KEY: $SECRET_KEY_B64
  JWT_SECRET_KEY: $JWT_SECRET_KEY_B64
EOF

echo -e "${GREEN}✅ Kubernetes secrets file created: k8s/secrets-generated.yaml${NC}"

# Create environment file
echo -e "${YELLOW}📝 Creating environment file...${NC}"

cat > .env.generated << EOF
# Generated Environment Variables
# Generated on: $(date)

# Database
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# MinIO
MINIO_SECRET_KEY=$MINIO_SECRET_KEY

# Application
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
EOF

echo -e "${GREEN}✅ Environment file created: .env.generated${NC}"

echo ""
echo -e "${GREEN}🎉 Secret generation completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Review the generated secrets in k8s/secrets-generated.yaml"
echo "2. Apply the secrets to your Kubernetes cluster:"
echo "   kubectl apply -f k8s/secrets-generated.yaml"
echo "3. Update your .env.production file with the generated values"
echo ""
echo -e "${RED}⚠️  Important: Keep these secrets secure and never commit them to version control!${NC}"




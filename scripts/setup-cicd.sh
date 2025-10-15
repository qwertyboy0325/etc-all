#!/bin/bash

# CI/CD Setup Script
# This script sets up CI/CD for the ETC Point Cloud Annotation System

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up CI/CD for ETC Point Cloud Annotation System${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed.${NC}"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No default project set. Please set one first:${NC}"
    echo "gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}Using project: $PROJECT_ID${NC}"
echo ""

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sourcerepo.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable containerregistry.googleapis.com

echo -e "${GREEN}✅ APIs enabled${NC}"

# Create Cloud Build trigger
echo -e "${YELLOW}🔨 Creating Cloud Build trigger...${NC}"

# Check if repository is connected to Cloud Source Repositories
REPO_NAME="etc-pointcloud"
REPO_URL=$(gcloud source repos describe $REPO_NAME --format="value(url)" 2>/dev/null || echo "")

if [ -z "$REPO_URL" ]; then
    echo -e "${YELLOW}📦 Creating Cloud Source Repository...${NC}"
    gcloud source repos create $REPO_NAME
    REPO_URL=$(gcloud source repos describe $REPO_NAME --format="value(url)")
    echo -e "${GREEN}✅ Repository created: $REPO_URL${NC}"
else
    echo -e "${GREEN}✅ Repository already exists: $REPO_URL${NC}"
fi

# Create Cloud Build trigger
TRIGGER_NAME="etc-pointcloud-deploy"
gcloud builds triggers create github \
    --repo-name="etc-pointcloud" \
    --repo-owner="$(git config user.name)" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml" \
    --name="$TRIGGER_NAME" \
    --description="Deploy ETC Point Cloud Annotation System" || echo "Trigger already exists"

echo -e "${GREEN}✅ Cloud Build trigger created${NC}"

# Create service account for Cloud Build
echo -e "${YELLOW}👤 Creating Cloud Build service account...${NC}"
SERVICE_ACCOUNT="etc-cloudbuild-sa"
gcloud iam service-accounts create $SERVICE_ACCOUNT \
    --display-name="ETC Cloud Build Service Account" \
    --description="Service account for Cloud Build deployments" || echo "Service account already exists"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"

echo -e "${GREEN}✅ Service account permissions granted${NC}"

# Create GitHub Actions secrets template
echo -e "${YELLOW}📝 Creating GitHub Actions secrets template...${NC}"

cat > .github-secrets-template.md << EOF
# GitHub Actions Secrets

Add these secrets to your GitHub repository:

## Required Secrets

1. **GCP_PROJECT_ID**: $PROJECT_ID
2. **GCP_SA_KEY**: (Service Account Key JSON)

## How to get GCP_SA_KEY:

1. Create a service account key:
   \`\`\`bash
   gcloud iam service-accounts keys create github-actions-key.json \\
     --iam-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com
   \`\`\`

2. Copy the contents of github-actions-key.json and add it as GCP_SA_KEY secret in GitHub

## How to add secrets in GitHub:

1. Go to your repository on GitHub
2. Click on Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the corresponding value

## Security Note:

- Never commit the service account key file to your repository
- Delete the key file after adding it to GitHub secrets
- Rotate the key regularly for security
EOF

echo -e "${GREEN}✅ GitHub Actions secrets template created: .github-secrets-template.md${NC}"

# Create deployment status script
echo -e "${YELLOW}📝 Creating deployment status script...${NC}"

cat > scripts/check-deployment.sh << 'EOF'
#!/bin/bash

# Check deployment status
PROJECT_ID=${1:-$(gcloud config get-value project)}
CLUSTER_NAME=${2:-"etc-pointcloud-cluster"}
ZONE=${3:-"asia-east1-a"}

echo "🔍 Checking deployment status..."
echo "Project: $PROJECT_ID"
echo "Cluster: $CLUSTER_NAME"
echo "Zone: $ZONE"
echo ""

# Get cluster credentials
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE

# Check pods
echo "📦 Pods:"
kubectl get pods -n etc-pointcloud

echo ""
echo "🌐 Services:"
kubectl get services -n etc-pointcloud

echo ""
echo "🚪 Ingress:"
kubectl get ingress -n etc-pointcloud

echo ""
echo "📊 Deployment status:"
kubectl rollout status deployment/backend -n etc-pointcloud
kubectl rollout status deployment/frontend -n etc-pointcloud
kubectl rollout status deployment/celery-worker -n etc-pointcloud

echo ""
echo "🔗 External IP:"
kubectl get ingress etc-ingress -n etc-pointcloud -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
echo ""
EOF

chmod +x scripts/check-deployment.sh

echo -e "${GREEN}✅ Deployment status script created: scripts/check-deployment.sh${NC}"

echo ""
echo -e "${GREEN}🎉 CI/CD setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "Project ID: $PROJECT_ID"
echo "Repository: $REPO_URL"
echo "Cloud Build Trigger: $TRIGGER_NAME"
echo "Service Account: $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Review .github-secrets-template.md for required GitHub secrets"
echo "2. Add the secrets to your GitHub repository"
echo "3. Push your code to the main branch to trigger deployment"
echo "4. Monitor the deployment with: ./scripts/check-deployment.sh"
echo ""
echo -e "${BLUE}🔍 Useful commands:${NC}"
echo "gcloud builds triggers list"
echo "gcloud builds list"
echo "./scripts/check-deployment.sh"
echo ""




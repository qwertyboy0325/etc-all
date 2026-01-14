#!/bin/bash
# Start ETC Production Environment

set -e

echo "🚀 Starting ETC Production Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Creating .env from env.example..."
    cp env.example .env
    echo ""
    echo "⚠️  Please edit .env file with your production values:"
    echo "   - POSTGRES_PASSWORD"
    echo "   - MINIO_SECRET_KEY"
    echo "   - SECRET_KEY"
    echo "   - BACKEND_CORS_ORIGINS"
    echo "   - FIRST_SUPERUSER_EMAIL"
    echo "   - FIRST_SUPERUSER_PASSWORD"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Validate required environment variables
source .env

REQUIRED_VARS=(
    "POSTGRES_DB"
    "POSTGRES_USER"
    "POSTGRES_PASSWORD"
    "MINIO_ACCESS_KEY"
    "MINIO_SECRET_KEY"
    "MINIO_BUCKET"
    "SECRET_KEY"
    "FIRST_SUPERUSER_EMAIL"
    "FIRST_SUPERUSER_PASSWORD"
    "FIRST_SUPERUSER_NAME"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please update your .env file."
    exit 1
fi

echo "✅ Environment variables validated"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

echo ""
echo "🔨 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🎉 Production environment started!"
echo ""
echo "Access the application:"
echo "  - Frontend: http://localhost"
echo "  - API: http://localhost/api/v1"
echo "  - API Health: http://localhost/api/v1/health"
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose -f docker-compose.prod.yml down"

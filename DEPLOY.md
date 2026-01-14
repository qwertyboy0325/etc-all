# ETC Production Deployment Guide

## Quick Start

### Prerequisites
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Environment Setup

1. **Copy environment template**
```bash
cp env.example .env
```

2. **Edit `.env` with your production values**
```bash
# Required variables:
POSTGRES_DB=etc_pointcloud_prod
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_secure_password

MINIO_ACCESS_KEY=your_minio_key
MINIO_SECRET_KEY=your_minio_secret
MINIO_BUCKET=pointcloud-files

SECRET_KEY=your_jwt_secret_key_at_least_32_chars
BACKEND_CORS_ORIGINS=https://your-domain.com

FIRST_SUPERUSER_EMAIL=admin@your-domain.com
FIRST_SUPERUSER_PASSWORD=admin_secure_password
FIRST_SUPERUSER_NAME=Admin
```

### Deployment

#### 1. Check for Port Conflicts
```bash
./scripts/fix-port-conflict.sh
```

If ports are in use:
```bash
# Stop old containers
docker-compose -f docker-compose.prod.yml down

# Or stop system Redis
sudo systemctl stop redis
# or on macOS
brew services stop redis
```

#### 2. Deploy
```bash
# Pull latest code
git pull origin main

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

#### 3. Verify Deployment
```bash
# Check all services are healthy
docker ps --filter "name=etc_" --format "table {{.Names}}\t{{.Status}}"

# Check logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Test API
curl http://localhost/api/v1/health
```

### Common Issues

#### Port 6379 Already in Use
**Cause**: Redis port conflict

**Solution**:
```bash
# Option 1: Stop old containers
docker-compose -f docker-compose.prod.yml down

# Option 2: Stop system Redis
sudo systemctl stop redis  # Linux
brew services stop redis   # macOS

# Option 3: Find and kill process
lsof -i :6379
kill -9 <PID>
```

#### Port 80/443 Already in Use
**Cause**: Another web server (nginx, apache) is running

**Solution**:
```bash
# Stop system nginx
sudo systemctl stop nginx

# Or modify nginx ports in docker-compose.prod.yml
ports:
  - "8080:80"
  - "8443:443"
```

#### Database Connection Failed
**Cause**: Database not ready or wrong credentials

**Solution**:
```bash
# Check database logs
docker logs etc_postgres_prod

# Verify environment variables
docker exec etc_api_prod env | grep DB_

# Restart services
docker-compose -f docker-compose.prod.yml restart api celery_worker
```

### Maintenance

#### Update Application
```bash
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

#### Backup Database
```bash
docker exec etc_postgres_prod pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs -f etc_api_prod
docker logs -f etc_celery_worker_prod
```

#### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

#### Clean Up (⚠️ Removes all data)
```bash
docker-compose -f docker-compose.prod.yml down -v
rm -rf data/
```

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Nginx (80/443)                │
│            Reverse Proxy & SSL                  │
└────────────┬────────────────────────┬───────────┘
             │                        │
    ┌────────▼────────┐      ┌───────▼────────┐
    │   Frontend      │      │   FastAPI      │
    │   (React)       │      │   Backend      │
    └─────────────────┘      └───┬────────────┘
                                  │
                     ┌────────────┼────────────┐
                     │            │            │
            ┌────────▼──┐   ┌────▼─────┐  ┌──▼──────┐
            │ PostgreSQL│   │  Redis   │  │  MinIO  │
            │ Database  │   │  Cache   │  │ Storage │
            └───────────┘   └────┬─────┘  └─────────┘
                                 │
                          ┌──────▼────────┐
                          │ Celery Worker │
                          │ (Async Tasks) │
                          └───────────────┘
```

### Services

| Service | Container Name | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------------|---------|
| Nginx | `etc_nginx_prod` | 80, 443 | 80, 443 | Reverse proxy |
| Frontend | `etc_frontend_prod` | 80 | - | React UI |
| API | `etc_api_prod` | 8000 | - | FastAPI backend |
| PostgreSQL | `etc_postgres_prod` | 5432 | - | Database |
| Redis | `etc_redis_prod` | 6379 | - | Cache & message broker |
| MinIO | `etc_minio_prod` | 9000, 9001 | - | Object storage |
| Celery Worker | `etc_celery_worker_prod` | - | - | Background tasks |

**Note**: In production, only Nginx ports (80/443) are exposed to the host. All other services communicate through Docker's internal network.

### Security Checklist

- [ ] Change default passwords in `.env`
- [ ] Use strong `SECRET_KEY` (32+ characters)
- [ ] Configure SSL certificates in `./ssl/`
- [ ] Set proper `BACKEND_CORS_ORIGINS`
- [ ] Enable firewall (only allow 80/443)
- [ ] Regular backups of database and MinIO data
- [ ] Keep Docker images updated

### Monitoring

```bash
# Resource usage
docker stats

# Health checks
docker inspect etc_api_prod | grep -A 10 Health
docker inspect etc_postgres_prod | grep -A 10 Health

# Service status
docker-compose -f docker-compose.prod.yml ps
```

## Support

For issues or questions, check:
- Application logs: `docker-compose -f docker-compose.prod.yml logs`
- GitHub Issues: https://github.com/your-repo/issues

# Deployment Instructions

## 1. Prerequisites
- Docker & Docker Compose installed
- Port 80 and 443 available (or modify docker-compose.prod.yml)

## 2. One-Click Deploy
Run the deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:
- Generate a secure `.env` file if one doesn't exist
- Create necessary data directories (`./data` and `./training-data`)
- Build and start all services

## 3. Access
- **Web Interface**: http://localhost
- **Admin Login**: 
  - Email: `admin@etc.com`
  - Password: `admin` (or check .env for `FIRST_SUPERUSER_PASSWORD`)

## 4. Data Management
- **Training Data**: Exported files appear in `./training-data`
- **Database**: Stored in `./data/postgres`
- **Images/Files**: Stored in `./data/minio`

## 5. Clean / Restart
To stop:
```bash
docker-compose -f docker-compose.prod.yml down
```

To wipe data (CAUTION):
```bash
rm -rf ./data
```




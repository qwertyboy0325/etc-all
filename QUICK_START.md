# ETC Production Quick Start

一鍵部署指南 - 適用於全新伺服器

## 📋 系統需求

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- 最低 4GB RAM
- 20GB 可用磁碟空間
- Docker 20.10+
- Docker Compose 2.0+

## 🚀 快速部署（3 步驟）

### 1. 安裝 Docker（如果尚未安裝）

```bash
# 安裝 Docker
curl -fsSL https://get.docker.com | sh

# 將當前用戶加入 docker 組
sudo usermod -aG docker $USER

# 重新登入使權限生效
exit
# 重新 SSH 連線

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 驗證安裝
docker --version
docker-compose --version
```

### 2. 克隆項目

```bash
# 克隆代碼
git clone https://github.com/qwertyboy0325/etc-all.git
cd etc-all

# 或使用 SSH
git clone git@github.com:qwertyboy0325/etc-all.git
cd etc-all
```

### 3. 運行部署腳本

```bash
# 一鍵部署
./deploy-prod.sh
```

就這樣！腳本會自動：
- ✅ 檢查系統環境
- ✅ 自動生成 `.env` 配置（如果不存在）
- ✅ 生成安全的隨機密鑰
- ✅ 構建並啟動所有服務
- ✅ 執行健康檢查
- ✅ 顯示訪問地址

## 🌐 訪問系統

部署完成後，在瀏覽器中打開：

- **前端**: http://your-server-ip
- **API**: http://your-server-ip/api/v1
- **API 文檔**: http://your-server-ip/api/v1/docs

## 🔑 默認登入憑證

```
Email: admin@your-domain
Password: admin123
```

**⚠️ 重要：首次登入後請立即更改密碼！**

## 📊 管理命令

```bash
# 查看所有服務狀態
docker-compose -f docker-compose.prod.yml ps

# 查看日誌
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服務日誌
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f celery_worker

# 重啟服務
docker-compose -f docker-compose.prod.yml restart

# 停止服務
docker-compose -f docker-compose.prod.yml down

# 停止並刪除數據（⚠️ 會清空所有數據）
docker-compose -f docker-compose.prod.yml down -v
```

## 🔄 更新部署

```bash
# 拉取最新代碼
git pull

# 重新部署
./deploy-prod.sh
```

## 🔧 手動配置（可選）

如果需要自定義配置，在運行 `deploy-prod.sh` 之前創建 `.env` 文件：

```bash
# 複製範例配置
cp .env.example .env

# 編輯配置
nano .env

# 修改以下重要參數：
# - POSTGRES_PASSWORD
# - MINIO_SECRET_KEY
# - SECRET_KEY
# - BACKEND_CORS_ORIGINS
# - FIRST_SUPERUSER_EMAIL
# - FIRST_SUPERUSER_PASSWORD
```

然後運行部署腳本：

```bash
./deploy-prod.sh
```

## 🔐 生成安全密鑰

```bash
# 生成 SECRET_KEY (64 字符)
openssl rand -hex 32

# 生成 MINIO_SECRET_KEY (40 字符)
openssl rand -hex 20

# 生成強密碼 (32 字符)
openssl rand -hex 16
```

## 🐛 故障排除

### 端口被占用

```bash
# 檢查端口 80 是否被占用
sudo lsof -i :80

# 停止占用端口的服務（例如 nginx）
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 服務啟動失敗

```bash
# 查看詳細日誌
docker-compose -f docker-compose.prod.yml logs api

# 重啟服務
docker-compose -f docker-compose.prod.yml restart api

# 完全重建
docker-compose -f docker-compose.prod.yml down -v
./deploy-prod.sh
```

### 數據庫連接失敗

```bash
# 檢查數據庫容器狀態
docker logs etc_postgres_prod

# 檢查環境變數
docker exec etc_api_prod env | grep DB_

# 如果密碼不匹配，需要重建數據庫
docker-compose -f docker-compose.prod.yml down -v
./deploy-prod.sh
```

## 📚 更多文檔

- [完整部署指南](DEPLOY.md)
- [開發環境設置](docs/development-environment.md)
- [訓練指南](TRAINING_GUIDE.md)

## 💡 提示

1. **首次部署**: 腳本會自動生成安全的密鑰和密碼
2. **環境隔離**: 使用 Docker 命名卷，數據獨立於代碼
3. **零配置**: 如果沒有 `.env` 文件，腳本會自動創建
4. **健康檢查**: 自動驗證所有服務是否正常啟動

## ⚠️ 安全建議

1. 首次登入後立即更改管理員密碼
2. 在防火牆中只開放必要端口（80, 443）
3. 配置 HTTPS（使用 Let's Encrypt）
4. 定期備份數據庫和對象存儲
5. 定期更新系統和 Docker 鏡像

## 📞 支持

如有問題，請查看：
- GitHub Issues: https://github.com/qwertyboy0325/etc-all/issues
- 完整文檔: [DEPLOY.md](DEPLOY.md)

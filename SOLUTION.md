# 🔧 解決 GCP 權限問題

## 問題描述

你遇到了 GCP 權限問題：
```
ERROR: (gcloud.services.enable) PERMISSION_DENIED: Permission denied to enable service [sourcerepo.googleapis.com]
```

**根本原因**：Google 在 2024-06-17 後停售了 Cloud Source Repositories 給新客戶，即使有 Owner 權限也無法啟用此 API。

## 🎯 解決方案

### 方案 1: 本地部署（推薦，無需 GCP 權限）

```bash
# 運行快速開始腳本
./quick-start.sh
# 選擇選項 3: 本地部署

# 或直接運行本地部署
./scripts/deploy-local.sh
```

**優點**：
- ✅ 無需 GCP 權限
- ✅ 快速啟動
- ✅ 完全功能
- ✅ 適合開發和測試

**訪問地址**：
- 前端：http://localhost:3000
- 後端：http://localhost:8000
- API 文檔：http://localhost:8000/docs
- MinIO 控制台：http://localhost:9001

### 方案 2: GitHub + Cloud Build CI/CD（推薦，現代化部署）

```bash
# 運行快速開始腳本
./quick-start.sh
# 選擇選項 4: GitHub + Cloud Build CI/CD

# 或直接運行
./scripts/setup-github-cicd.sh
```

**優點**：
- ✅ 現代化 CI/CD 流程
- ✅ 自動化部署
- ✅ 無需 Cloud Source Repositories
- ✅ 使用 GitHub 倉庫
- ✅ 適合生產環境

### 方案 3: 修復 GCP 權限

```bash
# 運行權限修復腳本
./scripts/fix-permissions.sh
```

**需要以下權限之一**：
- Project Owner (roles/owner)
- Project Editor (roles/editor)
- Service Usage Admin (roles/serviceusage.serviceUsageAdmin)

### 方案 4: 創建新 GCP 專案

```bash
# 創建新專案
gcloud projects create your-new-project-id --name="ETC Point Cloud"

# 設置專案
gcloud config set project your-new-project-id

# 啟用計費（在 GCP Console 中完成）
# https://console.cloud.google.com/billing

# 運行設置腳本
./scripts/setup-gcp-project.sh
```

## 🚀 快速開始

### 最簡單的方式（本地部署）

```bash
# 1. 運行快速開始腳本
./quick-start.sh

# 2. 選擇選項 3: 本地部署

# 3. 等待部署完成

# 4. 訪問 http://localhost:3000
```

### 如果需要 GCP 部署

```bash
# 1. 修復權限問題
./scripts/fix-permissions.sh

# 2. 運行快速開始腳本
./quick-start.sh

# 3. 選擇選項 1: 自動部署到 GCP
```

## 📋 部署選項對比

| 選項 | 權限要求 | 部署時間 | 成本 | 適用場景 |
|------|----------|----------|------|----------|
| 本地部署 | 無 | 5-10 分鐘 | 免費 | 開發、測試、演示 |
| GCP 部署 | 需要權限 | 15-30 分鐘 | 付費 | 生產環境 |

## 🔍 故障排除

### 如果本地部署失敗

```bash
# 檢查 Docker 是否運行
docker info

# 檢查端口是否被占用
lsof -i :3000
lsof -i :8000
lsof -i :5432

# 清理並重新部署
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.local.yml up -d
```

### 如果 GCP 部署失敗

```bash
# 檢查權限
./scripts/fix-permissions.sh

# 檢查計費
gcloud billing projects describe YOUR_PROJECT_ID

# 檢查 API 狀態
gcloud services list --enabled
```

## 🎉 推薦流程

1. **先試本地部署**：快速體驗系統功能
2. **如果需要生產環境**：使用 GitHub + Cloud Build CI/CD
3. **如果只是開發測試**：繼續使用本地部署
4. **如果需要傳統 GCP 部署**：解決權限問題後部署

## 📞 需要幫助？

如果遇到問題，可以：

1. 運行 `./scripts/fix-permissions.sh` 檢查權限
2. 查看 `DEPLOYMENT-GUIDE.md` 詳細指南
3. 檢查 `HOW-TO-USE.md` 使用說明
4. 運行 `./scripts/check-deployment.sh` 檢查狀態

記住：本地部署是最簡單的開始方式！

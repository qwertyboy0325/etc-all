# 依賴概覽表

## 核心依賴一覽

| 類別 | 套件名稱 | 版本 | 主要用途 | 重要性 |
|------|----------|------|----------|--------|
| **Web框架** | FastAPI | 0.104.1 | 主要Web框架 | 🔴 核心 |
| **Web框架** | Uvicorn | 0.24.0 | ASGI服務器 | 🔴 核心 |
| **資料庫** | SQLAlchemy | 2.0.23 | ORM框架 | 🔴 核心 |
| **資料庫** | AsyncPG | 0.29.0 | PostgreSQL異步驅動 | 🔴 核心 |
| **資料庫** | psycopg2-binary | 2.9.9 | PostgreSQL同步驅動 | 🟡 工具 |
| **資料庫** | Alembic | 1.12.1 | 資料庫遷移 | 🟡 工具 |
| **資料庫** | greenlet | 3.2.3 | 異步支援 | 🔴 核心 |
| **緩存** | Redis | 5.0.1 | 緩存/會話存儲 | 🔴 核心 |
| **任務隊列** | Celery | 5.3.4 | 背景任務處理 | 🟠 重要 |
| **安全** | python-jose | 3.3.0 | JWT Token處理 | 🟠 重要 |
| **安全** | passlib | 1.7.4 | 密碼哈希 | 🟠 重要 |
| **文件處理** | python-multipart | 0.0.6 | 文件上傳 | 🟠 重要 |
| **存儲** | MinIO | 7.2.0 | 對象存儲（內網） | 🟡 工具 |
| **存儲** | boto3 | 1.34.0 | AWS S3（雲端） | 🟡 工具 |
| **配置** | python-dotenv | 1.0.0 | 環境變數管理 | 🟡 工具 |
| **配置** | pydantic-settings | 2.1.0 | 設定驗證 | 🟡 工具 |
| **HTTP** | httpx | 0.25.2 | 異步HTTP客戶端 | 🟡 工具 |
| **數據處理** | NumPy | 1.24.4 | 數值計算 | 🔴 核心 |
| **數據處理** | pandas | 2.0.3 | 數據分析 | 🟠 重要 |

## 開發工具

| 類別 | 套件名稱 | 版本 | 主要用途 | 環境 |
|------|----------|------|----------|------|
| **測試** | pytest | 7.4.3 | 測試框架 | 開發 |
| **測試** | pytest-asyncio | 0.21.1 | 異步測試 | 開發 |
| **測試** | pytest-cov | 4.1.0 | 測試覆蓋率 | 開發 |
| **代碼品質** | Black | 23.11.0 | 代碼格式化 | 開發 |
| **代碼品質** | isort | 5.12.0 | Import排序 | 開發 |
| **代碼品質** | flake8 | 6.1.0 | 代碼檢查 | 開發 |
| **代碼品質** | mypy | 1.7.1 | 類型檢查 | 開發 |
| **Git工具** | pre-commit | 3.6.0 | Git hooks | 開發 |
| **類型提示** | types-redis | 4.6.0.8 | Redis類型 | 開發 |
| **類型提示** | types-requests | 2.31.0.10 | HTTP類型 | 開發 |

## 依賴重要性說明

- 🔴 **核心依賴**：應用程式無法運行的關鍵組件
- 🟠 **重要依賴**：核心功能需要，但可以有替代方案
- 🟡 **工具依賴**：提升開發效率或特定功能

## 版本兼容性矩陣

| Python版本 | 狀態 | 測試情況 |
|------------|------|----------|
| 3.11.x | ✅ 支援 | 完整測試 |
| 3.12.x | ⚠️ 部分支援 | NumPy/pandas可能有問題 |
| 3.10.x | ⚠️ 向下兼容 | 功能可能受限 |

## 安裝指南

### 完整安裝
```bash
pip install -r requirements.txt
```

### 最小化安裝（僅生產環境）
```bash
# 核心依賴
pip install fastapi==0.104.1 uvicorn==0.24.0
pip install sqlalchemy==2.0.23 asyncpg==0.29.0 greenlet==3.2.3
pip install redis==5.0.1 celery==5.3.4
pip install python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4
pip install numpy==1.24.4 pandas==2.0.3
```

### 開發環境安裝
```bash
# 完整依賴
pip install -r requirements.txt

# 設置pre-commit hooks
pre-commit install
```

## 常見問題

### Q: 為什麼需要兩個PostgreSQL驅動？
**A:** `asyncpg`用於高性能的異步操作，`psycopg2`用於Alembic遷移工具。

### Q: NumPy版本為什麼不是最新的？
**A:** 1.24.4是與Python 3.11最穩定的版本，避免兼容性問題。

### Q: 可以使用MySQL嗎？
**A:** 技術上可以，但需要修改驅動（如改用aiomysql），且某些PostgreSQL特性會失效。

### Q: 如何更新依賴？
**A:** 建議在測試環境先驗證，然後更新requirements.txt，重要更新需要測試完整功能。

## 依賴替代方案

| 當前選擇 | 替代方案 | 優缺點比較 |
|----------|----------|------------|
| FastAPI | Django/Flask | FastAPI性能更好，自動文檔生成 |
| PostgreSQL | MySQL/SQLite | PostgreSQL功能最豐富，JSON支援佳 |
| Redis | Memcached | Redis功能更豐富，支援持久化 |
| Celery | RQ/Dramatiq | Celery最成熟，功能最完整 |
| MinIO | 原生S3 | MinIO適合私有部署，S3適合雲端 |

這個依賴架構經過精心選擇，平衡了：
- 🎯 **功能完整性**：滿足所有業務需求
- ⚡ **性能要求**：異步處理，高併發支援
- 🔒 **安全標準**：企業級安全保障
- 🛠️ **開發效率**：完善的工具鏈
- 📈 **可擴展性**：支援水平擴展 
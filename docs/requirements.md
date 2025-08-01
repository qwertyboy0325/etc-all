# 需求分析

## 業務需求

### 業務背景
ETC（電子收費系統）主導的專案，旨在使用光達（LiDAR）掃描的點雲數據進行車種辨識的機器學習訓練。本系統負責提供點雲標注功能，讓標注人員在瀏覽器中辨識和標注車種，為後續的AI訓練提供高質量的標注數據。

### 業務目標
1. 建立高效的點雲標注系統，支援多人協作標注
2. 提供完整的權限管理和審核流程，確保標注質量
3. 設計可擴展的系統架構，未來可與訓練pipeline整合
4. 提供動態可調整的車種分類系統
5. 確保標注數據的準確性和一致性

### 目標用戶
- **標注員**：負責點雲數據的車種標注工作
- **審核員**：負責審核標注結果，確保質量
- **管理員**：負責系統管理、用戶管理、分類管理
- **查看者**：可查看標注結果，但無編輯權限

## 功能需求

### 核心功能
1. **點雲可視化**：在瀏覽器中渲染和顯示點雲數據
2. **車種標注**：提供文字分類標注功能
3. **任務分發系統**：自動分配標注任務，避免衝突
4. **審核工作流**：支援標注提交、審核、退回的完整流程
5. **權限管理**：多角色權限控制系統
6. **分類管理**：動態管理車種分類和標籤

### 功能優先級
| 功能 | 優先級 | 說明 | 預估工時 |
|------|--------|------|----------|
| 點雲可視化 | 高 | 基礎功能，必須先完成 | 3-4週 |
| 基本標注功能 | 高 | 核心業務功能 | 2-3週 |
| 權限管理系統 | 高 | 多用戶協作必需 | 2-3週 |
| 任務分發系統 | 中 | 避免衝突，提高效率 | 2-3週 |
| 審核工作流 | 中 | 質量控制 | 2-3週 |
| 分類管理 | 中 | 動態調整需求 | 1-2週 |
| 數據統計報表 | 低 | 管理功能 | 1-2週 |
| 系統整合API | 低 | 未來整合需求 | 1-2週 |

### 用戶故事
1. **作為標注員**，我希望能夠在瀏覽器中清晰地查看點雲數據，並快速進行車種分類
2. **作為標注員**，我希望系統能自動分配任務給我，避免與其他人重複標注
3. **作為審核員**，我希望能夠查看標注結果，並提供審核意見
4. **作為管理員**，我希望能夠管理用戶權限和車種分類
5. **作為查看者**，我希望能夠查看已完成的標注統計和結果

## 非功能需求

### 性能需求
- 點雲文件（≤10MB）載入時間不超過5秒
- 支援至少50個並發用戶同時使用
- 3D渲染操作響應時間不超過100ms
- 系統可用性達到99.5%以上

### 安全需求
- 用戶認證和授權機制
- 數據傳輸加密（HTTPS）
- 操作日誌記錄和審計
- 資料備份和恢復機制

### 可用性需求
- 直觀的用戶界面設計
- 支援主流瀏覽器（Chrome、Firefox、Safari）
- 響應式設計，支援不同螢幕尺寸
- 完整的操作說明和幫助文檔

### 擴展性需求
- 支援動態添加新的車種分類
- 支援水平擴展以應對用戶增長
- 模組化設計，便於功能擴展
- 提供API介面，方便第三方整合

## 技術限制

### 技術約束
- 點雲數據格式：NumPy格式（.npy/.npz）
- 數據大小：單個文件不超過10MB
- 數據特性：靜態點雲，無顏色信息
- 數據傳輸：透過消息隊列接收

### 環境限制
- 初期內網部署，後期遷移至雲端
- 支援瀏覽器端的3D渲染
- 與現有ETC系統的整合能力

## 驗收標準

### 功能驗收
- 能夠正確載入和顯示點雲數據
- 標注功能正常運作，數據正確保存
- 任務分發系統無衝突，狀態正確
- 審核流程完整，狀態轉換正確
- 權限控制有效，角色功能正確

### 性能驗收
- 點雲載入時間符合要求
- 並發用戶數符合要求
- 3D操作響應時間符合要求
- 系統穩定性符合要求

---
*最後更新：2024年12月19日* 
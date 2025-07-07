"""
API v1 主路由器
"""
from fastapi import APIRouter

from .health import router as health_router

# 創建 v1 API 路由器
router = APIRouter()

# 包含健康檢查路由
router.include_router(
    health_router,
    prefix="/health",
    tags=["health"]
)

# 添加根路由
@router.get("/")
async def root():
    """
    API v1 根端點
    """
    return {
        "message": "ETC Point Cloud Annotation System API v1",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health/health",
            "database_status": "/health/database/status",
            "models_validate": "/health/models/validate",
            "system_info": "/health/info",
            "ping": "/health/ping"
        }
    } 
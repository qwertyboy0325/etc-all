from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.enums import GlobalRole
from app.schemas.user import UserResponse, UserCreateAdmin

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def read_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve users. Only admins can see all users.
    """
    # 如果不是 System Admin，只能看到自己 (或者我們可以限制只有 Admin 能呼叫此 API)
    # 這裡為了指派專案管理員的功能，假設 System Admin 或 Project Creator (通常也是 Admin) 可以看到用戶列表
    # 簡單起見，這裡先檢查是否為 Admin
    if current_user.global_role not in [GlobalRole.SYSTEM_ADMIN, GlobalRole.ADMIN]:
        # 如果不是管理員，只返回自己
        return [UserResponse.model_validate(current_user)]

    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreateAdmin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new user (System Admin only).
    """
    if current_user.global_role != GlobalRole.SYSTEM_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )

    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system.",
        )

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        username=user_in.username,
        bio=user_in.bio,
        phone=user_in.phone,
        is_active=user_in.is_active,
        global_role=user_in.global_role,
        is_verified=True, # Admin created users are auto-verified
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)

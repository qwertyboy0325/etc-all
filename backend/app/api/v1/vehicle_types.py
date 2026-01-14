"""Vehicle types API endpoints for projects."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_active_user,
    get_db,
    require_project_access,
    validate_project_exists,
)
from app.models.enums import ProjectRole
from app.models.project import Project
from app.models.user import User
from app.models.vehicle_type import ProjectVehicleType
from app.schemas.annotation import VehicleTypeInfo, VehicleTypeCreate, VehicleTypeUpdate

router = APIRouter()


@router.get(
    "/projects/{project_id}/vehicle-types",
    response_model=List[VehicleTypeInfo],
    summary="List vehicle types for a project",
    description="Get all vehicle types available within the specified project.",
)
async def list_project_vehicle_types(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Project = Depends(validate_project_exists),
    __: bool = Depends(require_project_access(ProjectRole.VIEWER)),
) -> List[VehicleTypeInfo]:
    """Return vehicle types configured for the given project."""
    try:
        result = await db.execute(
            select(ProjectVehicleType).where(
                ProjectVehicleType.project_id == project_id
            )
        )
        items = result.scalars().all()
        # Adapt model to schema if needed (schema expects 'code', model has 'name')
        response_items = []
        for item in items:
             # Temporary fix if 'code' is required by schema but not in model
             # Assuming we updated VehicleTypeInfo to use name/display_name properly
             # or we map name -> code
             item_dict = {
                 "id": item.id,
                 "name": item.name,
                 "code": item.name, # Map name to code for compatibility
                 "description": item.description,
                 "display_name": item.display_name,
                 "color": item.color,
                 "is_active": item.is_active
             }
             response_items.append(VehicleTypeInfo(**item_dict))
             
        return response_items
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list vehicle types: {str(e)}",
        )


@router.post(
    "/projects/{project_id}/vehicle-types",
    response_model=VehicleTypeInfo,
    status_code=status.HTTP_201_CREATED,
    summary="Create vehicle type",
    description="Create a new vehicle type for the project.",
)
async def create_vehicle_type(
    project_id: UUID,
    type_data: VehicleTypeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Project = Depends(validate_project_exists),
    __: bool = Depends(require_project_access(ProjectRole.PROJECT_ADMIN)),
) -> VehicleTypeInfo:
    """Create a new vehicle type (Project Admin only)."""
    try:
        # Check for existing name
        existing = await db.execute(
            select(ProjectVehicleType).where(
                ProjectVehicleType.project_id == project_id,
                ProjectVehicleType.name == type_data.name
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle type with name '{type_data.name}' already exists in this project"
            )

        new_type = ProjectVehicleType.create_project_specific(
            project_id=str(project_id),
            name=type_data.name,
            display_name=type_data.display_name,
            description=type_data.description,
            category=type_data.category,
            color=type_data.color
        )

        db.add(new_type)
        await db.commit()
        await db.refresh(new_type)

        return VehicleTypeInfo(
            id=new_type.id,
            name=new_type.name,
            code=new_type.name,
            description=new_type.description,
            display_name=new_type.display_name,
            color=new_type.color,
            is_active=new_type.is_active
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create vehicle type: {str(e)}",
        )


@router.put(
    "/projects/{project_id}/vehicle-types/{type_id}",
    response_model=VehicleTypeInfo,
    summary="Update vehicle type",
    description="Update an existing vehicle type.",
)
async def update_vehicle_type(
    project_id: UUID,
    type_id: UUID,
    type_data: VehicleTypeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Project = Depends(validate_project_exists),
    __: bool = Depends(require_project_access(ProjectRole.PROJECT_ADMIN)),
) -> VehicleTypeInfo:
    """Update a vehicle type (Project Admin only)."""
    try:
        result = await db.execute(
            select(ProjectVehicleType).where(
                ProjectVehicleType.id == type_id,
                ProjectVehicleType.project_id == project_id
            )
        )
        vehicle_type = result.scalar_one_or_none()
        
        if not vehicle_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle type not found"
            )

        # Update fields
        if type_data.name:
            # Check name uniqueness if changed
            if type_data.name != vehicle_type.name:
                existing = await db.execute(
                    select(ProjectVehicleType).where(
                        ProjectVehicleType.project_id == project_id,
                        ProjectVehicleType.name == type_data.name
                    )
                )
                if existing.scalar_one_or_none():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Vehicle type '{type_data.name}' already exists"
                    )
            vehicle_type.name = type_data.name
            
        if type_data.display_name:
            vehicle_type.display_name = type_data.display_name
        if type_data.description is not None:
            vehicle_type.description = type_data.description
        if type_data.category is not None:
            vehicle_type.category = type_data.category
        if type_data.color is not None:
            vehicle_type.color = type_data.color
        if type_data.is_active is not None:
            vehicle_type.is_active = type_data.is_active

        await db.commit()
        await db.refresh(vehicle_type)

        return VehicleTypeInfo(
            id=vehicle_type.id,
            name=vehicle_type.name,
            code=vehicle_type.name,
            description=vehicle_type.description,
            display_name=vehicle_type.display_name,
            color=vehicle_type.color,
            is_active=vehicle_type.is_active
        )
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update vehicle type: {str(e)}",
        )


@router.delete(
    "/projects/{project_id}/vehicle-types/{type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete vehicle type",
    description="Delete a vehicle type (only if unused).",
)
async def delete_vehicle_type(
    project_id: UUID,
    type_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _: Project = Depends(validate_project_exists),
    __: bool = Depends(require_project_access(ProjectRole.PROJECT_ADMIN)),
) -> None:
    """Delete a vehicle type (Project Admin only)."""
    try:
        result = await db.execute(
            select(ProjectVehicleType).where(
                ProjectVehicleType.id == type_id,
                ProjectVehicleType.project_id == project_id
            )
        )
        vehicle_type = result.scalar_one_or_none()
        
        if not vehicle_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle type not found"
            )

        if vehicle_type.is_used:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete vehicle type that is in use"
            )

        await db.delete(vehicle_type)
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete vehicle type: {str(e)}",
        )

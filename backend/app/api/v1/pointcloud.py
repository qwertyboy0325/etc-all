"""Point cloud file management API endpoints."""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.api.deps import (
    get_current_active_user,
    get_db,
    require_project_access,
    require_admin,
    validate_project_exists,
)
from app.models.enums import FileStatus, ProjectRole
from app.models.project import Project
from app.models.user import User
from app.schemas.pointcloud import (
    FileDownloadResponse,
    FileUploadResponse,
    PointCloudFileListResponse,
    PointCloudFileResponse,
    PointCloudFileSummary,
    PointCloudStats,
)
from app.services.file_upload import FileUploadService
import zipfile
import io
from pathlib import Path

# Helper class for in-memory files
class MemoryUploadFile:
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self.content = content
        self.content_type = "application/octet-stream"
        self.size = len(content)

    async def read(self):
        return self.content

    async def seek(self, offset):
        pass

    async def close(self):
        pass

router = APIRouter()


@router.post(
    "/projects/{project_id}/files/upload-multi",
    response_model=List[FileUploadResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Batch upload point cloud files",
    description="Upload multiple point cloud files to a project.",
)
async def upload_multiple_files(
    project_id: UUID,
    files: List[UploadFile] = File(..., description="List of point cloud files"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.ANNOTATOR)),
) -> List[FileUploadResponse]:
    """
    Batch upload multiple point cloud files.
    """
    upload_service = FileUploadService(db)
    responses = []
    errors = []

    for file in files:
        try:
            # Reset file cursor if needed
            await file.seek(0)
            
            pointcloud_file = await upload_service.upload_pointcloud(
                file=file,
                project_id=project_id,
                uploaded_by=current_user.id,
            )

            responses.append(FileUploadResponse(
                file_id=pointcloud_file.id,
                filename=pointcloud_file.filename,
                original_filename=pointcloud_file.original_filename,
                file_size=pointcloud_file.file_size,
                status=pointcloud_file.status,
                point_count=pointcloud_file.point_count,
                bounding_box=pointcloud_file.bounding_box,
                checksum=pointcloud_file.checksum or "",
                message="Success",
            ))
        except Exception as e:
            # Log error but continue with other files
            errors.append(f"{file.filename}: {str(e)}")
            continue
            
    if not responses and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All uploads failed: {'; '.join(errors)}"
        )

    return responses


@router.post(
    "/projects/{project_id}/files/upload-archive",
    response_model=List[FileUploadResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Upload ZIP archive",
    description="Upload a ZIP file containing multiple point cloud files (.npy, .npz).",
)
async def upload_archive(
    project_id: UUID,
    archive: UploadFile = File(..., description="ZIP archive file"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.ANNOTATOR)),
) -> List[FileUploadResponse]:
    """
    Upload and extract a ZIP archive containing point cloud files.
    """
    if not archive.filename.lower().endswith('.zip'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a ZIP archive"
        )

    upload_service = FileUploadService(db)
    responses = []
    errors = []

    try:
        content = await archive.read()
        with zipfile.ZipFile(io.BytesIO(content)) as zip_ref:
            # Filter valid files
            valid_files = [
                f for f in zip_ref.namelist() 
                if not f.startswith('__MACOSX') and 
                not f.startswith('.') and 
                (f.lower().endswith('.npy') or f.lower().endswith('.npz'))
            ]

            if not valid_files:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No valid point cloud files (.npy, .npz) found in archive"
                )

            for filename in valid_files:
                try:
                    file_content = zip_ref.read(filename)
                    # Create memory file object that mimics UploadFile
                    mem_file = MemoryUploadFile(
                        filename=Path(filename).name, # Handle paths in zip
                        content=file_content
                    )

                    pointcloud_file = await upload_service.upload_pointcloud(
                        file=mem_file,
                        project_id=project_id,
                        uploaded_by=current_user.id,
                    )

                    responses.append(FileUploadResponse(
                        file_id=pointcloud_file.id,
                        filename=pointcloud_file.filename,
                        original_filename=pointcloud_file.original_filename,
                        file_size=pointcloud_file.file_size,
                        status=pointcloud_file.status,
                        point_count=pointcloud_file.point_count,
                        bounding_box=pointcloud_file.bounding_box,
                        checksum=pointcloud_file.checksum or "",
                        message="Success",
                    ))
                except Exception as e:
                    errors.append(f"{filename}: {str(e)}")
                    continue

    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ZIP file"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Archive processing failed: {str(e)}"
        )

    if not responses and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All files in archive failed: {'; '.join(errors)}"
        )

    return responses


@router.post(
    "/projects/{project_id}/files/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload point cloud file",
    description="Upload a point cloud file to a project. Supports .npy, .npz, .ply, and .pcd formats.",
)
async def upload_pointcloud_file(
    project_id: UUID,
    file: UploadFile = File(..., description="Point cloud file to upload"),
    description: Optional[str] = Form(None, description="Optional file description"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.ANNOTATOR)),
) -> FileUploadResponse:
    """
    Upload a point cloud file to a project.

    **Required permissions**: Project ANNOTATOR or higher

    **Supported formats**:
    - .npy (NumPy array format)
    - .npz (Compressed NumPy arrays)
    - .ply (Stanford PLY format)
    - .pcd (Point Cloud Data format)

    **File size limit**: 50MB (configurable)

    The file will be automatically analyzed to extract metadata such as:
    - Point count
    - Bounding box
    - Data dimensions
    - Basic quality assessment
    """
    upload_service = FileUploadService(db)

    try:
        pointcloud_file = await upload_service.upload_pointcloud(
            file=file,
            project_id=project_id,
            uploaded_by=current_user.id,
            description=description,
        )

        return FileUploadResponse(
            file_id=pointcloud_file.id,
            filename=pointcloud_file.filename,
            original_filename=pointcloud_file.original_filename,
            file_size=pointcloud_file.file_size,
            status=pointcloud_file.status,
            point_count=pointcloud_file.point_count,
            bounding_box=pointcloud_file.bounding_box,
            checksum=pointcloud_file.checksum or "",
            message="File uploaded and analyzed successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )


@router.get(
    "/projects/{project_id}/files",
    response_model=PointCloudFileListResponse,
    summary="List project files",
    description="Get a paginated list of point cloud files in a project.",
)
async def list_project_files(
    project_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    status_filter: Optional[FileStatus] = Query(
        None, description="Filter by file status"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.VIEWER)),
) -> PointCloudFileListResponse:
    """
    Get a paginated list of point cloud files in a project.

    **Required permissions**: Project VIEWER or higher
    """
    upload_service = FileUploadService(db)

    skip = (page - 1) * size
    files = await upload_service.get_project_files(
        project_id=project_id,
        skip=skip,
        limit=size,
        status_filter=status_filter,
    )

    # Get total count (simplified - in production you might want a more efficient count)
    total_files = await upload_service.get_project_files(
        project_id=project_id, skip=0, limit=1000
    )
    total = len(total_files)

    file_summaries = [
        PointCloudFileSummary(
            id=f.id,
            original_filename=f.original_filename,
            file_size=f.file_size,
            status=f.status,
            point_count=f.point_count,
            upload_completed_at=f.upload_completed_at,
            created_at=f.created_at,
        )
        for f in files
    ]

    pages = (total + size - 1) // size  # Ceiling division

    return PointCloudFileListResponse(
        items=file_summaries,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get(
    "/projects/{project_id}/files/{file_id}",
    response_model=PointCloudFileResponse,
    summary="Get file details",
    description="Get detailed information about a specific point cloud file.",
)
async def get_file_details(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.VIEWER)),
) -> PointCloudFileResponse:
    """
    Get detailed information about a specific point cloud file.

    **Required permissions**: Project VIEWER or higher
    """
    upload_service = FileUploadService(db)

    pointcloud_file = await upload_service.get_file_by_id(file_id)
    if not pointcloud_file or pointcloud_file.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    return PointCloudFileResponse.model_validate(pointcloud_file)


@router.get(
    "/projects/{project_id}/files/{file_id}/download",
    response_model=FileDownloadResponse,
    summary="Get download URL",
    description="Generate a temporary download URL for a point cloud file.",
)
async def get_file_download_url(
    project_id: UUID,
    file_id: UUID,
    expires_in_hours: int = Query(
        1, ge=1, le=24, description="URL expiration time in hours"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.VIEWER)),
) -> FileDownloadResponse:
    """
    Generate a temporary download URL for a point cloud file.

    **Required permissions**: Project VIEWER or higher

    **URL expiration**: 1-24 hours (default: 1 hour)
    """
    upload_service = FileUploadService(db)

    # Verify file exists and belongs to project
    pointcloud_file = await upload_service.get_file_by_id(file_id)
    if not pointcloud_file or pointcloud_file.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    if pointcloud_file.status == FileStatus.DELETED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="File has been deleted"
        )

    download_url = await upload_service.get_download_url(file_id, expires_in_hours)
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)

    return FileDownloadResponse(
        download_url=download_url,
        expires_at=expires_at,
        filename=pointcloud_file.original_filename,
        file_size=pointcloud_file.file_size,
    )


@router.delete(
    "/projects/{project_id}/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete file",
    description="Delete a point cloud file from storage and mark as deleted in database.",
)
async def delete_file(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.PROJECT_ADMIN)),
) -> None:
    """
    Delete a point cloud file.

    **Required permissions**: Project ADMIN

    **Note**: This performs a soft delete - the file record remains in the database
    but is marked as deleted and removed from storage.
    """
    upload_service = FileUploadService(db)

    # Verify file exists and belongs to project
    pointcloud_file = await upload_service.get_file_by_id(file_id)
    if not pointcloud_file or pointcloud_file.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    if pointcloud_file.status == FileStatus.DELETED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="File already deleted"
        )

    success = await upload_service.delete_file(file_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file",
        )


@router.get(
    "/projects/{project_id}/files/stats",
    response_model=PointCloudStats,
    summary="Get file statistics",
    description="Get statistics about point cloud files in a project.",
)
async def get_project_file_stats(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.VIEWER)),
) -> PointCloudStats:
    """
    Get statistics about point cloud files in a project.

    **Required permissions**: Project VIEWER or higher
    """
    upload_service = FileUploadService(db)

    # Get all files for the project
    all_files = await upload_service.get_project_files(
        project_id=project_id,
        skip=0,
        limit=1000,  # In production, use proper aggregation queries
    )

    total_files = len(all_files)
    total_size = sum(f.file_size for f in all_files)
    total_points = sum(f.point_count for f in all_files if f.point_count)

    # Status breakdown
    uploaded_files = len([f for f in all_files if f.status == FileStatus.UPLOADED])
    processing_files = len([f for f in all_files if f.status == FileStatus.PROCESSING])
    failed_files = len([f for f in all_files if f.status == FileStatus.FAILED])

    # File type breakdown
    file_types = {}
    for f in all_files:
        ext = f.file_extension
        file_types[ext] = file_types.get(ext, 0) + 1

    # Size statistics
    file_sizes_mb = [f.file_size / (1024 * 1024) for f in all_files]
    average_file_size = sum(file_sizes_mb) / len(file_sizes_mb) if file_sizes_mb else 0
    largest_file_size = max(file_sizes_mb) if file_sizes_mb else 0

    return PointCloudStats(
        total_files=total_files,
        total_size=total_size,
        total_points=total_points,
        uploaded_files=uploaded_files,
        processing_files=processing_files,
        failed_files=failed_files,
        file_types=file_types,
        average_file_size=average_file_size,
        largest_file_size=largest_file_size,
    )


@router.post(
    "/projects/{project_id}/files/{file_id}/reprocess",
    response_model=PointCloudFileResponse,
    summary="Reprocess file",
    description="Trigger reprocessing of a point cloud file to regenerate metadata.",
)
async def reprocess_file(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.PROJECT_ADMIN)),
) -> PointCloudFileResponse:
    """
    Trigger reprocessing of a point cloud file.

    **Required permissions**: Project ADMIN

    This can be useful if:
    - Initial processing failed
    - You want to regenerate metadata with updated algorithms
    - File analysis needs to be refreshed
    """
    upload_service = FileUploadService(db)

    pointcloud_file = await upload_service.get_file_by_id(file_id)
    if not pointcloud_file or pointcloud_file.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    if pointcloud_file.status == FileStatus.DELETED:
        raise HTTPException(
            status_code=status.HTTP_410_GONE, detail="Cannot reprocess deleted file"
        )

    # TODO: Implement reprocessing logic
    # This would typically involve:
    # 1. Marking file as PROCESSING
    # 2. Queuing a background task for reanalysis
    # 3. Updating metadata when complete

    # For now, return current file state
    return PointCloudFileResponse.model_validate(pointcloud_file)


# Local Import Endpoints

class LocalFolderItem(BaseModel):
    name: str
    path: str
    has_files: bool
    subdirs: List['LocalFolderItem'] = []

class LocalImportRequest(BaseModel):
    source_path: str
    recursive: bool = False

@router.get(
    "/local-folders", 
    response_model=List[LocalFolderItem],
    summary="List local folders",
    description="List folders in the configured local dataset directory."
)
async def list_local_folders(
    path: str = Query("", description="Relative path from raw_data"),
    current_user: User = Depends(get_current_active_user),
    _: User = Depends(require_admin()), # Only admins can browse server FS
):
    """List folders in the raw_data directory."""
    if not settings.DATASET_EXPORT_PATH:
        raise HTTPException(status_code=501, detail="DATASET_EXPORT_PATH not configured")
        
    base_root = Path(settings.DATASET_EXPORT_PATH) / "raw_data"
    if not base_root.exists():
        return []
        
    # Security check
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")
        
    target_dir = base_root / path
    if not target_dir.exists() or not target_dir.is_dir():
        return []
        
    items = []
    try:
        for entry in target_dir.iterdir():
            if entry.is_dir():
                # Check if it has relevant files
                has_files = any(f.suffix.lower() in ['.npy', '.npz', '.ply', '.pcd'] for f in entry.glob("*"))
                
                # Simple non-recursive check for subdirs to keep it fast
                # We don't populate subdirs list recursively here, client should query as needed
                
                items.append(LocalFolderItem(
                    name=entry.name,
                    path=str(entry.relative_to(base_root)),
                    has_files=has_files,
                    subdirs=[] 
                ))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing directory: {e}")
        
    return sorted(items, key=lambda x: x.name)

@router.post(
    "/projects/{project_id}/files/import-local",
    response_model=List[FileUploadResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Import local files",
    description="Import files from the server's local raw_data directory."
)
async def import_local_files(
    project_id: UUID,
    request: LocalImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.PROJECT_ADMIN)),
):
    """Import files from local folder."""
    if not settings.DATASET_EXPORT_PATH:
        raise HTTPException(status_code=501, detail="DATASET_EXPORT_PATH not configured")
        
    base_root = Path(settings.DATASET_EXPORT_PATH) / "raw_data"
    source_dir = base_root / request.source_path
    
    if not source_dir.exists() or not source_dir.is_dir():
        raise HTTPException(status_code=404, detail="Source directory not found")
        
    # Security check
    try:
        source_dir.relative_to(base_root)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    upload_service = FileUploadService(db)
    responses = []
    errors = []
    
    # Collect files
    files_to_process = []
    if request.recursive:
        for ext in ['.npy', '.npz', '.ply', '.pcd']:
            files_to_process.extend(source_dir.rglob(f"*{ext}"))
    else:
        for ext in ['.npy', '.npz', '.ply', '.pcd']:
            files_to_process.extend(source_dir.glob(f"*{ext}"))
            
    if not files_to_process:
        raise HTTPException(status_code=404, detail="No valid files found in directory")

    for file_path in files_to_process:
        try:
            # Read file content
            with open(file_path, "rb") as f:
                content = f.read()
                
            # Create memory file wrapper
            mem_file = MemoryUploadFile(
                filename=file_path.name,
                content=content
            )
            
            pointcloud_file = await upload_service.upload_pointcloud(
                file=mem_file,
                project_id=project_id,
                uploaded_by=current_user.id,
                description=f"Imported from {request.source_path}"
            )
            
            responses.append(FileUploadResponse(
                file_id=pointcloud_file.id,
                filename=pointcloud_file.filename,
                original_filename=pointcloud_file.original_filename,
                file_size=pointcloud_file.file_size,
                status=pointcloud_file.status,
                point_count=pointcloud_file.point_count,
                bounding_box=pointcloud_file.bounding_box,
                checksum=pointcloud_file.checksum or "",
                message="Success",
            ))
        except Exception as e:
            import traceback
            print(f"IMPORT ERROR for {file_path.name}: {e}")
            traceback.print_exc()
            errors.append(f"{file_path.name}: {str(e)}")
            continue
            
    if not responses and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All imports failed: {'; '.join(errors[:5])}"
        )
        
    return responses


@router.get(
    "/projects/{project_id}/files/{file_id}/proxy",
    summary="Proxy file download",
    description="Stream the file through the backend to avoid CORS/Signature issues.",
)
async def proxy_file_download(
    project_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    project: Project = Depends(validate_project_exists),
    _: bool = Depends(require_project_access(ProjectRole.VIEWER)),
):
    """
    Stream the file content directly from MinIO through the backend.
    Useful for local development to avoid DNS/CORS issues with MinIO URLs.
    """
    upload_service = FileUploadService(db)
    pointcloud_file = await upload_service.get_file_by_id(file_id)
    
    if not pointcloud_file or pointcloud_file.project_id != project_id:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Get object from MinIO
        # We use the internal MinIO client which is configured with internal host
        response = upload_service.minio_client.get_object(
            settings.MINIO_BUCKET,
            pointcloud_file.file_path
        )
        
        # Read fully into memory to avoid streaming issues with MinIO/Uvicorn
        content = response.read()
        
        # Log response details for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Proxying file {pointcloud_file.original_filename} (size: {len(content)} bytes)")
        if len(content) < 2000:
             logger.info(f"Small file content preview: {content[:200]}")

        # Close response immediately
        response.close()
        response.release_conn()

        return StreamingResponse(
            io.BytesIO(content), 
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{pointcloud_file.original_filename}"',
                "Content-Length": str(len(content))
            }
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to stream file: {e}")

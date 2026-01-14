import asyncio
import os
from datetime import datetime
from pathlib import Path
from uuid import UUID

from minio import Minio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.celery_app import celery_app

# Expose celery app for worker
celery = celery_app

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.annotation import Annotation
from app.models.enums import AnnotationStatus, TaskPriority
from app.models.pointcloud import PointCloudFile
from app.models.task import Task
from app.services.file_upload import FileUploadService
from app.services.task import TaskService

# ...

@celery_app.task(name="app.worker.import_and_create_tasks", acks_late=True)
def import_and_create_tasks(
    project_id: str,
    source_path: str,
    recursive: bool,
    creator_id: str,
    task_settings: dict,
):
    """
    Import files from server folder and create tasks.
    """
    return asyncio.run(
        import_and_create_tasks_async(
            project_id, source_path, recursive, creator_id, task_settings
        )
    )


async def import_and_create_tasks_async(
    project_id: str,
    source_path: str,
    recursive: bool,
    creator_id: str,
    task_settings: dict,
):
    base_dir = Path(settings.DATASET_EXPORT_PATH) / "raw_data"
    target_dir = base_dir / source_path
    
    if not target_dir.exists() or not target_dir.is_dir():
        return {"status": "failed", "message": f"Directory not found: {target_dir}"}

    print(f"Starting import from {target_dir} for project {project_id}")

    async with AsyncSessionLocal() as db:
        file_service = FileUploadService(db)
        task_service = TaskService(db)
        
        imported_files = []
        errors = []
        
        # Scan directory
        pattern = "**/*" if recursive else "*"
        # Allowed extensions from service
        allowed = {".npy", ".npz", ".ply", ".pcd"}
        
        files_to_process = []
        for p in target_dir.glob(pattern):
            if p.is_file() and p.suffix.lower() in allowed:
                files_to_process.append(p)
        
        print(f"Found {len(files_to_process)} files to process")

        # Import files
        for file_path in files_to_process:
            try:
                # Check if already exists (by filename/project) logic is inside upload/import usually?
                # Or duplicate check. The service doesn't strictly prevent duplicates but stores unique path.
                # Ideally we skip if exact filename already exists in project to avoid duplication.
                # Let's do a quick check or just import. "Import" usually implies adding.
                
                file_record = await file_service.import_local_file(
                    file_path=file_path,
                    project_id=UUID(project_id),
                    uploaded_by=UUID(creator_id)
                )
                imported_files.append(file_record.id)
            except Exception as e:
                print(f"Failed to import {file_path.name}: {e}")
                errors.append(f"{file_path.name}: {str(e)}")

        if not imported_files:
            return {
                "status": "completed",
                "message": "No files imported",
                "errors": errors
            }

        # Create tasks
        print(f"Creating tasks for {len(imported_files)} files")
        try:
            tasks = await task_service.create_batch_tasks(
                project_id=UUID(project_id),
                file_ids=imported_files,
                creator_id=UUID(creator_id),
                name_prefix=task_settings.get("name_prefix", "Task"),
                priority=TaskPriority(task_settings.get("priority", "medium")),
                max_annotations=task_settings.get("max_annotations", 3),
                require_review=task_settings.get("require_review", True),
                due_date=datetime.fromisoformat(task_settings["due_date"]) if task_settings.get("due_date") else None,
                instructions=task_settings.get("instructions"),
                assignee_ids=[UUID(uid) for uid in task_settings.get("assignee_ids", [])] if task_settings.get("assignee_ids") else None,
                distribute_equally=task_settings.get("distribute_equally", False),
            )
            return {
                "status": "completed",
                "files_imported": len(imported_files),
                "tasks_created": len(tasks),
                "errors": errors
            }
        except Exception as e:
            print(f"Failed to create tasks: {e}")
            return {
                "status": "partial",
                "files_imported": len(imported_files),
                "tasks_created": 0,
                "message": f"Files imported but task creation failed: {str(e)}",
                "errors": errors
            }

# MinIO Client
minio_client = Minio(
    endpoint=f"{settings.MINIO_HOST}:{settings.MINIO_PORT}",
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE,
)

@celery_app.task(name="app.worker.export_dataset", acks_late=True)
def export_dataset(project_id: str, base_path: str = None):
    """
    Export dataset task.
    """
    if base_path is None:
        base_path = settings.DATASET_EXPORT_PATH
    return asyncio.run(export_dataset_async(project_id, base_path))

async def export_dataset_async(project_id: str, base_path: str):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Use project ID prefix + timestamp for versioning in exports subdirectory
    export_dir = Path(base_path) / "exports" / f"{project_id}_{timestamp}"
    
    print(f"Starting export for project {project_id} to {export_dir}")

    # Use a session factory bound to the current loop context if possible, 
    # but here we are in a new process/loop. 
    # The issue "attached to a different loop" happens when an object created in one loop 
    # is awaited in another. The global 'AsyncSessionLocal' uses 'async_engine' which 
    # might have been initialized at module level (import time).
    # To fix this in Celery worker, we should dispose the engine or create a fresh one if needed.
    # However, 'async_engine' is global.
    
    # A robust fix for Celery async tasks is to not reuse the global engine directly 
    # if it was created before the fork/loop start.
    # But typically, async_engine is lazy.
    
    # Let's try to ensure we are using the session correctly.
    # The error comes from 'await db.execute(stmt)'.
    
    # We will try to create a scoped session or ensure engine is dispose/recreated?
    # No, that's heavy.
    
    # Simpler fix: Use run_sync for the whole operation? No, we need async.
    
    # Let's try to re-create the engine locally for this worker task to be safe.
    # Or simply Dispose the global engine before using it if we suspect fork issues.
    # But we are in a worker that handles multiple tasks.
    
    # Actually, the best practice with SQLAlchemy Async + Celery is to create the engine
    # inside the task or use a pool that is fork-safe.
    # 'NullPool' is good for this, but we use QueuePool.
    
    # Let's verify if we can just re-import or re-init the engine.
    
    # QUICK FIX: Create a fresh local engine/session for this export task
    # to guarantee isolation from any global loop contamination.
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    from app.core.config import settings
    
    local_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False, # Reduce noise
        pool_pre_ping=True,
    )
    LocalSession = async_sessionmaker(local_engine, expire_on_commit=False)

    try:
        async with LocalSession() as db:
            stmt = (
                select(Annotation)
                .join(Task)
                .join(PointCloudFile, Annotation.pointcloud_file_id == PointCloudFile.id)
                .options(
                    selectinload(Annotation.vehicle_type),
                    selectinload(Annotation.pointcloud_file)
                )
                .where(
                    Annotation.project_id == UUID(project_id),
                    Annotation.status == AnnotationStatus.SUBMITTED
                )
            )
            result = await db.execute(stmt)
            annotations = result.scalars().all()

            if not annotations:
                print("No submitted annotations found")
                return {"status": "failed", "message": "No submitted annotations found"}

            # Group annotations by vehicle_type for sequential numbering
            from collections import defaultdict
            annotations_by_type = defaultdict(list)
            for ann in annotations:
                if ann.vehicle_type:
                    label_name = ann.vehicle_type.name.replace(" ", "_").lower()
                    annotations_by_type[label_name].append(ann)
            
            count = 0
            export_dir.mkdir(parents=True, exist_ok=True)
            
            # Process each vehicle type
            for label_name, type_annotations in annotations_by_type.items():
                label_dir = export_dir / label_name
                train_dir = label_dir / "train"
                test_dir = label_dir / "test"
                train_dir.mkdir(parents=True, exist_ok=True)
                test_dir.mkdir(parents=True, exist_ok=True)
                
                # Split into train/test deterministically (90/10 for PointNet)
                # Start counting from 0 (PointNet requirement)
                train_count = 0
                test_count = 0
                
                for ann in type_annotations:
                    file_record = ann.pointcloud_file
                    if not file_record:
                        continue

                    # Determine split using hash (90/10 split for PointNet)
                    import hashlib
                    hash_val = int(hashlib.md5(file_record.original_filename.encode()).hexdigest(), 16)
                    is_train = (hash_val % 100) < 90  # 90% train, 10% test
                    
                    if is_train:
                        target_dir = train_dir
                        target_filename = f"{label_name}_{train_count:05d}.npz"
                        train_count += 1
                    else:
                        target_dir = test_dir
                        target_filename = f"{label_name}_{test_count:05d}.npz"
                        test_count += 1
                    
                    target_path = target_dir / target_filename

                    try:
                        minio_client.fget_object(
                            settings.MINIO_BUCKET,
                            file_record.file_path,
                            str(target_path)
                        )
                        
                        # Verify and clean .npz format for PointNet
                        # PointNet only needs 'pts' field, label comes from directory name
                        try:
                            import numpy as np
                            with np.load(str(target_path)) as data:
                                pts = data.get('pts')
                                if pts is None:
                                    print(f"Warning: {target_filename} missing 'pts' field")
                                else:
                                    # Re-save with only 'pts' field (PointNet requirement)
                                    np.savez_compressed(str(target_path), pts=pts)
                        except Exception as verify_err:
                            print(f"Warning: Could not verify {target_filename}: {verify_err}")
                        
                        count += 1
                    except Exception as e:
                        print(f"Failed to download {file_record.file_path}: {e}")

            print(f"\n{'='*60}")
            print(f"✅ Export completed: {count} files to {export_dir}")
            print(f"Dataset structure created for PointNet training")
            print(f"\n🚀 To train the model, run:")
            print(f"cd PointNet")
            print(f"python train_classification.py --data_dir {export_dir} --log_dir pointnet_cls_fetc --gpu 0 --epoch 200 --process_data --clear_log")
            print(f"{'='*60}\n")
            
            # 返回導出路徑供後續訓練任務使用
            return str(export_dir)
    finally:
        await local_engine.dispose()

@celery_app.task(name="app.worker.test_celery")
def test_celery(word: str):
    return f"test task return {word}"

@celery_app.task(name="app.worker.train_model", bind=True)
def train_model(self, export_path: str, model: str = "pointnet_cls", epoch: int = 200):
    """
    自動執行 PointNet 訓練
    """
    import subprocess
    import os
    from pathlib import Path
    
    try:
        # 獲取項目根目錄
        backend_dir = Path(__file__).parent.parent
        project_root = backend_dir.parent
        pointnet_dir = project_root / "PointNet"
        
        if not pointnet_dir.exists():
            return {
                "status": "failed",
                "message": f"PointNet 目錄不存在: {pointnet_dir}"
            }
        
        # 準備訓練命令
        cmd = [
            "python", "train_classification.py",
            "--data_dir", export_path,
            "--log_dir", "pointnet_cls_fetc",
            "--model", model,
            "--epoch", str(epoch),
            "--gpu", "0",
            "--batch_size", "24",
            "--num_point", "1024",
            "--sampler", "uniform",
            "--process_data",
            "--clear_log"
        ]
        
        print(f"\n{'='*60}")
        print(f"🚀 開始訓練 PointNet 模型")
        print(f"數據路徑: {export_path}")
        print(f"訓練輪數: {epoch}")
        print(f"執行命令: {' '.join(cmd)}")
        print(f"{'='*60}\n")
        
        # 執行訓練（在 PointNet 目錄下）
        result = subprocess.run(
            cmd,
            cwd=str(pointnet_dir),
            capture_output=True,
            text=True,
            timeout=3600 * 4  # 4 小時超時
        )
        
        if result.returncode == 0:
            print(f"\n{'='*60}")
            print(f"✅ 訓練完成！")
            print(f"查看日誌: {pointnet_dir}/log/classification/pointnet_cls_fetc/")
            print(f"{'='*60}\n")
            
            return {
                "status": "completed",
                "message": "訓練完成",
                "log_dir": str(pointnet_dir / "log/classification/pointnet_cls_fetc"),
                "stdout": result.stdout[-1000:],  # 最後 1000 字符
            }
        else:
            print(f"\n{'='*60}")
            print(f"❌ 訓練失敗")
            print(f"錯誤: {result.stderr}")
            print(f"{'='*60}\n")
            
            return {
                "status": "failed",
                "message": "訓練失敗",
                "error": result.stderr[-1000:],
                "stdout": result.stdout[-1000:],
            }
            
    except subprocess.TimeoutExpired:
        return {
            "status": "failed",
            "message": "訓練超時（超過 4 小時）"
        }
    except Exception as e:
        print(f"訓練過程發生錯誤: {e}")
        return {
            "status": "failed",
            "message": f"訓練過程發生錯誤: {str(e)}"
        }


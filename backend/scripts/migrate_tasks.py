import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import async_engine

async def migrate():
    print("Starting migration of tasks to Many-to-Many schema...")
    async with async_engine.begin() as conn:
        try:
            # 1. Check if task_files table exists (it should be created by init_db on startup)
            # But we are running this script manually.
            
            # 2. Read legacy data
            # We assume 'pointcloud_file_id' column still exists in DB even if removed from ORM
            print("Reading legacy task-file associations...")
            try:
                result = await conn.execute(text("SELECT id, pointcloud_file_id FROM tasks WHERE pointcloud_file_id IS NOT NULL"))
                rows = result.fetchall()
            except Exception as e:
                print(f"Could not read legacy column (maybe dropped?): {e}")
                return

            if not rows:
                print("No legacy associations found.")
                return

            print(f"Found {len(rows)} tasks to migrate.")
            
            # 3. Insert into task_files
            # We use raw SQL because ORM model might not have the table yet if not imported, 
            # or we want to be independent of ORM state.
            
            # Ensure task_files table exists? init_db should have run.
            
            values = [{"task_id": row.id, "pointcloud_file_id": row.pointcloud_file_id} for row in rows]
            
            if values:
                print("Inserting into task_files...")
                await conn.execute(
                    text("INSERT INTO task_files (task_id, pointcloud_file_id) VALUES (:task_id, :pointcloud_file_id) ON CONFLICT DO NOTHING"),
                    values
                )
                print("Data migration successful.")
                
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())









import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import async_engine

async def inspect():
    print("Inspecting database schema...")
    async with async_engine.begin() as conn:
        try:
            # Check tasks table columns
            print("\nChecking 'tasks' table columns:")
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'tasks'"
            ))
            columns = [row[0] for row in result.fetchall()]
            print(columns)

            # Check task_files table
            print("\nChecking 'task_files' table existence:")
            result = await conn.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'task_files')"
            ))
            exists = result.scalar()
            print(f"task_files exists: {exists}")

            # Check data counts
            print("\nChecking row counts:")
            res_tasks = await conn.execute(text("SELECT count(*) FROM tasks"))
            task_count = res_tasks.scalar()
            print(f"Tasks: {task_count}")
            
            if exists:
                res_tf = await conn.execute(text("SELECT count(*) FROM task_files"))
                tf_count = res_tf.scalar()
                print(f"Task Files associations: {tf_count}")

        except Exception as e:
            print(f"Inspection failed: {e}")

if __name__ == "__main__":
    asyncio.run(inspect())









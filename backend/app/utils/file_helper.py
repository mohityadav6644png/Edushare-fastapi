import os
import time
import random
from pathlib import Path
from typing import Optional
from fastapi import UploadFile
from app.config import settings

def get_file_extension(filename: str) -> str:
    ext = Path(filename).suffix
    return ext.lstrip(".").lower()

def get_file_size_in_mb(size_in_bytes: int) -> str:
    mb = size_in_bytes / (1024 * 1024)
    return f"{mb:.2f}"

def is_allowed_file(filename: str) -> bool:
    ext = get_file_extension(filename)
    return ext in settings.ALLOWED_EXTENSIONS

async def save_upload_file(file: UploadFile) -> tuple[str, str, str, int]:
    """
    Saves an uploaded file to the uploads directory.
    Returns: (file_path, original_file_name, file_extension, file_size_in_bytes)
    """
    ext = get_file_extension(file.filename or "")
    unique_suffix = f"{int(time.time() * 1000)}-{random.randint(100000000, 999999999)}"
    stored_file_name = f"file-{unique_suffix}.{ext}" if ext else f"file-{unique_suffix}"
    
    file_path = os.path.join(settings.UPLOAD_PATH, stored_file_name)
    
    total_size = 0
    contents = await file.read()
    total_size = len(contents)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    return file_path, file.filename or stored_file_name, ext, total_size

def delete_file(file_path: Optional[str]) -> bool:
    if not file_path:
        return False
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")
        return False

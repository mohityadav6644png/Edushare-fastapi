import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "StudyShare Backend"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Server
    PORT: int = 5000
    HOST: str = "0.0.0.0"
    NODE_ENV: str = "development"
    ENVIRONMENT: str = "development"
    
    # Database
    MONGO_URI: str = "mongodb://localhost:27017/studyshare"
    DB_NAME: str = "studyshare"
    
    # JWT
    JWT_SECRET: str = "your_super_secret_jwt_key_here_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_DAYS: int = 30
    
    # CORS
    CLIENT_URL: str = "http://localhost:3000"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]
    
    # Uploads
    UPLOAD_PATH: str = str(UPLOADS_DIR)
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_EXTENSIONS: set = {"pdf", "doc", "docx", "ppt", "pptx", "jpg", "jpeg", "png"}

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="allow"
    )

settings = Settings()

# Ensure CLIENT_URL is in ALLOWED_ORIGINS
if settings.CLIENT_URL and settings.CLIENT_URL not in settings.ALLOWED_ORIGINS:
    settings.ALLOWED_ORIGINS.append(settings.CLIENT_URL)

import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient

# Set test environment
os.environ["NODE_ENV"] = "test"
os.environ["MONGO_URI"] = "mongodb://localhost:27017/studyshare_test"
os.environ["JWT_SECRET"] = "testsecret_1234567890"

from app.config import settings
settings.MONGO_URI = "mongodb://localhost:27017/studyshare_test"
settings.DB_NAME = "studyshare_test"
settings.JWT_SECRET = "testsecret_1234567890"

from main import app
from app.database import db_instance, connect_to_mongo, close_mongo_connection

@pytest_asyncio.fixture(autouse=True)
async def setup_test_db():
    await connect_to_mongo()
    db = db_instance.db
    # Clean collections before test
    await db.users.delete_many({})
    await db.materials.delete_many({})
    await db.ratings.delete_many({})
    yield
    # Clean up after test
    await db.users.delete_many({})
    await db.materials.delete_many({})
    await db.ratings.delete_many({})
    await close_mongo_connection()

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

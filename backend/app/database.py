import logging
from urllib.parse import urlparse
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

logger = logging.getLogger("studyshare.database")

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

def get_db_name_from_uri(uri: str, default: str = "studyshare") -> str:
    try:
        parsed = urlparse(uri)
        path = parsed.path.lstrip("/")
        if path:
            # If query params exist in path like /dbname?retryWrites=true
            return path.split("?")[0] or default
    except Exception:
        pass
    return default

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    db_name = get_db_name_from_uri(settings.MONGO_URI, settings.DB_NAME)
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_instance.db = db_instance.client[db_name]
    
    # Initialize indexes
    try:
        # Users indexes
        await db_instance.db.users.create_index("email", unique=True)
        
        # Materials indexes
        await db_instance.db.materials.create_index([("subject", 1), ("semester", 1)])
        await db_instance.db.materials.create_index("uploaderId")
        await db_instance.db.materials.create_index("approved")
        await db_instance.db.materials.create_index([("uploadDate", -1)])
        
        # Ratings indexes
        await db_instance.db.ratings.create_index([("userId", 1), ("materialId", 1)], unique=True)
        await db_instance.db.ratings.create_index("materialId")
        await db_instance.db.ratings.create_index("userId")
        await db_instance.db.ratings.create_index([("createdAt", -1)])
        
        logger.info(f"Connected to MongoDB database: {db_name} and indexes verified.")
    except Exception as e:
        logger.warning(f"Could not initialize all indexes immediately: {e}")

async def close_mongo_connection():
    if db_instance.client is not None:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db

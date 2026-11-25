import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add parent dir to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

load_dotenv(str(BASE_DIR / ".env"))

from app.utils.security import hash_password

async def create_admin():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/studyshare")
    db_name = "studyshare"
    if "/" in mongo_uri.split("://")[-1]:
        part = mongo_uri.split("://")[-1].split("/")[1]
        db_name = part.split("?")[0] or "studyshare"
        
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    
    print(f"Connected to MongoDB database: {db_name}")
    
    existing_admin = await db.users.find_one({"role": "admin"})
    if existing_admin:
        print(f"Admin user already exists: {existing_admin.get('email')}")
        client.close()
        return

    admin_data = {
        "name": "Admin User",
        "email": "admin@studyshare.com",
        "password": hash_password("admin123"),
        "studentId": "ADMIN001",
        "semester": "Faculty",
        "role": "admin",
        "blocked": False,
        "createdAt": datetime.now(timezone.utc)
    }
    
    res = await db.users.insert_one(admin_data)
    print("Admin user created successfully:")
    print(f"ID: {res.inserted_id}")
    print("Email: admin@studyshare.com")
    print("Password: admin123")
    print("Role: admin")
    print("\nPlease change the password after first login!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())

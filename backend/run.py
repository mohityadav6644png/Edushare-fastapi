import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    reload = os.getenv("NODE_ENV", "development").lower() != "production"
    
    print(f"Starting StudyShare FastAPI server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=reload)

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings, UPLOADS_DIR
from app.database import connect_to_mongo, close_mongo_connection
from app.routes.auth import router as auth_router
from app.routes.materials import router as materials_router
from app.routes.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB
    await connect_to_mongo()
    yield
    # Shutdown: Close MongoDB connection
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="FastAPI Backend for StudyShare - Online platform for sharing exam papers and study materials",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Custom exception handler for HTTPException
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.detail}
    )

# Custom exception handler for validation errors (matches Joi format)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = []
    for err in exc.errors():
        field = ".".join(str(x) for x in err.get("loc", []) if x not in ("body", "query", "path"))
        msg = err.get("msg", "Invalid value")
        if field:
            error_messages.append(f"{field}: {msg}")
        else:
            error_messages.append(msg)
            
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "message": "Validation error",
            "errors": ", ".join(error_messages)
        }
    )

# Health check
@app.get("/api/status")
async def health_check():
    return {
        "message": "Server running",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.NODE_ENV
    }

# Swagger docs alias to /docs
@app.get("/api-docs", include_in_schema=False)
async def swagger_docs_alias():
    return RedirectResponse(url="/docs")

# Include Routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(materials_router, prefix="/api/materials")
app.include_router(admin_router, prefix="/api/admin")

# 404 handler for unmatched routes
@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"], include_in_schema=False)
async def not_found_handler(request: Request, full_path: str):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"success": False, "message": "Route not found"}
    )

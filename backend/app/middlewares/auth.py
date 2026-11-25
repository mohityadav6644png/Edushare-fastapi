from typing import Optional, Dict, Any
from bson import ObjectId
from fastapi import Request, HTTPException, Depends, status
from app.database import get_database
from app.utils.security import decode_access_token

def extract_token(request: Request) -> Optional[str]:
    # Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        parts = auth_header.split(" ")
        if len(parts) == 2:
            return parts[1].strip()
            
    # Check cookies
    cookie_token = request.cookies.get("token")
    if cookie_token:
        return cookie_token
        
    return None

async def get_current_user(request: Request) -> Dict[str, Any]:
    token = extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Access denied. No token provided."}
        )
        
    payload = decode_access_token(token)
    if not payload or "id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Token is not valid."}
        )
        
    user_id = payload["id"]
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Token is not valid. User not found."}
        )
        
    db = get_database()
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Token is not valid. User not found."}
        )
        
    user["id"] = str(user["_id"])
    return user

async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    token = extract_token(request)
    if not token:
        return None
        
    payload = decode_access_token(token)
    if not payload or "id" not in payload:
        return None
        
    try:
        obj_id = ObjectId(payload["id"])
        db = get_database()
        user = await db.users.find_one({"_id": obj_id})
        if user:
            user["id"] = str(user["_id"])
            return user
    except Exception:
        return None
    return None

async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    role = current_user.get("role", "user")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": f"User role {role} is not authorized to access this route"}
        )
    return current_user

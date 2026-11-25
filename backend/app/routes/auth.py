from datetime import datetime, timezone
from typing import Dict, Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status
from app.database import get_database
from app.config import settings
from app.utils.security import hash_password, verify_password, create_access_token
from app.schemas.auth import RegisterRequest, LoginRequest, UpdateProfileRequest
from app.middlewares.auth import get_current_user

router = APIRouter(tags=["Authentication"])

def serialize_datetime(dt):
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, response: Response):
    db = get_database()
    email_clean = body.email.lower().strip()
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "User already exists with this email"}
        )
        
    created_at = datetime.now(timezone.utc)
    user_doc = {
        "name": body.name.strip(),
        "email": email_clean,
        "password": hash_password(body.password),
        "studentId": body.studentId.strip(),
        "semester": body.semester.strip(),
        "role": "user",
        "blocked": False,
        "createdAt": created_at
    }
    
    res = await db.users.insert_one(user_doc)
    user_id = str(res.inserted_id)
    
    token = create_access_token(user_id=user_id, role="user")
    
    # Set cookie matching Express backend
    is_prod = settings.NODE_ENV == "production"
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,
        secure=is_prod,
        samesite="strict" if not is_prod else "none"
    )
    
    user_response = {
        "_id": user_id,
        "id": user_id,
        "name": user_doc["name"],
        "email": user_doc["email"],
        "role": user_doc["role"],
        "studentId": user_doc.get("studentId"),
        "semester": user_doc.get("semester"),
        "createdAt": serialize_datetime(created_at)
    }

    return {
        "success": True,
        "message": "User registered successfully",
        "user": user_response,
        "token": token,
        "data": {
            "user": user_response,
            "token": token
        }
    }

@router.post("/login")
async def login(body: LoginRequest, response: Response):
    db = get_database()
    email_clean = body.email.lower().strip()
    
    user = await db.users.find_one({"email": email_clean})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Invalid credentials"}
        )
        
    if not verify_password(body.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "message": "Invalid credentials"}
        )
        
    if user.get("blocked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": "Your account has been blocked. Please contact admin."}
        )
        
    user_id = str(user["_id"])
    role = user.get("role", "user")
    token = create_access_token(user_id=user_id, role=role)
    
    is_prod = settings.NODE_ENV == "production"
    response.set_cookie(
        key="token",
        value=token,
        httponly=True,
        max_age=30 * 24 * 60 * 60,
        secure=is_prod,
        samesite="none" if is_prod else "lax"
    )
    
    user_response = {
        "_id": user_id,
        "id": user_id,
        "name": user["name"],
        "email": user["email"],
        "role": role,
        "studentId": user.get("studentId"),
        "semester": user.get("semester"),
        "createdAt": serialize_datetime(user.get("createdAt"))
    }

    return {
        "success": True,
        "message": "Login successful",
        "user": user_response,
        "token": token,
        "data": {
            "user": user_response,
            "token": token
        }
    }

@router.get("/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_response = {
        "_id": current_user["id"],
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user.get("role", "user"),
        "studentId": current_user.get("studentId"),
        "semester": current_user.get("semester"),
        "createdAt": serialize_datetime(current_user.get("createdAt"))
    }
    return {
        "success": True,
        "user": user_response,
        "data": {
            "user": user_response
        }
    }

@router.put("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    db = get_database()
    obj_id = ObjectId(current_user["id"])
    
    update_fields = {}
    if body.name is not None:
        update_fields["name"] = body.name.strip()
    if body.studentId is not None:
        update_fields["studentId"] = body.studentId.strip()
    if body.semester is not None:
        update_fields["semester"] = body.semester.strip()
        
    if body.email is not None:
        new_email = body.email.lower().strip()
        if new_email != current_user.get("email"):
            existing = await db.users.find_one({"email": new_email})
            if existing and str(existing["_id"]) != current_user["id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"success": False, "message": "Email is already in use by another account"}
                )
            update_fields["email"] = new_email

    if update_fields:
        await db.users.update_one({"_id": obj_id}, {"$set": update_fields})
        
    updated = await db.users.find_one({"_id": obj_id})
    user_response = {
        "_id": str(updated["_id"]),
        "id": str(updated["_id"]),
        "name": updated["name"],
        "email": updated["email"],
        "role": updated.get("role", "user"),
        "studentId": updated.get("studentId"),
        "semester": updated.get("semester"),
        "createdAt": serialize_datetime(updated.get("createdAt"))
    }
    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": user_response,
        "data": {
            "user": user_response
        }
    }

@router.post("/logout")
async def logout(response: Response):
    response.set_cookie(
        key="token",
        value="",
        httponly=True,
        max_age=0,
        expires=0
    )
    return {
        "success": True,
        "message": "Logged out successfully"
    }

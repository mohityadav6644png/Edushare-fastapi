import math
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.database import get_database
from app.utils.file_helper import delete_file
from app.schemas.admin import RoleUpdateRequest
from app.middlewares.auth import require_admin

router = APIRouter(tags=["Admin"], dependencies=[Depends(require_admin)])

def serialize_datetime(dt):
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: Optional[str] = Query(None)
):
    db = get_database()
    skip = (page - 1) * limit
    filter_dict: Dict[str, Any] = {}
    
    if role:
        filter_dict["role"] = role
    if search:
        filter_dict["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
        
    sort_dict = [("createdAt", -1)]
    if sort == "name":
        sort_dict = [("name", 1)]
    elif sort == "email":
        sort_dict = [("email", 1)]
    elif sort == "oldest":
        sort_dict = [("createdAt", 1)]
        
    total = await db.users.count_documents(filter_dict)
    users = await db.users.find(filter_dict, {"password": 0}).sort(sort_dict).skip(skip).limit(limit).to_list(length=None)
    
    return {
        "success": True,
        "count": len(users),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1,
        "data": [
            {
                "_id": str(u["_id"]),
                "id": str(u["_id"]),
                "name": u.get("name"),
                "email": u.get("email"),
                "role": u.get("role", "user"),
                "blocked": u.get("blocked", False),
                "createdAt": serialize_datetime(u.get("createdAt"))
            }
            for u in users
        ]
    }

@router.get("/users/{id}")
async def get_user(id: str):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"}
        )
        
    db = get_database()
    user = await db.users.find_one({"_id": obj_id}, {"password": 0})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"}
        )
        
    uploads_count = await db.materials.count_documents({"uploaderId": obj_id})
    approved_uploads_count = await db.materials.count_documents({"uploaderId": obj_id, "approved": True})
    
    return {
        "success": True,
        "data": {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role", "user"),
            "blocked": user.get("blocked", False),
            "createdAt": serialize_datetime(user.get("createdAt")),
            "stats": {
                "totalUploads": uploads_count,
                "approvedUploads": approved_uploads_count,
                "pendingUploads": uploads_count - approved_uploads_count
            }
        }
    }

@router.put("/users/{id}/role")
async def update_user_role(
    id: str,
    body: RoleUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    if id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "You cannot change your own role"}
        )
        
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"}
        )
        
    db = get_database()
    res = await db.users.find_one_and_update(
        {"_id": obj_id},
        {"$set": {"role": body.role}},
        return_document=True,
        projection={"password": 0}
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"}
        )
        
    return {
        "success": True,
        "message": "User role updated successfully",
        "data": {
            "id": str(res["_id"]),
            "name": res.get("name"),
            "email": res.get("email"),
            "role": res.get("role")
        }
    }

@router.delete("/users/{id}")
async def delete_user(
    id: str,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    if id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "You cannot delete your own account"}
        )
        
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"}
        )
        
    db = get_database()
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"}
        )
        
    # Delete user's materials and files
    materials = await db.materials.find({"uploaderId": obj_id}).to_list(length=None)
    for m in materials:
        delete_file(m.get("filePath"))
        
    await db.materials.delete_many({"uploaderId": obj_id})
    await db.ratings.delete_many({"userId": obj_id})
    await db.users.delete_one({"_id": obj_id})
    
    return {
        "success": True,
        "message": "User and all associated data deleted successfully"
    }

async def _approve_material_impl(id: str, current_user: Dict[str, Any]):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )
        
    db = get_database()
    material = await db.materials.find_one({"_id": obj_id})
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )
        
    if material.get("approved"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "Material is already approved"}
        )
        
    approved_at = datetime.now(timezone.utc)
    await db.materials.update_one(
        {"_id": obj_id},
        {"$set": {
            "approved": True,
            "approvedBy": ObjectId(current_user["id"]),
            "approvedAt": approved_at
        }}
    )
    
    pipeline = [
        {"$match": {"_id": obj_id}},
        {
            "$lookup": {
                "from": "users",
                "localField": "uploaderId",
                "foreignField": "_id",
                "as": "uploader"
            }
        },
        {"$unwind": {"path": "$uploader", "preserveNullAndEmptyArrays": True}}
    ]
    updated_list = await db.materials.aggregate(pipeline).to_list(length=1)
    updated = updated_list[0]
    uploader_info = updated.get("uploader") or {}
    
    return {
        "success": True,
        "message": "Material approved successfully",
        "data": {
            "id": str(updated["_id"]),
            "title": updated.get("title"),
            "subject": updated.get("subject"),
            "semester": updated.get("semester"),
            "uploader": {
                "id": str(uploader_info.get("_id")) if uploader_info.get("_id") else None,
                "name": uploader_info.get("name")
            },
            "approved": True,
            "approvedAt": serialize_datetime(approved_at)
        }
    }

@router.put("/materials/{id}/approve")
async def approve_material(id: str, current_user: Dict[str, Any] = Depends(require_admin)):
    return await _approve_material_impl(id, current_user)

@router.put("/approve/{id}")
async def approve_material_alias(id: str, current_user: Dict[str, Any] = Depends(require_admin)):
    return await _approve_material_impl(id, current_user)

async def _delete_material_impl(id: str):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )
        
    db = get_database()
    material = await db.materials.find_one({"_id": obj_id})
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )
        
    delete_file(material.get("filePath"))
    await db.ratings.delete_many({"materialId": obj_id})
    await db.materials.delete_one({"_id": obj_id})
    
    return {
        "success": True,
        "message": "Material and all associated data deleted successfully"
    }

@router.delete("/materials/{id}")
async def delete_material(id: str):
    return await _delete_material_impl(id)

@router.delete("/delete/{id}")
async def delete_material_alias(id: str):
    return await _delete_material_impl(id)

@router.get("/materials/pending")
async def get_pending_materials(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    subject: Optional[str] = Query(None),
    semester: Optional[str] = Query(None)
):
    db = get_database()
    skip = (page - 1) * limit
    filter_dict: Dict[str, Any] = {"approved": False}
    if subject:
        filter_dict["subject"] = {"$regex": subject, "$options": "i"}
    if semester:
        filter_dict["semester"] = {"$regex": semester, "$options": "i"}
        
    total = await db.materials.count_documents(filter_dict)
    
    pipeline = [
        {"$match": filter_dict},
        {"$sort": {"uploadDate": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "localField": "uploaderId",
                "foreignField": "_id",
                "as": "uploader"
            }
        },
        {"$unwind": {"path": "$uploader", "preserveNullAndEmptyArrays": True}}
    ]
    materials = await db.materials.aggregate(pipeline).to_list(length=None)
    
    return {
        "success": True,
        "count": len(materials),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1,
        "data": [
            {
                "_id": str(m["_id"]),
                "id": str(m["_id"]),
                "title": m.get("title", ""),
                "description": m.get("description", ""),
                "subject": m.get("subject", ""),
                "semester": m.get("semester", ""),
                "uploader": {
                    "_id": str(m["uploader"]["_id"]) if m.get("uploader") else None,
                    "id": str(m["uploader"]["_id"]) if m.get("uploader") else None,
                    "name": m["uploader"]["name"] if m.get("uploader") else None,
                    "email": m["uploader"]["email"] if m.get("uploader") else None
                },
                "fileName": m.get("fileName", ""),
                "filename": m.get("fileName", ""),
                "fileType": m.get("fileType", ""),
                "fileSize": m.get("fileSize", 0),
                "uploadDate": serialize_datetime(m.get("uploadDate")),
                "createdAt": serialize_datetime(m.get("uploadDate"))
            }
            for m in materials
        ]
    }

@router.get("/uploads")
async def get_uploads(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    semester: Optional[str] = Query(None)
):
    db = get_database()
    skip = (page - 1) * limit
    filter_dict: Dict[str, Any] = {}
    if status == "approved":
        filter_dict["approved"] = True
    elif status == "pending":
        filter_dict["approved"] = False
        
    if subject:
        filter_dict["subject"] = {"$regex": subject, "$options": "i"}
    if semester:
        filter_dict["semester"] = {"$regex": semester, "$options": "i"}
        
    total = await db.materials.count_documents(filter_dict)
    
    pipeline = [
        {"$match": filter_dict},
        {"$sort": {"uploadDate": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "localField": "uploaderId",
                "foreignField": "_id",
                "as": "uploader"
            }
        },
        {"$unwind": {"path": "$uploader", "preserveNullAndEmptyArrays": True}}
    ]
    materials = await db.materials.aggregate(pipeline).to_list(length=None)
    
    return {
        "success": True,
        "count": len(materials),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1,
        "data": [
            {
                "id": str(m["_id"]),
                "title": m["title"],
                "subject": m["subject"],
                "semester": m["semester"],
                "uploader": {
                    "id": str(m["uploader"]["_id"]) if m.get("uploader") else None,
                    "name": m["uploader"]["name"] if m.get("uploader") else None,
                    "email": m["uploader"]["email"] if m.get("uploader") else None
                },
                "fileName": m["fileName"],
                "fileType": m["fileType"],
                "fileSize": m["fileSize"],
                "uploadDate": serialize_datetime(m.get("uploadDate")),
                "approved": m.get("approved", False),
                "approvedAt": serialize_datetime(m.get("approvedAt"))
            }
            for m in materials
        ]
    }

@router.put("/toggle/{userId}")
async def toggle_user_block(
    userId: str,
    current_user: Dict[str, Any] = Depends(require_admin)
):
    if userId == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "You cannot block/unblock yourself"}
        )
        
    try:
        obj_id = ObjectId(userId)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "Invalid user id"}
        )
        
    db = get_database()
    user = await db.users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "User not found"}
        )
        
    new_blocked = not user.get("blocked", False)
    await db.users.update_one({"_id": obj_id}, {"$set": {"blocked": new_blocked}})
    
    return {
        "success": True,
        "message": "User blocked" if new_blocked else "User unblocked",
        "data": {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role", "user"),
            "blocked": new_blocked
        }
    }

@router.get("/stats")
async def get_stats():
    db = get_database()
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_materials = await db.materials.count_documents({})
    approved_materials = await db.materials.count_documents({"approved": True})
    pending_materials = await db.materials.count_documents({"approved": False})
    total_ratings = await db.ratings.count_documents({})
    
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_users = await db.users.count_documents({"createdAt": {"$gte": seven_days_ago}})
    recent_materials = await db.materials.count_documents({"uploadDate": {"$gte": seven_days_ago}})
    recent_ratings = await db.ratings.count_documents({"createdAt": {"$gte": seven_days_ago}})
    
    top_subjects_pipeline = [
        {"$match": {"approved": True}},
        {"$group": {"_id": "$subject", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_subjects_raw = await db.materials.aggregate(top_subjects_pipeline).to_list(length=None)
    top_subjects = [{"subject": item["_id"], "count": item["count"]} for item in top_subjects_raw]
    
    materials_by_type_pipeline = [
        {"$match": {"approved": True}},
        {"$group": {"_id": "$fileType", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    materials_by_type_raw = await db.materials.aggregate(materials_by_type_pipeline).to_list(length=None)
    materials_by_type = [{"fileType": item["_id"], "count": item["count"]} for item in materials_by_type_raw]
    
    return {
        "success": True,
        "data": {
            "overview": {
                "totalUsers": total_users,
                "totalAdmins": total_admins,
                "totalMaterials": total_materials,
                "approvedMaterials": approved_materials,
                "pendingMaterials": pending_materials,
                "totalRatings": total_ratings
            },
            "recentActivity": {
                "recentUsers": recent_users,
                "recentMaterials": recent_materials,
                "recentRatings": recent_ratings,
                "period": "Last 7 days"
            },
            "topSubjects": top_subjects,
            "materialsByType": materials_by_type
        }
    }

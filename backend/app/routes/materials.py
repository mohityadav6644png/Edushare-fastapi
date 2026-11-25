import os
import math
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from app.database import get_database
from app.config import settings
from app.utils.file_helper import (
    save_upload_file,
    delete_file,
    is_allowed_file,
    get_file_size_in_mb
)
from app.schemas.material import MaterialUpdate
from app.schemas.rating import RatingCreate
from app.middlewares.auth import get_current_user, get_current_user_optional

router = APIRouter(tags=["Materials"])

def serialize_datetime(dt):
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt

async def update_material_rating(material_id: str):
    db = get_database()
    obj_id = ObjectId(material_id)
    ratings = await db.ratings.find({"materialId": obj_id}).to_list(length=None)
    if not ratings:
        await db.materials.update_one(
            {"_id": obj_id},
            {"$set": {"averageRating": 0.0, "totalRatings": 0}}
        )
    else:
        total = sum(r["rating"] for r in ratings)
        avg = round(total / len(ratings), 1)
        await db.materials.update_one(
            {"_id": obj_id},
            {"$set": {"averageRating": avg, "totalRatings": len(ratings)}}
        )

# Specific paths first
@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_material(
    title: str = Form(...),
    subject: str = Form(...),
    semester: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if not title or not subject or not semester:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "Title, subject, and semester are required"}
        )
        
    if not is_allowed_file(file.filename or ""):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG files are allowed."}
        )
        
    file_path = None
    try:
        file_path, original_name, ext, file_size = await save_upload_file(file)
        
        if file_size > settings.MAX_FILE_SIZE:
            delete_file(file_path)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "message": "File size exceeds the 10MB limit"}
            )
            
        db = get_database()
        upload_date = datetime.now(timezone.utc)
        doc = {
            "title": title.strip(),
            "subject": subject.strip(),
            "semester": semester.strip(),
            "description": (description or "").strip(),
            "uploaderId": ObjectId(current_user["id"]),
            "filePath": file_path,
            "fileName": original_name,
            "fileType": ext,
            "fileSize": file_size,
            "uploadDate": upload_date,
            "approved": False,
            "approvedBy": None,
            "approvedAt": None,
            "downloadCount": 0,
            "averageRating": 0.0,
            "totalRatings": 0
        }
        res = await db.materials.insert_one(doc)
        material_id = str(res.inserted_id)
        
        mat_response = {
            "_id": material_id,
            "id": material_id,
            "title": doc["title"],
            "subject": doc["subject"],
            "semester": doc["semester"],
            "description": doc["description"],
            "fileName": doc["fileName"],
            "filename": doc["fileName"],
            "fileType": doc["fileType"],
            "fileSize": get_file_size_in_mb(file_size),
            "uploadDate": serialize_datetime(upload_date),
            "createdAt": serialize_datetime(upload_date),
            "approved": False
        }

        return {
            "success": True,
            "message": "Material uploaded successfully. Waiting for admin approval.",
            "data": {
                "material": mat_response
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        if file_path:
            delete_file(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": "Error uploading material", "error": str(e)}
        )

@router.get("/my-uploads")
async def get_my_materials(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_database()
    cursor = db.materials.find({"uploaderId": ObjectId(current_user["id"])}).sort([("uploadDate", -1)])
    materials = await cursor.to_list(length=None)
    
    return {
        "success": True,
        "count": len(materials),
        "data": [
            {
                "_id": str(m["_id"]),
                "id": str(m["_id"]),
                "title": m.get("title", ""),
                "description": m.get("description", ""),
                "subject": m.get("subject", ""),
                "semester": m.get("semester", ""),
                "fileName": m.get("fileName", ""),
                "filename": m.get("fileName", ""),
                "fileType": m.get("fileType", ""),
                "fileSize": get_file_size_in_mb(m.get("fileSize", 0)),
                "uploadDate": serialize_datetime(m.get("uploadDate")),
                "createdAt": serialize_datetime(m.get("uploadDate")),
                "approved": m.get("approved", False),
                "downloadCount": m.get("downloadCount", 0),
                "averageRating": m.get("averageRating", 0),
                "totalRatings": m.get("totalRatings", 0)
            }
            for m in materials
        ]
    }

@router.get("")
@router.get("/")
async def get_materials(
    page: Optional[int] = Query(None),
    limit: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    semester: Optional[str] = Query(None),
    sort: Optional[str] = Query("newest")
):
    db = get_database()
    use_pagination = (page is not None) or (limit is not None)
    cur_page = max(page or 1, 1)
    cur_limit = min(max(limit or 10, 1), 50)
    skip = (cur_page - 1) * cur_limit

    filter_dict: Dict[str, Any] = {"approved": True}
    if search:
        filter_dict["title"] = {"$regex": search, "$options": "i"}
    if subject:
        filter_dict["subject"] = {"$regex": subject, "$options": "i"}
    if semester:
        filter_dict["semester"] = semester

    sort_field = [("uploadDate", -1)]
    if sort == "oldest":
        sort_field = [("uploadDate", 1)]
    elif sort == "title":
        sort_field = [("title", 1)]
    elif sort == "subject":
        sort_field = [("subject", 1)]
    elif sort == "downloads":
        sort_field = [("downloadCount", -1)]
    elif sort == "rating":
        sort_field = [("averageRating", -1)]

    # Fetch total
    total = await db.materials.count_documents(filter_dict)

    # Pipeline with lookup for uploader
    pipeline = [
        {"$match": filter_dict},
        {"$sort": dict(sort_field)},
    ]
    if use_pagination:
        pipeline.extend([
            {"$skip": skip},
            {"$limit": cur_limit}
        ])
    pipeline.extend([
        {
            "$lookup": {
                "from": "users",
                "localField": "uploaderId",
                "foreignField": "_id",
                "as": "uploader"
            }
        },
        {
            "$unwind": {
                "path": "$uploader",
                "preserveNullAndEmptyArrays": True
            }
        }
    ])

    materials = await db.materials.aggregate(pipeline).to_list(length=None)

    data = []
    for m in materials:
        uploader_info = m.get("uploader") or {}
        uploader_id = str(uploader_info.get("_id")) if uploader_info.get("_id") else None
        uploader_name = uploader_info.get("name") or "Unknown"
        uploader_obj = {
            "_id": uploader_id,
            "id": uploader_id,
            "name": uploader_name,
            "email": uploader_info.get("email")
        }
        data.append({
            "_id": str(m["_id"]),
            "id": str(m["_id"]),
            "title": m.get("title", ""),
            "description": m.get("description", ""),
            "subject": m.get("subject", ""),
            "semester": m.get("semester", ""),
            "uploader": uploader_obj,
            "uploadedBy": uploader_obj,
            "fileName": m.get("fileName", ""),
            "filename": m.get("fileName", ""),
            "fileType": m.get("fileType", ""),
            "fileSize": get_file_size_in_mb(m.get("fileSize", 0)),
            "uploadDate": serialize_datetime(m.get("uploadDate")),
            "createdAt": serialize_datetime(m.get("uploadDate")),
            "downloadCount": m.get("downloadCount", 0),
            "averageRating": m.get("averageRating", 0),
            "totalRatings": m.get("totalRatings", 0),
            "ratingCount": m.get("totalRatings", 0)
        })

    return {
        "success": True,
        "count": len(data),
        "total": total,
        "page": cur_page if use_pagination else 1,
        "pages": math.ceil(total / cur_limit) if use_pagination and cur_limit > 0 else 1,
        "data": data
    }

# Parameterized routes
@router.get("/{id}")
async def get_material(
    id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    try:
        obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    db = get_database()
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
        {"$unwind": {"path": "$uploader", "preserveNullAndEmptyArrays": True}},
        {
            "$lookup": {
                "from": "users",
                "localField": "approvedBy",
                "foreignField": "_id",
                "as": "approver"
            }
        },
        {"$unwind": {"path": "$approver", "preserveNullAndEmptyArrays": True}}
    ]
    materials = await db.materials.aggregate(pipeline).to_list(length=1)
    if not materials:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    m = materials[0]
    is_admin = current_user and current_user.get("role") == "admin"
    if not m.get("approved") and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    uploader_info = m.get("uploader") or {}
    uploader_id = str(uploader_info.get("_id")) if uploader_info.get("_id") else None
    uploader_name = uploader_info.get("name") or "Unknown"
    uploader_obj = {
        "_id": uploader_id,
        "id": uploader_id,
        "name": uploader_name,
        "email": uploader_info.get("email")
    }
    approver_info = m.get("approver") or {}

    mat_response = {
        "_id": str(m["_id"]),
        "id": str(m["_id"]),
        "title": m.get("title", ""),
        "description": m.get("description", ""),
        "subject": m.get("subject", ""),
        "semester": m.get("semester", ""),
        "uploader": uploader_obj,
        "uploadedBy": uploader_obj,
        "fileName": m.get("fileName", ""),
        "filename": m.get("fileName", ""),
        "fileType": m.get("fileType", ""),
        "fileSize": get_file_size_in_mb(m.get("fileSize", 0)),
        "uploadDate": serialize_datetime(m.get("uploadDate")),
        "createdAt": serialize_datetime(m.get("uploadDate")),
        "approved": m.get("approved", False),
        "approvedBy": {
            "_id": str(approver_info.get("_id")),
            "id": str(approver_info.get("_id")),
            "name": approver_info.get("name")
        } if approver_info.get("_id") else None,
        "approvedAt": serialize_datetime(m.get("approvedAt")),
        "downloadCount": m.get("downloadCount", 0),
        "averageRating": m.get("averageRating", 0),
        "totalRatings": m.get("totalRatings", 0),
        "ratingCount": m.get("totalRatings", 0)
    }

    return {
        "success": True,
        "data": mat_response
    }

@router.get("/{id}/download")
async def download_material(id: str):
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

    if not material.get("approved"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": "Material not approved for download"}
        )

    file_path = material.get("filePath")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "File not found on server"}
        )

    # Increment download count
    await db.materials.update_one({"_id": obj_id}, {"$inc": {"downloadCount": 1}})

    return FileResponse(
        path=file_path,
        filename=material.get("fileName", "download"),
        media_type="application/octet-stream"
    )

@router.put("/{id}")
async def update_material(
    id: str,
    body: MaterialUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
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

    if str(material.get("uploaderId")) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": "Not authorized to update this material"}
        )

    updates = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.subject is not None:
        updates["subject"] = body.subject
    if body.semester is not None:
        updates["semester"] = str(body.semester)

    if updates:
        await db.materials.update_one({"_id": obj_id}, {"$set": updates})

    updated = await db.materials.find_one({"_id": obj_id})
    return {
        "success": True,
        "message": "Material updated successfully",
        "data": {
            "id": str(updated["_id"]),
            "title": updated.get("title"),
            "description": updated.get("description"),
            "subject": updated.get("subject"),
            "semester": updated.get("semester")
        }
    }

@router.delete("/{id}")
async def delete_material(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
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

    is_owner = str(material.get("uploaderId")) == current_user["id"]
    is_admin = current_user.get("role") == "admin"
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": "Not authorized to delete this material"}
        )

    # Delete physical file
    delete_file(material.get("filePath"))

    # Delete material and ratings
    await db.materials.delete_one({"_id": obj_id})
    await db.ratings.delete_many({"materialId": obj_id})

    return {
        "success": True,
        "message": "Material deleted successfully"
    }

# Rating endpoints
@router.post("/{id}/rate")
async def add_rating(
    id: str,
    body: RatingCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if not body.rating or body.rating < 1 or body.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"success": False, "message": "Rating must be between 1 and 5"}
        )

    try:
        material_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    db = get_database()
    material = await db.materials.find_one({"_id": material_obj_id})
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    if not material.get("approved"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"success": False, "message": "Cannot rate unapproved material"}
        )

    user_obj_id = ObjectId(current_user["id"])
    existing_rating = await db.ratings.find_one({
        "userId": user_obj_id,
        "materialId": material_obj_id
    })

    now = datetime.now(timezone.utc)
    is_new = existing_rating is None

    if existing_rating:
        await db.ratings.update_one(
            {"_id": existing_rating["_id"]},
            {"$set": {"rating": body.rating, "comment": body.comment or existing_rating.get("comment", "")}}
        )
        rating_id = str(existing_rating["_id"])
        created_at = existing_rating.get("createdAt", now)
    else:
        res = await db.ratings.insert_one({
            "userId": user_obj_id,
            "materialId": material_obj_id,
            "rating": body.rating,
            "comment": body.comment or "",
            "createdAt": now
        })
        rating_id = str(res.inserted_id)
        created_at = now

    await update_material_rating(id)

    return {
        "success": True,
        "message": "Rating added successfully" if is_new else "Rating updated successfully",
        "data": {
            "rating": {
                "id": rating_id,
                "rating": body.rating,
                "comment": body.comment or "",
                "createdAt": serialize_datetime(created_at)
            }
        }
    }

@router.get("/{id}/ratings")
async def get_material_ratings(
    id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    try:
        material_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    db = get_database()
    material = await db.materials.find_one({"_id": material_obj_id})
    if not material:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    skip = (page - 1) * limit
    total = await db.ratings.count_documents({"materialId": material_obj_id})

    pipeline = [
        {"$match": {"materialId": material_obj_id}},
        {"$sort": {"createdAt": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}}
    ]

    ratings = await db.ratings.aggregate(pipeline).to_list(length=None)

    return {
        "success": True,
        "count": len(ratings),
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if limit > 0 else 1,
        "data": [
            {
                "id": str(r["_id"]),
                "rating": r["rating"],
                "comment": r.get("comment", ""),
                "user": {
                    "id": str(r["user"]["_id"]) if r.get("user") else None,
                    "name": r["user"]["name"] if r.get("user") else "Unknown"
                },
                "createdAt": serialize_datetime(r.get("createdAt"))
            }
            for r in ratings
        ]
    }

@router.get("/{id}/ratings/my-rating")
async def get_my_rating(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        material_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Material not found"}
        )

    db = get_database()
    rating = await db.ratings.find_one({
        "userId": ObjectId(current_user["id"]),
        "materialId": material_obj_id
    })

    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "You have not rated this material"}
        )

    return {
        "success": True,
        "data": {
            "id": str(rating["_id"]),
            "rating": rating["rating"],
            "comment": rating.get("comment", ""),
            "createdAt": serialize_datetime(rating.get("createdAt"))
        }
    }

@router.delete("/{id}/ratings")
async def delete_rating(
    id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    try:
        material_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Rating not found"}
        )

    db = get_database()
    res = await db.ratings.delete_one({
        "userId": ObjectId(current_user["id"]),
        "materialId": material_obj_id
    })

    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"success": False, "message": "Rating not found"}
        )

    await update_material_rating(id)

    return {
        "success": True,
        "message": "Rating deleted successfully"
    }

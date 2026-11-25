from typing import Optional, List, Any
from pydantic import BaseModel, Field

class RatingCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field("", max_length=500)

class RatingUser(BaseModel):
    id: str
    name: str

class RatingItem(BaseModel):
    id: str
    rating: int
    comment: Optional[str] = ""
    user: Optional[RatingUser] = None
    createdAt: Any

class RatingListResponse(BaseModel):
    success: bool = True
    count: int
    total: int
    page: int
    pages: int
    data: List[RatingItem]

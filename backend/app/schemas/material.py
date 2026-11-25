from typing import Optional, List, Any
from pydantic import BaseModel, Field

class MaterialUploadForm:
    # Handled via Form(...) in route
    pass

class MaterialUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    subject: Optional[str] = None
    semester: Optional[Any] = None

class UploaderSummary(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None

class MaterialItem(BaseModel):
    id: str
    title: str
    subject: str
    semester: str
    uploader: Optional[UploaderSummary] = None
    fileName: str
    fileType: str
    fileSize: Any
    uploadDate: Any
    approved: Optional[bool] = False
    approvedBy: Optional[Any] = None
    approvedAt: Optional[Any] = None
    downloadCount: int = 0
    averageRating: float = 0.0
    totalRatings: int = 0

class MaterialListResponse(BaseModel):
    success: bool = True
    count: int
    total: int
    page: int
    pages: int
    data: List[MaterialItem]

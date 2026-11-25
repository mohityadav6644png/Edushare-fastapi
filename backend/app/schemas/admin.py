from typing import Optional, List, Any, Literal
from pydantic import BaseModel, Field

class RoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]

class UserStats(BaseModel):
    totalUploads: int = 0
    approvedUploads: int = 0
    pendingUploads: int = 0

class UserDetail(BaseModel):
    id: str
    name: str
    email: str
    role: str
    createdAt: Any
    stats: Optional[UserStats] = None

class UserListResponse(BaseModel):
    success: bool = True
    count: int
    total: int
    page: int
    pages: int
    data: List[Any]

class OverviewStats(BaseModel):
    totalUsers: int = 0
    totalAdmins: int = 0
    totalMaterials: int = 0
    approvedMaterials: int = 0
    pendingMaterials: int = 0
    totalRatings: int = 0

class RecentActivityStats(BaseModel):
    recentUsers: int = 0
    recentMaterials: int = 0
    recentRatings: int = 0
    period: str = "Last 7 days"

class SubjectCount(BaseModel):
    subject: str
    count: int

class FileTypeCount(BaseModel):
    fileType: str
    count: int

class StatsData(BaseModel):
    overview: OverviewStats
    recentActivity: RecentActivityStats
    topSubjects: List[SubjectCount]
    materialsByType: List[FileTypeCount]

class StatsResponse(BaseModel):
    success: bool = True
    data: StatsData

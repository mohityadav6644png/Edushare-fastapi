from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, model_validator

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirmPassword: str
    studentId: str = Field(..., min_length=1, max_length=20)
    semester: str = Field(..., min_length=1, max_length=20)

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.confirmPassword:
            raise ValueError("Passwords do not match")
        return self

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    studentId: Optional[str] = Field(None, min_length=1, max_length=20)
    semester: Optional[str] = Field(None, min_length=1, max_length=20)

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    studentId: Optional[str] = None
    semester: Optional[str] = None
    blocked: Optional[bool] = False
    createdAt: Optional[Any] = None

class AuthResponseData(BaseModel):
    user: UserOut
    token: Optional[str] = None

class AuthResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[AuthResponseData] = None

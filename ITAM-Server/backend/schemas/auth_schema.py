"""
Authentication schemas for API requests/responses
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    """Schema para solicitud de login"""
    username: str
    password: str

class TokenResponse(BaseModel):
    """Schema para respuesta de token"""
    access_token: str
    token_type: str = "bearer"
    username: str
    nombre_completo: Optional[str] = None

class UserResponse(BaseModel):
    """Schema para información de usuario"""
    id: int
    username: str
    email: Optional[str] = None
    nombre_completo: Optional[str] = None
    es_activo: bool
    es_admin: bool
    ultimo_login: Optional[datetime] = None

    class Config:
        from_attributes = True

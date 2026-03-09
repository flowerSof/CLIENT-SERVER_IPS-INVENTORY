"""
User management schemas for API requests/responses
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime

class PermisoBase(BaseModel):
    """Schema base para permisos"""
    edificio_id: int
    piso_id: Optional[int] = None  # None = acceso a todo el edificio

class PermisoResponse(PermisoBase):
    """Schema para respuesta de permiso"""
    id: int
    edificio_nombre: Optional[str] = None
    piso_nombre: Optional[str] = None

    class Config:
        from_attributes = True

class UsuarioCreate(BaseModel):
    """Schema para crear usuario"""
    username: str
    password: str
    email: Optional[str] = None
    nombre_completo: Optional[str] = None
    es_activo: bool = True
    es_admin: bool = True
    es_superadmin: bool = False
    permisos: List[PermisoBase] = []

    @field_validator('username')
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError('Username debe tener al menos 3 caracteres')
        return v.lower()

    @field_validator('password')
    @classmethod
    def password_valid(cls, v):
        if len(v) < 8:
            raise ValueError('Password debe tener al menos 8 caracteres')
        return v

class UsuarioUpdate(BaseModel):
    """Schema para actualizar usuario"""
    email: Optional[str] = None
    nombre_completo: Optional[str] = None
    password: Optional[str] = None  # Solo si se quiere cambiar
    es_activo: Optional[bool] = None
    es_admin: Optional[bool] = None

class PermisoUpdate(BaseModel):
    """Schema para actualizar permisos de usuario"""
    permisos: List[PermisoBase]

class UsuarioResponse(BaseModel):
    """Schema para respuesta de usuario"""
    id: int
    username: str
    email: Optional[str] = None
    nombre_completo: Optional[str] = None
    es_activo: bool
    es_admin: bool
    es_superadmin: bool
    fecha_creacion: Optional[datetime] = None
    ultimo_login: Optional[datetime] = None
    permisos: List[PermisoResponse] = []

    class Config:
        from_attributes = True

class UsuarioListItem(BaseModel):
    """Schema simplificado para lista de usuarios"""
    id: int
    username: str
    nombre_completo: Optional[str] = None
    es_activo: bool
    es_superadmin: bool
    permisos_count: int = 0
    ultimo_login: Optional[datetime] = None

    class Config:
        from_attributes = True

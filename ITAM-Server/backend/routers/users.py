"""
User Management Router - CRUD de usuarios y permisos
Solo accesible por superadministradores
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models.users import UsuarioAdmin
from models.permisos import PermisoUsuario
from models.locations import Edificio, Piso
from schemas.user_schema import (
    UsuarioCreate, UsuarioUpdate, UsuarioResponse, 
    UsuarioListItem, PermisoUpdate, PermisoResponse
)
from auth_utils import verify_token, get_password_hash

router = APIRouter(prefix="/api/users", tags=["User Management"])
security = HTTPBearer()


def get_current_superadmin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UsuarioAdmin:
    """Verifica que el usuario actual sea superadmin"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    
    username = payload.get("sub")
    user = db.query(UsuarioAdmin).filter(UsuarioAdmin.username == username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if not user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requieren permisos de superadministrador."
        )
    
    return user


@router.get("", response_model=List[UsuarioListItem])
def listar_usuarios(
    current_user: UsuarioAdmin = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Lista todos los usuarios (solo superadmin)"""
    usuarios = db.query(UsuarioAdmin).options(
        joinedload(UsuarioAdmin.permisos)
    ).all()
    
    result = []
    for user in usuarios:
        result.append(UsuarioListItem(
            id=user.id,
            username=user.username,
            nombre_completo=user.nombre_completo,
            es_activo=user.es_activo,
            es_superadmin=user.es_superadmin,
            permisos_count=len(user.permisos),
            ultimo_login=user.ultimo_login
        ))
    
    return result


@router.get("/{user_id}", response_model=UsuarioResponse)
def obtener_usuario(
    user_id: int,
    current_user: UsuarioAdmin = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Obtiene un usuario por ID con sus permisos"""
    usuario = db.query(UsuarioAdmin).options(
        joinedload(UsuarioAdmin.permisos).joinedload(PermisoUsuario.edificio),
        joinedload(UsuarioAdmin.permisos).joinedload(PermisoUsuario.piso)
    ).filter(UsuarioAdmin.id == user_id).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # Construir respuesta con nombres de edificio/piso
    permisos_response = []
    for p in usuario.permisos:
        permisos_response.append(PermisoResponse(
            id=p.id,
            edificio_id=p.edificio_id,
            piso_id=p.piso_id,
            edificio_nombre=p.edificio.nombre if p.edificio else None,
            piso_nombre=p.piso.nombre if p.piso else None
        ))
    
    return UsuarioResponse(
        id=usuario.id,
        username=usuario.username,
        email=usuario.email,
        nombre_completo=usuario.nombre_completo,
        es_activo=usuario.es_activo,
        es_admin=usuario.es_admin,
        es_superadmin=usuario.es_superadmin,
        fecha_creacion=usuario.fecha_creacion,
        ultimo_login=usuario.ultimo_login,
        permisos=permisos_response
    )


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    usuario_data: UsuarioCreate,
    current_user: UsuarioAdmin = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Crea un nuevo usuario"""
    # Verificar que el username no exista
    existing = db.query(UsuarioAdmin).filter(
        UsuarioAdmin.username == usuario_data.username.lower()
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El usuario '{usuario_data.username}' ya existe"
        )
    
    # Crear usuario
    nuevo_usuario = UsuarioAdmin(
        username=usuario_data.username.lower(),
        email=usuario_data.email,
        nombre_completo=usuario_data.nombre_completo,
        hashed_password=get_password_hash(usuario_data.password),
        es_activo=usuario_data.es_activo,
        es_admin=usuario_data.es_admin,
        es_superadmin=usuario_data.es_superadmin
    )
    
    db.add(nuevo_usuario)
    db.flush()  # Para obtener el ID
    
    # Agregar permisos
    for permiso in usuario_data.permisos:
        nuevo_permiso = PermisoUsuario(
            usuario_id=nuevo_usuario.id,
            edificio_id=permiso.edificio_id,
            piso_id=permiso.piso_id
        )
        db.add(nuevo_permiso)
    
    db.commit()
    db.refresh(nuevo_usuario)
    
    return obtener_usuario(nuevo_usuario.id, current_user, db)


@router.put("/{user_id}", response_model=UsuarioResponse)
def actualizar_usuario(
    user_id: int,
    usuario_data: UsuarioUpdate,
    current_user: UsuarioAdmin = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Actualiza un usuario existente"""
    usuario = db.query(UsuarioAdmin).filter(UsuarioAdmin.id == user_id).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    # No permitir desactivar al superadmin actual
    if usuario.id == current_user.id and usuario_data.es_activo == False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes desactivar tu propia cuenta"
        )
    
    # Actualizar campos
    if usuario_data.email is not None:
        usuario.email = usuario_data.email
    if usuario_data.nombre_completo is not None:
        usuario.nombre_completo = usuario_data.nombre_completo
    if usuario_data.es_activo is not None:
        usuario.es_activo = usuario_data.es_activo
    if usuario_data.es_admin is not None:
        usuario.es_admin = usuario_data.es_admin
    if usuario_data.password:
        usuario.hashed_password = get_password_hash(usuario_data.password)
    
    db.commit()
    
    return obtener_usuario(user_id, current_user, db)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(
    user_id: int,
    current_user: UsuarioAdmin = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Elimina un usuario"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar tu propia cuenta"
        )
    
    usuario = db.query(UsuarioAdmin).filter(UsuarioAdmin.id == user_id).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if usuario.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar un superadministrador"
        )
    
    db.delete(usuario)
    db.commit()


@router.get("/{user_id}/permisos", response_model=List[PermisoResponse])
def obtener_permisos(
    user_id: int,
    current_user: UsuarioAdmin = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Obtiene los permisos de un usuario"""
    permisos = db.query(PermisoUsuario).options(
        joinedload(PermisoUsuario.edificio),
        joinedload(PermisoUsuario.piso)
    ).filter(PermisoUsuario.usuario_id == user_id).all()
    
    return [
        PermisoResponse(
            id=p.id,
            edificio_id=p.edificio_id,
            piso_id=p.piso_id,
            edificio_nombre=p.edificio.nombre if p.edificio else None,
            piso_nombre=p.piso.nombre if p.piso else None
        )
        for p in permisos
    ]


@router.put("/{user_id}/permisos", response_model=List[PermisoResponse])
def actualizar_permisos(
    user_id: int,
    permisos_data: PermisoUpdate,
    current_user: UsuarioAdmin = Depends(get_current_superadmin),
    db: Session = Depends(get_db)
):
    """Actualiza todos los permisos de un usuario (reemplaza los existentes)"""
    usuario = db.query(UsuarioAdmin).filter(UsuarioAdmin.id == user_id).first()
    
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    
    if usuario.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden modificar permisos de un superadministrador (tiene acceso total)"
        )
    
    # Eliminar permisos existentes
    db.query(PermisoUsuario).filter(PermisoUsuario.usuario_id == user_id).delete()
    
    # Agregar nuevos permisos
    for permiso in permisos_data.permisos:
        # Validar que edificio existe
        edificio = db.query(Edificio).filter(Edificio.id == permiso.edificio_id).first()
        if not edificio:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Edificio con ID {permiso.edificio_id} no encontrado"
            )
        
        # Validar piso si se especifica
        if permiso.piso_id:
            piso = db.query(Piso).filter(
                Piso.id == permiso.piso_id,
                Piso.edificio_id == permiso.edificio_id
            ).first()
            if not piso:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Piso con ID {permiso.piso_id} no encontrado en edificio {permiso.edificio_id}"
                )
        
        nuevo_permiso = PermisoUsuario(
            usuario_id=user_id,
            edificio_id=permiso.edificio_id,
            piso_id=permiso.piso_id
        )
        db.add(nuevo_permiso)
    
    db.commit()
    
    return obtener_permisos(user_id, current_user, db)

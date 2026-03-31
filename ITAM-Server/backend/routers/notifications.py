"""
Router para notificaciones de comandos remotos
Muestra historial de apagados/reinicios ejecutados por usuarios
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models.notifications import Notificacion
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/notificaciones",
    tags=["Notificaciones"],
    dependencies=[Depends(get_current_user)]
)


class NotificacionResponse(BaseModel):
    id: int
    tipo: str
    activo_hostname: Optional[str] = None
    activo_ip: Optional[str] = None
    usuario_username: Optional[str] = None
    exitoso: bool
    mensaje: Optional[str] = None
    fecha: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificacionesListResponse(BaseModel):
    items: List[NotificacionResponse]
    count: int


@router.get("", response_model=NotificacionesListResponse)
def listar_notificaciones(
    tipo: Optional[str] = None,
    limit: int = Query(default=20, le=500),
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """Lista notificaciones con filtros opcionales y paginación"""
    query = db.query(Notificacion).order_by(desc(Notificacion.fecha))

    if tipo:
        query = query.filter(Notificacion.tipo == tipo.upper())

    total = query.count()
    items = query.offset(skip).limit(limit).all()

    return NotificacionesListResponse(items=items, count=total)


@router.get("/count")
def contar_notificaciones(
    tipo: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Devuelve el total de notificaciones (para badge)"""
    query = db.query(Notificacion)
    if tipo:
        query = query.filter(Notificacion.tipo == tipo.upper())
    total = query.count()
    return {"count": total}


@router.delete("/{notificacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_notificacion(
    notificacion_id: int,
    db: Session = Depends(get_db)
):
    """Elimina una notificación por ID"""
    notif = db.query(Notificacion).filter(Notificacion.id == notificacion_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificación no encontrada"
        )
    db.delete(notif)
    db.commit()


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_todas(
    tipo: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Elimina todas las notificaciones (opcionalmente filtradas por tipo)"""
    query = db.query(Notificacion)
    if tipo:
        query = query.filter(Notificacion.tipo == tipo.upper())
    query.delete(synchronize_session=False)
    db.commit()

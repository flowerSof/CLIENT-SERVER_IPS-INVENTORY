"""
Router para consultar logs de auditoría
Solo accesible por superadmin
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models.audit import AuditLog
from auth_utils import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import date, datetime, timedelta

router = APIRouter(prefix="/api/audit", tags=["Audit"])
security = HTTPBearer()


def require_superadmin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Verifica que el usuario sea superadmin"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )
    
    if not payload.get("es_superadmin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere permisos de superadministrador"
        )
    
    return payload


@router.get("/logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    username: Optional[str] = None,
    entity_type: Optional[str] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    success: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_superadmin)
):
    """
    Obtiene logs de auditoría con filtros
    Solo accesible por superadmin
    """
    query = db.query(AuditLog)
    
    # Filtros
    if action:
        query = query.filter(AuditLog.action == action)
    
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    
    if fecha_inicio:
        query = query.filter(AuditLog.timestamp >= datetime.combine(fecha_inicio, datetime.min.time()))
    
    if fecha_fin:
        query = query.filter(AuditLog.timestamp <= datetime.combine(fecha_fin, datetime.max.time()))
    
    if success:
        query = query.filter(AuditLog.success == success)
    
    # Ordenar por fecha descendente
    query = query.order_by(desc(AuditLog.timestamp))
    
    # Paginación
    total = query.count()
    logs = query.offset((page - 1) * limit).limit(limit).all()
    
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "action": log.action,
                "username": log.username,
                "ip_address": log.ip_address,
                "endpoint": log.endpoint,
                "method": log.method,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "status_code": log.status_code,
                "success": log.success,
                "error_message": log.error_message
            }
            for log in logs
        ]
    }


@router.get("/stats")
def get_audit_stats(
    dias: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _: dict = Depends(require_superadmin)
):
    """
    Estadísticas de auditoría
    """
    from sqlalchemy import func
    
    fecha_inicio = datetime.now() - timedelta(days=dias)
    
    # Total de eventos
    total_eventos = db.query(func.count(AuditLog.id)).filter(
        AuditLog.timestamp >= fecha_inicio
    ).scalar()
    
    # Logins fallidos
    logins_fallidos = db.query(func.count(AuditLog.id)).filter(
        AuditLog.timestamp >= fecha_inicio,
        AuditLog.action == "LOGIN_FAILED"
    ).scalar()
    
    # Eventos por tipo
    eventos_por_accion = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label("count")
    ).filter(
        AuditLog.timestamp >= fecha_inicio
    ).group_by(AuditLog.action).all()
    
    # Top IPs con más actividad
    top_ips = db.query(
        AuditLog.ip_address,
        func.count(AuditLog.id).label("count")
    ).filter(
        AuditLog.timestamp >= fecha_inicio,
        AuditLog.ip_address.isnot(None)
    ).group_by(AuditLog.ip_address).order_by(
        desc(func.count(AuditLog.id))
    ).limit(10).all()
    
    # Top usuarios
    top_usuarios = db.query(
        AuditLog.username,
        func.count(AuditLog.id).label("count")
    ).filter(
        AuditLog.timestamp >= fecha_inicio,
        AuditLog.username.isnot(None)
    ).group_by(AuditLog.username).order_by(
        desc(func.count(AuditLog.id))
    ).limit(10).all()
    
    return {
        "periodo_dias": dias,
        "total_eventos": total_eventos,
        "logins_fallidos": logins_fallidos,
        "eventos_por_accion": [
            {"action": a, "count": c} for a, c in eventos_por_accion
        ],
        "top_ips": [
            {"ip": ip, "count": c} for ip, c in top_ips
        ],
        "top_usuarios": [
            {"username": u, "count": c} for u, c in top_usuarios
        ]
    }


@router.get("/failed-logins")
def get_failed_logins(
    horas: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    _: dict = Depends(require_superadmin)
):
    """
    Lista de intentos de login fallidos recientes
    Útil para detectar ataques de fuerza bruta
    """
    desde = datetime.now() - timedelta(hours=horas)
    
    logs = db.query(AuditLog).filter(
        AuditLog.action == "LOGIN_FAILED",
        AuditLog.timestamp >= desde
    ).order_by(desc(AuditLog.timestamp)).limit(100).all()
    
    return {
        "periodo_horas": horas,
        "total": len(logs),
        "intentos": [
            {
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent[:100] if log.user_agent else None
            }
            for log in logs
        ]
    }

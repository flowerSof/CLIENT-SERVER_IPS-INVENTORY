"""
Middleware de Auditoría - Registra todas las acciones importantes
"""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
from database import SessionLocal
from models.audit import AuditLog, AuditAction
from auth_utils import verify_token
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import json
import logging

logger = logging.getLogger(__name__)


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware para registrar acciones en el log de auditoría"""
    
    # Endpoints que se auditan
    AUDITED_PATHS = [
        "/api/auth/login",
        "/api/auth/logout",
        "/api/users",
        "/api/assets",
        "/api/printers",
        "/api/buildings",
        "/api/floors",
        "/api/remote",
    ]
    
    # Métodos que se auditan
    AUDITED_METHODS = ["POST", "PUT", "DELETE", "PATCH"]
    
    # Endpoints con GET que se auditan (datos sensibles)
    AUDITED_GET_PATHS = [
        "/api/users",
        "/api/reports",
    ]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Verificar si debe auditarse
        if not self._should_audit(request):
            return await call_next(request)
        
        # Capturar información antes de procesar
        start_time = datetime.now(timezone.utc)
        client_ip = self._get_client_ip(request)
        user_info = await self._get_user_info(request)
        
        # Procesar petición
        response = await call_next(request)
        
        # Registrar en auditoría
        try:
            await self._log_action(
                request=request,
                response=response,
                client_ip=client_ip,
                user_info=user_info,
                start_time=start_time
            )
        except Exception as e:
            logger.error(f"Error logging audit: {e}")
        
        return response
    
    def _should_audit(self, request: Request) -> bool:
        """Determina si la petición debe ser auditada"""
        path = request.url.path
        method = request.method
        
        # Verificar si es un endpoint auditado
        for audited_path in self.AUDITED_PATHS:
            if path.startswith(audited_path):
                # POST, PUT, DELETE siempre se auditan
                if method in self.AUDITED_METHODS:
                    return True
                
                # GET solo para endpoints sensibles
                if method == "GET" and any(path.startswith(p) for p in self.AUDITED_GET_PATHS):
                    return True
        
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """Obtiene IP real del cliente"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        if request.client:
            return request.client.host
        
        return "unknown"
    
    async def _get_user_info(self, request: Request) -> Dict[str, Any]:
        """Extrae información del usuario del token JWT"""
        auth_header = request.headers.get("Authorization", "")
        
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = verify_token(token)
            
            if payload:
                return {
                    "user_id": payload.get("user_id"),
                    "username": payload.get("sub")
                }
        
        return {"user_id": None, "username": None}
    
    async def _log_action(
        self,
        request: Request,
        response: Response,
        client_ip: str,
        user_info: Dict[str, Any],
        start_time: datetime
    ):
        """Registra la acción en la base de datos"""
        db = SessionLocal()
        
        try:
            path = request.url.path
            method = request.method
            
            # Determinar tipo de acción
            action = self._determine_action(path, method, response.status_code)
            
            # Extraer entidad del path
            entity_type, entity_id = self._extract_entity(path)
            
            # Crear registro
            log = AuditLog(
                timestamp=start_time,
                action=action,
                user_id=user_info.get("user_id"),
                username=user_info.get("username"),
                ip_address=client_ip,
                user_agent=request.headers.get("User-Agent", "")[:500],
                endpoint=path[:200],
                method=method,
                entity_type=entity_type,
                entity_id=entity_id,
                status_code=response.status_code,
                success="true" if response.status_code < 400 else "false",
                error_message=None if response.status_code < 400 else f"HTTP {response.status_code}"
            )
            
            db.add(log)
            db.commit()
            
            logger.debug(f"Audit: {action} by {user_info.get('username')} on {entity_type}/{entity_id}")
            
        except Exception as e:
            logger.error(f"Failed to log audit: {e}")
            db.rollback()
        finally:
            db.close()
    
    def _determine_action(self, path: str, method: str, status_code: int) -> str:
        """Determina el tipo de acción basado en path y método"""
        # Login/Logout específicos
        if "/auth/login" in path:
            return AuditAction.LOGIN_SUCCESS if status_code < 400 else AuditAction.LOGIN_FAILED
        
        if "/auth/logout" in path:
            return AuditAction.LOGOUT
        
        # Operaciones especiales
        if "/scan" in path:
            return AuditAction.SCAN_PRINTER
        
        if "/remote" in path:
            return AuditAction.REMOTE_COMMAND
        
        if "/export" in path or "/reports" in path:
            return AuditAction.EXPORT_DATA
        
        if "/upload" in path or "/import" in path:
            return AuditAction.IMPORT_DATA
        
        # CRUD básico
        method_to_action = {
            "POST": AuditAction.CREATE,
            "GET": AuditAction.READ,
            "PUT": AuditAction.UPDATE,
            "PATCH": AuditAction.UPDATE,
            "DELETE": AuditAction.DELETE
        }
        
        return method_to_action.get(method, "UNKNOWN")
    
    def _extract_entity(self, path: str) -> tuple:
        """Extrae tipo y ID de entidad del path"""
        parts = path.strip("/").split("/")
        
        if len(parts) < 2:
            return None, None
        
        # /api/assets/123 -> (assets, 123)
        entity_type = None
        entity_id = None
        
        # Mapeo de paths a entidades
        entity_map = {
            "assets": "asset",
            "users": "user",
            "printers": "printer",
            "buildings": "building",
            "floors": "floor",
            "areas": "area"
        }
        
        for i, part in enumerate(parts):
            if part in entity_map:
                entity_type = entity_map[part]
                # Verificar si siguiente parte es ID
                if i + 1 < len(parts) and parts[i + 1].isdigit():
                    entity_id = parts[i + 1]
                break
        
        return entity_type, entity_id


# Función helper para logging manual
def log_audit(
    db: Session,
    action: str,
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    ip_address: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict] = None,
    success: bool = True,
    error_message: Optional[str] = None
):
    """
    Función para registrar auditoría manualmente desde cualquier parte del código
    
    Uso:
        log_audit(db, AuditAction.DELETE, user_id=1, entity_type="printer", entity_id="5")
    """
    try:
        log = AuditLog(
            action=action,
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            details=details,
            success="true" if success else "false",
            error_message=error_message
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Manual audit log failed: {e}")
        db.rollback()

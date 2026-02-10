"""
Sistema de Auditoría - Registro de acciones de usuarios
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from sqlalchemy.sql import func
from database import Base
from datetime import datetime, timezone


class AuditLog(Base):
    """Modelo para logs de auditoría"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Información del evento
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    action = Column(String(50), index=True, nullable=False)  # LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW
    
    # Usuario que realizó la acción
    user_id = Column(Integer, nullable=True, index=True)
    username = Column(String(100), nullable=True, index=True)
    
    # Información de la petición
    ip_address = Column(String(45), nullable=True)  # IPv6 puede tener hasta 45 chars
    user_agent = Column(String(500), nullable=True)
    
    # Detalles de la acción
    endpoint = Column(String(200), nullable=True)
    method = Column(String(10), nullable=True)  # GET, POST, PUT, DELETE
    
    # Entidad afectada
    entity_type = Column(String(50), nullable=True)  # asset, user, printer, etc.
    entity_id = Column(String(50), nullable=True)
    
    # Datos adicionales (JSON)
    details = Column(JSON, nullable=True)
    
    # Resultado
    status_code = Column(Integer, nullable=True)
    success = Column(String(10), default="true")  # true, false
    error_message = Column(Text, nullable=True)


# Acciones predefinidas
class AuditAction:
    # Autenticación
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # CRUD
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    
    # Operaciones específicas
    SCAN_PRINTER = "SCAN_PRINTER"
    REMOTE_COMMAND = "REMOTE_COMMAND"
    EXPORT_DATA = "EXPORT_DATA"
    IMPORT_DATA = "IMPORT_DATA"

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class UsuarioAdmin(Base):
    """Modelo de usuario administrador para autenticación"""
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(200), unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)  # Contraseña encriptada con bcrypt
    nombre_completo = Column(String(200))
    es_activo = Column(Boolean, default=True)
    es_admin = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    ultimo_login = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<UsuarioAdmin {self.username}>"

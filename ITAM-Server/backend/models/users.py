from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from ..database import Base

class UsuarioAdmin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String) # Si usas LDAP, esto puede ser opcional
    es_activo = Column(Boolean, default=True)
    ultimo_login = Column(DateTime(timezone=True), nullable=True)
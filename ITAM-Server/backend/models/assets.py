from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from ..database import Base

class Activo(Base):
    __tablename__ = "activos"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String, unique=True, index=True)
    hostname = Column(String)
    ip_address = Column(String)
    mac_address = Column(String)
    usuario_detectado = Column(String)
    
    # --- NUEVOS CAMPOS ---
    marca = Column(String)
    sistema_operativo = Column(String)
    procesador = Column(String)
    memoria_ram = Column(String)
    # ---------------------
    
    ultimo_reporte = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    es_dominio = Column(Boolean, default=False)
    
    pos_x = Column(Float, nullable=True)
    pos_y = Column(Float, nullable=True)
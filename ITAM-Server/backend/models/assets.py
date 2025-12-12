from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class Activo(Base):
    __tablename__ = "activos"

    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String, unique=True, index=True, nullable=False)
    
    # Datos de Red
    hostname = Column(String, index=True)
    ip_address = Column(String)
    mac_address = Column(String)
    es_dominio = Column(Boolean, default=False)
    
    # Datos de Hardware/Software
    marca = Column(String)
    modelo = Column(String)
    sistema_operativo = Column(String)
    procesador = Column(String)
    memoria_ram = Column(String)
    
    # Datos Administrativos
    usuario_detectado = Column(String)
    tipo_asignacion = Column(String, default="PLANILLA") # PRACTICANTE, VOLUNTARIO...
    
    # Estado
    ultimo_reporte = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Ubicación Física (Relaciones)
    piso_id = Column(Integer, ForeignKey("pisos.id"), nullable=True)
    pos_x = Column(Float, nullable=True)
    pos_y = Column(Float, nullable=True)
    
    # Relación inversa (opcional, para consultas avanzadas)
    piso = relationship("Piso", back_populates="activos")
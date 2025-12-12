from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Edificio(Base):
    __tablename__ = "edificios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True)
    ciudad = Column(String)
    
    pisos = relationship("Piso", back_populates="edificio")

class Piso(Base):
    __tablename__ = "pisos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String) # Ej: Piso 1, Mezzanine
    nivel = Column(Integer) # 1, 2, -1
    mapa_url = Column(String, nullable=True) # Ruta de la imagen
    
    edificio_id = Column(Integer, ForeignKey("edificios.id"))
    
    edificio = relationship("Edificio", back_populates="pisos")
    areas = relationship("Area", back_populates="piso")
    activos = relationship("Activo", back_populates="piso")

class Area(Base):
    __tablename__ = "areas"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String) # Ej: RRHH, Sistemas
    coordenadas_json = Column(String, nullable=True) # Para dibujar polígonos
    
    piso_id = Column(Integer, ForeignKey("pisos.id"))
    piso = relationship("Piso", back_populates="areas")
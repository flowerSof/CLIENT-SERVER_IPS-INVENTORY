"""
Modelos de base de datos para impresoras y registro de impresiones
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, timezone
from database import Base


class Impresora(Base):
    """Modelo para impresoras de red monitoreadas via SNMP"""
    __tablename__ = "impresoras"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True, nullable=False)  # Nombre descriptivo
    ip_address = Column(String, unique=True, index=True, nullable=False)
    
    # Datos de Hardware
    marca = Column(String, default="Unknown")  # Lexmark, Ricoh, HP, etc.
    modelo = Column(String, default="Unknown")
    serial_number = Column(String, nullable=True)
    
    # Ubicación
    ubicacion = Column(String, nullable=True)  # Descripción de ubicación
    piso_id = Column(Integer, ForeignKey("pisos.id"), nullable=True)
    
    # Estado
    activa = Column(Boolean, default=True)
    ultimo_sondeo = Column(DateTime(timezone=True), nullable=True)
    ultimo_contador = Column(Integer, default=0)  # Último contador total de páginas
    
    # SNMP
    snmp_community = Column(String, default="public")  # Community string SNMP
    
    # Timestamps
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relaciones
    piso = relationship("Piso", backref="impresoras")
    registros = relationship("RegistroImpresion", back_populates="impresora", cascade="all, delete-orphan")
    
    def is_online(self, threshold_minutes=30):
        """Determina si la impresora respondió recientemente"""
        if not self.ultimo_sondeo:
            return False
        limite = datetime.now(timezone.utc) - timedelta(minutes=threshold_minutes)
        return self.ultimo_sondeo >= limite


class RegistroImpresion(Base):
    """Historial de contadores de impresión (guardado cada sondeo)"""
    __tablename__ = "registros_impresion"

    id = Column(Integer, primary_key=True, index=True)
    impresora_id = Column(Integer, ForeignKey("impresoras.id"), nullable=False, index=True)
    
    # Timestamp del sondeo
    fecha = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    fecha_solo = Column(Date, index=True)  # Para consultas rápidas por día
    
    # Contadores
    total_paginas = Column(Integer, default=0)  # Contador acumulativo
    paginas_bn = Column(Integer, nullable=True)  # Páginas blanco y negro (si disponible)
    paginas_color = Column(Integer, nullable=True)  # Páginas color (si disponible)
    
    # Datos adicionales SNMP
    nivel_toner_negro = Column(Integer, nullable=True)  # Porcentaje
    nivel_toner_color = Column(Integer, nullable=True)  # Porcentaje (si aplica)
    estado = Column(String, nullable=True)  # idle, printing, error, etc.
    
    # Relación
    impresora = relationship("Impresora", back_populates="registros")

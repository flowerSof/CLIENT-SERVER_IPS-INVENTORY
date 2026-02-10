"""
Modelo para registro de impresiones por computadora
Almacena cuántas impresiones hace cada PC a cada impresora, por día
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class PrintStatsPC(Base):
    """Estadísticas de impresión por computadora, por impresora, por día"""
    __tablename__ = "print_stats_pc"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Computadora que imprimió
    activo_id = Column(Integer, ForeignKey("activos.id"), nullable=False, index=True)
    serial_number = Column(String, index=True, nullable=False)  # Para referencia rápida
    hostname = Column(String, index=True)
    
    # Impresora utilizada
    printer_name = Column(String, nullable=False, index=True)  # Nombre de la cola
    printer_port = Column(String, nullable=True)  # Puerto/IP de la impresora
    printer_driver = Column(String, nullable=True)
    is_network_printer = Column(Boolean, default=False)
    
    # Contadores del día
    fecha = Column(Date, nullable=False, index=True)
    total_jobs = Column(Integer, default=0)  # Trabajos de impresión del día
    total_pages = Column(Integer, default=0)  # Páginas impresas del día
    
    # Contadores acumulativos (desde que se reinició el spooler)
    jobs_acumulados = Column(Integer, default=0)
    pages_acumuladas = Column(Integer, default=0)
    
    # Timestamps
    primera_lectura = Column(DateTime(timezone=True), server_default=func.now())
    ultima_lectura = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relación
    activo = relationship("Activo", backref="print_stats")
    
    # Unique: una entrada por PC + impresora + día
    __table_args__ = (
        UniqueConstraint('activo_id', 'printer_name', 'fecha', name='uq_pc_printer_date'),
    )

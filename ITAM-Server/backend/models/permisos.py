"""
Modelo de permisos de usuario para control de acceso granular.
Permite definir qué edificios y pisos puede ver cada usuario.
"""
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class PermisoUsuario(Base):
    """
    Modelo para almacenar permisos granulares de usuario.
    
    Lógica de permisos:
    - Si solo tiene edificio_id: acceso a TODO el edificio (todos los pisos)
    - Si tiene edificio_id + piso_id: acceso solo a ese piso específico
    """
    __tablename__ = "permisos_usuario"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("admins.id", ondelete="CASCADE"), nullable=False)
    edificio_id = Column(Integer, ForeignKey("edificios.id", ondelete="CASCADE"), nullable=False)
    piso_id = Column(Integer, ForeignKey("pisos.id", ondelete="CASCADE"), nullable=True)  # NULL = todo el edificio
    
    # Relaciones
    usuario = relationship("UsuarioAdmin", back_populates="permisos")
    edificio = relationship("Edificio")
    piso = relationship("Piso")

    def __repr__(self):
        if self.piso_id:
            return f"<Permiso Usuario={self.usuario_id} Edificio={self.edificio_id} Piso={self.piso_id}>"
        return f"<Permiso Usuario={self.usuario_id} Edificio={self.edificio_id} (completo)>"

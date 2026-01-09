"""
Asset position update schema
"""
from pydantic import BaseModel
from typing import Optional

class AssetPositionUpdate(BaseModel):
    """Schema para actualizar posición de un activo"""
    piso_id: Optional[int] = None
    pos_x: Optional[float] = None
    pos_y: Optional[float] = None

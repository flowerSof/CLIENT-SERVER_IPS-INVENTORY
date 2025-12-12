from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AssetReportCreate(BaseModel):
    auth_token: str # Para validar seguridad
    serial_number: str
    hostname: str
    ip_address: str
    mac_address: str
    usuario: str
    
    # Hardware
    marca: str
    modelo: Optional[str] = None
    sistema_operativo: str
    procesador: str
    memoria_ram: str

class AssetResponse(BaseModel):
    id: int
    hostname: str
    estado: str = "ok"
    
    class Config:
        from_attributes = True
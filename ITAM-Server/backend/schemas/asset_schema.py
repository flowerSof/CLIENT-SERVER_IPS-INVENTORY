from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PrintDataItem(BaseModel):
    printer_name: str
    total_jobs: int = 0
    total_pages: int = 0
    port: str = ""
    driver: str = ""
    is_network: bool = False
    is_default: bool = False

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
    
    # Datos de impresión (opcional)
    print_data: Optional[List[PrintDataItem]] = None

class AssetResponse(BaseModel):
    id: int
    hostname: str
    estado: str = "ok"
    
    class Config:
        from_attributes = True
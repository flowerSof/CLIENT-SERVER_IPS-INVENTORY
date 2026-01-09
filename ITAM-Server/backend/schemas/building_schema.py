from pydantic import BaseModel
from typing import Optional

# --- EDIFICIO SCHEMAS ---
class EdificioBase(BaseModel):
    nombre: str
    ciudad: Optional[str] = None

class EdificioCreate(EdificioBase):
    pass

class EdificioUpdate(BaseModel):
    nombre: Optional[str] = None
    ciudad: Optional[str] = None

class EdificioResponse(EdificioBase):
    id: int
    
    class Config:
        from_attributes = True

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from ..database import get_db
from ..models import assets

router = APIRouter(prefix="/api/assets", tags=["Dashboard"])

class PositionUpdate(BaseModel):
    pos_x: float
    pos_y: float
    piso_id: int

# --- NUEVO: Endpoint de Estadísticas ---
@router.get("/stats")
def obtener_estadisticas(db: Session = Depends(get_db)):
    """Calcula los KPIs en tiempo real"""
    total_equipos = db.query(assets.Activo).count()
    
    # Calcular Online (reportaron en los últimos 5 minutos)
    hace_5_min = datetime.now() - timedelta(minutes=5)
    online_count = db.query(assets.Activo).filter(assets.Activo.ultimo_reporte >= hace_5_min).count()
    
    # Calcular Dominio
    en_dominio = db.query(assets.Activo).filter(assets.Activo.es_dominio == True).count()
    
    # Calcular Alertas (Ej: PCs sin usuario asignado o "No User")
    alertas = db.query(assets.Activo).filter(assets.Activo.usuario_detectado == "No User").count()

    return {
        "total": total_equipos,
        "online": online_count,
        "offline": total_equipos - online_count,
        "en_dominio": en_dominio,
        "alertas": alertas
    }

@router.get("/")
def listar_activos(db: Session = Depends(get_db)):
    return db.query(assets.Activo).all()

@router.put("/{serial}/position")
def guardar_posicion(serial: str, pos: PositionUpdate, db: Session = Depends(get_db)):
    activo = db.query(assets.Activo).filter(assets.Activo.serial_number == serial).first()
    if not activo: raise HTTPException(status_code=404, detail="Activo no encontrado")
    activo.pos_x = pos.pos_x
    activo.pos_y = pos.pos_y
    activo.piso_id = pos.piso_id
    db.commit()
    return {"status": "updated"}
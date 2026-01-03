from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta

# Importamos usando rutas absolutas (Docker WORKDIR es /app)
from database import get_db
from models import assets

router = APIRouter(
    prefix="/api/assets",
    tags=["Dashboard"]
)

class PositionUpdate(BaseModel):
    pos_x: float
    pos_y: float
    piso_id: int

# --- ENDPOINT 1: ESTADÍSTICAS (KPIs) ---
@router.get("/stats")
def obtener_estadisticas(db: Session = Depends(get_db)):
    # Total de equipos
    total = db.query(assets.Activo).count()
    
    # Equipos Online (reportaron en los últimos 5 mins)
    limite_tiempo = datetime.now() - timedelta(minutes=5)
    online = db.query(assets.Activo).filter(assets.Activo.ultimo_reporte >= limite_tiempo).count()
    
    # Equipos en Dominio
    dominio = db.query(assets.Activo).filter(assets.Activo.es_dominio == True).count()
    
    # Alertas (Sin usuario asignado)
    alertas = db.query(assets.Activo).filter(assets.Activo.usuario_detectado == "No User").count()

    return {
        "total": total,
        "online": online,
        "offline": total - online,
        "en_dominio": dominio,
        "alertas": alertas
    }

# --- ENDPOINT 2: LISTA COMPLETA ---
@router.get("/")
def listar_activos(db: Session = Depends(get_db)):
    return db.query(assets.Activo).all()

# --- ENDPOINT 3: GUARDAR POSICIÓN EN MAPA ---
@router.put("/{serial}/position")
def guardar_posicion(serial: str, pos: PositionUpdate, db: Session = Depends(get_db)):
    activo = db.query(assets.Activo).filter(assets.Activo.serial_number == serial).first()
    
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    activo.pos_x = pos.pos_x
    activo.pos_y = pos.pos_y
    activo.piso_id = pos.piso_id
    
    db.commit()
    return {"status": "updated"}
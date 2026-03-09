from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.history import HistorialActivo
from schemas.history_schema import HistoryResponse
from typing import List
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/history",
    tags=["History"],
    dependencies=[Depends(get_current_user)]
)

@router.get("/{asset_id}", response_model=List[HistoryResponse])
def get_asset_history(asset_id: int, db: Session = Depends(get_db)):
    """
    Obtiene el historial de cambios de un activo específico.
    """
    history = db.query(HistorialActivo).filter(HistorialActivo.activo_id == asset_id).order_by(HistorialActivo.fecha_cambio.desc()).all()
    return history

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import locations
from schemas import area_schema
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/areas",
    tags=["Areas"],
    dependencies=[Depends(get_current_user)]
)

# --- LISTAR ALL AREAS ---
@router.get("/", response_model=List[area_schema.AreaResponse])
def listar_areas(piso_id: int = None, db: Session = Depends(get_db)):
    query = db.query(locations.Area)
    if piso_id:
        query = query.filter(locations.Area.piso_id == piso_id)
    return query.all()

# --- CREATE AREA ---
@router.post("/", response_model=area_schema.AreaResponse)
def crear_area(area: area_schema.AreaCreate, db: Session = Depends(get_db)):
    # Check if piso exists
    piso = db.query(locations.Piso).filter(locations.Piso.id == area.piso_id).first()
    if not piso:
        raise HTTPException(status_code=404, detail="Piso no encontrado")

    nueva_area = locations.Area(
        nombre=area.nombre,
        piso_id=area.piso_id,
        coordenadas_json=area.coordenadas_json
    )
    db.add(nueva_area)
    db.commit()
    db.refresh(nueva_area)
    return nueva_area

# --- UPDATE AREA ---
@router.put("/{area_id}", response_model=area_schema.AreaResponse)
def actualizar_area(area_id: int, area_update: area_schema.AreaUpdate, db: Session = Depends(get_db)):
    db_area = db.query(locations.Area).filter(locations.Area.id == area_id).first()
    if not db_area:
        raise HTTPException(status_code=404, detail="Area no encontrada")

    update_data = area_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_area, key, value)

    db.commit()
    db.refresh(db_area)
    return db_area

# --- DELETE AREA ---
@router.delete("/{area_id}")
def eliminar_area(area_id: int, db: Session = Depends(get_db)):
    db_area = db.query(locations.Area).filter(locations.Area.id == area_id).first()
    if not db_area:
        raise HTTPException(status_code=404, detail="Area no encontrada")

    db.delete(db_area)
    db.commit()
    return {"status": "deleted", "id": area_id}

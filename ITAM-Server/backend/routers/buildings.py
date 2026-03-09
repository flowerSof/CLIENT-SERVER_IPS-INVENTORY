from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import locations
from schemas import building_schema
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/buildings",
    tags=["Buildings"],
    dependencies=[Depends(get_current_user)]
)

# --- ENDPOINT 1: LISTAR TODOS LOS EDIFICIOS ---
@router.get("/", response_model=List[building_schema.EdificioResponse])
def listar_edificios(db: Session = Depends(get_db)):
    """Obtiene la lista de todos los edificios"""
    edificios = db.query(locations.Edificio).all()
    return edificios

# --- ENDPOINT 2: OBTENER DETALLES DE UN EDIFICIO ---
@router.get("/{edificio_id}", response_model=building_schema.EdificioResponse)
def obtener_edificio(edificio_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de un edificio específico"""
    edificio = db.query(locations.Edificio).filter(locations.Edificio.id == edificio_id).first()
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    return edificio

# --- ENDPOINT 3: CREAR EDIFICIO ---
@router.post("/", response_model=building_schema.EdificioResponse)
def crear_edificio(edificio: building_schema.EdificioCreate, db: Session = Depends(get_db)):
    """Crea un nuevo edificio"""
    
    # Verificar que no exista un edificio con el mismo nombre
    edificio_existente = db.query(locations.Edificio).filter(
        locations.Edificio.nombre == edificio.nombre
    ).first()
    
    if edificio_existente:
        raise HTTPException(
            status_code=400, 
            detail=f"Ya existe un edificio con el nombre '{edificio.nombre}'"
        )
    
    nuevo_edificio = locations.Edificio(
        nombre=edificio.nombre,
        ciudad=edificio.ciudad
    )
    
    db.add(nuevo_edificio)
    db.commit()
    db.refresh(nuevo_edificio)
    
    return nuevo_edificio

# --- ENDPOINT 4: ACTUALIZAR EDIFICIO ---
@router.put("/{edificio_id}", response_model=building_schema.EdificioResponse)
def actualizar_edificio(
    edificio_id: int, 
    edificio_update: building_schema.EdificioUpdate, 
    db: Session = Depends(get_db)
):
    """Actualiza los datos de un edificio"""
    edificio = db.query(locations.Edificio).filter(locations.Edificio.id == edificio_id).first()
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Actualizar campos proporcionados
    update_data = edificio_update.dict(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(edificio, key, value)
    
    db.commit()
    db.refresh(edificio)
    
    return edificio

# --- ENDPOINT 5: ELIMINAR EDIFICIO ---
@router.delete("/{edificio_id}")
def eliminar_edificio(edificio_id: int, db: Session = Depends(get_db)):
    """Elimina un edificio (solo si no tiene pisos)"""
    edificio = db.query(locations.Edificio).filter(locations.Edificio.id == edificio_id).first()
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Verificar que no tenga pisos
    pisos_count = db.query(locations.Piso).filter(locations.Piso.edificio_id == edificio_id).count()
    if pisos_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el edificio porque tiene {pisos_count} pisos asignados"
        )
    
    db.delete(edificio)
    db.commit()
    
    return {"status": "deleted", "id": edificio_id}

# --- ENDPOINT 6: OBTENER PISOS DE UN EDIFICIO ---
@router.get("/{edificio_id}/floors")
def obtener_pisos_edificio(edificio_id: int, db: Session = Depends(get_db)):
    """Obtiene todos los pisos de un edificio específico"""
    edificio = db.query(locations.Edificio).filter(locations.Edificio.id == edificio_id).first()
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    pisos = db.query(locations.Piso).filter(locations.Piso.edificio_id == edificio_id).all()
    
    return [{
        "id": piso.id,
        "nombre": piso.nombre,
        "nivel": piso.nivel,
        "edificio_id": piso.edificio_id,
        "tiene_imagen": piso.mapa_imagen is not None,
        "mapa_filename": piso.mapa_filename,
        "ancho_imagen": piso.ancho_imagen,
        "alto_imagen": piso.alto_imagen
    } for piso in pisos]

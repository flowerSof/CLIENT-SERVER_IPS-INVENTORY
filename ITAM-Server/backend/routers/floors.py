from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import base64
from io import BytesIO
from PIL import Image

from database import get_db
from models import locations
from schemas import floor_schema
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/floors",
    tags=["Floors"],
    dependencies=[Depends(get_current_user)]
)

# --- ENDPOINT 1: LISTAR TODOS LOS PISOS ---
@router.get("/", response_model=List[floor_schema.FloorResponse])
def listar_pisos(db: Session = Depends(get_db)):
    """Obtiene la lista de todos los pisos sin las imágenes (solo metadata)"""
    pisos = db.query(locations.Piso).all()
    return pisos

# --- ENDPOINT 2: OBTENER DETALLES DE UN PISO ---
@router.get("/{piso_id}", response_model=floor_schema.FloorResponse)
def obtener_piso(piso_id: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de un piso específico"""
    piso = db.query(locations.Piso).filter(locations.Piso.id == piso_id).first()
    if not piso:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    return piso

# --- ENDPOINT 3: OBTENER IMAGEN DEL PISO ---
@router.get("/{piso_id}/image", response_model=floor_schema.FloorWithImage)
def obtener_imagen_piso(piso_id: int, db: Session = Depends(get_db)):
    """Obtiene la imagen del plano del piso en formato base64"""
    piso = db.query(locations.Piso).filter(locations.Piso.id == piso_id).first()
    if not piso:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    
    if not piso.mapa_imagen:
        raise HTTPException(status_code=404, detail="Este piso no tiene imagen de plano")
    
    return {
        "id": piso.id,
        "nombre": piso.nombre,
        "nivel": piso.nivel,
        "edificio_id": piso.edificio_id,
        "mapa_filename": piso.mapa_filename,
        "mapa_content_type": piso.mapa_content_type,
        "ancho_imagen": piso.ancho_imagen,
        "alto_imagen": piso.alto_imagen,
        "mapa_imagen": piso.mapa_imagen
    }

# --- ENDPOINT 4: CREAR PISO CON IMAGEN ---
@router.post("/", response_model=floor_schema.FloorResponse)
def crear_piso(piso: floor_schema.FloorCreate, db: Session = Depends(get_db)):
    """Crea un nuevo piso con su imagen de plano"""
    
    # Validar que el edificio existe
    edificio = db.query(locations.Edificio).filter(locations.Edificio.id == piso.edificio_id).first()
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")
    
    # Validar imagen si se proporciona
    if piso.mapa_imagen:
        try:
            # Decodificar base64 para validar
            if "," in piso.mapa_imagen:
                # Remover el prefijo data:image/...;base64,
                image_data = piso.mapa_imagen.split(",")[1]
            else:
                image_data = piso.mapa_imagen
            
            img_bytes = base64.b64decode(image_data)
            img = Image.open(BytesIO(img_bytes))
            
            # Actualizar dimensiones si no se proporcionaron
            if not piso.ancho_imagen:
                piso.ancho_imagen = img.width
            if not piso.alto_imagen:
                piso.alto_imagen = img.height
                
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Imagen inválida: {str(e)}")
    
    # Crear el piso
    nuevo_piso = locations.Piso(
        nombre=piso.nombre,
        nivel=piso.nivel,
        edificio_id=piso.edificio_id,
        mapa_imagen=piso.mapa_imagen,
        mapa_filename=piso.mapa_filename,
        mapa_content_type=piso.mapa_content_type,
        ancho_imagen=piso.ancho_imagen,
        alto_imagen=piso.alto_imagen
    )
    
    db.add(nuevo_piso)
    db.commit()
    db.refresh(nuevo_piso)
    
    return nuevo_piso

# --- ENDPOINT 5: ACTUALIZAR PISO ---
@router.put("/{piso_id}", response_model=floor_schema.FloorResponse)
def actualizar_piso(piso_id: int, piso_update: floor_schema.FloorUpdate, db: Session = Depends(get_db)):
    """Actualiza los datos de un piso"""
    piso = db.query(locations.Piso).filter(locations.Piso.id == piso_id).first()
    if not piso:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    
    # Actualizar campos proporcionados
    update_data = piso_update.dict(exclude_unset=True)
    
    # Validar imagen si se actualiza
    if "mapa_imagen" in update_data and update_data["mapa_imagen"]:
        try:
            if "," in update_data["mapa_imagen"]:
                image_data = update_data["mapa_imagen"].split(",")[1]
            else:
                image_data = update_data["mapa_imagen"]
            
            img_bytes = base64.b64decode(image_data)
            img = Image.open(BytesIO(img_bytes))
            
            # Actualizar dimensiones automáticamente
            update_data["ancho_imagen"] = img.width
            update_data["alto_imagen"] = img.height
            
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Imagen inválida: {str(e)}")
    
    for key, value in update_data.items():
        setattr(piso, key, value)
    
    db.commit()
    db.refresh(piso)
    
    return piso

# --- ENDPOINT 6: ELIMINAR PISO ---
@router.delete("/{piso_id}")
def eliminar_piso(piso_id: int, db: Session = Depends(get_db)):
    """Elimina un piso (solo si no tiene activos asignados)"""
    piso = db.query(locations.Piso).filter(locations.Piso.id == piso_id).first()
    if not piso:
        raise HTTPException(status_code=404, detail="Piso no encontrado")
    
    # Verificar que no tenga activos
    activos_count = db.query(locations.Activo).filter(locations.Activo.piso_id == piso_id).count()
    if activos_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el piso porque tiene {activos_count} activos asignados"
        )
    
    db.delete(piso)
    db.commit()
    
    return {"status": "deleted", "id": piso_id}

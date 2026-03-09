from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.glossary import NamingConvention
from pydantic import BaseModel
from typing import List
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/catalogs",
    tags=["Catalogs"],
    dependencies=[Depends(get_current_user)]
)

class CatalogItemCreate(BaseModel):
    category: str # "DISTRITO", "SEDE", "TIPO", "OOJJ", "AREA"
    code: str
    description: str

class CatalogItemResponse(CatalogItemCreate):
    id: int
    class Config:
        from_attributes = True

@router.get("/{category}", response_model=List[CatalogItemResponse])
def get_catalog_by_category(category: str, db: Session = Depends(get_db)):
    """Obtener items de una categoría específica (ej: DISTRITO)"""
    return db.query(NamingConvention).filter(NamingConvention.category == category.upper()).all()

@router.post("/", response_model=CatalogItemResponse)
def create_catalog_item(item: CatalogItemCreate, db: Session = Depends(get_db)):
    """Crear nuevo item en el catálogo"""
    # Verificar duplicados
    existing = db.query(NamingConvention).filter(
        NamingConvention.category == item.category.upper(),
        NamingConvention.code == item.code.upper()
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="El código ya existe en esta categoría")
    
    new_item = NamingConvention(
        category=item.category.upper(),
        code=item.code.upper(),
        description=item.description
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.delete("/{id}")
def delete_catalog_item(id: int, db: Session = Depends(get_db)):
    """Eliminar un item del catálogo"""
    item = db.query(NamingConvention).filter(NamingConvention.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    db.delete(item)
    db.commit()
    return {"status": "deleted"}

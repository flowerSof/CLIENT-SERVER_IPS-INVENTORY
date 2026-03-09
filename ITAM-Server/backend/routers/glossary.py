from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict

from database import get_db
from models import glossary
from schemas import glossary as schemas
from dependencies import get_current_user

router = APIRouter(prefix="/api/glossary", tags=["Glossary"], dependencies=[Depends(get_current_user)])

@router.get("/", response_model=List[schemas.GlossaryResponse])
def get_all_conventions(db: Session = Depends(get_db)):
    return db.query(glossary.NamingConvention).all()

@router.get("/category/{category}", response_model=List[schemas.GlossaryResponse])
def get_by_category(category: str, db: Session = Depends(get_db)):
    return db.query(glossary.NamingConvention).filter(glossary.NamingConvention.category == category.upper()).all()

@router.post("/", response_model=schemas.GlossaryResponse)
def create_convention(convention: schemas.GlossaryCreate, db: Session = Depends(get_db)):
    # Check duplicate
    existing = db.query(glossary.NamingConvention).filter(
        glossary.NamingConvention.category == convention.category.upper(),
        glossary.NamingConvention.code == convention.code.upper()
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Code already exists in this category")
    
    new_conv = glossary.NamingConvention(
        category=convention.category.upper(),
        code=convention.code.upper(),
        description=convention.description
    )
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)
    return new_conv

@router.put("/{id}", response_model=schemas.GlossaryResponse)
def update_convention(id: int, convention: schemas.GlossaryUpdate, db: Session = Depends(get_db)):
    db_conv = db.query(glossary.NamingConvention).filter(glossary.NamingConvention.id == id).first()
    if not db_conv:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if convention.category:
        db_conv.category = convention.category.upper()
    if convention.code:
        db_conv.code = convention.code.upper()
    if convention.description:
        db_conv.description = convention.description
        
    db.commit()
    db.refresh(db_conv)
    return db_conv

@router.delete("/{id}")
def delete_convention(id: int, db: Session = Depends(get_db)):
    db_conv = db.query(glossary.NamingConvention).filter(glossary.NamingConvention.id == id).first()
    if not db_conv:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_conv)
    db.commit()
    return {"message": "Deleted successfully"}

# --- Utility Endpoint for Frontend Verification ---

from utils.parser import parse_hostname_logic

@router.post("/parse-hostname")
def parse_hostname(hostname: str, db: Session = Depends(get_db)):
    return parse_hostname_logic(hostname, db)

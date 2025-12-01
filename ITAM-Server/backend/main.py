from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from .database import engine, get_db, Base
from .models import assets

Base.metadata.create_all(bind=engine)

app = FastAPI(title="ITAM Server API")

# --- ESQUEMA  ---
class AssetReport(BaseModel):
    serial_number: str
    hostname: str
    ip_address: str
    mac_address: str
    usuario: str
    marca: str
    sistema_operativo: str
    procesador: str
    memoria_ram: str

@app.get("/")
def read_root():
    return {"mensaje": "ITAM Server Activo"}

@app.post("/api/report")
def recibir_reporte(reporte: AssetReport, db: Session = Depends(get_db)):
    # Buscamos por Serial
    activo = db.query(assets.Activo).filter(assets.Activo.serial_number == reporte.serial_number).first()
    
    if activo:
        # ACTUALIZAR TODO
        activo.hostname = reporte.hostname
        activo.ip_address = reporte.ip_address
        activo.usuario_detectado = reporte.usuario
        # Actualizamos hardware también (por si le pusieron más RAM)
        activo.marca = reporte.marca
        activo.sistema_operativo = reporte.sistema_operativo
        activo.procesador = reporte.procesador
        activo.memoria_ram = reporte.memoria_ram
        
        activo.ultimo_reporte = datetime.now()
        msg = "Datos actualizados"
    else:
        # CREAR NUEVO CON TODOS LOS DATOS
        nuevo_activo = assets.Activo(
            serial_number=reporte.serial_number,
            hostname=reporte.hostname,
            ip_address=reporte.ip_address,
            mac_address=reporte.mac_address,
            usuario_detectado=reporte.usuario,
            # Nuevos datos
            marca=reporte.marca,
            sistema_operativo=reporte.sistema_operativo,
            procesador=reporte.procesador,
            memoria_ram=reporte.memoria_ram
        )
        db.add(nuevo_activo)
        msg = "Nuevo equipo registrado"
    
    db.commit()
    return {"status": "ok", "mensaje": msg}

@app.get("/api/assets")
def listar_activos(db: Session = Depends(get_db)):
    return db.query(assets.Activo).all()
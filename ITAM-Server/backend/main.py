import time
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import dashboard, floors, buildings, auth

from sqlalchemy.orm import Session
# GOOD (Fix)
from database import engine, get_db, Base
from config import settings
from models import assets, locations

from schemas import asset_schema

# --- CREACIÓN AUTOMÁTICA DE TABLAS ---
# Esperamos un poco a que la BD inicie (parche simple para Docker)
time.sleep(3) 
Base.metadata.create_all(bind=engine)

# --- INICIALIZAR DATOS POR DEFECTO ---
try:
    from init_db import init_default_data
    init_default_data()
except Exception as e:
    print(f"Note: Could not initialize default data: {e}")

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

# --- CORS (Seguridad Frontend) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción poner dominio real
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "online", "db": settings.POSTGRES_DB}

@app.post("/api/report", response_model=asset_schema.AssetResponse)
def recibir_reporte(reporte: asset_schema.AssetReportCreate, db: Session = Depends(get_db)):
    # 1. Validar Token de Seguridad
    if reporte.auth_token != settings.API_TOKEN:
        raise HTTPException(status_code=401, detail="Token de agente inválido")
    
    # 2. Buscar si existe
    activo = db.query(assets.Activo).filter(assets.Activo.serial_number == reporte.serial_number).first()
    
    # 3. Lógica de Dominio (Ejemplo simple)
    en_dominio = "ED" in reporte.hostname or "PC" in reporte.hostname

    if activo:
        # ACTUALIZAR
        activo.hostname = reporte.hostname
        activo.ip_address = reporte.ip_address
        activo.mac_address = reporte.mac_address
        activo.usuario_detectado = reporte.usuario
        activo.marca = reporte.marca
        activo.modelo = reporte.modelo
        activo.sistema_operativo = reporte.sistema_operativo
        activo.procesador = reporte.procesador
        activo.memoria_ram = reporte.memoria_ram
        activo.es_dominio = en_dominio
        # ultimo_reporte se actualiza solo por la config del modelo
    else:
        # CREAR
        nuevo_activo = assets.Activo(
            serial_number=reporte.serial_number,
            hostname=reporte.hostname,
            ip_address=reporte.ip_address,
            mac_address=reporte.mac_address,
            usuario_detectado=reporte.usuario,
            marca=reporte.marca,
            modelo=reporte.modelo,
            sistema_operativo=reporte.sistema_operativo,
            procesador=reporte.procesador,
            memoria_ram=reporte.memoria_ram,
            es_dominio=en_dominio
        )
        db.add(nuevo_activo)
        db.commit() # Commit para obtener el ID
        db.refresh(nuevo_activo)
        activo = nuevo_activo
    
    db.commit()
    
    return {"id": activo.id, "hostname": activo.hostname, "estado": "procesado"}

# Registrar routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(floors.router)
app.include_router(buildings.router)

import time
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import dashboard, floors, buildings, auth, areas, reports, history as history_router, glossary as glossary_router, catalogs, users, remote
from utils.history import log_asset_change
from utils.parser import parse_hostname_logic

# ... (omitted code) ...



from sqlalchemy.orm import Session
from database import engine, get_db, Base
from config import settings
# Importar TODOS los modelos antes de create_all para que SQLAlchemy los detecte
from models import assets, locations, users as users_model, history, glossary, permisos
from schemas import asset_schema

# --- CREACIÓN AUTOMÁTICA DE TABLAS ---
# Esperamos un poco a que la BD inicie (parche simple para Docker)
time.sleep(3) 

# --- REPARACIÓN AUTOMÁTICA DE DB (Added to fix missing columns) ---
try:
    from fix_db import fix_database
    fix_database()
except Exception as e:
    print(f"Warning: Could not run DB repair: {e}")

Base.metadata.create_all(bind=engine)

# --- INICIALIZAR DATOS POR DEFECTO ---
try:
    from init_db import init_default_data
    init_default_data()
except Exception as e:
    print(f"Note: Could not initialize default data: {e}")

app = FastAPI(title=settings.PROJECT_NAME, version=settings.PROJECT_VERSION)

# --- CORS (Seguridad Frontend) ---
# Permitir múltiples orígenes para desarrollo local
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"  # Fallback para desarrollo
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
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
    
    # 3. Lógica de Dominio y Area via Hostname Parser
    parsed_info = parse_hostname_logic(reporte.hostname, db)
    
    # "si no coincida la estructura entonces seria no dominimio"
    en_dominio = parsed_info["is_domain"]
    
    # Extraer area si esta disponible
    parsed_area = parsed_info.get("derived_area")
    
    # Opcional: Extraer piso si queremos actualizarlo automaticamente
    # piso_val = parsed_info["parts"].get("piso_val")

    if activo:
        # ACTUALIZAR Y REGISTRAR HISTORIAL
        # Comparar y loguear campos críticos
        log_asset_change(db, activo.id, "hostname", activo.hostname, reporte.hostname)
        log_asset_change(db, activo.id, "ip_address", activo.ip_address, reporte.ip_address)
        log_asset_change(db, activo.id, "usuario", activo.usuario_detectado, reporte.usuario)
        log_asset_change(db, activo.id, "os", activo.sistema_operativo, reporte.sistema_operativo)
        
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
        if parsed_area:
            if activo.area != parsed_area:
                log_asset_change(db, activo.id, "area", activo.area, parsed_area)
                activo.area = parsed_area

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
            es_dominio=en_dominio,
            area=parsed_area # Asginar area derivada
        )
        db.add(nuevo_activo)
        db.commit() # Commit para obtener el ID
        db.refresh(nuevo_activo)
        activo = nuevo_activo
        
        # Historial de creación (opcional)
        log_asset_change(db, activo.id, "creation", None, "Activo creado")
    
    db.commit()
    
    return {"id": activo.id, "hostname": activo.hostname, "estado": "procesado"}

# Registrar routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(floors.router)
app.include_router(buildings.router)
app.include_router(areas.router)
app.include_router(reports.router)
app.include_router(history_router.router)
app.include_router(catalogs.router)
app.include_router(glossary_router.router)
app.include_router(users.router)
app.include_router(remote.router)

# Trigger reload for schema update

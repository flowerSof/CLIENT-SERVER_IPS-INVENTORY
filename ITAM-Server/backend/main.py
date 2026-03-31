import time
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import dashboard, floors, buildings, auth, areas, reports, history as history_router, glossary as glossary_router, catalogs, users, remote, printers, audit as audit_router, print_stats as print_stats_router, notifications as notifications_router
from routers import commands_pull as commands_pull_router
from middleware import RateLimitMiddleware, AuditMiddleware
from utils.history import log_asset_change
from utils.parser import parse_hostname_logic
from models import locations

# ... (omitted code) ...



from sqlalchemy.orm import Session
from database import engine, get_db, Base
from config import settings
# Importar TODOS los modelos antes de create_all para que SQLAlchemy los detecte
from models import assets, locations, users as users_model, history, glossary, permisos, printers as printers_model, audit as audit_model, notifications as notifications_model
from models.print_stats import PrintStatsPC
from models.commands import ComandoPendiente  # Tabla de comandos pull
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
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"^https?://.*$", # Permite conexiones desde otras IPs en la LAN
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# --- SECURITY MIDDLEWARE ---
# Rate Limiting: Previene ataques de fuerza bruta
app.add_middleware(RateLimitMiddleware)

# Auditoría: Registra todas las acciones importantes
app.add_middleware(AuditMiddleware)


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
        
        # Detectar si la PC estuvo apagada (último reporte fue hace más de 10 min)
        if activo.ultimo_reporte:
            ahora = datetime.now(timezone.utc)
            ultimo = activo.ultimo_reporte
            if ultimo.tzinfo is None:
                ultimo = ultimo.replace(tzinfo=timezone.utc)
            minutos_offline = (ahora - ultimo).total_seconds() / 60
            if minutos_offline > 10:
                # Registrar apagado (momento aproximado) y encendido (ahora)
                log_asset_change(db, activo.id, "apagado", 
                    ultimo.strftime("%Y-%m-%d %H:%M"), 
                    f"Offline por {int(minutos_offline)} min")
                log_asset_change(db, activo.id, "encendido", 
                    None, 
                    ahora.strftime("%Y-%m-%d %H:%M"))
        
        activo.hostname = reporte.hostname
        activo.ip_address = reporte.ip_address
        activo.mac_address = reporte.mac_address
        # Solo actualizar usuario si el agente reporta un usuario real
        # (evita borrar el nombre cuando la pantalla está bloqueada o el usuario cierra sesión)
        if reporte.usuario and reporte.usuario not in ("No User", "Unknown", ""):
            activo.usuario_detectado = reporte.usuario
            activo.usuario_nombre_completo = reporte.usuario_nombre_completo
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

        # Auto-asignar piso desde hostname (dígitos 5-6) si es dominio y no tiene piso asignado
        if en_dominio and parsed_info.get("valid_format") and not activo.piso_id:
            piso_val = parsed_info["parts"].get("piso_val")
            if piso_val:
                try:
                    piso_nivel = int(piso_val)
                    piso_obj = db.query(locations.Piso).filter(
                        locations.Piso.nivel == piso_nivel
                    ).first()
                    if piso_obj:
                        activo.piso_id = piso_obj.id
                except ValueError:
                    pass

        # Forzar actualización de ultimo_reporte SIEMPRE (incluso si los datos no cambian)
        activo.ultimo_reporte = datetime.now(timezone.utc)
    else:
        # CREAR
        nuevo_activo = assets.Activo(
            serial_number=reporte.serial_number,
            hostname=reporte.hostname,
            ip_address=reporte.ip_address,
            mac_address=reporte.mac_address,
            usuario_detectado=reporte.usuario,
            usuario_nombre_completo=reporte.usuario_nombre_completo,
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

        # Auto-asignar piso desde hostname para nuevo activo en dominio
        if en_dominio and parsed_info.get("valid_format"):
            piso_val = parsed_info["parts"].get("piso_val")
            if piso_val:
                try:
                    piso_nivel = int(piso_val)
                    piso_obj = db.query(locations.Piso).filter(
                        locations.Piso.nivel == piso_nivel
                    ).first()
                    if piso_obj:
                        activo.piso_id = piso_obj.id
                except ValueError:
                    pass
        
        # Historial de creación (opcional)
        log_asset_change(db, activo.id, "creation", None, "Activo creado")
    
    db.commit()
    
    # Procesar datos de impresión si vienen en el reporte
    if reporte.print_data:
        today = datetime.now(timezone.utc).date()
        for pd in reporte.print_data:
            try:
                # Buscar registro existente para este PC + impresora + día
                stat = db.query(PrintStatsPC).filter(
                    PrintStatsPC.activo_id == activo.id,
                    PrintStatsPC.printer_name == pd.printer_name,
                    PrintStatsPC.fecha == today
                ).first()
                
                if stat:
                    # Calcular delta (impresiones nuevas desde última lectura)
                    if pd.total_jobs > stat.jobs_acumulados:
                        stat.total_jobs += (pd.total_jobs - stat.jobs_acumulados)
                    elif pd.total_jobs < stat.jobs_acumulados: # Manejo de reinicio de contador
                        stat.total_jobs += pd.total_jobs
                        
                    if pd.total_pages > stat.pages_acumuladas:
                        stat.total_pages += (pd.total_pages - stat.pages_acumuladas)
                    elif pd.total_pages < stat.pages_acumuladas:
                        stat.total_pages += pd.total_pages
                        
                    stat.jobs_acumulados = pd.total_jobs
                    stat.pages_acumuladas = pd.total_pages
                    stat.ultima_lectura = datetime.now(timezone.utc)
                else:
                    # Crear nuevo registro del día
                    stat = PrintStatsPC(
                        activo_id=activo.id,
                        serial_number=activo.serial_number,
                        hostname=activo.hostname,
                        printer_name=pd.printer_name,
                        printer_port=pd.port,
                        printer_driver=pd.driver,
                        is_network_printer=pd.is_network,
                        fecha=today,
                        total_jobs=0,  # Primer lectura del día, sin delta aún
                        total_pages=0,
                        jobs_acumulados=pd.total_jobs,
                        pages_acumuladas=pd.total_pages
                    )
                    db.add(stat)
                
                db.commit()
            except Exception as e:
                db.rollback()
                import logging
                logging.getLogger(__name__).warning(f"Error guardando stats de impresión: {e}")
    
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
app.include_router(printers.router)
app.include_router(audit_router.router)
app.include_router(print_stats_router.router)
app.include_router(notifications_router.router)
app.include_router(commands_pull_router.router)  # Comandos Pull (sin necesitar alcanzar al agente)

# Trigger reload for schema update

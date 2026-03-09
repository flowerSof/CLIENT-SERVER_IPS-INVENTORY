from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from database import get_db
from models import assets
import pandas as pd
from io import BytesIO
from utils.history import log_asset_change
from utils.parser import parse_hostname_logic
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/assets",
    tags=["Dashboard"],
    dependencies=[Depends(get_current_user)]
)

class PositionUpdate(BaseModel):
    pos_x: float
    pos_y: float
    piso_id: int
    icono_tipo: str = None  # Opcional: desktop, laptop, server

# --- ENDPOINT 1: ESTADÍSTICAS (KPIs) ---
@router.get("/stats")
def obtener_estadisticas(db: Session = Depends(get_db)):
    # Total de equipos
    total = db.query(assets.Activo).count()
    
    # Obtener todos los activos para calcular estados
    todos_activos = db.query(assets.Activo).all()
    
    # Calcular online/offline usando el método del modelo
    online = sum(1 for activo in todos_activos if activo.is_online())
    offline = total - online
    
    # Equipos en Dominio
    dominio = db.query(assets.Activo).filter(assets.Activo.es_dominio == True).count()
    
    # Alertas (Sin usuario asignado o "No User")
    alertas = db.query(assets.Activo).filter(
        (assets.Activo.usuario_detectado == "No User") | 
        (assets.Activo.usuario_detectado == None)
    ).count()
    
    # Estadísticas por piso
    pisos_stats = {}
    pisos = db.query(assets.Activo.piso_id).distinct().all()
    for (piso_id,) in pisos:
        if piso_id:
            activos_piso = db.query(assets.Activo).filter(assets.Activo.piso_id == piso_id).all()
            online_piso = sum(1 for a in activos_piso if a.is_online())
            pisos_stats[piso_id] = {
                "total": len(activos_piso),
                "online": online_piso,
                "offline": len(activos_piso) - online_piso
            }

    return {
        "total": total,
        "online": online,
        "offline": offline,
        "en_dominio": dominio,
        "alertas": alertas,
        "por_piso": pisos_stats
    }

# --- ENDPOINT 2: LISTA COMPLETA CON FILTROS ---
@router.get("/")
def listar_activos(
    piso_id: int = None,
    solo_online: bool = None,
    solo_dominio: bool = None,
    area: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(assets.Activo)
    
    # Aplicar filtros
    if piso_id is not None:
        query = query.filter(assets.Activo.piso_id == piso_id)
    
    if solo_dominio is not None:
        query = query.filter(assets.Activo.es_dominio == solo_dominio)
        
    if area is not None:
        query = query.filter(assets.Activo.area == area)
    
    activos = query.all()
    
    # Filtrar por estado online si se solicita
    if solo_online is not None:
        if solo_online:
            activos = [a for a in activos if a.is_online()]
        else:
            activos = [a for a in activos if not a.is_online()]
    
    # Agregar estado online a cada activo en la respuesta
    resultado = []
    for activo in activos:
        activo_dict = {
            "id": activo.id,
            "serial_number": activo.serial_number,
            "hostname": activo.hostname,
            "ip_address": activo.ip_address,
            "mac_address": activo.mac_address,
            "usuario_detectado": activo.usuario_detectado,
            "marca": activo.marca,
            "modelo": activo.modelo,
            "sistema_operativo": activo.sistema_operativo,
            "procesador": activo.procesador,
            "memoria_ram": activo.memoria_ram,
            "es_dominio": activo.es_dominio,
            "icono_tipo": activo.icono_tipo,
            "ultimo_reporte": activo.ultimo_reporte,
            "piso_id": activo.piso_id,
            "pos_x": activo.pos_x,
            "pos_y": activo.pos_y,
            "area": activo.area,
            "is_online": activo.is_online()
        }
        resultado.append(activo_dict)
    
    return resultado

# --- ENDPOINT 3: GUARDAR POSICIÓN EN MAPA ---
@router.put("/{serial}/position")
def guardar_posicion(serial: str, pos: PositionUpdate, db: Session = Depends(get_db)):
    activo = db.query(assets.Activo).filter(assets.Activo.serial_number == serial).first()
    
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    # Validar que el piso existe si se proporciona
    if pos.piso_id:
        from models import locations
        piso = db.query(locations.Piso).filter(locations.Piso.id == pos.piso_id).first()
        if not piso:
            raise HTTPException(status_code=404, detail="Piso no encontrado")
    
    # Loguear cambios de posición
    if activo.pos_x != pos.pos_x or activo.pos_y != pos.pos_y:
        log_asset_change(db, activo.id, "position", f"{activo.pos_x},{activo.pos_y}", f"{pos.pos_x},{pos.pos_y}")
    
    if activo.piso_id != pos.piso_id:
        log_asset_change(db, activo.id, "piso_id", activo.piso_id, pos.piso_id)

    activo.pos_x = pos.pos_x
    activo.pos_y = pos.pos_y
    activo.piso_id = pos.piso_id
    
    # Actualizar tipo de icono si se proporciona
    if pos.icono_tipo:
        if activo.icono_tipo != pos.icono_tipo:
            log_asset_change(db, activo.id, "icono_tipo", activo.icono_tipo, pos.icono_tipo)
        activo.icono_tipo = pos.icono_tipo
    
    db.commit()
    return {"status": "updated", "serial": serial}

# --- ENDPOINT 3.5: QUITAR UBICACIÓN DEL MAPA ---
@router.delete("/{serial}/position")
def quitar_ubicacion(serial: str, db: Session = Depends(get_db)):
    """Quita un activo del mapa (lo devuelve a 'sin ubicar')"""
    activo = db.query(assets.Activo).filter(assets.Activo.serial_number == serial).first()
    
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    # Loguear el cambio
    if activo.piso_id:
        log_asset_change(db, activo.id, "piso_id", str(activo.piso_id), "NULL")
    
    # Quitar posición
    activo.pos_x = None
    activo.pos_y = None
    activo.piso_id = None
    
    db.commit()
    return {"status": "unassigned", "serial": serial}

# --- ENDPOINT 4: CARGA MASIVA (EXCEL) ---
@router.post("/upload")
async def upload_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .xlsx")
    
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Validar columnas mínimas (ajustar según tu Excel real)
        # Asumimos que la fila 1 (index 0) tiene los headers
        
        updated_count = 0
        
        for index, row in df.iterrows():
            # Mapeo basado en la imagen/excel del usuario
            # Asumimos nombres de columnas basados en la imagen visualizada
            
            # Buscar columnas por nombres probables (normalizando a minúsculas para seguridad)
            row_keys = {k.lower().strip(): k for k in row.keys()}
            
            # Helper para obtener valor seguro
            def get_val(key_fragment):
                for k in row_keys:
                    if key_fragment in k:
                        return row[row_keys[k]]
                return None

            hostname = get_val("nombre equipo") or get_val("hostname")
            ip_address = get_val("ip local") or get_val("ip")
            usuario = get_val("usuario")
            area_excel = get_val("area") # Columna B
            dominio_estado_val = get_val("domini estado") # Columna H
            
            if not hostname:
                continue # Skip fila invalida
                
            hostname = str(hostname).strip()
            
            # Lógica de Dominio (Columna H: 1=True, 0=False)
            es_dominio = False
            if dominio_estado_val is not None:
                try:
                    es_dominio = int(dominio_estado_val) == 1
                except:
                    pass
            
            # Lógica de Área
            area_final = "Unknown"
            
            # 1. Prioridad: Excel
            if area_excel and str(area_excel).lower() != "nan":
                area_final = str(area_excel).strip()
            
            # 2. Fallback: Hostname Parsing con Glosario
            elif len(hostname) >= 13:
                 parsed_info = parse_hostname_logic(hostname, db)
                 if parsed_info["valid_format"]:
                     area_final = parsed_info.get("derived_area") or "Unknown"
                     
                     # Si el excel no tiena info de dominio, usamos la del parser
                     if dominio_estado_val is None:
                         es_dominio = parsed_info["is_domain"]
            
            # Buscar activo
            activo = db.query(assets.Activo).filter(assets.Activo.hostname == hostname).first()
            if not activo:
                # O buscar por serial si estuviera en excel...
                # Si no existe, lo creamos? 
                # Mejor actualizamos solo existentes o creamos "placeholders"
                # Para MVP: Crear placeholder si no existe
                activo = assets.Activo(
                    serial_number=f"GEN-{hostname}", # Serial generico
                    hostname=hostname,
                    ip_address=str(ip_address) if ip_address else "0.0.0.0",
                    usuario_detectado=str(usuario) if usuario else "Importado",
                    marca="Generico",
                    modelo="Importado Excel",
                    sistema_operativo="Unknown",
                    procesador="Unknown",
                    memoria_ram="Unknown",
                    es_dominio=es_dominio,
                    area=area_final
                )
                db.add(activo)
            else:
                # Actualizar existente
                # Loguear cambios importantes
                log_asset_change(db, activo.id, "area", activo.area, area_final)
                activo.area = area_final
                
                if dominio_estado_val is not None:
                     log_asset_change(db, activo.id, "es_dominio", str(activo.es_dominio), str(es_dominio))
                     activo.es_dominio = es_dominio
                     
                # Si el excel trae IP o usuario mas reciente, actualizamos?
                if usuario:
                    log_asset_change(db, activo.id, "usuario", activo.usuario_detectado, str(usuario))
                    activo.usuario_detectado = str(usuario)
            
            updated_count += 1
        
        db.commit()
        return {"status": "success", "processed_rows": len(df), "updated": updated_count}
        
    except Exception as e:
        print(f"Error processing excel: {e}")
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")
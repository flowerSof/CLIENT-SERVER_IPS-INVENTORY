"""
Router para gestión de impresoras y monitoreo de impresiones
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta, timezone
from database import get_db
from models.printers import Impresora, RegistroImpresion
from models.locations import Piso, Edificio
from utils.snmp_service import SNMPPrinterService
import asyncio
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/printers",
    tags=["Printers"]
)


# === SCHEMAS ===

class PrinterCreate(BaseModel):
    nombre: str
    ip_address: str
    marca: str = "Unknown"
    modelo: str = "Unknown"
    ubicacion: Optional[str] = None
    piso_id: Optional[int] = None
    snmp_community: str = "public"


class PrinterUpdate(BaseModel):
    nombre: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    ubicacion: Optional[str] = None
    piso_id: Optional[int] = None
    snmp_community: Optional[str] = None
    activa: Optional[bool] = None


class PrinterResponse(BaseModel):
    id: int
    nombre: str
    ip_address: str
    marca: str
    modelo: str
    ubicacion: Optional[str]
    piso_id: Optional[int]
    piso_nombre: Optional[str] = None
    edificio_nombre: Optional[str] = None
    activa: bool
    ultimo_sondeo: Optional[datetime]
    ultimo_contador: int
    is_online: bool
    impresiones_hoy: int = 0
    
    class Config:
        from_attributes = True


# === ENDPOINTS ===

@router.get("/", response_model=List[PrinterResponse])
def listar_impresoras(
    activa: Optional[bool] = None,
    piso_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Lista todas las impresoras con estadísticas"""
    query = db.query(Impresora)
    
    if activa is not None:
        query = query.filter(Impresora.activa == activa)
    if piso_id is not None:
        query = query.filter(Impresora.piso_id == piso_id)
    
    impresoras = query.all()
    resultado = []
    
    hoy = date.today()
    
    for imp in impresoras:
        # Calcular impresiones del día
        impresiones_hoy = calcular_impresiones_periodo(db, imp.id, hoy, hoy)
        
        # Obtener nombre del piso y edificio
        piso_nombre = None
        edificio_nombre = None
        if imp.piso_id:
            piso = db.query(Piso).filter(Piso.id == imp.piso_id).first()
            if piso:
                piso_nombre = piso.nombre
                edificio = db.query(Edificio).filter(Edificio.id == piso.edificio_id).first()
                if edificio:
                    edificio_nombre = edificio.nombre
        
        resultado.append(PrinterResponse(
            id=imp.id,
            nombre=imp.nombre,
            ip_address=imp.ip_address,
            marca=imp.marca,
            modelo=imp.modelo,
            ubicacion=imp.ubicacion,
            piso_id=imp.piso_id,
            piso_nombre=piso_nombre,
            edificio_nombre=edificio_nombre,
            activa=imp.activa,
            ultimo_sondeo=imp.ultimo_sondeo,
            ultimo_contador=imp.ultimo_contador or 0,
            is_online=imp.is_online(),
            impresiones_hoy=impresiones_hoy
        ))
    
    return resultado


@router.get("/stats")
def obtener_estadisticas(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Obtiene estadísticas generales de impresiones"""
    hoy = date.today()
    
    if not fecha_inicio:
        fecha_inicio = hoy - timedelta(days=30)
    if not fecha_fin:
        fecha_fin = hoy
    
    # Total de impresoras
    total_impresoras = db.query(Impresora).filter(Impresora.activa == True).count()
    
    # Impresoras online
    todas = db.query(Impresora).filter(Impresora.activa == True).all()
    online = sum(1 for imp in todas if imp.is_online())
    
    # Impresiones del período
    impresiones_periodo = calcular_impresiones_totales(db, fecha_inicio, fecha_fin)
    
    # Impresiones hoy
    impresiones_hoy = calcular_impresiones_totales(db, hoy, hoy)
    
    # Impresiones por día (últimos 7 días)
    impresiones_por_dia = []
    for i in range(7):
        dia = hoy - timedelta(days=i)
        total = calcular_impresiones_totales(db, dia, dia)
        impresiones_por_dia.append({
            "fecha": dia.isoformat(),
            "total": total
        })
    
    # Top 5 impresoras con más impresiones en el período
    top_impresoras = obtener_top_impresoras(db, fecha_inicio, fecha_fin, limit=5)
    
    return {
        "total_impresoras": total_impresoras,
        "impresoras_online": online,
        "impresoras_offline": total_impresoras - online,
        "impresiones_hoy": impresiones_hoy,
        "impresiones_periodo": impresiones_periodo,
        "periodo": {
            "inicio": fecha_inicio.isoformat(),
            "fin": fecha_fin.isoformat()
        },
        "impresiones_por_dia": impresiones_por_dia,
        "top_impresoras": top_impresoras
    }


@router.get("/{printer_id}")
def obtener_impresora(printer_id: int, db: Session = Depends(get_db)):
    """Obtiene detalles de una impresora específica"""
    impresora = db.query(Impresora).filter(Impresora.id == printer_id).first()
    
    if not impresora:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    
    # Info del piso
    piso_nombre = None
    edificio_nombre = None
    if impresora.piso_id:
        piso = db.query(Piso).filter(Piso.id == impresora.piso_id).first()
        if piso:
            piso_nombre = piso.nombre
            edificio = db.query(Edificio).filter(Edificio.id == piso.edificio_id).first()
            if edificio:
                edificio_nombre = edificio.nombre
    
    hoy = date.today()
    
    return {
        "id": impresora.id,
        "nombre": impresora.nombre,
        "ip_address": impresora.ip_address,
        "marca": impresora.marca,
        "modelo": impresora.modelo,
        "serial_number": impresora.serial_number,
        "ubicacion": impresora.ubicacion,
        "piso_id": impresora.piso_id,
        "piso_nombre": piso_nombre,
        "edificio_nombre": edificio_nombre,
        "activa": impresora.activa,
        "ultimo_sondeo": impresora.ultimo_sondeo,
        "ultimo_contador": impresora.ultimo_contador or 0,
        "is_online": impresora.is_online(),
        "snmp_community": impresora.snmp_community,
        "impresiones_hoy": calcular_impresiones_periodo(db, impresora.id, hoy, hoy),
        "impresiones_semana": calcular_impresiones_periodo(db, impresora.id, hoy - timedelta(days=7), hoy),
        "impresiones_mes": calcular_impresiones_periodo(db, impresora.id, hoy - timedelta(days=30), hoy),
    }


@router.get("/{printer_id}/history")
def obtener_historial(
    printer_id: int,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Obtiene historial de impresiones de una impresora"""
    impresora = db.query(Impresora).filter(Impresora.id == printer_id).first()
    
    if not impresora:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    
    hoy = date.today()
    if not fecha_inicio:
        fecha_inicio = hoy - timedelta(days=30)
    if not fecha_fin:
        fecha_fin = hoy
    
    # Agrupar registros por día
    registros_diarios = db.query(
        RegistroImpresion.fecha_solo,
        func.max(RegistroImpresion.total_paginas).label("max_paginas"),
        func.min(RegistroImpresion.total_paginas).label("min_paginas")
    ).filter(
        RegistroImpresion.impresora_id == printer_id,
        RegistroImpresion.fecha_solo >= fecha_inicio,
        RegistroImpresion.fecha_solo <= fecha_fin
    ).group_by(RegistroImpresion.fecha_solo).order_by(RegistroImpresion.fecha_solo).all()
    
    historial = []
    for i, registro in enumerate(registros_diarios):
        # Calcular impresiones del día (diferencia entre max y min del día)
        impresiones_dia = registro.max_paginas - registro.min_paginas
        
        # Si es el primer registro del día, comparar con el día anterior
        if impresiones_dia == 0 and i > 0:
            impresiones_dia = registro.max_paginas - registros_diarios[i-1].max_paginas
        
        historial.append({
            "fecha": registro.fecha_solo.isoformat(),
            "impresiones": max(0, impresiones_dia),
            "contador_total": registro.max_paginas
        })
    
    return {
        "impresora_id": printer_id,
        "impresora_nombre": impresora.nombre,
        "periodo": {
            "inicio": fecha_inicio.isoformat(),
            "fin": fecha_fin.isoformat()
        },
        "historial": historial,
        "total_periodo": sum(h["impresiones"] for h in historial)
    }


@router.post("/", response_model=PrinterResponse)
def crear_impresora(printer: PrinterCreate, db: Session = Depends(get_db)):
    """Registra una nueva impresora"""
    # Verificar si ya existe
    existente = db.query(Impresora).filter(Impresora.ip_address == printer.ip_address).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una impresora con esta IP")
    
    nueva = Impresora(
        nombre=printer.nombre,
        ip_address=printer.ip_address,
        marca=printer.marca,
        modelo=printer.modelo,
        ubicacion=printer.ubicacion,
        piso_id=printer.piso_id,
        snmp_community=printer.snmp_community
    )
    
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    
    return PrinterResponse(
        id=nueva.id,
        nombre=nueva.nombre,
        ip_address=nueva.ip_address,
        marca=nueva.marca,
        modelo=nueva.modelo,
        ubicacion=nueva.ubicacion,
        piso_id=nueva.piso_id,
        activa=nueva.activa,
        ultimo_sondeo=nueva.ultimo_sondeo,
        ultimo_contador=nueva.ultimo_contador or 0,
        is_online=False,
        impresiones_hoy=0
    )


@router.put("/{printer_id}")
def actualizar_impresora(
    printer_id: int,
    datos: PrinterUpdate,
    db: Session = Depends(get_db)
):
    """Actualiza una impresora existente"""
    impresora = db.query(Impresora).filter(Impresora.id == printer_id).first()
    
    if not impresora:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    
    for key, value in datos.dict(exclude_unset=True).items():
        setattr(impresora, key, value)
    
    db.commit()
    db.refresh(impresora)
    
    return {"status": "updated", "id": printer_id}


@router.delete("/{printer_id}")
def eliminar_impresora(printer_id: int, db: Session = Depends(get_db)):
    """Elimina una impresora"""
    impresora = db.query(Impresora).filter(Impresora.id == printer_id).first()
    
    if not impresora:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    
    db.delete(impresora)
    db.commit()
    
    return {"status": "deleted", "id": printer_id}


@router.post("/{printer_id}/scan")
async def escanear_impresora(printer_id: int, db: Session = Depends(get_db)):
    """Escanea una impresora específica via SNMP y actualiza sus datos"""
    impresora = db.query(Impresora).filter(Impresora.id == printer_id).first()
    
    if not impresora:
        raise HTTPException(status_code=404, detail="Impresora no encontrada")
    
    service = SNMPPrinterService()
    resultado = await service.get_printer_info(impresora.ip_address, impresora.snmp_community)
    
    if resultado and resultado.get("online"):
        # Actualizar impresora
        impresora.ultimo_sondeo = datetime.now(timezone.utc)
        
        if resultado.get("total_paginas", 0) > 0:
            nuevo_contador = resultado["total_paginas"]
            
            # Solo registrar si el contador cambió
            if nuevo_contador != impresora.ultimo_contador:
                impresora.ultimo_contador = nuevo_contador
                
                # Guardar registro
                registro = RegistroImpresion(
                    impresora_id=impresora.id,
                    fecha=datetime.now(timezone.utc),
                    fecha_solo=date.today(),
                    total_paginas=nuevo_contador,
                    estado=resultado.get("estado", "unknown")
                )
                db.add(registro)
        
        # Actualizar marca si se detectó
        if resultado.get("marca_detectada") != "Unknown":
            impresora.marca = resultado["marca_detectada"]
        
        db.commit()
        
        return {
            "status": "success",
            "online": True,
            "data": resultado
        }
    else:
        return {
            "status": "offline",
            "online": False,
            "message": "La impresora no responde a SNMP"
        }


@router.post("/scan-all")
async def escanear_todas(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Inicia escaneo de todas las impresoras activas (en background)"""
    impresoras = db.query(Impresora).filter(Impresora.activa == True).all()
    
    # Programar tarea en background
    background_tasks.add_task(escanear_impresoras_background, [i.id for i in impresoras])
    
    return {
        "status": "scanning",
        "message": f"Iniciando escaneo de {len(impresoras)} impresoras",
        "total": len(impresoras)
    }


# === FUNCIONES AUXILIARES ===

def calcular_impresiones_periodo(db: Session, impresora_id: int, fecha_inicio: date, fecha_fin: date) -> int:
    """Calcula impresiones en un período para una impresora"""
    registros = db.query(RegistroImpresion).filter(
        RegistroImpresion.impresora_id == impresora_id,
        RegistroImpresion.fecha_solo >= fecha_inicio,
        RegistroImpresion.fecha_solo <= fecha_fin
    ).order_by(RegistroImpresion.fecha).all()
    
    if len(registros) < 2:
        return 0
    
    # Diferencia entre último y primer registro del período
    return max(0, registros[-1].total_paginas - registros[0].total_paginas)


def calcular_impresiones_totales(db: Session, fecha_inicio: date, fecha_fin: date) -> int:
    """Calcula impresiones totales de todas las impresoras en un período"""
    impresoras = db.query(Impresora).filter(Impresora.activa == True).all()
    total = 0
    
    for imp in impresoras:
        total += calcular_impresiones_periodo(db, imp.id, fecha_inicio, fecha_fin)
    
    return total


def obtener_top_impresoras(db: Session, fecha_inicio: date, fecha_fin: date, limit: int = 5):
    """Obtiene las impresoras con más impresiones en un período"""
    impresoras = db.query(Impresora).filter(Impresora.activa == True).all()
    
    ranking = []
    for imp in impresoras:
        impresiones = calcular_impresiones_periodo(db, imp.id, fecha_inicio, fecha_fin)
        ranking.append({
            "id": imp.id,
            "nombre": imp.nombre,
            "ubicacion": imp.ubicacion,
            "impresiones": impresiones
        })
    
    # Ordenar por impresiones descendente
    ranking.sort(key=lambda x: x["impresiones"], reverse=True)
    
    return ranking[:limit]


async def escanear_impresoras_background(impresora_ids: List[int]):
    """Tarea de background para escanear impresoras"""
    from database import SessionLocal
    
    db = SessionLocal()
    service = SNMPPrinterService()
    
    try:
        impresoras = db.query(Impresora).filter(Impresora.id.in_(impresora_ids)).all()
        
        for impresora in impresoras:
            try:
                resultado = await service.get_printer_info(
                    impresora.ip_address,
                    impresora.snmp_community
                )
                
                if resultado and resultado.get("online"):
                    impresora.ultimo_sondeo = datetime.now(timezone.utc)
                    
                    if resultado.get("total_paginas", 0) > 0:
                        nuevo_contador = resultado["total_paginas"]
                        
                        if nuevo_contador != impresora.ultimo_contador:
                            impresora.ultimo_contador = nuevo_contador
                            
                            registro = RegistroImpresion(
                                impresora_id=impresora.id,
                                fecha=datetime.now(timezone.utc),
                                fecha_solo=date.today(),
                                total_paginas=nuevo_contador,
                                estado=resultado.get("estado", "unknown")
                            )
                            db.add(registro)
                    
                    if resultado.get("marca_detectada") != "Unknown":
                        impresora.marca = resultado["marca_detectada"]
                
            except Exception as e:
                logger.error(f"Error scanning printer {impresora.ip_address}: {e}")
                continue
        
        db.commit()
        logger.info(f"Escaneo completado para {len(impresoras)} impresoras")
        
    except Exception as e:
        logger.error(f"Error in background scan: {e}")
    finally:
        db.close()

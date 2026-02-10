"""
Endpoints para consultar estadísticas de impresión por computadora
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from database import get_db
from models.print_stats import PrintStatsPC
from models.assets import Activo
from typing import Optional
from datetime import date, timedelta, datetime

router = APIRouter(prefix="/api/print-stats", tags=["Print Stats"])


@router.get("/by-asset/{asset_id}")
def get_print_stats_by_asset(
    asset_id: int,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de impresión de una computadora específica
    Muestra cuántas impresiones hizo a cada impresora, por día
    """
    query = db.query(PrintStatsPC).filter(PrintStatsPC.activo_id == asset_id)
    
    if fecha_inicio:
        query = query.filter(PrintStatsPC.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(PrintStatsPC.fecha <= fecha_fin)
    
    stats = query.order_by(desc(PrintStatsPC.fecha)).all()
    
    # Agrupar por impresora
    printers_summary = {}
    daily_data = []
    
    for s in stats:
        daily_data.append({
            "fecha": s.fecha.isoformat(),
            "printer_name": s.printer_name,
            "printer_port": s.printer_port,
            "is_network": s.is_network_printer,
            "total_jobs": s.total_jobs,
            "total_pages": s.total_pages
        })
        
        if s.printer_name not in printers_summary:
            printers_summary[s.printer_name] = {
                "printer_name": s.printer_name,
                "printer_port": s.printer_port,
                "is_network": s.is_network_printer,
                "total_jobs": 0,
                "total_pages": 0,
                "dias_activos": 0
            }
        printers_summary[s.printer_name]["total_jobs"] += s.total_jobs
        printers_summary[s.printer_name]["total_pages"] += s.total_pages
        printers_summary[s.printer_name]["dias_activos"] += 1
    
    return {
        "asset_id": asset_id,
        "resumen_por_impresora": list(printers_summary.values()),
        "detalle_diario": daily_data
    }


@router.get("/by-printer")
def get_print_stats_by_printer(
    printer_name: str = Query(...),
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """
    Obtiene qué computadoras usaron una impresora específica
    """
    query = db.query(PrintStatsPC).filter(PrintStatsPC.printer_name == printer_name)
    
    if fecha_inicio:
        query = query.filter(PrintStatsPC.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(PrintStatsPC.fecha <= fecha_fin)
    
    stats = query.order_by(desc(PrintStatsPC.fecha)).all()
    
    # Agrupar por computadora
    pc_summary = {}
    for s in stats:
        key = s.hostname or s.serial_number
        if key not in pc_summary:
            pc_summary[key] = {
                "hostname": s.hostname,
                "serial_number": s.serial_number,
                "activo_id": s.activo_id,
                "total_jobs": 0,
                "total_pages": 0
            }
        pc_summary[key]["total_jobs"] += s.total_jobs
        pc_summary[key]["total_pages"] += s.total_pages
    
    return {
        "printer_name": printer_name,
        "computadoras": list(pc_summary.values())
    }


@router.get("/summary")
def get_print_summary(
    dias: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    """
    Resumen general de impresiones: top impresoras, top PCs, totales
    """
    desde = date.today() - timedelta(days=dias)
    
    # Total general
    totals = db.query(
        func.sum(PrintStatsPC.total_jobs).label("jobs"),
        func.sum(PrintStatsPC.total_pages).label("pages")
    ).filter(PrintStatsPC.fecha >= desde).first()
    
    # Top computadoras que más imprimen
    top_pcs = db.query(
        PrintStatsPC.hostname,
        PrintStatsPC.activo_id,
        func.sum(PrintStatsPC.total_jobs).label("jobs"),
        func.sum(PrintStatsPC.total_pages).label("pages")
    ).filter(
        PrintStatsPC.fecha >= desde
    ).group_by(
        PrintStatsPC.hostname, PrintStatsPC.activo_id
    ).order_by(desc("pages")).limit(10).all()
    
    # Top impresoras más usadas
    top_printers = db.query(
        PrintStatsPC.printer_name,
        PrintStatsPC.printer_port,
        func.sum(PrintStatsPC.total_jobs).label("jobs"),
        func.sum(PrintStatsPC.total_pages).label("pages"),
        func.count(func.distinct(PrintStatsPC.activo_id)).label("pcs")
    ).filter(
        PrintStatsPC.fecha >= desde
    ).group_by(
        PrintStatsPC.printer_name, PrintStatsPC.printer_port
    ).order_by(desc("pages")).limit(10).all()
    
    # Impresiones por día
    daily = db.query(
        PrintStatsPC.fecha,
        func.sum(PrintStatsPC.total_jobs).label("jobs"),
        func.sum(PrintStatsPC.total_pages).label("pages")
    ).filter(
        PrintStatsPC.fecha >= desde
    ).group_by(PrintStatsPC.fecha).order_by(PrintStatsPC.fecha).all()
    
    return {
        "periodo_dias": dias,
        "total_jobs": totals.jobs or 0,
        "total_pages": totals.pages or 0,
        "top_computadoras": [
            {"hostname": h, "activo_id": aid, "jobs": j, "pages": p}
            for h, aid, j, p in top_pcs
        ],
        "top_impresoras": [
            {"printer_name": pn, "port": pp, "jobs": j, "pages": p, "pcs_distintas": pc}
            for pn, pp, j, p, pc in top_printers
        ],
        "por_dia": [
            {"fecha": f.isoformat(), "jobs": j, "pages": p}
            for f, j, p in daily
        ]
    }

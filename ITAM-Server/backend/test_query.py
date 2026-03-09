import sys
import os
from sqlalchemy import func, and_, desc

# Asumir que estamos en backend
sys.path.append(os.getcwd())
try:
    from database import SessionLocal
    from models.assets import Activo
    from models.print_stats import PrintStatsPC

    db = SessionLocal()
    join_conditions = [Activo.id == PrintStatsPC.activo_id]
    
    query = db.query(
        Activo.id.label('activo_id'),
        Activo.hostname,
        func.coalesce(func.sum(PrintStatsPC.total_pages), 0).label('total_pages')
    ).outerjoin(
        PrintStatsPC, and_(*join_conditions)
    ).group_by(
        Activo.id, Activo.hostname
    ).order_by(desc('total_pages')).all()

    print(f'Total activos en la base de datos: {db.query(Activo).count()}')
    print(f'Total retornados por query: {len(query)}')
    for r in query[:5]:
        print(r)
except Exception as e:
    print(f"Error: {e}")

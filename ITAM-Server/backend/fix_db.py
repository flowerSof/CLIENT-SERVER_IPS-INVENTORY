import sys
import os
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import assets, users, history, locations, glossary
from init_db import load_initial_catalogs, load_initial_buildings

def fix_database():
    db = SessionLocal()
    print(">> Iniciando reparacion de base de datos...")

    # 1. Agregar columna AREA a la tabla ACTIVOS si no existe
    try:
        print("Checking 'area' column in 'activos'...")
        db.execute(text("ALTER TABLE activos ADD COLUMN IF NOT EXISTS area VARCHAR"))
        db.commit()
        print("✓ Columna 'area' verificada/agregada.")
    except Exception as e:
        print(f"Error checking column: {e}")
        db.rollback()

    # 2. Agregar columna ICONO_TIPO a la tabla ACTIVOS si no existe
    try:
        print("Checking 'icono_tipo' column in 'activos'...")
        db.execute(text("ALTER TABLE activos ADD COLUMN IF NOT EXISTS icono_tipo VARCHAR DEFAULT 'desktop'"))
        db.commit()
        print("✓ Columna 'icono_tipo' verificada/agregada.")
    except Exception as e:
        print(f"Error checking icono_tipo column: {e}")
        db.rollback()

    # 2.5 Agregar columnas de imagen a la tabla PISOS si no existen
    print("Checking 'pisos' table columns...")
    pisos_columns = [
        ("mapa_imagen", "TEXT"),
        ("mapa_filename", "VARCHAR"),
        ("mapa_content_type", "VARCHAR"),
        ("ancho_imagen", "INTEGER"),
        ("alto_imagen", "INTEGER")
    ]
    for col_name, col_type in pisos_columns:
        try:
            db.execute(text(f"ALTER TABLE pisos ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
            db.commit()
        except Exception as e:
            print(f"  Note ({col_name}): {e}")
            db.rollback()
    print("✓ Columnas de pisos verificadas/agregadas.")


    # 2. Re-crear tablas faltantes (especialmente historial_activos y naming_conventions)
    print("Checking tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ create_all ejecutado.")
    except Exception as e:
        print(f"Error en create_all: {e}")

    # 3. Cargar Catálogos
    try:
        load_initial_catalogs(db)
        print("✓ Catálogos cargados.")
    except Exception as e:
        print(f"Error cargando catálogos: {e}")

    # 4. Cargar Edificios Custom
    try:
        load_initial_buildings(db)
        print("✓ Edificios cargados.")
    except Exception as e:
        print(f"Error cargando edificios: {e}")
    
    # 5. Agregar columna es_superadmin a la tabla admins
    try:
        print("Checking 'es_superadmin' column in 'admins'...")
        db.execute(text("ALTER TABLE admins ADD COLUMN IF NOT EXISTS es_superadmin BOOLEAN DEFAULT FALSE"))
        db.commit()
        print("✓ Columna 'es_superadmin' verificada/agregada.")
    except Exception as e:
        print(f"Error checking es_superadmin column: {e}")
        db.rollback()

    # 6. Marcar usuario '.localadminpj' como superadmin si no lo está
    try:
        print("Setting '.localadminpj' user as superadmin...")
        result = db.execute(text("UPDATE admins SET es_superadmin = TRUE WHERE username = '.localadminpj' AND (es_superadmin IS NULL OR es_superadmin = FALSE)"))
        db.commit()
        if result.rowcount > 0:
            print("✓ Usuario '.localadminpj' configurado como superadmin.")
        else:
            print("✓ Usuario '.localadminpj' ya es superadmin.")
    except Exception as e:
        print(f"Error setting superadmin: {e}")
        db.rollback()

    # 7. Crear tabla permisos_usuario si no existe
    try:
        print("Checking 'permisos_usuario' table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS permisos_usuario (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                edificio_id INTEGER NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
                piso_id INTEGER REFERENCES pisos(id) ON DELETE CASCADE
            )
        """))
        db.commit()
        print("✓ Tabla 'permisos_usuario' verificada/creada.")
    except Exception as e:
        print(f"Error creating permisos_usuario table: {e}")
        db.rollback()

    # 8. Crear índice para permisos si no existe
    try:
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_permisos_usuario_id ON permisos_usuario(usuario_id)"))
        db.commit()
        print("✓ Índice de permisos verificado/creado.")
    except Exception as e:
        print(f"Error creating index: {e}")
        db.rollback()

    db.close()
    print("\n✅ Reparación completada. Reinicia el backend.")

if __name__ == "__main__":
    fix_database()

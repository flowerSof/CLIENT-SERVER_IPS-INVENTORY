"""
Script de migración para agregar sistema de gestión de usuarios con permisos.
Ejecutar una vez para actualizar la base de datos existente.
"""
import sys
import os

# Agregar directorio padre al path para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from sqlalchemy import text

def run_migration():
    """Ejecuta la migración de base de datos"""
    print("🚀 Iniciando migración de usuarios y permisos...")
    
    with engine.connect() as conn:
        # 1. Agregar columna es_superadmin a la tabla admins
        print("  📌 Agregando columna es_superadmin a tabla admins...")
        try:
            conn.execute(text("""
                ALTER TABLE admins 
                ADD COLUMN IF NOT EXISTS es_superadmin BOOLEAN DEFAULT FALSE;
            """))
            conn.commit()
            print("     ✅ Columna es_superadmin agregada")
        except Exception as e:
            print(f"     ℹ️ Nota: {e}")
        
        # 2. Marcar el admin actual como superadmin
        print("  📌 Configurando usuario 'admin' como superadmin...")
        try:
            result = conn.execute(text("""
                UPDATE admins SET es_superadmin = TRUE WHERE username = 'admin';
            """))
            conn.commit()
            print(f"     ✅ {result.rowcount} usuario(s) actualizado(s)")
        except Exception as e:
            print(f"     ⚠️ Error: {e}")
        
        # 3. Crear tabla de permisos de usuario
        print("  📌 Creando tabla permisos_usuario...")
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS permisos_usuario (
                    id SERIAL PRIMARY KEY,
                    usuario_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                    edificio_id INTEGER NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
                    piso_id INTEGER REFERENCES pisos(id) ON DELETE CASCADE
                );
            """))
            conn.commit()
            print("     ✅ Tabla permisos_usuario creada")
        except Exception as e:
            print(f"     ℹ️ Nota: {e}")
        
        # 4. Crear índice para mejorar performance
        print("  📌 Creando índices...")
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_permisos_usuario_id ON permisos_usuario(usuario_id);
            """))
            conn.commit()
            print("     ✅ Índices creados")
        except Exception as e:
            print(f"     ℹ️ Nota: {e}")
    
    print("\n✨ Migración completada exitosamente!")
    print("   El usuario 'admin' ahora es superadministrador.")
    print("   Puede crear y gestionar otros usuarios desde la plataforma.\n")

if __name__ == "__main__":
    run_migration()

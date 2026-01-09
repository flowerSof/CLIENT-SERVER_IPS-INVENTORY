"""
Database initialization script
Adds default buildings, floors, and admin user
"""
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import locations, users
from auth_utils import get_password_hash
import base64

def init_default_data():
    """Initialize database with default buildings, floors, and admin user"""
    db = SessionLocal()
    
    try:
        # ===== CREAR USUARIO ADMIN =====
        print("\n🔐 Creando usuario administrador...")
        existing_admin = db.query(users.UsuarioAdmin).filter(
            users.UsuarioAdmin.username == ".localadminpj"
        ).first()
        
        if not existing_admin:
            admin_password = "Admin@PJ2026!"  # Shorter password for bcrypt compatibility
            hashed_password = get_password_hash(admin_password)
            
            admin_user = users.UsuarioAdmin(
                username=".localadminpj",
                email="admin@pj.gob.pe",
                hashed_password=hashed_password,
                nombre_completo="Administrador TI - Poder Judicial",
                es_activo=True,
                es_admin=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            
            print(f"✓ Usuario admin creado: {admin_user.username}")
            print(f"  Email: {admin_user.email}")
            print(f"  Contraseña: [ENCRIPTADA]")
        else:
            print(f"✓ Usuario admin ya existe: {existing_admin.username}")
        
        # ===== CREAR EDIFICIOS =====
        print("\n🏢 Verificando edificios...")
        existing_buildings = db.query(locations.Edificio).count()
        if existing_buildings > 0:
            print(f"Database already has {existing_buildings} buildings. Skipping initialization.")
            return
        
        # Create default buildings
        print("Creating default buildings...")
        
        edificio1 = locations.Edificio(
            nombre="Principal",
            ciudad="Lima"
        )
        db.add(edificio1)
        
        edificio2 = locations.Edificio(
            nombre="Anexo",
            ciudad="Lima"
        )
        db.add(edificio2)
        
        db.commit()
        db.refresh(edificio1)
        db.refresh(edificio2)
        
        print(f"✓ Created building: {edificio1.nombre} (ID: {edificio1.id})")
        print(f"✓ Created building: {edificio2.nombre} (ID: {edificio2.id})")
        
        # Create default floors for Principal building
        print("\nCreating default floors...")
        
        piso1 = locations.Piso(
            nombre="Administración",
            nivel=1,
            edificio_id=edificio1.id
        )
        db.add(piso1)
        
        piso2 = locations.Piso(
            nombre="Sistemas",
            nivel=2,
            edificio_id=edificio1.id
        )
        db.add(piso2)
        
        # Create default floors for Anexo building
        piso3 = locations.Piso(
            nombre="Operaciones",
            nivel=1,
            edificio_id=edificio2.id
        )
        db.add(piso3)
        
        db.commit()
        
        print(f"✓ Created floor: {piso1.nombre} - Level {piso1.nivel} (Building: {edificio1.nombre})")
        print(f"✓ Created floor: {piso2.nombre} - Level {piso2.nivel} (Building: {edificio1.nombre})")
        print(f"✓ Created floor: {piso3.nombre} - Level {piso3.nivel} (Building: {edificio2.nombre})")
        
        print("\n✅ Database initialization completed successfully!")
        print("\n📋 Credenciales de acceso:")
        print("   Usuario: .localadminpj")
        print("   Contraseña: Admin@PJ2026!")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing database with default data...")
    print("=" * 50)
    init_default_data()

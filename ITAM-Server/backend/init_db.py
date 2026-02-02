"""
Database initialization script
Adds default buildings, floors, and admin user
"""
import sys
import os

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import locations, users, assets, history, glossary
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
        
        # Load Catalogs and custom buildings
        load_initial_catalogs(db)
        load_initial_buildings(db)
        
        print("\n✅ Database initialization completed successfully!")
        print("\n📋 Credenciales de acceso:")
        print("   Usuario: .localadminpj")
        print("   Contraseña: Admin@PJ2026!")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

def load_initial_catalogs(db):
    """Cargar datos base de catálogos (Distritos, Sedes, etc)"""
    from models.glossary import NamingConvention
    
    catalogs = [
        # DISTRITOS
        {"category": "DISTRITO", "code": "25", "description": "Corte Superior de Justicia del Santa (Chimbote)"},
        {"category": "DISTRITO", "code": "04", "description": "Corte Superior de Justicia de Arequipa"},
        
        # SEDES
        {"category": "SEDE", "code": "01", "description": "Sede Central"},
        {"category": "SEDE", "code": "15", "description": "Derrama Judicial"},
        {"category": "SEDE", "code": "08", "description": "Sede 08 (Anexo)"},
        {"category": "SEDE", "code": "04", "description": "Sede 04 (Anexo)"},
        {"category": "SEDE", "code": "02", "description": "Sede 02 (Anexo)"},

        # TIPOS
        {"category": "TIPO", "code": "C", "description": "Computadora"},
        {"category": "TIPO", "code": "L", "description": "Laptop"},
        {"category": "TIPO", "code": "I", "description": "Impresora"},
        {"category": "TIPO", "code": "S", "description": "Servidor"},
        {"category": "TIPO", "code": "V", "description": "Máquina Virtual"},
        {"category": "TIPO", "code": "T", "description": "Tablet"},

        # OOJJ / SALAS (Basado en imagen)
        {"category": "OOJJ", "code": "ODEC", "description": "ODECMA / ODANC"},
        {"category": "OOJJ", "code": "USJU", "description": "Usuario Judicial (Mesa de Partes/Atención al Cliente)"},
        {"category": "OOJJ", "code": "IMAG", "description": "Imagen / ODAJUP"},
        {"category": "OOJJ", "code": "INFO", "description": "Informática"},
        {"category": "OOJJ", "code": "LOGI", "description": "Logística"},
        {"category": "OOJJ", "code": "CONT", "description": "Contabilidad"},
        {"category": "OOJJ", "code": "ADMI", "description": "Administración / UAF"},
        {"category": "OOJJ", "code": "GERE", "description": "Gerencia / Trámite Documentario"},
        {"category": "OOJJ", "code": "RCVI", "description": "Seguridad / Registro Civil?"},
        {"category": "OOJJ", "code": "TESO", "description": "Tesorería"},
        {"category": "OOJJ", "code": "ASES", "description": "Asesoría Legal"},
        {"category": "OOJJ", "code": "PRES", "description": "Presidencia / Secretaria General"},
        {"category": "OOJJ", "code": "BIEN", "description": "Bienestar Social"},

        # ÁREAS (Basado en imagen y lógica)
        {"category": "AREA", "code": "MA", "description": "Mesa de Partes / Atención al Cliente"},
        {"category": "AREA", "code": "IN", "description": "Informática"},
        {"category": "AREA", "code": "CO", "description": "Coordinación / Contabilidad"},
        {"category": "AREA", "code": "ST", "description": "Soporte Técnico"},
        {"category": "AREA", "code": "MP", "description": "Mesa de Partes"},
        {"category": "AREA", "code": "DE", "description": "Derrama?"},
        {"category": "AREA", "code": "AS", "description": "Asistente / Asesoría"},
    ]

    print("\n📚 Cargando catálogos iniciales...")
    for item in catalogs:
        existing = db.query(NamingConvention).filter(
            NamingConvention.category == item["category"],
            NamingConvention.code == item["code"]
        ).first()
        
        if not existing:
            new_item = NamingConvention(
                category=item["category"],
                code=item["code"],
                description=item["description"]
            )
            db.add(new_item)
            print(f"   + Agregado: [{item['category']}] {item['code']} - {item['description']}")
    
    db.commit()

def load_initial_buildings(db):
    """Cargar edificios de Chimbote"""
    from models import locations
    
    buildings_data = [
        {"nombre": "Sede Central (Chimbote)", "ciudad": "Chimbote"},
        {"nombre": "Derrama Judicial", "ciudad": "Chimbote"}
    ]

    print("\n🏢 Cargando edificios iniciales...")
    for b_data in buildings_data:
        existing = db.query(locations.Edificio).filter(
            locations.Edificio.nombre == b_data["nombre"]
        ).first()
        
        if not existing:
            new_b = locations.Edificio(
                nombre=b_data["nombre"],
                ciudad=b_data["ciudad"]
            )
            db.add(new_b)
            print(f"   + Edificio creado: {b_data['nombre']}")
    
    db.commit()


if __name__ == "__main__":
    print("Initializing database with default data...")
    print("=" * 50)
    init_default_data()

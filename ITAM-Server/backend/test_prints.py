import sys
import os
from datetime import date

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.assets import Activo
from models.print_stats import PrintStatsPC

def insert_test_print_stats():
    db = SessionLocal()
    try:
        # Find the first active computer
        activo = db.query(Activo).first()
        if not activo:
            # Create a dummy one
            activo = Activo(
                hostname="DESKTOP-SOFIA-01",
                serial_number="TEST-SER-001",
                ip_address="192.168.1.50",
                area="Informática"
            )
            db.add(activo)
            db.commit()
            db.refresh(activo)
            
        print(f"Adding print stats for {activo.hostname} (ID: {activo.id})")
        
        # Check if already exists for today
        today = date.today()
        
        # Add a couple of printers for this PC
        stat1 = PrintStatsPC(
            activo_id=activo.id,
            serial_number=activo.serial_number,
            hostname=activo.hostname,
            printer_name="HP LaserJet Pro MFP M428",
            printer_port="IP_192.168.1.100",
            is_network_printer=True,
            fecha=today,
            total_jobs=15,
            total_pages=45
        )
        
        stat2 = PrintStatsPC(
            activo_id=activo.id,
            serial_number=activo.serial_number,
            hostname=activo.hostname,
            printer_name="Epson EcoTank L3250",
            printer_port="USB001",
            is_network_printer=False,
            fecha=today,
            total_jobs=8,
            total_pages=12
        )
        
        stat3 = PrintStatsPC(
            activo_id=activo.id,
            serial_number=activo.serial_number,
            hostname=activo.hostname,
            printer_name="Microsoft Print to PDF",
            printer_port="PORTPROMPT:",
            is_network_printer=False,
            fecha=today,
            total_jobs=3,
            total_pages=5
        )
        
        # Delete existing for today to avoid unique constraint errors
        db.query(PrintStatsPC).filter(PrintStatsPC.activo_id == activo.id, PrintStatsPC.fecha == today).delete()
        
        db.add_all([stat1, stat2, stat3])
        db.commit()
        print("Successfully added mock print data!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    insert_test_print_stats()

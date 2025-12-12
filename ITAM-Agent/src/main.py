import time
import sys
from collector import get_system_data
from network import send_report
from config import settings

def main():
    print("========================================")
    print("      AGENTE DE INVENTARIO ITAM        ")
    print("========================================")
    print(f"Target Server: {settings.API_URL}")
    print(f"Intervalo: {settings.REPORT_INTERVAL} segundos")
    print("========================================\n")

    while True:
        print(f"[{time.strftime('%H:%M:%S')}] Iniciando ciclo de reporte...")
        
        # 1. Recolectar
        data = get_system_data()
        
        if data:
            print(f"    Host: {data['hostname']}")
            print(f"    User: {data['usuario']}")
            
            # 2. Enviar
            success = send_report(data)
        else:
            print("   No se pudieron recolectar datos del sistema.")

        # 3. Esperar
        print(f"   Durmiendo {settings.REPORT_INTERVAL} segundos...\n")
        time.sleep(settings.REPORT_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n Agente detenido por el usuario.")
        sys.exit(0)
import time
import requests
import json
from collector import get_system_info

# --- CONFIGURACIÓN ---
# Apuntamos a tu servidor local (Backend)
SERVER_URL = "http://127.0.0.1:8000/api/report"
INTERVALO_SEGUNDOS = 10 # En producción pondremos 300 (5 min), ahora 10 para probar rápido

def run_agent():
    print(f"Agente ITAM Iniciado. Servidor: {SERVER_URL}")
    print("------------------------------------------------")

    while True:
        print("Recolectando datos del sistema...")
        datos = get_system_info()
        
        if datos:
            try:
                print(f"Enviando datos de: {datos['hostname']} ({datos['ip_address']})...")
                
                # ENVIAR AL SERVIDOR (POST)
                response = requests.post(SERVER_URL, json=datos)
                
                if response.status_code == 200:
                    print("Servidor respondió: OK - Datos guardados.")
                else:
                    print(f"Error del servidor: {response.status_code} - {response.text}")
                    
            except requests.exceptions.ConnectionError:
                print("No se pudo conectar al servidor. ¿Está prendido?")
        
        print(f"Durmiendo {INTERVALO_SEGUNDOS} segundos...")
        time.sleep(INTERVALO_SEGUNDOS)

if __name__ == "__main__":
    run_agent()
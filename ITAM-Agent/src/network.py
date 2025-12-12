import requests
import json
from config import settings

def send_report(data):
    """
    Envía el diccionario de datos al servidor Backend.
    """
    if not data:
        return False

    # Agregamos el Token de Seguridad al paquete
    payload = data.copy()
    payload["auth_token"] = settings.API_TOKEN
    
    endpoint = f"{settings.API_URL}/api/report"
    
    try:
        print(f" Conectando a {endpoint}...")
        response = requests.post(endpoint, json=payload, timeout=5)
        
        if response.status_code == 200:
            print("Reporte enviado con éxito.")
            print(f"   Respuesta Servidor: {response.json()}")
            return True
        elif response.status_code == 401:
            print("Error de Autenticación: El Token es incorrecto.")
        else:
            print(f"El servidor respondió con error: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print(f"No se pudo conectar al servidor en {settings.API_URL}")
        print("   ¿Está el servidor Docker corriendo?")
    except Exception as e:
        print(f"Error inesperado de red: {e}")
        
    return False
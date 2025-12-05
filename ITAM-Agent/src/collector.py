import wmi
import socket
import platform
import uuid

def get_system_info():
    """
    Recolecta toda la información de hardware y SO usando WMI.
    Retorna un diccionario listo para enviar a la API.
    """
    try:
        c = wmi.WMI()
        
        # 1. Información del Sistema (Marca, Modelo, RAM)
        system = c.Win32_ComputerSystem()[0]
        
        # 2. Información del SO (Nombre exacto)
        os_info = c.Win32_OperatingSystem()[0]
        
        # 3. Información del Procesador
        cpu = c.Win32_Processor()[0]
        
        # 4. Información de BIOS (Para el Serial Number)
        bios = c.Win32_BIOS()[0]
        
        # 5. Información de Red (IP y MAC)
        # Obtenemos el Hostname real
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        
        # MAC Address (Formateada)
        mac_address = hex(uuid.getnode()).replace('0x', '').upper()
        mac_address = ':'.join(mac_address[i : i + 2] for i in range(0, 11, 2))

        # --- CÁLCULOS Y LIMPIEZA ---
        
        # Convertir RAM de Bytes a GB (y redondear)
        ram_bytes = int(system.TotalPhysicalMemory)
        ram_gb = round(ram_bytes / (1024**3), 1) # Ej: 15.8 GB -> 16.0 GB
        
        # Usuario Logueado (Formato DOMINIO\Usuario)
        usuario = system.UserName if system.UserName else "No activo"

        # --- ARMANDO EL PAQUETE ---
        data = {
            "serial_number": bios.SerialNumber.strip(),
            "hostname": hostname,
            "ip_address": ip_address,
            "mac_address": mac_address,
            "usuario": usuario,
            
            # Nuevos datos de Hardware
            "marca": f"{system.Manufacturer} {system.Model}".strip(),
            "sistema_operativo": os_info.Caption.strip(), # Ej: Microsoft Windows 11 Pro
            "procesador": cpu.Name.strip(),               # Ej: Intel(R) Core(TM) i7...
            "memoria_ram": f"{ram_gb} GB"
        }
        
        return data

    except Exception as e:
        print(f"Error recolectando datos WMI: {e}\033[0m")
        return None

# Bloque para probar este archivo solo
if __name__ == "__main__":
    print("Probando recolección de datos...")
    info = get_system_info()
    import json
    print(json.dumps(info, indent=4))
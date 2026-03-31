import wmi
import socket
import platform
import uuid
import pythoncom
from typing import Dict, Optional
from logger import logger

class SystemCollector:
    """
    Modelo para recolección de datos del sistema (MVC - Model)
    Utiliza WMI para obtener información de hardware y software
    """
    
    def __init__(self):
        self._cached_data = None
        self._cache_timestamp = None
    
    def collect(self) -> Optional[Dict]:
        """
        Recopila toda la información del sistema
        
        Returns:
            Dict con los datos del sistema o None si hay error
        """
        try:
            # Inicializar WMI (necesario para threads/servicios)
            pythoncom.CoInitialize()
            
            logger.info("Iniciando recolección de datos del sistema...")
            
            # Conectar a WMI
            c = wmi.WMI()
            
            # Recolectar datos de diferentes fuentes
            data = {
                **self._get_system_info(c),
                **self._get_os_info(c),
                **self._get_cpu_info(c),
                **self._get_bios_info(c),
                **self._get_network_info()
            }
            
            # Recolectar datos de impresión (no bloquea si falla)
            try:
                data["print_data"] = self._get_print_info(c)
            except Exception as e:
                logger.warning(f"No se pudieron obtener datos de impresión: {e}")
                data["print_data"] = []
            
            # Validar datos
            if self._validate_data(data):
                logger.info(f"✓ Datos recolectados: {data['hostname']} ({data['serial_number']})")
                self._cached_data = data
                return data
            else:
                logger.error("Los datos recolectados no son válidos")
                return None
                
        except Exception as e:
            logger.error(f"Error recolectando datos WMI: {e}", exc_info=True)
            return None
            
        finally:
            pythoncom.CoUninitialize()
    
    def _get_system_info(self, c) -> Dict:
        """Obtiene información del sistema (Marca, Modelo, RAM, Usuario)"""
        try:
            sys_info = c.Win32_ComputerSystem()[0]
            
            # RAM en GB
            ram_bytes = int(sys_info.TotalPhysicalMemory)
            ram_gb = f"{round(ram_bytes / (1024**3), 1)} GB"
            
            # Usuario (limpiar dominio si existe)
            full_user = sys_info.UserName if sys_info.UserName else None
            
            # Fallback: si UserName es None (pantalla bloqueada), buscar dueño de explorer.exe
            if not full_user:
                try:
                    for proc in c.Win32_Process(Name="explorer.exe"):
                        owner = proc.GetOwner()
                        if owner[0] == 0:  # ReturnValue == 0 means success
                            domain = owner[1] or ""
                            user = owner[2] or ""
                            if user:
                                full_user = f"{domain}\\{user}" if domain else user
                                break
                except Exception as e:
                    logger.debug(f"Fallback explorer.exe owner falló: {e}")
            
            if not full_user:
                full_user = "No User"
            
            # Obtener nombre completo del usuario desde Win32_UserAccount
            usuario_nombre_completo = full_user
            try:
                username_only = full_user.split("\\")[-1] if "\\" in full_user else full_user
                if username_only and username_only != "No User":
                    user_accounts = c.Win32_UserAccount(Name=username_only)
                    if user_accounts and user_accounts[0].FullName:
                        usuario_nombre_completo = user_accounts[0].FullName.strip()
            except Exception as e:
                logger.warning(f"No se pudo obtener nombre completo del usuario: {e}")
            
            return {
                "marca": sys_info.Manufacturer.strip(),
                "modelo": sys_info.Model.strip(),
                "memoria_ram": ram_gb,
                "usuario": full_user,
                "usuario_nombre_completo": usuario_nombre_completo
            }
        except Exception as e:
            logger.warning(f"Error obteniendo info del sistema: {e}")
            return {
                "marca": "Unknown",
                "modelo": "Unknown",
                "memoria_ram": "Unknown",
                "usuario": "No User",
                "usuario_nombre_completo": "No User"
            }
    
    def _get_os_info(self, c) -> Dict:
        """Obtiene información del sistema operativo"""
        try:
            os_info = c.Win32_OperatingSystem()[0]
            return {
                "sistema_operativo": os_info.Caption.strip()
            }
        except Exception as e:
            logger.warning(f"Error obteniendo info del SO: {e}")
            return {
                "sistema_operativo": platform.system()
            }
    
    def _get_cpu_info(self, c) -> Dict:
        """Obtiene información del procesador"""
        try:
            cpu_info = c.Win32_Processor()[0]
            return {
                "procesador": cpu_info.Name.strip()
            }
        except Exception as e:
            logger.warning(f"Error obteniendo info del CPU: {e}")
            return {
                "procesador": "Unknown"
            }
    
    def _get_bios_info(self, c) -> Dict:
        """Obtiene el serial number del BIOS (identificador único)"""
        try:
            bios_info = c.Win32_BIOS()[0]
            serial = bios_info.SerialNumber.strip()
            
            # Validar que no esté vacío
            if not serial or serial.lower() in ['to be filled by o.e.m.', 'default string', 'none']:
                # Fallback: usar UUID de la placa base
                logger.warning("Serial BIOS inválido, usando UUID de placa base")
                board_info = c.Win32_BaseBoard()[0]
                serial = board_info.SerialNumber.strip() if board_info.SerialNumber else str(uuid.getnode())
            
            return {
                "serial_number": serial
            }
        except Exception as e:
            logger.warning(f"Error obteniendo serial BIOS: {e}")
            # Fallback: usar MAC address como identificador
            return {
                "serial_number": str(uuid.getnode())
            }
    
    def _get_network_info(self) -> Dict:
        """Obtiene información de red (IP, MAC, Hostname)"""
        try:
            # Hostname
            hostname = socket.gethostname()
            
            # IP Address (obtener la IP que sale a internet)
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip_address = s.getsockname()[0]
                s.close()
            except:
                ip_address = "127.0.0.1"
            
            # MAC Address
            mac_num = uuid.getnode()
            mac_address = ':'.join(('%012X' % mac_num)[i:i+2] for i in range(0, 12, 2))
            
            return {
                "hostname": hostname,
                "ip_address": ip_address,
                "mac_address": mac_address
            }
        except Exception as e:
            logger.warning(f"Error obteniendo info de red: {e}")
            return {
                "hostname": "Unknown",
                "ip_address": "0.0.0.0",
                "mac_address": "00:00:00:00:00:00"
            }
    
    def _get_print_info(self, c) -> list:
        """Obtiene información de impresiones por impresora usando EventLog y fallback WMI"""
        try:
            print_stats = []
            
            # Activar el log Operacional de PrintService silenciosamente
            try:
                import subprocess
                subprocess.run(
                    ["wevtutil", "sl", "Microsoft-Windows-PrintService/Operational", "/e:true"],
                    check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            except Exception:
                pass
            
            printers = {}
            try:
                for p in c.Win32_Printer():
                    printers[p.Name] = {
                        "port": p.PortName or "",
                        "driver": p.DriverName or "",
                        "is_network": bool(p.Network),
                        "is_default": bool(p.Default),
                        "total_jobs": 0,
                        "total_pages": 0
                    }
            except Exception:
                pass
            
            # Script PS para extraer EventID 307 (Impresiones) del log Operacional
            ps_script = """
            $ErrorActionPreference = 'SilentlyContinue'
            $events = Get-WinEvent -LogName 'Microsoft-Windows-PrintService/Operational' -FilterXPath "*[System[EventID=307]]"
            if (-not $events) { return '[]' }
            $results = @()
            foreach ($e in $events) {
                $printerName = $e.Properties[4].Value
                $pages = 0
                if ($e.Properties[7].Value) {
                    $pages = [int]$e.Properties[7].Value
                }
                $results += [PSCustomObject]@{
                    Printer = $printerName
                    Pages = $pages
                }
            }
            $results | Group-Object -Property Printer | ForEach-Object {
                [PSCustomObject]@{
                    printer_name = $_.Name
                    total_jobs = $_.Group.Count
                    total_pages = ($_.Group | Measure-Object -Property Pages -Sum).Sum
                }
            } | ConvertTo-Json -Compress
            """
            
            import json
            uso_eventlog = False
            try:
                result = subprocess.run(
                    ["powershell", "-NoProfile", "-Command", ps_script],
                    capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW
                )
                if result.stdout.strip() and result.stdout.strip() != '[]':
                    data = json.loads(result.stdout)
                    if isinstance(data, dict):
                        data = [data]
                    for d in data:
                        name = d.get('printer_name')
                        if name in printers:
                            printers[name]['total_jobs'] = d.get('total_jobs', 0)
                            printers[name]['total_pages'] = d.get('total_pages', 0)
                        else:
                            printers[name] = {
                                "port": "", "driver": "", "is_network": False, "is_default": False,
                                "total_jobs": d.get('total_jobs', 0),
                                "total_pages": d.get('total_pages', 0)
                            }
                    uso_eventlog = True
            except Exception as e:
                logger.warning(f"Error parseando EventLog de impresoras: {e}")
            
            # Fallback a WMI viejo si EventLog falla (o está vacío al ser recién activado)
            if not uso_eventlog:
                try:
                    perf_data = c.Win32_PerfFormattedData_Spooler_PrintQueue()
                    for queue in perf_data:
                        nombre = queue.Name
                        if nombre == "_Total": continue
                        
                        virtual_keywords = ["Microsoft", "OneNote", "XPS", "PDF", "Fax", "nul"]
                        if any(kw.lower() in nombre.lower() for kw in virtual_keywords):
                            continue
                            
                        # WMI usa Acumulado histórico 
                        t_jobs = int(queue.TotalJobsPrinted or 0)
                        t_pages = int(queue.TotalPagesPrinted or 0)
                        if t_jobs > 0 or t_pages > 0:
                            if nombre in printers:
                                printers[nombre]["total_jobs"] = max(t_jobs, printers[nombre]["total_jobs"])
                                printers[nombre]["total_pages"] = max(t_pages, printers[nombre]["total_pages"])
                            else:
                                printers[nombre] = {
                                    "port": "", "driver": "", "is_network": False, "is_default": False,
                                    "total_jobs": t_jobs, "total_pages": t_pages
                                }
                except:
                    pass

            for nombre, props in printers.items():
                if props["total_jobs"] > 0 or props["total_pages"] > 0:
                    virtual_keywords = ["Microsoft", "OneNote", "XPS", "PDF", "Fax", "nul"]
                    if not any(kw.lower() in nombre.lower() for kw in virtual_keywords):
                        print_stats.append({
                            "printer_name": nombre,
                            "total_jobs": props["total_jobs"],
                            "total_pages": props["total_pages"],
                            "port": props.get("port", ""),
                            "driver": props.get("driver", ""),
                            "is_network": props.get("is_network", False),
                            "is_default": props.get("is_default", False)
                        })
            
            if print_stats:
                logger.info(f"  ✓ Impresoras detectadas con actividad: {len(print_stats)}")
                for ps in print_stats:
                    logger.info(f"    - {ps['printer_name']}: {ps['total_jobs']} trab, {ps['total_pages']} pag")
            
            return print_stats
            
        except Exception as e:
            logger.warning(f"Error general obteniendo datos de impresión: {e}")
            return []
    
    def _validate_data(self, data: Dict) -> bool:
        """Valida que los datos recolectados sean correctos"""
        required_fields = [
            'serial_number', 'hostname', 'ip_address', 'mac_address',
            'usuario', 'usuario_nombre_completo', 'marca', 'modelo',
            'sistema_operativo', 'procesador', 'memoria_ram'
        ]
        
        for field in required_fields:
            if field not in data or not data[field]:
                logger.error(f"Campo requerido faltante o vacío: {field}")
                return False
        
        return True

# Función de compatibilidad con código anterior
def get_system_data() -> Optional[Dict]:
    """Wrapper para compatibilidad con versiones anteriores"""
    collector = SystemCollector()
    return collector.collect()
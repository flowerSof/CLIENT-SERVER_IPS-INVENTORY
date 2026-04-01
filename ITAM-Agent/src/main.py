"""
ITAM Agent - IT Asset Management Agent
Agente de inventario automático para Windows

Este agente recolecta información del hardware y software del equipo
y la envía periódicamente al servidor central ITAM.

Arquitectura MVC:
- Model: collector.py (recolección de datos)
- View: logger.py (presentación de información)
- Controller: main.py (lógica de control y orquestación)
"""

import time
import sys
import signal
import os
from pathlib import Path

# Add winreg for Windows startup persistence
try:
    import winreg
except ImportError:
    winreg = None

from collector import SystemCollector
from network import NetworkService
from config import settings
from logger import logger
from command_server import get_command_server


class ITAMAgent:
    """
    Controlador principal del agente ITAM (MVC - Controller)
    """
    
    def __init__(self):
        self.collector = SystemCollector()
        self.network = NetworkService()
        self.running = True
        
        # Configurar manejadores de señales para shutdown graceful
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Maneja señales de interrupción para shutdown graceful"""
        logger.info("Señal de interrupción recibida. Deteniendo agente...")
        self.running = False
    
    def start(self):
        """Inicia el agente en modo continuo"""
        logger.info("=" * 60)
        logger.info("AGENTE DE INVENTARIO ITAM - INICIADO")
        logger.info("=" * 60)
        logger.info(f"Servidor: {settings.API_URL}")
        logger.info(f"Intervalo de reporte: {settings.REPORT_INTERVAL} segundos")
        logger.info(f"Modo silencioso: {settings.SILENT_MODE}")
        logger.info("=" * 60)
        
        # Prueba de conexión inicial
        if not self.network.test_connection():
            logger.warning("No se pudo conectar al servidor. El agente continuará intentando...")
        
        # Iniciar servidor de comandos remotos
        command_server = get_command_server()
        if command_server.start():
            logger.info("Servidor de comandos remotos activo - esperando instrucciones...")
        else:
            logger.warning("No se pudo iniciar el servidor de comandos remotos")
            
        # Configurar autostart en Windows (Persistencia a reinicios/apagados)
        self._enable_autostart()
        
        # Ciclo principal
        cycle_count = 0
        while self.running:
            cycle_count += 1
            logger.info(f"\n{'='*60}")
            logger.info(f"CICLO #{cycle_count} - {time.strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info(f"{'='*60}")
            
            try:
                # 1. Recolectar datos del sistema
                logger.info("Paso 1/3: Recolectando datos del sistema...")
                data = self.collector.collect()
                
                if data:
                    logger.info(f"  ✓ Host: {data['hostname']}")
                    logger.info(f"  ✓ Usuario: {data['usuario']}")
                    logger.info(f"  ✓ IP: {data['ip_address']}")
                    
                    # 2. Enviar al servidor
                    logger.info("Paso 2/3: Enviando reporte al servidor...")
                    success = self.network.send_report(data)
                    
                    if success:
                        logger.info("  ✓ Reporte enviado exitosamente")
                    else:
                        logger.warning("  ✗ No se pudo enviar el reporte")

                    # 2b. Consultar comandos pendientes (arquitectura PULL)
                    # Funciona incluso si el servidor no puede alcanzar a este agente
                    try:
                        cmd = self.network.poll_command(data.get("serial_number", ""))
                        if cmd.get("tiene_comando"):
                            tipo = cmd.get("tipo", "")
                            delay = cmd.get("delay_segundos", 60)
                            cmd_id = cmd.get("comando_id")
                            logger.warning(f"Comando recibido: {tipo} (delay: {delay}s)")

                            import subprocess
                            exito = False
                            msg = ""
                            try:
                                if tipo == "SHUTDOWN":
                                    subprocess.run(
                                        f'shutdown /s /t {delay} /c "El administrador ha programado el apagado de este PC. Guarde su trabajo."',
                                        shell=True, check=True
                                    )
                                    msg = f"Apagado programado en {delay} segundos"
                                    exito = True
                                    logger.warning(f"APAGADO PROGRAMADO en {delay}s")

                                elif tipo == "RESTART":
                                    subprocess.run(
                                        f'shutdown /r /t {delay} /c "El administrador ha programado el reinicio de este PC. Guarde su trabajo."',
                                        shell=True, check=True
                                    )
                                    msg = f"Reinicio programado en {delay} segundos"
                                    exito = True
                                    logger.warning(f"REINICIO PROGRAMADO en {delay}s")

                                elif tipo == "CANCEL":
                                    subprocess.run("shutdown /a", shell=True)
                                    msg = "Apagado/reinicio cancelado"
                                    exito = True
                                    logger.info("Apagado/reinicio CANCELADO")

                                else:
                                    msg = f"Tipo de comando desconocido: {tipo}"
                                    logger.error(msg)

                            except subprocess.CalledProcessError as e:
                                msg = f"Error ejecutando {tipo}: {e}"
                                logger.error(msg)

                            # Reportar resultado al servidor
                            if cmd_id:
                                self.network.report_command_result(cmd_id, exito, msg)
                                
                            # Entrar en ciclo rápido de polling para poder cancelar
                            if exito and delay > 0 and tipo in ("SHUTDOWN", "RESTART"):
                                logger.info(f"Entrando en modo polling rápido ({delay}s) para interceptar posibles cancelaciones...")
                                import time as time_module
                                end_time = time_module.time() + delay
                                while time_module.time() < (end_time - 5): # Hasta 5 seg antes de que se apague
                                    time_module.sleep(2)
                                    try:
                                        cmd_cancel = self.network.poll_command(data.get("serial_number", ""))
                                        if cmd_cancel.get("tiene_comando") and cmd_cancel.get("tipo") == "CANCEL":
                                            subprocess.run("shutdown /a", shell=True)
                                            self.network.report_command_result(cmd_cancel.get("comando_id"), True, "Apagado cancelado")
                                            logger.info("Apagado/reinicio CANCELADO remotamente")
                                            break
                                    except Exception as e:
                                        logger.debug(f"Error en polling rapido: {e}")
                    except Exception as e:
                        logger.debug(f"Error en ciclo de comandos: {e}")
                else:
                    logger.error("  ✗ No se pudieron recolectar datos del sistema")
                
            except Exception as e:
                logger.error(f"Error en el ciclo de reporte: {e}", exc_info=True)
            
            # 3. Esperar hasta el próximo ciclo
            if self.running:
                logger.info(f"Paso 3/3: Esperando {settings.REPORT_INTERVAL} segundos hasta el próximo ciclo...")
                
                # Esperar en intervalos pequeños para poder responder a señales
                remaining = settings.REPORT_INTERVAL
                while remaining > 0 and self.running:
                    sleep_time = min(1, remaining)
                    time.sleep(sleep_time)
                    remaining -= sleep_time
        
        # Cleanup
        logger.info("\n" + "=" * 60)
        logger.info("AGENTE DETENIDO")
        logger.info("=" * 60)
        self.network.close()
    
    def run_once(self):
        """Ejecuta un solo ciclo de reporte (útil para testing)"""
        logger.info("Ejecutando ciclo único de reporte...")
        
        data = self.collector.collect()
        if data:
            success = self.network.send_report(data)
            return success
        return False
        
    def _enable_autostart(self):
        """Registra el ejecutable en el inicio de Windows para iniciar con el PC"""
        if not winreg:
            return
            
        try:
            # Solo agregar al autostart si estamos en la versión compilada (.exe)
            if getattr(sys, 'frozen', False):
                exe_path = sys.executable
            else:
                return
                
            # Intentar primero HKEY_LOCAL_MACHINE (Aplica a todos los usuarios, requiere Admin)
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
                winreg.SetValueEx(key, "ITAMAgent", 0, winreg.REG_SZ, f'"{exe_path}"')
                winreg.CloseKey(key)
                logger.info("Autostart configurado globalmente (HKLM).")
            except PermissionError:
                # Si falla por falta de permisos, usar HKEY_CURRENT_USER (Solo este usuario)
                key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
                winreg.SetValueEx(key, "ITAMAgent", 0, winreg.REG_SZ, f'"{exe_path}"')
                winreg.CloseKey(key)
                logger.info("Autostart configurado para el usuario actual (HKCU).")
        except Exception as e:
            logger.warning(f"No se pudo configurar el autostart: {e}")

def main():
    """Punto de entrada principal"""
    try:
        # Crear agente
        agent = ITAMAgent()
        
        # Verificar argumentos de línea de comandos
        if len(sys.argv) > 1:
            if sys.argv[1] == '--once':
                # Modo de prueba: ejecutar una sola vez
                success = agent.run_once()
                sys.exit(0 if success else 1)
            
            elif sys.argv[1] == '--test-connection':
                # Probar conexión con el servidor
                success = agent.network.test_connection()
                sys.exit(0 if success else 1)
            
            elif sys.argv[1] == '--config':
                # Crear archivo de configuración de ejemplo
                settings.save_config_template()
                sys.exit(0)
            
            elif sys.argv[1] == '--help':
                print("ITAM Agent - IT Asset Management Agent")
                print("\nUso:")
                print("  python main.py              Ejecutar en modo continuo")
                print("  python main.py --once       Ejecutar un solo ciclo")
                print("  python main.py --test-connection  Probar conexión con servidor")
                print("  python main.py --config     Crear archivo de configuración de ejemplo")
                print("  python main.py --help       Mostrar esta ayuda")
                sys.exit(0)
        
        # Modo normal: ejecutar continuamente
        agent.start()
        
    except KeyboardInterrupt:
        logger.info("\nAgente detenido por el usuario (Ctrl+C)")
        sys.exit(0)
    
    except Exception as e:
        logger.error(f"Error fatal: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
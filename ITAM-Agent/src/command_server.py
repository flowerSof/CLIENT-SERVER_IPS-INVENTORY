"""
Servidor HTTP para comandos remotos del ITAM Agent
Escucha comandos del servidor central: shutdown, restart, cancel
"""
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
from logger import logger

COMMAND_SERVER_PORT = 5001

class CommandHandler(BaseHTTPRequestHandler):
    """Manejador de comandos HTTP"""
    
    def log_message(self, format, *args):
        """Override para usar nuestro logger"""
        logger.debug(f"[CommandServer] {args[0]}")
    
    def _send_json_response(self, data: dict, status: int = 200):
        """Envía respuesta JSON"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Health check endpoint"""
        if self.path == '/health' or self.path == '/':
            self._send_json_response({
                "status": "online",
                "service": "itam-agent-command-server",
                "port": COMMAND_SERVER_PORT
            })
        else:
            self._send_json_response({"error": "Not found"}, 404)
    
    def do_POST(self):
        """Procesar comandos remotos"""
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = parse_qs(parsed_path.query)
        
        try:
            if path == '/execute/shutdown':
                delay = int(query_params.get('delay', [60])[0])
                result = self._execute_shutdown(delay)
                self._send_json_response(result)
                
            elif path == '/execute/restart':
                delay = int(query_params.get('delay', [60])[0])
                result = self._execute_restart(delay)
                self._send_json_response(result)
                
            elif path == '/execute/cancel':
                result = self._execute_cancel()
                self._send_json_response(result)
                
            else:
                self._send_json_response({"error": "Unknown command"}, 400)
                
        except Exception as e:
            logger.error(f"Error ejecutando comando: {e}")
            self._send_json_response({"error": str(e)}, 500)
    
    def _execute_shutdown(self, delay: int = 60) -> dict:
        """Ejecuta apagado programado"""
        try:
            # shutdown /s = shutdown, /t = tiempo en segundos, /c = comentario
            cmd = f'shutdown /s /t {delay} /c "Apagado remoto iniciado por ITAM Server. Guarda tu trabajo. Tienes {delay} segundos para cancelar con: shutdown /a"'
            subprocess.run(cmd, shell=True, check=True)
            
            logger.warning(f"🔴 APAGADO PROGRAMADO en {delay} segundos")
            return {
                "success": True,
                "action": "shutdown",
                "delay": delay,
                "message": f"Apagado programado en {delay} segundos"
            }
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": f"Error al ejecutar shutdown: {e}"}
    
    def _execute_restart(self, delay: int = 60) -> dict:
        """Ejecuta reinicio programado"""
        try:
            cmd = f'shutdown /r /t {delay} /c "Reinicio remoto iniciado por ITAM Server. Guarda tu trabajo. Tienes {delay} segundos para cancelar con: shutdown /a"'
            subprocess.run(cmd, shell=True, check=True)
            
            logger.warning(f"🔄 REINICIO PROGRAMADO en {delay} segundos")
            return {
                "success": True,
                "action": "restart",
                "delay": delay,
                "message": f"Reinicio programado en {delay} segundos"
            }
        except subprocess.CalledProcessError as e:
            return {"success": False, "error": f"Error al ejecutar restart: {e}"}
    
    def _execute_cancel(self) -> dict:
        """Cancela apagado/reinicio pendiente"""
        try:
            subprocess.run('shutdown /a', shell=True, check=True)
            
            logger.info("✅ Apagado/reinicio CANCELADO")
            return {
                "success": True,
                "action": "cancel",
                "message": "Apagado/reinicio cancelado exitosamente"
            }
        except subprocess.CalledProcessError as e:
            # Puede fallar si no hay shutdown pendiente
            return {"success": False, "error": "No hay apagado pendiente para cancelar"}


class CommandServer:
    """Servidor de comandos que corre en background"""
    
    def __init__(self, port: int = COMMAND_SERVER_PORT):
        self.port = port
        self.server = None
        self.thread = None
        self.running = False
    
    def start(self):
        """Inicia el servidor en un thread separado"""
        try:
            self.server = HTTPServer(('0.0.0.0', self.port), CommandHandler)
            self.running = True
            
            self.thread = threading.Thread(target=self._run_server, daemon=True)
            self.thread.start()
            
            logger.info(f"📡 Command Server iniciado en puerto {self.port}")
            return True
            
        except Exception as e:
            logger.error(f"Error iniciando Command Server: {e}")
            return False
    
    def _run_server(self):
        """Loop del servidor"""
        while self.running:
            try:
                self.server.handle_request()
            except Exception as e:
                if self.running:
                    logger.error(f"Error en Command Server: {e}")
    
    def stop(self):
        """Detiene el servidor"""
        self.running = False
        if self.server:
            self.server.shutdown()
            logger.info("📡 Command Server detenido")


# Singleton para acceso global
_command_server = None

def get_command_server() -> CommandServer:
    """Obtiene la instancia del servidor de comandos"""
    global _command_server
    if _command_server is None:
        _command_server = CommandServer()
    return _command_server

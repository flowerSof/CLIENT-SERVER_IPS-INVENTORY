"""
Router para comandos remotos a los agentes ITAM
Permite apagar, reiniciar y cancelar shutdown de PCs
Registra cada comando en la tabla de notificaciones
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
import asyncio

from database import get_db
from models import assets
from models.notifications import Notificacion
from models.users import UsuarioAdmin
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/remote",
    tags=["Remote Commands"],
)

# Configuración
AGENT_PORT = 5001
AGENT_TIMEOUT = 10  # segundos
SHUTDOWN_DELAY = 60  # segundos de espera antes del apagado

class CommandResponse(BaseModel):
    success: bool
    message: str
    asset_ip: str = None
    error: str = None  # Contains error detail when success=False

async def send_command_to_agent(ip_address: str, endpoint: str, timeout: int = AGENT_TIMEOUT) -> dict:
    """Envía un comando HTTP al agente ITAM en la PC destino"""
    url = f"http://{ip_address}:{AGENT_PORT}{endpoint}"
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(url)
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
    except httpx.ConnectError:
        return {"success": False, "error": "No se pudo conectar al agente. ¿Está instalado y corriendo?"}
    except httpx.TimeoutException:
        return {"success": False, "error": "Timeout al conectar con el agente"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _log_notificacion(db: Session, tipo: str, activo, user: UsuarioAdmin, exitoso: bool, mensaje: str):
    """Registra un comando remoto en la tabla de notificaciones"""
    notif = Notificacion(
        tipo=tipo,
        activo_id=activo.id,
        activo_hostname=activo.hostname,
        activo_ip=activo.ip_address,
        usuario_id=user.id,
        usuario_username=user.username,
        exitoso=exitoso,
        mensaje=mensaje,
    )
    db.add(notif)
    db.commit()


@router.post("/{asset_id}/shutdown", response_model=CommandResponse)
async def shutdown_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """
    Envía comando de apagado a una PC
    El usuario tendrá 60 segundos para cancelar antes del apagado
    """
    activo = db.query(assets.Activo).filter(assets.Activo.id == asset_id).first()
    
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    if not activo.ip_address or activo.ip_address == "0.0.0.0":
        raise HTTPException(status_code=400, detail="El activo no tiene IP válida")
    
    if not activo.is_online():
        raise HTTPException(status_code=400, detail="El activo está offline. No se puede enviar comando.")
    
    result = await send_command_to_agent(
        activo.ip_address, 
        f"/execute/shutdown?delay={SHUTDOWN_DELAY}"
    )
    
    if result["success"]:
        msg = f"Comando de apagado enviado. La PC se apagara en {SHUTDOWN_DELAY} segundos."
        _log_notificacion(db, "SHUTDOWN", activo, current_user, True, msg)
        return CommandResponse(
            success=True,
            message=msg,
            asset_ip=activo.ip_address
        )
    else:
        err_msg = result.get('error', 'Error desconocido')
        _log_notificacion(db, "SHUTDOWN", activo, current_user, False, err_msg)
        # Return 200 with success=False so the notification is shown in the panel
        return CommandResponse(
            success=False,
            message=f"El comando se registró pero no llegó a la PC: {err_msg}",
            asset_ip=activo.ip_address,
            error=err_msg
        )

@router.post("/{asset_id}/restart", response_model=CommandResponse)
async def restart_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """
    Envía comando de reinicio a una PC
    El usuario tendrá 60 segundos para cancelar antes del reinicio
    """
    activo = db.query(assets.Activo).filter(assets.Activo.id == asset_id).first()
    
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    if not activo.ip_address or activo.ip_address == "0.0.0.0":
        raise HTTPException(status_code=400, detail="El activo no tiene IP válida")
    
    if not activo.is_online():
        raise HTTPException(status_code=400, detail="El activo está offline. No se puede enviar comando.")
    
    result = await send_command_to_agent(
        activo.ip_address,
        f"/execute/restart?delay={SHUTDOWN_DELAY}"
    )
    
    if result["success"]:
        msg = f"Comando de reinicio enviado. La PC se reiniciará en {SHUTDOWN_DELAY} segundos."
        _log_notificacion(db, "RESTART", activo, current_user, True, msg)
        return CommandResponse(
            success=True,
            message=msg,
            asset_ip=activo.ip_address
        )
    else:
        err_msg = result.get('error', 'Error desconocido')
        _log_notificacion(db, "RESTART", activo, current_user, False, err_msg)
        return CommandResponse(
            success=False,
            message=f"El comando se registró pero no llegó a la PC: {err_msg}",
            asset_ip=activo.ip_address,
            error=err_msg
        )

@router.post("/{asset_id}/cancel", response_model=CommandResponse)
async def cancel_shutdown(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """
    Cancela un apagado o reinicio pendiente
    """
    activo = db.query(assets.Activo).filter(assets.Activo.id == asset_id).first()
    
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    if not activo.ip_address or activo.ip_address == "0.0.0.0":
        raise HTTPException(status_code=400, detail="El activo no tiene IP válida")
    
    result = await send_command_to_agent(activo.ip_address, "/execute/cancel")
    
    if result["success"]:
        msg = "Apagado/reinicio cancelado exitosamente."
        _log_notificacion(db, "CANCEL", activo, current_user, True, msg)
        return CommandResponse(
            success=True,
            message=msg,
            asset_ip=activo.ip_address
        )
    else:
        err_msg = result.get('error', 'Error desconocido')
        _log_notificacion(db, "CANCEL", activo, current_user, False, err_msg)
        return CommandResponse(
            success=False,
            message=f"El comando se registró pero no llegó a la PC: {err_msg}",
            asset_ip=activo.ip_address,
            error=err_msg
        )

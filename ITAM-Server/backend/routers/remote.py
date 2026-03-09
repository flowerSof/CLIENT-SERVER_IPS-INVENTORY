"""
Router para comandos remotos a los agentes ITAM
Permite apagar, reiniciar y cancelar shutdown de PCs
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
import asyncio

from database import get_db
from models import assets
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/remote",
    tags=["Remote Commands"],
    dependencies=[Depends(get_current_user)]
)

# Configuración
AGENT_PORT = 5001
AGENT_TIMEOUT = 10  # segundos
SHUTDOWN_DELAY = 60  # segundos de espera antes del apagado

class CommandResponse(BaseModel):
    success: bool
    message: str
    asset_ip: str = None

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

@router.post("/{asset_id}/shutdown", response_model=CommandResponse)
async def shutdown_asset(asset_id: int, db: Session = Depends(get_db)):
    """
    Envía comando de apagado a una PC
    El usuario tendrá 60 segundos para cancelar antes del apagado
    """
    activo = db.query(assets.Activo).filter(assets.Activo.id == asset_id).first()
    
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    
    if not activo.ip_address or activo.ip_address == "0.0.0.0":
        raise HTTPException(status_code=400, detail="El activo no tiene IP válida")
    
    # Verificar que esté online
    if not activo.is_online():
        raise HTTPException(status_code=400, detail="El activo está offline. No se puede enviar comando.")
    
    result = await send_command_to_agent(
        activo.ip_address, 
        f"/execute/shutdown?delay={SHUTDOWN_DELAY}"
    )
    
    if result["success"]:
        return CommandResponse(
            success=True,
            message=f"Comando de apagado enviado. La PC se apagará en {SHUTDOWN_DELAY} segundos.",
            asset_ip=activo.ip_address
        )
    else:
        raise HTTPException(
            status_code=503,
            detail=f"Error al enviar comando: {result['error']}"
        )

@router.post("/{asset_id}/restart", response_model=CommandResponse)
async def restart_asset(asset_id: int, db: Session = Depends(get_db)):
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
        return CommandResponse(
            success=True,
            message=f"Comando de reinicio enviado. La PC se reiniciará en {SHUTDOWN_DELAY} segundos.",
            asset_ip=activo.ip_address
        )
    else:
        raise HTTPException(
            status_code=503,
            detail=f"Error al enviar comando: {result['error']}"
        )

@router.post("/{asset_id}/cancel", response_model=CommandResponse)
async def cancel_shutdown(asset_id: int, db: Session = Depends(get_db)):
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
        return CommandResponse(
            success=True,
            message="Apagado/reinicio cancelado exitosamente.",
            asset_ip=activo.ip_address
        )
    else:
        raise HTTPException(
            status_code=503,
            detail=f"Error al cancelar: {result['error']}"
        )

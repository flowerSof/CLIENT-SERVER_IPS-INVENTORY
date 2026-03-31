"""
Router para comandos remotos a los agentes ITAM
MIGRADO: Ahora encola comandos via arquitectura PULL en vez de intentar push directo.
El agente recoge los comandos en su próximo ciclo de reporte.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import assets
from models.commands import ComandoPendiente
from models.notifications import Notificacion
from models.users import UsuarioAdmin
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/remote",
    tags=["Remote Commands"],
)

SHUTDOWN_DELAY = 60


class CommandResponse(BaseModel):
    success: bool
    message: str
    asset_ip: str = None
    error: str = None


def _enqueue_command(db: Session, activo, current_user: UsuarioAdmin, tipo: str, delay: int) -> CommandResponse:
    """Encola un comando para que el agente lo ejecute en su próximo ciclo (PULL)."""
    # Si es CANCEL, cancelar comandos pendientes de este activo
    if tipo == "CANCEL":
        db.query(ComandoPendiente).filter(
            ComandoPendiente.activo_id == activo.id,
            ComandoPendiente.estado == "PENDIENTE"
        ).update({"estado": "CANCELADO"})

    cmd = ComandoPendiente(
        activo_id=activo.id,
        serial_number=activo.serial_number,
        hostname=activo.hostname,
        tipo=tipo,
        delay_segundos=delay,
        usuario_id=current_user.id,
        usuario_username=current_user.username,
        estado="PENDIENTE"
    )
    db.add(cmd)
    db.commit()

    if tipo == "CANCEL":
        msg = "Cancelación encolada. Se ejecutará en el próximo ciclo del agente."
    else:
        accion = "apagado" if tipo == "SHUTDOWN" else "reinicio"
        msg = f"Comando de {accion} encolado. Se ejecutará en el próximo ciclo del agente (~5 min)."

    return CommandResponse(
        success=True,
        message=msg,
        asset_ip=activo.ip_address
    )


def _validate_asset(db: Session, asset_id: int):
    """Valida que el activo exista y tenga IP."""
    activo = db.query(assets.Activo).filter(assets.Activo.id == asset_id).first()
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    if not activo.ip_address or activo.ip_address == "0.0.0.0":
        raise HTTPException(status_code=400, detail="El activo no tiene IP válida")
    return activo


@router.post("/{asset_id}/shutdown", response_model=CommandResponse)
async def shutdown_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """Encola comando de apagado para una PC"""
    activo = _validate_asset(db, asset_id)
    return _enqueue_command(db, activo, current_user, "SHUTDOWN", SHUTDOWN_DELAY)


@router.post("/{asset_id}/restart", response_model=CommandResponse)
async def restart_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """Encola comando de reinicio para una PC"""
    activo = _validate_asset(db, asset_id)
    return _enqueue_command(db, activo, current_user, "RESTART", SHUTDOWN_DELAY)


@router.post("/{asset_id}/cancel", response_model=CommandResponse)
async def cancel_shutdown(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """Cancela un apagado o reinicio pendiente"""
    activo = _validate_asset(db, asset_id)
    return _enqueue_command(db, activo, current_user, "CANCEL", 0)

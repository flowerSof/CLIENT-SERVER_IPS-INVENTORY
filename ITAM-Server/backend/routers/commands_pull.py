"""
Router para la arquitectura PULL de comandos.
El agente consulta periódicamente si tiene comandos pendientes.
El servidor encola el comando y el agente lo ejecuta en su próximo ciclo.
Esto funciona incluso cuando el servidor no puede alcanzar al agente directamente (redes distintas).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta

from database import get_db
from models.commands import ComandoPendiente
from models import assets
from models.users import UsuarioAdmin
from models.notifications import Notificacion
from dependencies import get_current_user

router = APIRouter(
    prefix="/api/commands",
    tags=["Commands Pull"],
)

SHUTDOWN_DELAY = 60  # segundos


class QueueCommandRequest(BaseModel):
    tipo: str  # SHUTDOWN | RESTART | CANCEL
    delay_segundos: int = SHUTDOWN_DELAY


class AgentPollResponse(BaseModel):
    tiene_comando: bool
    comando_id: Optional[int] = None
    tipo: Optional[str] = None
    delay_segundos: Optional[int] = None


class AgentResultRequest(BaseModel):
    comando_id: int
    exito: bool
    mensaje: str = ""


# ─────────────────────────────────────────────────────────────────
# FRONTEND → Encolar comando para una PC
# ─────────────────────────────────────────────────────────────────
@router.post("/{asset_id}/queue")
async def queue_command(
    asset_id: int,
    req: QueueCommandRequest,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """Frontend encola un comando para que el agente lo ejecute en su próximo ciclo."""
    activo = db.query(assets.Activo).filter(assets.Activo.id == asset_id).first()
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    # Si es CANCEL, cancelar comandos pendientes de este activo
    if req.tipo == "CANCEL":
        db.query(ComandoPendiente).filter(
            ComandoPendiente.activo_id == asset_id,
            ComandoPendiente.estado == "PENDIENTE"
        ).update({"estado": "CANCELADO"})
        db.commit()
        return {
            "success": True,
            "message": "Comandos pendientes cancelados.",
            "comando_id": None
        }

    # Evitar comandos duplicados: si ya hay un SHUTDOWN o RESTART pendiente, rechazar
    existing = db.query(ComandoPendiente).filter(
        ComandoPendiente.activo_id == asset_id,
        ComandoPendiente.estado == "PENDIENTE",
        ComandoPendiente.tipo.in_(["SHUTDOWN", "RESTART"])
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Ya hay un comando {existing.tipo} pendiente para esta PC. Cancélalo primero."
        )

    # Encolar el nuevo comando
    cmd = ComandoPendiente(
        activo_id=asset_id,
        serial_number=activo.serial_number,
        hostname=activo.hostname,
        tipo=req.tipo,
        delay_segundos=req.delay_segundos,
        usuario_id=current_user.id,
        usuario_username=current_user.username,
        estado="PENDIENTE"
    )
    db.add(cmd)
    db.commit()
    db.refresh(cmd)

    return {
        "success": True,
        "message": f"Comando {req.tipo} encolado. Se ejecutará en el próximo ciclo del agente (~5 min).",
        "comando_id": cmd.id
    }


# ─────────────────────────────────────────────────────────────────
# AGENTE → Consulta si tiene comandos pendientes (PULL)
# Autenticado con el mismo API token que usa para reportar
# ─────────────────────────────────────────────────────────────────
@router.get("/poll/{serial_number}")
async def poll_commands(
    serial_number: str,
    db: Session = Depends(get_db)
):
    """
    El agente llama a este endpoint en cada ciclo para saber si tiene comandos pendientes.
    No requiere sesión de usuario — usa el serial_number del agente como identificador.
    """
    cmd = db.query(ComandoPendiente).filter(
        ComandoPendiente.serial_number == serial_number,
        ComandoPendiente.estado == "PENDIENTE"
    ).order_by(ComandoPendiente.creado_en.asc()).first()

    if not cmd:
        return AgentPollResponse(tiene_comando=False)

    return AgentPollResponse(
        tiene_comando=True,
        comando_id=cmd.id,
        tipo=cmd.tipo,
        delay_segundos=cmd.delay_segundos or SHUTDOWN_DELAY
    )


# ─────────────────────────────────────────────────────────────────
# AGENTE → Reporta el resultado de un comando ejecutado
# ─────────────────────────────────────────────────────────────────
@router.post("/result")
async def report_command_result(
    req: AgentResultRequest,
    db: Session = Depends(get_db)
):
    """
    El agente reporta si ejecutó el comando con éxito o falló.
    Esto actualiza la notificación en la BD.
    """
    cmd = db.query(ComandoPendiente).filter(ComandoPendiente.id == req.comando_id).first()
    if not cmd:
        raise HTTPException(status_code=404, detail="Comando no encontrado")

    # Marcar el comando como ejecutado
    cmd.estado = "EJECUTADO" if req.exito else "FALLIDO"
    cmd.ejecutado_en = datetime.now(timezone.utc)
    cmd.mensaje_resultado = req.mensaje

    # Registrar notificación
    activo = db.query(assets.Activo).filter(assets.Activo.id == cmd.activo_id).first()
    if activo:
        notif = Notificacion(
            tipo=cmd.tipo,
            activo_id=activo.id,
            activo_hostname=activo.hostname,
            activo_ip=activo.ip_address,
            usuario_id=cmd.usuario_id,
            usuario_username=cmd.usuario_username or "Sistema",
            exitoso=req.exito,
            mensaje=req.mensaje or f"Comando {cmd.tipo} {'ejecutado' if req.exito else 'fallido'}"
        )
        db.add(notif)

    db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────────
# FRONTEND → Listar comandos pendientes para una PC
# ─────────────────────────────────────────────────────────────────
@router.get("/{asset_id}/pending")
async def get_pending_commands(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UsuarioAdmin = Depends(get_current_user)
):
    """Devuelve los comandos pendientes y en ejecución (con cuenta regresiva) para un activo."""
    ahora = datetime.now(timezone.utc)
    resultados = []
    
    # 1. Comandos PENDIENTES (el agente aún no los ha recogido)
    cmds_pendientes = db.query(ComandoPendiente).filter(
        ComandoPendiente.activo_id == asset_id,
        ComandoPendiente.estado == "PENDIENTE"
    ).all()
    for c in cmds_pendientes:
        resultados.append({
            "id": c.id,
            "tipo": c.tipo,
            "estado": "PENDIENTE",
            "creado_en": c.creado_en,
            "delay_segundos": c.delay_segundos
        })
        
    # 2. Comandos EJECUTADOS recientemente (el OS está haciendo el countdown)
    cmds_ejecutados = db.query(ComandoPendiente).filter(
        ComandoPendiente.activo_id == asset_id,
        ComandoPendiente.estado == "EJECUTADO",
        ComandoPendiente.tipo.in_(["SHUTDOWN", "RESTART"])
    ).order_by(ComandoPendiente.ejecutado_en.desc()).limit(1).all()
    
    for c in cmds_ejecutados:
        if c.ejecutado_en and c.delay_segundos:
            # Check if timeframe has passed
            fin = c.ejecutado_en + timedelta(seconds=c.delay_segundos)
            if fin > ahora:
                resultados.append({
                    "id": c.id,
                    "tipo": c.tipo,
                    "estado": "EJECUTANDO",
                    "ejecutado_en": c.ejecutado_en,
                    "deadline": fin,
                    "delay_segundos": c.delay_segundos
                })

    return resultados

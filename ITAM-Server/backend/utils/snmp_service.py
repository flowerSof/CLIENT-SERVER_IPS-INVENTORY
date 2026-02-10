"""
Servicio SNMP para consultar impresoras de red
Soporta: Lexmark, Ricoh (y otras marcas estándar)
"""
import asyncio
import os
from typing import Dict, Optional, List, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

# Community string por defecto desde variable de entorno
DEFAULT_SNMP_COMMUNITY = os.getenv("SNMP_COMMUNITY", "public")

# OIDs estándar de impresoras (RFC 3805 - Printer MIB)
PRINTER_OIDS = {
    # Información general
    "sysDescr": "1.3.6.1.2.1.1.1.0",  # Descripción del sistema
    "sysName": "1.3.6.1.2.1.1.5.0",   # Nombre del sistema
    "sysUpTime": "1.3.6.1.2.1.1.3.0", # Tiempo encendido
    
    # Contadores de páginas (Printer MIB)
    "prtMarkerLifeCount": "1.3.6.1.2.1.43.10.2.1.4.1.1",  # Total páginas impresas
    "prtMarkerLifeCountAlt": "1.3.6.1.2.1.43.10.2.1.4",   # Alternativo (walk)
    
    # Serial Number
    "prtGeneralSerialNumber": "1.3.6.1.2.1.43.5.1.1.17.1",
    
    # Estado de la impresora
    "hrPrinterStatus": "1.3.6.1.2.1.25.3.5.1.1.1",
    "hrDeviceStatus": "1.3.6.1.2.1.25.3.2.1.5.1",
    
    # Información del dispositivo
    "hrDeviceDescr": "1.3.6.1.2.1.25.3.2.1.3.1",
}

# OIDs específicos por marca
LEXMARK_OIDS = {
    "totalPages": "1.3.6.1.4.1.641.2.1.5.1.0",  # Contador Lexmark específico
    "blackPages": "1.3.6.1.4.1.641.2.1.5.2.0",
    "colorPages": "1.3.6.1.4.1.641.2.1.5.3.0",
    "tonerLevel": "1.3.6.1.4.1.641.2.1.2.1.6.1",
}

RICOH_OIDS = {
    "totalPages": "1.3.6.1.4.1.367.3.2.1.2.19.5.1.9.1",  # Contador Ricoh
    "blackPages": "1.3.6.1.4.1.367.3.2.1.2.19.5.1.9.2",
    "colorPages": "1.3.6.1.4.1.367.3.2.1.2.19.5.1.9.3",
    "tonerBlack": "1.3.6.1.4.1.367.3.2.1.2.24.1.1.5.1",
}

# Estados de impresora según hrPrinterStatus
PRINTER_STATUS = {
    1: "other",
    2: "unknown",
    3: "idle",
    4: "printing",
    5: "warmup",
}


class SNMPPrinterService:
    """Servicio para consultar impresoras via SNMP"""
    
    def __init__(self, timeout: int = 5, retries: int = 2):
        self.timeout = timeout
        self.retries = retries
    
    async def get_printer_info(self, ip: str, community: str = "public") -> Optional[Dict[str, Any]]:
        """
        Obtiene información completa de una impresora via SNMP
        
        Args:
            ip: Dirección IP de la impresora
            community: Community string SNMP (default: public)
            
        Returns:
            Dict con información de la impresora o None si falla
        """
        try:
            from pysnmp.hlapi.v1arch.asyncio import (
                SnmpDispatcher,
                CommunityData,
                UdpTransportTarget,
                get_cmd,
                ObjectType,
                ObjectIdentity
            )
            
            dispatcher = SnmpDispatcher()
            
            result = {
                "ip": ip,
                "online": False,
                "timestamp": datetime.now(timezone.utc),
                "total_paginas": 0,
                "paginas_bn": None,
                "paginas_color": None,
                "nivel_toner_negro": None,
                "estado": "unknown",
                "descripcion": "",
                "serial": "",
                "marca_detectada": "Unknown",
            }
            
            # Paso 1: Verificar si está online obteniendo descripción del sistema
            try:
                iterator = get_cmd(
                    dispatcher,
                    CommunityData(community),
                    await UdpTransportTarget.create((ip, 161), timeout=self.timeout, retries=self.retries),
                    ObjectType(ObjectIdentity(PRINTER_OIDS["sysDescr"])),
                    ObjectType(ObjectIdentity(PRINTER_OIDS["sysName"])),
                )
                
                errorIndication, errorStatus, errorIndex, varBinds = await iterator
                
                if errorIndication or errorStatus:
                    logger.warning(f"SNMP error for {ip}: {errorIndication or errorStatus}")
                    return result  # Devolver con online=False
                
                result["online"] = True
                
                for varBind in varBinds:
                    oid = str(varBind[0])
                    value = str(varBind[1])
                    
                    if "1.3.6.1.2.1.1.1.0" in oid:  # sysDescr
                        result["descripcion"] = value
                        # Detectar marca
                        value_lower = value.lower()
                        if "lexmark" in value_lower:
                            result["marca_detectada"] = "Lexmark"
                        elif "ricoh" in value_lower:
                            result["marca_detectada"] = "Ricoh"
                        elif "hp" in value_lower or "hewlett" in value_lower:
                            result["marca_detectada"] = "HP"
                        elif "canon" in value_lower:
                            result["marca_detectada"] = "Canon"
                        elif "brother" in value_lower:
                            result["marca_detectada"] = "Brother"
                        elif "xerox" in value_lower:
                            result["marca_detectada"] = "Xerox"
                        elif "epson" in value_lower:
                            result["marca_detectada"] = "Epson"
                    elif "1.3.6.1.2.1.1.5.0" in oid:  # sysName
                        if not result.get("nombre"):
                            result["nombre"] = value
                
            except Exception as e:
                logger.error(f"Error getting basic info from {ip}: {e}")
                return result
            
            # Paso 2: Obtener contador de páginas
            await self._get_page_counts(dispatcher, ip, community, result)
            
            # Paso 3: Obtener estado
            await self._get_printer_status(dispatcher, ip, community, result)
            
            dispatcher.transport_dispatcher.close_dispatcher()
            return result
            
        except ImportError:
            logger.error("pysnmp not installed. Run: pip install pysnmp-lextudio")
            return None
        except Exception as e:
            logger.error(f"Error querying printer {ip}: {e}")
            return None
    
    async def _get_page_counts(self, dispatcher, ip: str, community: str, result: Dict):
        """Obtiene los contadores de páginas"""
        from pysnmp.hlapi.v1arch.asyncio import (
            CommunityData,
            UdpTransportTarget,
            get_cmd,
            ObjectType,
            ObjectIdentity
        )
        
        # Intentar OID estándar primero
        oids_to_try = [
            PRINTER_OIDS["prtMarkerLifeCount"],
        ]
        
        # Agregar OIDs específicos de marca
        marca = result.get("marca_detectada", "").lower()
        if marca == "lexmark":
            oids_to_try.insert(0, LEXMARK_OIDS["totalPages"])
        elif marca == "ricoh":
            oids_to_try.insert(0, RICOH_OIDS["totalPages"])
        
        for oid in oids_to_try:
            try:
                iterator = get_cmd(
                    dispatcher,
                    CommunityData(community),
                    await UdpTransportTarget.create((ip, 161), timeout=self.timeout, retries=1),
                    ObjectType(ObjectIdentity(oid)),
                )
                
                errorIndication, errorStatus, errorIndex, varBinds = await iterator
                
                if not errorIndication and not errorStatus:
                    for varBind in varBinds:
                        try:
                            value = int(varBind[1])
                            if value > 0:
                                result["total_paginas"] = value
                                return
                        except (ValueError, TypeError):
                            continue
            except Exception:
                continue
    
    async def _get_printer_status(self, dispatcher, ip: str, community: str, result: Dict):
        """Obtiene el estado de la impresora"""
        from pysnmp.hlapi.v1arch.asyncio import (
            CommunityData,
            UdpTransportTarget,
            get_cmd,
            ObjectType,
            ObjectIdentity
        )
        
        try:
            iterator = get_cmd(
                dispatcher,
                CommunityData(community),
                await UdpTransportTarget.create((ip, 161), timeout=self.timeout, retries=1),
                ObjectType(ObjectIdentity(PRINTER_OIDS["hrPrinterStatus"])),
            )
            
            errorIndication, errorStatus, errorIndex, varBinds = await iterator
            
            if not errorIndication and not errorStatus:
                for varBind in varBinds:
                    try:
                        status_code = int(varBind[1])
                        result["estado"] = PRINTER_STATUS.get(status_code, "unknown")
                    except (ValueError, TypeError):
                        pass
        except Exception:
            pass
    
    async def scan_printer(self, ip: str, community: str = "public") -> Optional[Dict]:
        """Escanea una impresora y retorna información básica"""
        return await self.get_printer_info(ip, community)
    
    async def scan_multiple(self, printers: List[Dict]) -> List[Dict]:
        """
        Escanea múltiples impresoras en paralelo
        
        Args:
            printers: Lista de dicts con {ip, community}
            
        Returns:
            Lista de resultados
        """
        tasks = [
            self.get_printer_info(p.get("ip"), p.get("community", "public"))
            for p in printers
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return [r for r in results if isinstance(r, dict)]


# Función helper para uso síncrono
def query_printer_sync(ip: str, community: str = "public") -> Optional[Dict]:
    """Consulta síncrona de impresora (para uso en endpoints)"""
    service = SNMPPrinterService()
    return asyncio.run(service.get_printer_info(ip, community))


# Test standalone
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python snmp_service.py <IP_IMPRESORA> [community]")
        print("Ejemplo: python snmp_service.py 192.168.1.100 public")
        sys.exit(1)
    
    ip = sys.argv[1]
    community = sys.argv[2] if len(sys.argv) > 2 else "public"
    
    print(f"Consultando impresora {ip}...")
    result = query_printer_sync(ip, community)
    
    if result:
        print(f"\n✓ Resultado:")
        for key, value in result.items():
            print(f"  {key}: {value}")
    else:
        print("✗ No se pudo obtener información de la impresora")

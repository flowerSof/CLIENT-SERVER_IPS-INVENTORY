"""
Rate Limiting Middleware para FastAPI
Limita peticiones por IP para prevenir ataques de fuerza bruta
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple
import asyncio
import logging

logger = logging.getLogger(__name__)


class RateLimitConfig:
    """Configuración de límites por endpoint"""
    
    # Límites: (max_requests, window_seconds)
    LIMITS = {
        # Login: 5 intentos por minuto (más estricto)
        "/api/auth/login": (5, 60),
        
        # Endpoints sensibles: 30 requests por minuto
        "/api/users": (30, 60),
        "/api/printers/scan-all": (5, 60),
        
        # API general: 100 requests por minuto
        "default": (100, 60)
    }
    
    # IPs en whitelist (no se limitan)
    WHITELIST = [
        "127.0.0.1",
        "::1",  # localhost IPv6
    ]
    
    # Endpoints excluidos del rate limiting
    EXCLUDED = [
        "/",
        "/docs",
        "/redoc",
        "/openapi.json",
    ]


class RateLimiter:
    """
    Almacena contadores de peticiones por IP
    Usa almacenamiento en memoria (para producción considerar Redis)
    """
    
    def __init__(self):
        # Estructura: {ip: {endpoint: [(timestamp, count)]}}
        self._requests: Dict[str, Dict[str, list]] = defaultdict(lambda: defaultdict(list))
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, ip: str, endpoint: str) -> Tuple[bool, int, int]:
        """
        Verifica si una IP puede hacer una petición
        
        Returns:
            (allowed, remaining, reset_seconds)
        """
        async with self._lock:
            # Obtener límite para el endpoint
            max_requests, window = self._get_limit(endpoint)
            
            now = datetime.now()
            window_start = now - timedelta(seconds=window)
            
            # Limpiar peticiones antiguas
            key = self._get_endpoint_key(endpoint)
            self._requests[ip][key] = [
                ts for ts in self._requests[ip][key]
                if ts > window_start
            ]
            
            current_count = len(self._requests[ip][key])
            remaining = max(0, max_requests - current_count - 1)
            
            if current_count >= max_requests:
                # Calcular tiempo hasta reset
                if self._requests[ip][key]:
                    oldest = min(self._requests[ip][key])
                    reset_seconds = int((oldest + timedelta(seconds=window) - now).total_seconds())
                else:
                    reset_seconds = window
                
                return False, 0, reset_seconds
            
            # Registrar petición
            self._requests[ip][key].append(now)
            
            return True, remaining, 0
    
    def _get_limit(self, endpoint: str) -> Tuple[int, int]:
        """Obtiene el límite para un endpoint"""
        # Buscar coincidencia exacta
        if endpoint in RateLimitConfig.LIMITS:
            return RateLimitConfig.LIMITS[endpoint]
        
        # Buscar por prefijo
        for path, limit in RateLimitConfig.LIMITS.items():
            if path != "default" and endpoint.startswith(path):
                return limit
        
        return RateLimitConfig.LIMITS["default"]
    
    def _get_endpoint_key(self, endpoint: str) -> str:
        """Normaliza el endpoint para agrupar"""
        # Agrupar endpoints con IDs dinámicos
        parts = endpoint.split("/")
        normalized = []
        for part in parts:
            # Si parece un ID numérico, reemplazar
            if part.isdigit():
                normalized.append("{id}")
            else:
                normalized.append(part)
        return "/".join(normalized)
    
    async def cleanup(self):
        """Limpia entradas antiguas (ejecutar periódicamente)"""
        async with self._lock:
            now = datetime.now()
            max_age = timedelta(minutes=10)
            
            for ip in list(self._requests.keys()):
                for endpoint in list(self._requests[ip].keys()):
                    self._requests[ip][endpoint] = [
                        ts for ts in self._requests[ip][endpoint]
                        if now - ts < max_age
                    ]
                    
                    # Eliminar endpoints vacíos
                    if not self._requests[ip][endpoint]:
                        del self._requests[ip][endpoint]
                
                # Eliminar IPs vacías
                if not self._requests[ip]:
                    del self._requests[ip]


# Instancia global
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware de FastAPI para rate limiting"""
    
    async def dispatch(self, request: Request, call_next):
        # Obtener IP del cliente
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        # Verificar whitelist
        if client_ip in RateLimitConfig.WHITELIST:
            return await call_next(request)
        
        # Verificar exclusiones
        if endpoint in RateLimitConfig.EXCLUDED:
            return await call_next(request)
        
        # Verificar rate limit
        allowed, remaining, reset = await rate_limiter.is_allowed(client_ip, endpoint)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for {client_ip} on {endpoint}")
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Demasiadas peticiones. Por favor espera antes de intentar nuevamente.",
                    "retry_after": reset
                },
                headers={
                    "Retry-After": str(reset),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset)
                }
            )
        
        # Procesar petición
        response = await call_next(request)
        
        # Agregar headers de rate limit
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Obtiene IP real del cliente (considerando proxies)"""
        # X-Forwarded-For para clientes detrás de proxy/load balancer
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        # X-Real-IP (nginx)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # IP directa
        if request.client:
            return request.client.host
        
        return "unknown"

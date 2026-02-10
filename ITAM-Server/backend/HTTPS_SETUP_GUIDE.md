# ====================================================
# GUÍA DE CONFIGURACIÓN HTTPS/SSL PARA ITAM SERVER
# ====================================================

## 1. GENERAR CERTIFICADOS SSL

### Opción A: Certificado Auto-firmado (Desarrollo/LAN)
```powershell
# Crear directorio para certificados
mkdir ssl

# Generar certificado auto-firmado (válido por 365 días)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/server.key \
    -out ssl/server.crt \
    -subj "/C=PE/ST=Lima/L=Lima/O=Poder Judicial/CN=itam.local"
```

### Opción B: Let's Encrypt (Producción con dominio público)
```bash
# Instalar certbot
sudo apt install certbot

# Generar certificado (requiere dominio público)
sudo certbot certonly --standalone -d tudominio.pe
```

---

## 2. CONFIGURAR UVICORN CON HTTPS

### Archivo: run_https.py
```python
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="./ssl/server.key",
        ssl_certfile="./ssl/server.crt",
        reload=True  # Quitar en producción
    )
```

### Comando directo:
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 \
    --ssl-keyfile=./ssl/server.key \
    --ssl-certfile=./ssl/server.crt
```

---

## 3. CONFIGURAR NGINX COMO REVERSE PROXY (Recomendado para Producción)

### Archivo: /etc/nginx/sites-available/itam
```nginx
server {
    listen 80;
    server_name itam.tudominio.pe;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name itam.tudominio.pe;
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/itam.tudominio.pe/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/itam.tudominio.pe/privkey.pem;
    
    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    
    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Frontend (archivos estáticos)
    location / {
        root /var/www/itam/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### Habilitar sitio:
```bash
sudo ln -s /etc/nginx/sites-available/itam /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. ACTUALIZAR FRONTEND PARA HTTPS

### Archivo: frontend/src/config.js
```javascript
// Detectar automáticamente protocolo
const API_URL = window.location.protocol === 'https:' 
    ? 'https://tu-servidor:8000'
    : 'http://localhost:8000';

export default API_URL;
```

---

## 5. ACTUALIZAR CONFIGURACIÓN DEL AGENTE

### Archivo: ITAM-Agent/config.json
```json
{
    "api_url": "https://tu-servidor:8000",
    "api_token": "tu_token_seguro",
    "verify_ssl": true  // En LAN con certificado auto-firmado: false
}
```

---

## 6. VERIFICACIÓN

### Probar conexión HTTPS:
```powershell
# Verificar que el servidor responde
curl -k https://localhost:8000/

# Verificar certificado
openssl s_client -connect localhost:8000 -showcerts
```

### Probar seguridad SSL:
- Usar: https://www.ssllabs.com/ssltest/

---

## NOTAS IMPORTANTES

⚠️ **Certificados auto-firmados:**
- Mostrarán advertencia en navegadores
- Útiles solo para LAN interna
- Para producción usar Let's Encrypt

⚠️ **Firewall:**
- Abrir puerto 443 (HTTPS)
- Cerrar puerto 80 en producción (solo redirigir)

⚠️ **Renovación:**
- Certificados Let's Encrypt expiran cada 90 días
- Configurar cron para auto-renovación:
```bash
0 0 1 * * certbot renew --quiet && systemctl reload nginx
```

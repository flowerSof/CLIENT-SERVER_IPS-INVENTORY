# 📘 Guía Completa de Despliegue - Sistema ITAM

Esta guía te ayudará a instalar el sistema ITAM en otra red LAN, configurar las IPs correctamente y crear ejecutables para distribuir sin necesidad de código fuente.

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación del Servidor en Otra Red LAN](#instalación-del-servidor-en-otra-red-lan)
3. [Configuración de IP del Servidor](#configuración-de-ip-del-servidor)
4. [Creación de Ejecutable del Agente](#creación-de-ejecutable-del-agente)
5. [Creación de Ejecutable del Servidor](#creación-de-ejecutable-del-servidor)
6. [Instalación en Máquinas Cliente](#instalación-en-máquinas-cliente)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Requisitos Previos

### Para el Servidor
- Windows Server +2016 o Windows 10/11
- 4 GB RAM mínimo (8 GB recomendado)
- 20 GB espacio en disco
- Docker Desktop instalado
- Conexión a red LAN
- IP estática configurada (recomendado)

### Para los Clientes (Agentes)
- Windows 10/11
- 100 MB espacio en disco
- Conexión a la misma red LAN del servidor

---

## 🖥️ Instalación del Servidor en Otra Red LAN

### Opción 1: Instalación con Docker (Recomendado)

#### Paso 1: Preparar la Máquina Servidor

1. **Instalar Docker Desktop**
   - Descarga desde: https://www.docker.com/products/docker-desktop
   - Instala y reinicia la máquina
   - Verifica la instalación:
     ```powershell
     docker --version
     docker-compose --version
     ```

2. **Copiar los archivos del proyecto**
   
   Tienes dos opciones:

   **Opción A: Clonar desde Git (si tienes repositorio)**
   ```powershell
   cd C:\
   git clone <URL_DEL_REPOSITORIO>
   cd CLIENT-SERVER_IPS-INVENTORY\ITAM-Server
   ```

   **Opción B: Copiar archivos manualmente**
   - Copia la carpeta `ITAM-Server` completa a la máquina servidor
   - Ubicación recomendada: `C:\ITAM-Server`

#### Paso 2: Configurar Variables de Entorno

1. **Navega a la carpeta del servidor**
   ```powershell
   cd C:\ITAM-Server
   ```

2. **Crea el archivo de configuración**
   ```powershell
   copy .env.example .env
   notepad .env
   ```

3. **Edita el archivo `.env` con la IP de tu servidor**
   ```env
   # ========================================
   # CONFIGURACIÓN DEL SERVIDOR ITAM
   # ========================================

   # --- Base de Datos PostgreSQL ---
   DB_USER=postgres
   DB_PASSWORD=TuPasswordSeguro123!
   DB_NAME=itam_db
   DB_HOST=db
   DB_PORT=5432

   # --- Configuración de la API ---
   PROJECT_NAME=ITAM Server
   PROJECT_VERSION=1.0.0

   # Token de seguridad para los agentes
   # IMPORTANTE: Cambia este valor y guárdalo para configurar los agentes
   API_TOKEN=sk_live_token_maestro_para_agentes_cambiar_esto

   # --- Configuración del Frontend ---
   # IMPORTANTE: Cambia localhost por la IP del servidor
   VITE_API_URL=http://192.168.1.100:8000
   ```

   > ⚠️ **IMPORTANTE**: Reemplaza `192.168.1.100` con la IP real de tu servidor

#### Paso 3: Obtener la IP del Servidor

```powershell
# Ver todas las interfaces de red
ipconfig

# Busca la sección "Adaptador de Ethernet" o "Adaptador de LAN inalámbrica"
# Anota la dirección IPv4, por ejemplo: 192.168.1.100
```

#### Paso 4: Configurar el Firewall

```powershell
# Abrir puerto 8000 (Backend API)
New-NetFirewallRule -DisplayName "ITAM Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow

# Abrir puerto 5173 (Frontend Web)
New-NetFirewallRule -DisplayName "ITAM Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# Abrir puerto 5432 (PostgreSQL - opcional, solo si necesitas acceso externo a la BD)
New-NetFirewallRule -DisplayName "ITAM Database" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow
```

#### Paso 5: Iniciar el Servidor

```powershell
# Iniciar todos los servicios
docker-compose up -d

# Ver el estado de los contenedores
docker-compose ps

# Ver los logs (opcional)
docker-compose logs -f
```

Espera aproximadamente 30-60 segundos para que todos los servicios se inicialicen.

#### Paso 6: Verificar la Instalación

1. **Desde el servidor mismo:**
   - Abre el navegador en: `http://localhost:5173`
   - Deberías ver el dashboard del sistema ITAM

2. **Desde otra máquina en la red:**
   - Abre el navegador en: `http://192.168.1.100:5173` (usa la IP de tu servidor)
   - Deberías ver el mismo dashboard

3. **Verificar el backend:**
   - Abre: `http://192.168.1.100:8000/docs`
   - Deberías ver la documentación de la API (Swagger UI)

---

### Opción 2: Instalación Sin Docker (Instalación Manual)

> ⚠️ Esta opción es más compleja y requiere instalar PostgreSQL, Python y Node.js manualmente.

#### Paso 1: Instalar PostgreSQL

1. **Descargar PostgreSQL 17**
   - Descarga desde: https://www.postgresql.org/download/windows/
   - Instala con las opciones por defecto
   - Anota la contraseña del usuario `postgres`

2. **Crear la base de datos**
   ```powershell
   # Abrir psql (busca "SQL Shell (psql)" en el menú inicio)
   # Ingresa la contraseña que configuraste
   
   CREATE DATABASE itam_db;
   \q
   ```

3. **Ejecutar el script de inicialización**
   ```powershell
   cd C:\ITAM-Server\database
   psql -U postgres -d itam_db -f init_schema.sql
   ```

#### Paso 2: Instalar Python y el Backend

1. **Instalar Python 3.11+**
   - Descarga desde: https://www.python.org/downloads/
   - ✅ Marca "Add Python to PATH" durante la instalación

2. **Instalar dependencias del backend**
   ```powershell
   cd C:\ITAM-Server\backend
   pip install -r requirements.txt
   ```

3. **Configurar variables de entorno**
   ```powershell
   # Crear archivo .env en C:\ITAM-Server
   notepad C:\ITAM-Server\.env
   ```

   Contenido del `.env`:
   ```env
   DB_USER=postgres
   DB_PASSWORD=TuPasswordDePostgreSQL
   DB_NAME=itam_db
   DB_HOST=localhost
   DB_PORT=5432
   API_TOKEN=sk_live_token_maestro_para_agentes_cambiar_esto
   PROJECT_NAME=ITAM Server
   PROJECT_VERSION=1.0.0
   ```

4. **Iniciar el backend**
   ```powershell
   cd C:\ITAM-Server\backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

#### Paso 3: Instalar Node.js y el Frontend

1. **Instalar Node.js 20+**
   - Descarga desde: https://nodejs.org/
   - Instala con las opciones por defecto

2. **Instalar dependencias del frontend**
   ```powershell
   cd C:\ITAM-Server\frontend
   npm install
   ```

3. **Configurar la URL del backend**
   ```powershell
   # Editar el archivo .env en la carpeta frontend
   notepad .env
   ```

   Contenido:
   ```env
   VITE_API_URL=http://192.168.1.100:8000
   ```

4. **Compilar y servir el frontend**
   ```powershell
   npm run build
   npm run preview -- --host 0.0.0.0 --port 5173
   ```

#### Paso 4: Configurar como Servicios de Windows (Opcional)

Para que el servidor se inicie automáticamente con Windows, puedes usar NSSM (Non-Sucking Service Manager):

1. **Descargar NSSM**
   - Descarga desde: https://nssm.cc/download

2. **Crear servicio para el backend**
   ```powershell
   nssm install ITAMBackend "C:\Python311\python.exe" "C:\ITAM-Server\backend\main.py"
   nssm set ITAMBackend AppDirectory "C:\ITAM-Server\backend"
   nssm start ITAMBackend
   ```

3. **Crear servicio para el frontend**
   ```powershell
   nssm install ITAMFrontend "C:\Program Files\nodejs\npm.cmd" "run preview"
   nssm set ITAMFrontend AppDirectory "C:\ITAM-Server\frontend"
   nssm start ITAMFrontend
   ```

---

## 🌐 Configuración de IP del Servidor

### Configurar IP Estática (Recomendado)

Para evitar que la IP del servidor cambie y los agentes pierdan conexión:

1. **Abrir Configuración de Red**
   ```
   Panel de Control → Redes e Internet → Centro de redes y recursos compartidos
   → Cambiar configuración del adaptador
   ```

2. **Configurar IP Estática**
   - Clic derecho en tu adaptador de red → Propiedades
   - Selecciona "Protocolo de Internet versión 4 (TCP/IPv4)" → Propiedades
   - Selecciona "Usar la siguiente dirección IP"
   - Configura:
     - **Dirección IP**: `192.168.1.100` (o la que prefieras en tu rango de red)
     - **Máscara de subred**: `255.255.255.0`
     - **Puerta de enlace predeterminada**: `192.168.1.1` (IP de tu router)
     - **Servidor DNS preferido**: `8.8.8.8` (Google DNS)
     - **Servidor DNS alternativo**: `8.8.4.4`

3. **Verificar conectividad**
   ```powershell
   ping 8.8.8.8
   ping google.com
   ```

### Actualizar Configuración Después de Cambiar IP

Si cambias la IP del servidor después de la instalación:

1. **Actualizar archivo `.env` del servidor**
   ```powershell
   notepad C:\ITAM-Server\.env
   ```
   
   Cambia:
   ```env
   VITE_API_URL=http://NUEVA_IP:8000
   ```

2. **Reiniciar servicios**
   
   **Con Docker:**
   ```powershell
   cd C:\ITAM-Server
   docker-compose down
   docker-compose up -d --build
   ```

   **Sin Docker:**
   - Reinicia los servicios de backend y frontend

3. **Actualizar configuración de todos los agentes**
   - Ver sección [Instalación en Máquinas Cliente](#instalación-en-máquinas-cliente)

---

## 📦 Creación de Ejecutable del Agente

Para distribuir el agente sin necesidad de instalar Python en cada máquina cliente:

### Paso 1: Instalar PyInstaller

En tu máquina de desarrollo (donde tienes el código fuente):

```powershell
cd C:\Users\SOFIA\Documents\GitHub\CLIENT-SERVER_IPS-INVENTORY\ITAM-Agent
pip install pyinstaller
```

### Paso 2: Crear Script de Configuración

Crea un archivo `build_agent.ps1` en la carpeta `ITAM-Agent`:

```powershell
# build_agent.ps1
# Script para compilar el agente ITAM a ejecutable

Write-Host "🔨 Compilando ITAM Agent..." -ForegroundColor Cyan

# Limpiar builds anteriores
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "build") { Remove-Item -Recurse -Force "build" }

# Compilar con PyInstaller
pyinstaller --onefile `
    --name "ITAM-Agent" `
    --icon="src/icon.ico" `
    --add-data "config.json.example;." `
    --hidden-import=wmi `
    --hidden-import=win32api `
    --hidden-import=win32con `
    --hidden-import=win32security `
    --noconsole `
    src/main.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Compilación exitosa!" -ForegroundColor Green
    Write-Host "📁 Ejecutable en: dist\ITAM-Agent.exe" -ForegroundColor Yellow
} else {
    Write-Host "❌ Error en la compilación" -ForegroundColor Red
}
```

### Paso 3: Crear Archivo de Configuración del Instalador

Crea `setup_config.json` en la carpeta `ITAM-Agent`:

```json
{
  "server_ip": "192.168.1.100",
  "server_port": "8000",
  "api_token": "sk_live_token_maestro_para_agentes_cambiar_esto",
  "report_interval": 300,
  "request_timeout": 30,
  "max_retries": 3,
  "retry_delay": 5,
  "silent_mode": true
}
```

### Paso 4: Crear Script de Instalación para Clientes

Crea `install_agent.ps1`:

```powershell
# install_agent.ps1
# Script de instalación del agente ITAM en máquinas cliente

param(
    [string]$ServerIP = "192.168.1.100",
    [string]$ServerPort = "8000",
    [string]$ApiToken = "sk_live_token_maestro_para_agentes_cambiar_esto"
)

Write-Host "🚀 Instalando ITAM Agent..." -ForegroundColor Cyan

# Crear directorio de instalación
$InstallDir = "C:\Program Files\ITAM-Agent"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Copiar ejecutable
Write-Host "📁 Copiando archivos..." -ForegroundColor Yellow
Copy-Item "ITAM-Agent.exe" -Destination $InstallDir -Force

# Crear archivo de configuración
$ConfigPath = Join-Path $InstallDir "config.json"
$Config = @{
    api_url = "http://${ServerIP}:${ServerPort}"
    api_token = $ApiToken
    report_interval = 300
    request_timeout = 30
    max_retries = 3
    retry_delay = 5
    silent_mode = $true
} | ConvertTo-Json

$Config | Out-File -FilePath $ConfigPath -Encoding UTF8

Write-Host "⚙️ Configurando servicio de Windows..." -ForegroundColor Yellow

# Crear tarea programada para ejecutar el agente al inicio
$Action = New-ScheduledTaskAction -Execute "$InstallDir\ITAM-Agent.exe"
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "ITAM Agent" -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force

# Iniciar el agente
Start-ScheduledTask -TaskName "ITAM Agent"

Write-Host "✅ Instalación completada!" -ForegroundColor Green
Write-Host "📊 El agente está reportando al servidor: http://${ServerIP}:${ServerPort}" -ForegroundColor Cyan
Write-Host "🔍 Para verificar el estado, visita: http://${ServerIP}:5173" -ForegroundColor Cyan
```

### Paso 5: Compilar el Agente

```powershell
cd C:\Users\SOFIA\Documents\GitHub\CLIENT-SERVER_IPS-INVENTORY\ITAM-Agent

# Ejecutar el script de compilación
.\build_agent.ps1
```

### Paso 6: Crear Paquete de Distribución

Crea una carpeta de distribución con todo lo necesario:

```powershell
# Crear carpeta de distribución
New-Item -ItemType Directory -Path "ITAM-Agent-Installer" -Force

# Copiar archivos necesarios
Copy-Item "dist\ITAM-Agent.exe" -Destination "ITAM-Agent-Installer\"
Copy-Item "install_agent.ps1" -Destination "ITAM-Agent-Installer\"
Copy-Item "setup_config.json" -Destination "ITAM-Agent-Installer\"

# Crear README para el instalador
@"
# ITAM Agent - Instalador

## Instalación Rápida

1. Edita el archivo setup_config.json con la IP de tu servidor
2. Ejecuta como Administrador:
   .\install_agent.ps1

## Instalación Personalizada

.\install_agent.ps1 -ServerIP "192.168.1.100" -ServerPort "8000" -ApiToken "tu_token"

## Verificación

Visita http://IP_DEL_SERVIDOR:5173 para ver si el equipo aparece en el inventario.
"@ | Out-File -FilePath "ITAM-Agent-Installer\README.txt" -Encoding UTF8

Write-Host "✅ Paquete de distribución creado en: ITAM-Agent-Installer\" -ForegroundColor Green
```

---

## 🏢 Creación de Ejecutable del Servidor

Para distribuir el servidor completo sin Docker ni código fuente:

> ⚠️ **Nota**: Esta opción es más compleja. Se recomienda usar Docker para el servidor.

### Opción 1: Crear Instalador con Docker Embebido

Puedes crear un instalador que incluya Docker Desktop y los contenedores pre-configurados:

1. **Exportar las imágenes Docker**
   ```powershell
   cd C:\ITAM-Server
   
   # Asegúrate de que los contenedores estén corriendo
   docker-compose up -d
   
   # Exportar imágenes
   docker save -o itam_backend.tar itam-server_backend
   docker save -o itam_frontend.tar itam-server_frontend
   docker save -o postgres.tar postgres:17
   ```

2. **Crear script de instalación**
   
   Crea `install_server.ps1`:

```powershell
# install_server.ps1
# Instalador del servidor ITAM

param(
    [string]$ServerIP = "192.168.1.100",
    [string]$DBPassword = "sql",
    [string]$ApiToken = "sk_live_token_maestro_para_agentes"
)

Write-Host "🚀 Instalando ITAM Server..." -ForegroundColor Cyan

# Verificar si Docker está instalado
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker no está instalado." -ForegroundColor Red
    Write-Host "Por favor instala Docker Desktop desde: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Crear directorio de instalación
$InstallDir = "C:\ITAM-Server"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Copiar archivos
Write-Host "📁 Copiando archivos del servidor..." -ForegroundColor Yellow
Copy-Item -Path ".\*" -Destination $InstallDir -Recurse -Force

# Cargar imágenes Docker
Write-Host "🐳 Cargando imágenes Docker..." -ForegroundColor Yellow
docker load -i "$InstallDir\itam_backend.tar"
docker load -i "$InstallDir\itam_frontend.tar"
docker load -i "$InstallDir\postgres.tar"

# Crear archivo .env
Write-Host "⚙️ Configurando variables de entorno..." -ForegroundColor Yellow
$EnvContent = @"
DB_USER=postgres
DB_PASSWORD=$DBPassword
DB_NAME=itam_db
DB_HOST=db
DB_PORT=5432
PROJECT_NAME=ITAM Server
PROJECT_VERSION=1.0.0
API_TOKEN=$ApiToken
VITE_API_URL=http://${ServerIP}:8000
"@

$EnvContent | Out-File -FilePath "$InstallDir\.env" -Encoding UTF8

# Configurar firewall
Write-Host "🔥 Configurando firewall..." -ForegroundColor Yellow
New-NetFirewallRule -DisplayName "ITAM Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "ITAM Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

# Iniciar servicios
Write-Host "🚀 Iniciando servicios..." -ForegroundColor Yellow
Set-Location $InstallDir
docker-compose up -d

Write-Host "✅ Instalación completada!" -ForegroundColor Green
Write-Host "🌐 Accede al sistema en: http://${ServerIP}:5173" -ForegroundColor Cyan
Write-Host "📚 API Docs en: http://${ServerIP}:8000/docs" -ForegroundColor Cyan
```

### Opción 2: Compilar Backend y Frontend como Ejecutables

Esta opción es más compleja pero no requiere Docker:

#### Backend

```powershell
cd C:\ITAM-Server\backend

# Instalar PyInstaller
pip install pyinstaller

# Compilar
pyinstaller --onefile `
    --name "ITAM-Backend" `
    --add-data "models;models" `
    --add-data "routers;routers" `
    --add-data "schemas;schemas" `
    --hidden-import=uvicorn `
    --hidden-import=sqlalchemy `
    main.py
```

#### Frontend

```powershell
cd C:\ITAM-Server\frontend

# Compilar para producción
npm run build

# Los archivos compilados estarán en la carpeta 'dist'
# Necesitarás un servidor web como nginx o http-server para servirlos
```

---

## 💻 Instalación en Máquinas Cliente

### Método 1: Instalación Manual

1. **Copiar el paquete de instalación**
   - Copia la carpeta `ITAM-Agent-Installer` a la máquina cliente
   - Puede ser mediante USB, carpeta compartida en red, etc.

2. **Editar configuración**
   - Abre `setup_config.json`
   - Cambia `server_ip` por la IP de tu servidor
   - Guarda el archivo

3. **Ejecutar instalador**
   - Clic derecho en `install_agent.ps1`
   - Selecciona "Ejecutar con PowerShell como administrador"
   - Espera a que termine la instalación

4. **Verificar instalación**
   - Abre el navegador en: `http://IP_DEL_SERVIDOR:5173`
   - El equipo debería aparecer en el inventario en ~5 minutos

### Método 2: Instalación Remota con PowerShell

Si tienes acceso remoto a las máquinas:

```powershell
# En tu máquina de administración

$Computers = @("PC-001", "PC-002", "PC-003")  # Lista de computadoras
$ServerIP = "192.168.1.100"
$ApiToken = "sk_live_token_maestro_para_agentes"

foreach ($Computer in $Computers) {
    Write-Host "Instalando en $Computer..." -ForegroundColor Cyan
    
    # Copiar archivos
    Copy-Item -Path "ITAM-Agent-Installer\*" -Destination "\\$Computer\C$\Temp\ITAM" -Recurse -Force
    
    # Ejecutar instalación remota
    Invoke-Command -ComputerName $Computer -ScriptBlock {
        param($IP, $Token)
        Set-Location "C:\Temp\ITAM"
        .\install_agent.ps1 -ServerIP $IP -ApiToken $Token
    } -ArgumentList $ServerIP, $ApiToken
    
    Write-Host "✅ Instalado en $Computer" -ForegroundColor Green
}
```

### Método 3: Despliegue con GPO (Group Policy)

Para redes con Active Directory:

1. **Crear script de inicio**
   - Copia `install_agent.ps1` a `\\dominio.local\SYSVOL\scripts\`

2. **Crear GPO**
   - Abre "Administración de directivas de grupo"
   - Crea nueva GPO: "Instalar ITAM Agent"
   - Edita la GPO:
     - Configuración del equipo → Directivas → Configuración de Windows → Scripts → Inicio
     - Agrega el script `install_agent.ps1`

3. **Vincular GPO**
   - Vincula la GPO a la OU que contiene los equipos
   - Los equipos instalarán el agente en el próximo reinicio

---

## 🔍 Troubleshooting

### El servidor no es accesible desde otras máquinas

**Síntomas:**
- Puedes acceder a `http://localhost:5173` desde el servidor
- No puedes acceder desde otras máquinas en la red

**Soluciones:**

1. **Verificar firewall**
   ```powershell
   # Ver reglas de firewall
   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*ITAM*"}
   
   # Si no existen, crearlas
   New-NetFirewallRule -DisplayName "ITAM Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "ITAM Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
   ```

2. **Verificar que Docker esté escuchando en todas las interfaces**
   ```powershell
   # Ver puertos abiertos
   netstat -an | findstr "8000"
   netstat -an | findstr "5173"
   
   # Deberías ver: 0.0.0.0:8000 y 0.0.0.0:5173
   ```

3. **Verificar conectividad de red**
   ```powershell
   # Desde otra máquina, hacer ping al servidor
   ping 192.168.1.100
   
   # Probar conexión al puerto
   Test-NetConnection -ComputerName 192.168.1.100 -Port 8000
   Test-NetConnection -ComputerName 192.168.1.100 -Port 5173
   ```

### Los agentes no se conectan al servidor

**Síntomas:**
- El agente está instalado pero no aparece en el inventario

**Soluciones:**

1. **Verificar configuración del agente**
   ```powershell
   # Ver configuración
   notepad "C:\Program Files\ITAM-Agent\config.json"
   
   # Verificar que api_url tenga la IP correcta
   # Verificar que api_token coincida con el del servidor
   ```

2. **Probar conexión manualmente**
   ```powershell
   # Desde la máquina cliente
   curl http://192.168.1.100:8000
   
   # Debería responder: {"status":"online"}
   ```

3. **Ver logs del agente**
   ```powershell
   # Ver eventos de la tarea programada
   Get-ScheduledTask -TaskName "ITAM Agent" | Get-ScheduledTaskInfo
   
   # Ver logs de eventos de Windows
   Get-EventLog -LogName Application -Source "ITAM Agent" -Newest 10
   ```

4. **Reiniciar el agente**
   ```powershell
   Stop-ScheduledTask -TaskName "ITAM Agent"
   Start-ScheduledTask -TaskName "ITAM Agent"
   ```

### Error de token de autenticación

**Síntomas:**
- Los agentes reportan error 401 o 403

**Solución:**

1. **Verificar token en el servidor**
   ```powershell
   # Ver el token configurado
   type C:\ITAM-Server\.env | findstr API_TOKEN
   ```

2. **Verificar token en el agente**
   ```powershell
   # Ver el token del agente
   type "C:\Program Files\ITAM-Agent\config.json" | findstr api_token
   ```

3. **Asegurarse de que coincidan**
   - Ambos tokens deben ser exactamente iguales
   - Si no coinciden, edita el config.json del agente y reinicia

### La base de datos no se inicializa

**Síntomas:**
- Error al iniciar el backend
- Mensajes de "connection refused" o "database does not exist"

**Soluciones:**

1. **Verificar que PostgreSQL esté corriendo**
   ```powershell
   docker ps | findstr postgres
   
   # Debería mostrar el contenedor itam_db
   ```

2. **Ver logs de PostgreSQL**
   ```powershell
   docker logs itam_db
   ```

3. **Reiniciar la base de datos**
   ```powershell
   docker-compose restart db
   
   # Esperar 30 segundos
   docker-compose restart backend
   ```

4. **Recrear la base de datos desde cero**
   ```powershell
   # ⚠️ ADVERTENCIA: Esto borrará todos los datos
   docker-compose down -v
   docker-compose up -d
   ```

### El frontend muestra errores de conexión

**Síntomas:**
- El frontend carga pero no muestra datos
- Errores en la consola del navegador (F12)

**Soluciones:**

1. **Verificar la URL del backend**
   ```powershell
   # Ver configuración
   type C:\ITAM-Server\.env | findstr VITE_API_URL
   
   # Debe apuntar a la IP correcta
   ```

2. **Verificar CORS en el backend**
   - Edita `C:\ITAM-Server\backend\main.py`
   - Verifica que la configuración de CORS permita tu origen

3. **Limpiar caché del navegador**
   - Presiona Ctrl+Shift+Delete
   - Borra caché y cookies
   - Recarga la página (Ctrl+F5)

4. **Reconstruir el frontend**
   ```powershell
   docker-compose down
   docker-compose up -d --build frontend
   ```

### Problemas de rendimiento

**Síntomas:**
- El sistema es lento
- Muchos equipos reportando

**Soluciones:**

1. **Aumentar recursos de Docker**
   - Abre Docker Desktop → Settings → Resources
   - Aumenta CPU y RAM asignados

2. **Optimizar intervalo de reporte**
   - Edita `config.json` de los agentes
   - Aumenta `report_interval` de 300 a 600 segundos (10 minutos)

3. **Limpiar datos antiguos**
   ```sql
   -- Conectarse a la base de datos
   docker exec -it itam_db psql -U postgres -d itam_db
   
   -- Eliminar equipos que no han reportado en 30 días
   DELETE FROM activos WHERE ultima_actualizacion < NOW() - INTERVAL '30 days';
   ```

---

## 📚 Recursos Adicionales

### Documentación
- [QUICK_START.md](file:///c:/Users/SOFIA/Documents/GitHub/CLIENT-SERVER_IPS-INVENTORY/QUICK_START.md) - Guía de inicio rápido
- [ITAM-Server/README.md](file:///c:/Users/SOFIA/Documents/GitHub/CLIENT-SERVER_IPS-INVENTORY/ITAM-Server/README.md) - Documentación del servidor
- [ITAM-Agent/README.md](file:///c:/Users/SOFIA/Documents/GitHub/CLIENT-SERVER_IPS-INVENTORY/ITAM-Agent/README.md) - Documentación del agente

### Comandos Útiles

```powershell
# Ver estado de servicios Docker
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar un servicio específico
docker-compose restart backend

# Detener todo
docker-compose down

# Iniciar todo
docker-compose up -d

# Ver uso de recursos
docker stats

# Backup de la base de datos
docker exec itam_db pg_dump -U postgres itam_db > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# Restaurar base de datos
docker exec -i itam_db psql -U postgres itam_db < backup_20260202_120000.sql
```

---

## ✅ Checklist de Instalación

### Servidor
- [ ] Docker Desktop instalado
- [ ] IP estática configurada
- [ ] Firewall configurado (puertos 8000 y 5173)
- [ ] Archivo `.env` configurado con IP correcta
- [ ] Servicios Docker iniciados
- [ ] Acceso web verificado desde otra máquina

### Agentes
- [ ] Ejecutable compilado
- [ ] Paquete de instalación creado
- [ ] Configuración con IP del servidor
- [ ] Token de API configurado
- [ ] Instalado en máquinas cliente
- [ ] Equipos aparecen en el inventario

### Red
- [ ] Todas las máquinas en la misma red LAN
- [ ] Servidor con IP estática
- [ ] Firewall permite tráfico en puertos necesarios
- [ ] Conectividad verificada con ping y Test-NetConnection

---

## 🎉 ¡Listo!

Tu sistema ITAM está completamente desplegado y funcionando en tu red LAN. Los agentes están reportando automáticamente y puedes monitorear todos tus equipos desde el dashboard web.

**¿Necesitas ayuda?** Consulta la sección de [Troubleshooting](#troubleshooting) o revisa los logs de los servicios.

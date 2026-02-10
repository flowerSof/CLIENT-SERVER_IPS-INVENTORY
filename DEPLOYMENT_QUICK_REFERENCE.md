# 📦 Guía Rápida de Despliegue - ITAM System

## 🎯 Para Instalar el Servidor

### Opción 1: Con Docker (Recomendado)

```powershell
# 1. Navega a la carpeta del servidor
cd ITAM-Server

# 2. Ejecuta el instalador
.\install_server.ps1

# El script te pedirá la IP del servidor y configurará todo automáticamente
```

### Opción 2: Manual

```powershell
# 1. Copia .env.example a .env
copy .env.example .env

# 2. Edita .env y cambia VITE_API_URL con tu IP
notepad .env

# 3. Inicia Docker
docker-compose up -d

# 4. Accede a http://TU_IP:5173
```

---

## 💻 Para Crear el Instalador del Agente

```powershell
# 1. Navega a la carpeta del agente
cd ITAM-Agent

# 2. Compila el agente a ejecutable
.\build_agent.ps1

# 3. Crea el paquete de instalación
.\create_installer_package.ps1

# 4. Edita la configuración en la carpeta generada
notepad ITAM-Agent-Installer\setup_config.json

# 5. Distribuye la carpeta ITAM-Agent-Installer a las máquinas cliente
```

---

## 🖥️ Para Instalar el Agente en Clientes

```powershell
# 1. Copia la carpeta ITAM-Agent-Installer a la máquina cliente

# 2. Edita setup_config.json con la IP de tu servidor
notepad setup_config.json

# 3. Ejecuta como Administrador
.\install_agent.ps1

# 4. Verifica en http://IP_SERVIDOR:5173 que el equipo aparece
```

---

## 📚 Documentación Completa

Para instrucciones detalladas, consulta:

- **[GUIA_DESPLIEGUE.md](GUIA_DESPLIEGUE.md)** - Guía completa de instalación y despliegue
- **[QUICK_START.md](QUICK_START.md)** - Guía de inicio rápido para desarrollo
- **[ITAM-Server/README.md](ITAM-Server/README.md)** - Documentación del servidor
- **[ITAM-Agent/README.md](ITAM-Agent/README.md)** - Documentación del agente

---

## 🔧 Comandos Útiles

### Servidor
```powershell
# Iniciar
docker-compose up -d

# Detener
docker-compose down

# Ver logs
docker-compose logs -f

# Ver estado
docker-compose ps
```

### Agente
```powershell
# Ver estado
Get-ScheduledTask -TaskName "ITAM Agent"

# Reiniciar
Stop-ScheduledTask -TaskName "ITAM Agent"
Start-ScheduledTask -TaskName "ITAM Agent"

# Desinstalar
.\uninstall_agent.ps1
```

---

## ⚡ Resumen de Archivos Creados

### Scripts del Agente
- `build_agent.ps1` - Compila el agente a ejecutable
- `create_installer_package.ps1` - Crea paquete de distribución
- `install_agent.ps1` - Instala el agente en clientes
- `setup_config.json` - Configuración para instalación

### Scripts del Servidor
- `install_server.ps1` - Instala el servidor con Docker
- `start_server.ps1` - Inicia el servidor
- `stop_server.ps1` - Detiene el servidor
- `status_server.ps1` - Muestra estado del servidor

### Documentación
- `GUIA_DESPLIEGUE.md` - Guía completa de despliegue
- `DEPLOYMENT_QUICK_REFERENCE.md` - Esta guía rápida

---

## 🎉 ¡Listo!

Con estos scripts puedes:
- ✅ Instalar el servidor en cualquier red LAN
- ✅ Cambiar la IP del servidor fácilmente
- ✅ Crear ejecutables del agente para distribuir
- ✅ Instalar agentes en múltiples máquinas sin código fuente

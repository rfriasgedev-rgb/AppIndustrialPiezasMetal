<#
.SYNOPSIS
    Script de despliegue de AppIndustrialPiezasMetal en Google Cloud Compute Engine.

.DESCRIPTION
    Este script crea una VM en GCP, la configura con Docker + Docker Compose,
    clona el repositorio y levanta todos los servicios automáticamente.

    REQUISITOS PREVIOS:
    1. gcloud CLI instalado y autenticado: gcloud auth login
    2. Repositorio subido a GitHub

    USO:
        .\deploy.ps1
        .\deploy.ps1 -ProjectId "mi-proyecto" -RepoUrl "https://github.com/user/repo.git"
#>

param(
    [string]$ProjectId    = "metalerp-produccion",
    [string]$Region       = "us-central1",
    [string]$Zone         = "us-central1-a",
    [string]$VmName       = "metalerp-vm",
    [string]$MachineType  = "e2-medium",
    [string]$DiskSizeGb   = "30",
    [string]$RepoUrl      = "",          # Ej: https://github.com/usuario/AppIndustrialPiezasMetal.git
    [string]$DbUser       = "metalerp",
    [string]$DbName       = "metal_parts_db"
)

$ErrorActionPreference = "Stop"

# ═══════════════════════════════════════════════════════════
# FUNCIONES DE UTILIDAD
# ═══════════════════════════════════════════════════════════
function Write-Step([int]$n, [int]$total, [string]$msg) {
    Write-Host ""
    Write-Host "[$n/$total] $msg" -ForegroundColor Yellow
}

function Invoke-Gcloud([string[]]$args) {
    $result = & gcloud @args 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Error ejecutando: gcloud $($args -join ' ')`n$result" }
    return $result
}

# ═══════════════════════════════════════════════════════════
# BANNER
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   MetalERP — Deploy a Google Cloud Compute Engine        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host " Proyecto  : $ProjectId"
Write-Host " VM        : $VmName  ($MachineType)"
Write-Host " Zona      : $Zone"
Write-Host ""

# ═══════════════════════════════════════════════════════════
# PASO 1: Validar dependencias
# ═══════════════════════════════════════════════════════════
Write-Step 1 6 "Validando dependencias..."

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    # Intentar ruta de instalación por defecto en Windows
    $gcloudDefault = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    if (Test-Path $gcloudDefault) {
        Set-Alias gcloud $gcloudDefault -Scope Script
        Write-Host "   ✅ gcloud encontrado en: $gcloudDefault"
    } else {
        Write-Error "❌ gcloud CLI no encontrado en el PATH ni en la ruta por defecto.`nDescárgalo de: https://cloud.google.com/sdk/docs/install"
    }
} else {
    Write-Host "   ✅ gcloud disponible."
}

# Validar autenticación
$authList = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>&1
if ([string]::IsNullOrWhiteSpace($authList)) {
    Write-Error "❌ No hay sesión activa en gcloud. Ejecuta: gcloud auth login"
}
Write-Host "   ✅ Autenticado como: $authList"

# Configurar proyecto
Invoke-Gcloud @("config", "set", "project", $ProjectId) | Out-Null
Write-Host "   ✅ Proyecto activo: $ProjectId"

# Solicitar RepoUrl si no se pasó
if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
    $RepoUrl = Read-Host "   🔗 URL del repositorio Git (ej: https://github.com/usuario/repo.git)"
}
if ([string]::IsNullOrWhiteSpace($RepoUrl)) {
    Write-Error "❌ La URL del repositorio es obligatoria."
}

# ═══════════════════════════════════════════════════════════
# PASO 2: Solicitar secretos de forma interactiva
# ═══════════════════════════════════════════════════════════
Write-Step 2 6 "Configurando secretos..."
Write-Host "   Los secretos se pasan a la VM como metadata cifrada (nunca en el repositorio)." -ForegroundColor Gray

$DbPasswordSec    = Read-Host "   🔑 Contraseña para usuario DB '$DbUser'" -AsSecureString
$DbRootPassSec    = Read-Host "   🔑 Contraseña ROOT de MariaDB" -AsSecureString
$JwtSecretSec     = Read-Host "   🔑 JWT Secret (Enter para generar automáticamente)"  -AsSecureString

$DbPassword    = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPasswordSec))
$DbRootPass    = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbRootPassSec))
$JwtSecret     = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($JwtSecretSec))

if ([string]::IsNullOrWhiteSpace($DbPassword))   { $DbPassword   = "MetalErp_$(Get-Random -Max 9999)!" }
if ([string]::IsNullOrWhiteSpace($DbRootPass))   { $DbRootPass   = "Root_$(Get-Random -Max 9999)!" }
if ([string]::IsNullOrWhiteSpace($JwtSecret))    { $JwtSecret    = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) }

Write-Host "   ✅ Secretos configurados."

# ═══════════════════════════════════════════════════════════
# PASO 3: Preparar el startup script
# ═══════════════════════════════════════════════════════════
Write-Step 3 6 "Preparando startup script..."

$StartupScript = Get-Content ".\vm-startup.sh" -Raw
$StartupScript = $StartupScript -replace "__REPO_URL__", $RepoUrl

$TmpStartupFile = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllText($TmpStartupFile, $StartupScript, [System.Text.Encoding]::UTF8)

Write-Host "   ✅ Startup script listo."

# ═══════════════════════════════════════════════════════════
# PASO 4: Crear reglas de Firewall (si no existen)
# ═══════════════════════════════════════════════════════════
Write-Step 4 6 "Configurando firewall..."

$existingRules = gcloud compute firewall-rules list --filter="name=allow-http-metalerp" --format="value(name)" 2>&1
if ([string]::IsNullOrWhiteSpace($existingRules)) {
    Write-Host "   Creando regla de firewall allow-http-metalerp..."
    Invoke-Gcloud @(
        "compute", "firewall-rules", "create", "allow-http-metalerp",
        "--allow", "tcp:80,tcp:443",
        "--source-ranges", "0.0.0.0/0",
        "--target-tags", "metalerp-web",
        "--description", "Permite tráfico HTTP/HTTPS a MetalERP",
        "--project", $ProjectId
    ) | Out-Null
    Write-Host "   ✅ Firewall HTTP/HTTPS creado."
} else {
    Write-Host "   ✅ Regla de firewall ya existe, omitiendo."
}

# ═══════════════════════════════════════════════════════════
# PASO 5: Crear la VM
# ═══════════════════════════════════════════════════════════
Write-Step 5 6 "Creando la instancia VM en Compute Engine..."

# Verificar si la VM ya existe
$existingVm = gcloud compute instances list --filter="name=$VmName AND zone=$Zone" --format="value(name)" 2>&1
if (-not [string]::IsNullOrWhiteSpace($existingVm)) {
    Write-Host "   ⚠️  La VM '$VmName' ya existe." -ForegroundColor DarkYellow
    $confirm = Read-Host "   ¿Deseas eliminarla y recrearla? (s/N)"
    if ($confirm.ToLower() -eq 's') {
        Write-Host "   Eliminando VM existente..."
        Invoke-Gcloud @("compute", "instances", "delete", $VmName, "--zone", $Zone, "--quiet")
    } else {
        Write-Host "   Omitiendo creación. La VM existente será reutilizada."
        goto SetupMetadata
    }
}

Write-Host "   Creando VM '$VmName'... (esto puede tardar 1-2 minutos)"
Invoke-Gcloud @(
    "compute", "instances", "create", $VmName,
    "--zone", $Zone,
    "--machine-type", $MachineType,
    "--image-family", "ubuntu-2204-lts",
    "--image-project", "ubuntu-os-cloud",
    "--boot-disk-size", "$($DiskSizeGb)GB",
    "--boot-disk-type", "pd-ssd",
    "--tags", "metalerp-web,http-server,https-server",
    "--metadata-from-file", "startup-script=$TmpStartupFile",
    "--metadata", "db_password=$DbPassword,db_root_password=$DbRootPass,jwt_secret=$JwtSecret,db_user=$DbUser,db_name=$DbName",
    "--scopes", "cloud-platform",
    "--project", $ProjectId
)

Write-Host "   ✅ VM creada exitosamente."

# ═══════════════════════════════════════════════════════════
# PASO 6: Obtener IP y mostrar resumen
# ═══════════════════════════════════════════════════════════
Write-Step 6 6 "Obteniendo información de la VM..."

$ExternalIp = Invoke-Gcloud @(
    "compute", "instances", "describe", $VmName,
    "--zone", $Zone,
    "--format", "value(networkInterfaces[0].accessConfigs[0].natIP)"
)
$ExternalIp = $ExternalIp.Trim()

# Limpiar archivo temporal
Remove-Item $TmpStartupFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅  DESPLIEGUE INICIADO EXITOSAMENTE                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host " 🌐  IP Externa     : $ExternalIp" -ForegroundColor Cyan
Write-Host " 🔗  URL App        : http://$ExternalIp" -ForegroundColor Cyan
Write-Host " 🔑  Admin Login    : admin@metalerp.com / Admin123!" -ForegroundColor Cyan
Write-Host ""
Write-Host " ⏳  IMPORTANTE: La VM tardará ~3-5 minutos en instalar Docker" -ForegroundColor Yellow
Write-Host "     y levantar todos los contenedores por primera vez." -ForegroundColor Yellow
Write-Host ""
Write-Host " 📋  Comandos útiles:" -ForegroundColor White
Write-Host "     - Ver logs del startup:"
Write-Host "       gcloud compute ssh $VmName --zone $Zone -- 'tail -f /var/log/metalerp-startup.log'"
Write-Host ""
Write-Host "     - Ver estado de contenedores:"
Write-Host "       gcloud compute ssh $VmName --zone $Zone -- 'cd /opt/appindustrial && docker compose ps'"
Write-Host ""
Write-Host "     - Conectarse a la VM:"
Write-Host "       gcloud compute ssh $VmName --zone $Zone"
Write-Host ""

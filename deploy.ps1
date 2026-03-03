<#
.SYNOPSIS
    Script de despliegue automatizado para AppIndustrialPiezasMetal hacia Google Cloud Platform (GCP).
    
.DESCRIPTION
    Este script asume que ya tienes instalados y configurados:
    1. Google Cloud CLI (gcloud) - Autenticado y apuntando al proyecto correcto.
    2. Firebase CLI (firebase-tools) - Autenticado.
    3. Node.js y npm.
    
    El script realizará las siguientes acciones:
    - Verificará los requisitos.
    - Desplegará el backend a Google Cloud Run.
    - Capturará la URL de Cloud Run generada.
    - Actualizará el frontend con la nueva URL de la API.
    - Compilará el frontend (React/Vite).
    - Desplegará el frontend a Firebase Hosting.
#>

$ErrorActionPreference = "Stop"

# --- CONFIGURACIÓN DEL PROYECTO ---
$GCP_PROJECT_ID = "metalerp-produccion" # Reemplaza con tu ID de proyecto real en GCP
$GCP_REGION = "us-central1"
$CLOUD_RUN_SERVICE_NAME = "metalerp-backend"
# ----------------------------------

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " Iniciando Despliegue Automatizado a Google Cloud" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Verificaciones previas
Write-Host "`n[1/5] Verificando dependencias..." -ForegroundColor Yellow
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "Google Cloud CLI (gcloud) no está instalado o no está en el PATH."
}
if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "npx no está instalado. Asegúrate de tener Node.js y npm instalados."
}

# Comprobar/Establecer proyecto activo en gcloud
Write-Host "Configurando proyecto activo en gcloud a: metalerp-produccion"
gcloud config set project metalerp-produccion

# 2. Despliegue del Backend (Cloud Run)
Write-Host "`n[2/5] Desplegando Backend en Google Cloud Run..." -ForegroundColor Yellow
$BackendDir = ".\backend"
if (!(Test-Path $BackendDir)) {
    Write-Error "No se encontró el directorio del backend."
}

Set-Location $BackendDir

Write-Host "Ejecutando gcloud run deploy..."
# Capturamos la salida para extraer la URL
# Usamos --format="value(status.url)" para obtener solo la URL directamente
$CloudRunUrl = gcloud run deploy $CLOUD_RUN_SERVICE_NAME `
    --source . `
    --platform managed `
    --region $GCP_REGION `
    --allow-unauthenticated `
    --quiet `
    --format="value(status.url)"

if ([string]::IsNullOrWhiteSpace($CloudRunUrl)) {
    Write-Error "Fallo al obtener la URL de Cloud Run tras el despliegue."
}

Write-Host "Backend desplegado exitosamente en: $CloudRunUrl" -ForegroundColor Green

# 3. Configurar Frontend
Write-Host "`n[3/5] Configurando URL del API en el Frontend..." -ForegroundColor Yellow
Set-Location "..\frontend"

$FrontendEnvFile = ".env.production"
$ApiUrl = "$CloudRunUrl/api"

Write-Host "Creando/Actualizando $FrontendEnvFile con VITE_API_URL=$ApiUrl"
"VITE_API_URL=$ApiUrl" | Out-File -FilePath $FrontendEnvFile -Encoding UTF8 -Force

# 4. Compilar Frontend
Write-Host "`n[4/5] Compilando Frontend (React/Vite)..." -ForegroundColor Yellow
Write-Host "Instalando dependencias si es necesario..."
npm install

Write-Host "Ejecutando build..."
npm run build

# 5. Desplegar Frontend (Firebase)
Write-Host "`n[5/5] Desplegando Frontend en Firebase Hosting..." -ForegroundColor Yellow
# Usamos npx para evitar requerir la instalación global de firebase-tools
npx --yes firebase-tools deploy --only hosting --project $GCP_PROJECT_ID

Set-Location ".."

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host " Despliegue Completado de forma Exitosa!" -ForegroundColor Green
Write-Host " Tu Backend está en: $CloudRunUrl"
Write-Host " Tu Frontend se ha publicado en Firebase."
Write-Host "======================================================" -ForegroundColor Cyan

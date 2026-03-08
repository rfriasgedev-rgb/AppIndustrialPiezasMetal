Write-Host "=================================================="
Write-Host "  Iniciando MetalERP (Backend & Frontend)"
Write-Host "=================================================="

# Función para matar procesos usando un puerto específico
function Kill-ProcessOnPort {
    param([int]$Port)
    $Connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($Connections) {
        foreach ($Conn in $Connections) {
            $ProcessId = $Conn.OwningProcess
            if ($ProcessId -ne 0 -and $ProcessId -ne 4) {
                # Evita System Idle y System
                Write-Host "⚠️ Puerto $Port está en uso por el PID $ProcessId. Deteniendo proceso..."
                Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
                Write-Host "✅ Proceso $ProcessId detenido."
            }
        }
        Start-Sleep -Seconds 1 # Espera breve para asegurar liberación del puerto
    }
}

# 0. Limpiar puertos conflictivos
Kill-ProcessOnPort -Port 3001
Kill-ProcessOnPort -Port 5173

# 1. Iniciar el Backend
Write-Host "[1/2] Iniciando Backend en puerto 3001..."
Start-Process "cmd.exe" -ArgumentList "/k cd backend && npm run dev" -WindowStyle Normal

# Dar un momento al backend para arrancar
Start-Sleep -Seconds 2

# 2. Iniciar el Frontend
Write-Host "[2/2] Iniciando Frontend en puerto 5173..."
Start-Process "cmd.exe" -ArgumentList "/k cd frontend && npm run dev" -WindowStyle Normal

Write-Host "=================================================="
Write-Host " Servicios iniciados:"
Write-Host " - Backend API: http://localhost:3001/api"
Write-Host " - Frontend UI: http://localhost:5173"
Write-Host "=================================================="
Write-Host ""
Write-Host "Se han abierto dos ventanas nuevas para los servidores."
Write-Host "Para detenerlos, simplemente cierra esas ventanas."

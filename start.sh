#!/usr/bin/env bash

echo "=================================================="
echo "  Iniciando MetalERP (Backend & Frontend)"
echo "=================================================="

# Detectar OS para usar comandos apropiados
OS_TYPE="UNIX"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    OS_TYPE="WINDOWS"
fi

# 1. Iniciar el Backend
echo "[1/2] Iniciando Backend en puerto 3001..."
cd backend
if [ "$OS_TYPE" == "WINDOWS" ]; then
    start "MetalERP_Backend" cmd /c "npm run dev"
else
    npm run dev &
fi
cd ..

# Dar un momento al backend para arrancar
sleep 3

# 2. Iniciar el Frontend
echo "[2/2] Iniciando Frontend en puerto 5173..."
cd frontend
if [ "$OS_TYPE" == "WINDOWS" ]; then
    start "MetalERP_Frontend" cmd /c "npm run dev"
else
    npm run dev &
fi
cd ..

echo "=================================================="
echo " Servicios iniciados:"
echo " - Backend API: http://localhost:3001/api"
echo " - Frontend UI: http://localhost:5173"
echo "=================================================="
echo ""
echo "En Windows: Se han abierto dos ventanas nuevas para los servidores."
echo "En Linux/Mac: Los servidores corren en segundo plano."
echo "Para detener:"
echo " - Windows: Cierra las ventanas que se abrieron."
echo " - Linux/Mac: Usa 'pkill node' o 'kill %1 %2' (con cuidado)."

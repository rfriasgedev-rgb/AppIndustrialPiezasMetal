#!/usr/bin/env bash
# =============================================================================
# vm-startup.sh — Script de inicio para la VM de GCP (Compute Engine)
# Se ejecuta automáticamente al arrancar la instancia por primera vez.
# =============================================================================
set -euo pipefail

LOG_FILE="/var/log/metalerp-startup.log"
APP_DIR="/opt/appindustrial"
REPO_URL="__REPO_URL__"   # Reemplazado por deploy.ps1 al crear la VM

exec > >(tee -a "$LOG_FILE") 2>&1
echo "======================================================="
echo " MetalERP - Startup Script"
echo " $(date)"
echo "======================================================="

# ─────────────────────────────────────────────
# 1. Actualizar sistema
# ─────────────────────────────────────────────
echo "[1/7] Actualizando sistema..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ca-certificates gnupg lsb-release

# ─────────────────────────────────────────────
# 2. Instalar Docker Engine
# ─────────────────────────────────────────────
echo "[2/7] Instalando Docker..."
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
        | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
else
    echo "   Docker ya instalado, omitiendo."
fi

# ─────────────────────────────────────────────
# 3. Clonar / actualizar repositorio
# ─────────────────────────────────────────────
echo "[3/7] Clonando repositorio..."
if [ -d "$APP_DIR/.git" ]; then
    echo "   Repositorio existente detectado, actualizando..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ─────────────────────────────────────────────
# 4. Crear archivo .env desde metadata de la VM
# ─────────────────────────────────────────────
echo "[4/7] Configurando variables de entorno..."
METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
HEADERS="-H 'Metadata-Flavor: Google'"

get_meta() {
    curl -sf -H "Metadata-Flavor: Google" \
        "${METADATA_URL}/${1}" || echo "${2:-}"
}

DB_PASSWORD_VAL=$(get_meta "db_password" "ChangeMe123!")
JWT_SECRET_VAL=$(get_meta "jwt_secret" "$(openssl rand -hex 32)")
DB_ROOT_PASSWORD_VAL=$(get_meta "db_root_password" "RootChangeMe123!")
DB_USER_VAL=$(get_meta "db_user" "metalerp")
DB_NAME_VAL=$(get_meta "db_name" "metal_parts_db")

cat > "$APP_DIR/.env" <<EOF
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD_VAL}
DB_USER=${DB_USER_VAL}
DB_PASSWORD=${DB_PASSWORD_VAL}
DB_NAME=${DB_NAME_VAL}
JWT_SECRET=${JWT_SECRET_VAL}
JWT_EXPIRES_IN=8h
EOF

chmod 600 "$APP_DIR/.env"
echo "   .env creado."

# ─────────────────────────────────────────────
# 5. Construir y levantar los contenedores
# ─────────────────────────────────────────────
echo "[5/7] Construyendo contenedores Docker..."
cd "$APP_DIR"
docker compose pull --ignore-buildable 2>/dev/null || true
docker compose build --no-cache

echo "[6/7] Iniciando servicios..."
docker compose up -d

# ─────────────────────────────────────────────
# 6. Esperar a que la DB esté lista y ejecutar seed
# ─────────────────────────────────────────────
echo "[7/7] Esperando a que MariaDB esté lista para ejecutar seed..."
RETRIES=20
COUNT=0
until docker compose exec -T db healthcheck.sh --connect --innodb_initialized 2>/dev/null || [ $COUNT -ge $RETRIES ]; do
    COUNT=$((COUNT+1))
    echo "   DB no lista aún ($COUNT/$RETRIES), esperando 10s..."
    sleep 10
done

if [ $COUNT -lt $RETRIES ]; then
    echo "   DB lista. Ejecutando seed inicial..."
    docker compose exec -T backend node src/db/seed.js && echo "   Seed completado." || echo "   Seed omitido (posiblemente ya ejecutado)."
else
    echo "   ⚠️  DB no respondió a tiempo. El seed deberá ejecutarse manualmente."
fi

# ─────────────────────────────────────────────
# 7. Mostrar estado final
# ─────────────────────────────────────────────
echo ""
echo "======================================================="
echo " Estado de los contenedores:"
docker compose ps
echo ""
echo " ✅ MetalERP desplegado exitosamente."
echo " 🌐 Acceso: http://$(curl -sf -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)"
echo "======================================================="

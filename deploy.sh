#!/usr/bin/env bash
# =============================================================================
# Script de despliegue de AppIndustrialPiezasMetal en Google Cloud Compute Engine
# Para ejecución desde entorno Linux o WSL.
# =============================================================================
set -e

# --- PARÁMETROS POR DEFECTO ---
PROJECT_ID="metalerp-produccion"
REGION="us-central1"
ZONE="us-central1-a"
VM_NAME="metalerp-vm"
MACHINE_TYPE="e2-medium"
DISK_SIZE_GB="30"
REPO_URL=""
DB_USER="metalerp"
DB_NAME="metal_parts_db"

echo "============================================================"
echo "  MetalERP - Deploy a Google Cloud Compute Engine (Linux/WSL)"
echo "============================================================"

# --- 1. VALIDAR DEPENDENCIAS ---
echo ""
echo "[1/6] Validando dependencias..."
if ! command -v gcloud &> /dev/null; then
    echo "⚠️ gcloud CLI no encontrado."
    echo "Debe instalar el SDK de Google Cloud para Linux:"
    echo "  curl https://sdk.cloud.google.com | bash"
    exit 1
fi
echo "✅ gcloud CLI disponible."

AUTH_ACCOUNT=$(gcloud auth list --filter="status:ACTIVE" --format="value(account)" || true)
if [ -z "$AUTH_ACCOUNT" ]; then
    echo "⚠️ No hay sesión activa en gcloud. Ejecute: gcloud auth login"
    exit 1
fi
echo "✅ Autenticado como: $AUTH_ACCOUNT"

gcloud config set project "$PROJECT_ID" >/dev/null 2>&1
echo "✅ Proyecto activo: $PROJECT_ID"

echo ""
read -p "🔗 URL del repositorio Git (ej: https://github.com/user/repo.git): " REPO_URL
if [ -z "$REPO_URL" ]; then
    echo "❌ La URL del repositorio es obligatoria."
    exit 1
fi

# --- 2. CONFIGURAR SECRETOS ---
echo ""
echo "[2/6] Configurando secretos..."
read -s -p "🔑 Contraseña para usuario DB '$DB_USER' (Enter para auto-generar): " DB_PASS_INPUT
echo ""
read -s -p "🔑 Contraseña ROOT de MariaDB (Enter para auto-generar): " DB_ROOT_PASS_INPUT
echo ""
read -s -p "🔑 JWT Secret (Enter para auto-generar): " JWT_SECRET_INPUT
echo ""

DB_PASSWORD=${DB_PASS_INPUT:-"MetalErp_$RANDOM!"}
DB_ROOT_PASSWORD=${DB_ROOT_PASS_INPUT:-"Root_$RANDOM!"}
JWT_SECRET=${JWT_SECRET_INPUT:-$(openssl rand -hex 32)}

echo "✅ Secretos configurados."

# --- 3. PREPARAR STARTUP SCRIPT ---
echo ""
echo "[3/6] Preparando startup script..."
if [ ! -f "vm-startup.sh" ]; then
    echo "❌ No se encuentra vm-startup.sh en el directorio actual."
    exit 1
fi

TMP_STARTUP="/tmp/metalerp-startup.sh"
sed "s|__REPO_URL__|$REPO_URL|g" vm-startup.sh > "$TMP_STARTUP"
echo "✅ Startup script temporal creado en: $TMP_STARTUP"

# --- 4. CONFIGURAR FIREWALL ---
echo ""
echo "[4/6] Configurando firewall..."
if ! gcloud compute firewall-rules list --filter="name=allow-http-metalerp" --format="value(name)" | grep -q 'allow-http-metalerp'; then
    echo "Creando regla de firewall allow-http-metalerp..."
    gcloud compute firewall-rules create allow-http-metalerp \
        --allow tcp:80,tcp:443 \
        --source-ranges 0.0.0.0/0 \
        --target-tags metalerp-web \
        --description "HTTP/HTTPS para MetalERP" \
        --project "$PROJECT_ID" >/dev/null 2>&1
    echo "✅ Firewall HTTP/HTTPS creado."
else
    echo "✅ Regla de firewall ya existe."
fi

# --- 5. CREAR LA VM ---
echo ""
echo "[5/6] Creando instancia VM en Compute Engine..."

EXISTING_VM=$(gcloud compute instances list --filter="name=$VM_NAME AND zone=$ZONE" --format="value(name)")
SKIP_CREATE=false

if [ -n "$EXISTING_VM" ]; then
    echo "⚠️ La VM '$VM_NAME' ya existe."
    read -p "¿Deseas eliminarla y recrearla? (s/N) " CONFIRM
    if [[ "$CONFIRM" =~ ^[sS]$ ]]; then
        echo "Eliminando VM existente..."
        gcloud compute instances delete "$VM_NAME" --zone "$ZONE" --quiet
    else
        echo "Omitiendo creación. La VM existente será reutilizada."
        SKIP_CREATE=true
    fi
fi

if [ "$SKIP_CREATE" = false ]; then
    METADATA_STR="db_password=$DB_PASSWORD,db_root_password=$DB_ROOT_PASSWORD,jwt_secret=$JWT_SECRET,db_user=$DB_USER,db_name=$DB_NAME"
    
    echo "Creando VM '$VM_NAME'... (esto puede tardar 1-2 minutos)"
    gcloud compute instances create "$VM_NAME" \
        --zone "$ZONE" \
        --machine-type "$MACHINE_TYPE" \
        --image-family "ubuntu-2204-lts" \
        --image-project "ubuntu-os-cloud" \
        --boot-disk-size "${DISK_SIZE_GB}GB" \
        --boot-disk-type "pd-ssd" \
        --tags "metalerp-web,http-server,https-server" \
        --metadata-from-file "startup-script=$TMP_STARTUP" \
        --metadata "$METADATA_STR" \
        --scopes "cloud-platform" \
        --project "$PROJECT_ID"
        
    echo "✅ VM creada exitosamente."
fi

# --- 6. OBTENER IP Y RESUMEN ---
echo ""
echo "[6/6] Obteniendo información de la VM..."
EXTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" \
    --zone "$ZONE" \
    --format="value(networkInterfaces[0].accessConfigs[0].natIP)")

rm -f "$TMP_STARTUP"

echo ""
echo "============================================================"
echo " ✅ DESPLIEGUE INICIADO EXITOSAMENTE"
echo "============================================================"
echo ""
echo " 🌐 IP Externa    : $EXTERNAL_IP"
echo " 🔗 URL App       : http://$EXTERNAL_IP"
echo " 🔑 Admin Login   : admin@metalerp.com / Admin123!"
echo ""
echo " ⏳ IMPORTANTE: La VM tardará ~3-5 minutos en inicializar dependencias (Docker, cloque, etc)."
echo ""
echo " 📋 Comandos útiles (Desde esta terminal Linux):"
echo "    - Ver logs de startup:"
echo "      gcloud compute ssh $VM_NAME --zone $ZONE -- 'tail -f /var/log/metalerp-startup.log'"
echo ""
echo "    - Ver estado de contenedores:"
echo "      gcloud compute ssh $VM_NAME --zone $ZONE -- 'cd /opt/appindustrial && sudo docker compose ps'"
echo "============================================================"

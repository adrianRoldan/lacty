#!/bin/bash
# Instalación inicial del VPS (Ubuntu 24.04).
# Ejecutar como root: bash setup-vps.sh
set -e

REPO_URL=${1:?"Uso: $0 https://github.com/usuario/lacty.git"}
APP_DIR=/opt/lacty
APP_USER=lacty

echo "── 1. Actualizar sistema ────────────────────────────────"
apt-get update && apt-get upgrade -y

echo "── 2. Instalar dependencias del sistema ─────────────────"
apt-get install -y curl git ufw sqlite3 unzip

echo "── 3. Instalar Docker ───────────────────────────────────"
curl -fsSL https://get.docker.com | sh
systemctl enable docker

echo "── 4. Firewall (UFW) ────────────────────────────────────"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp   # HTTP/3 para Caddy
ufw --force enable

echo "── 5. Usuario de la aplicación ──────────────────────────"
id -u $APP_USER &>/dev/null || useradd -r -s /bin/bash -m -d /home/$APP_USER $APP_USER
usermod -aG docker $APP_USER

echo "── 6. Clonar repositorio ────────────────────────────────"
mkdir -p $APP_DIR
git clone "$REPO_URL" $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

echo "── 7. Crear directorios de datos y backups ──────────────"
mkdir -p $APP_DIR/data $APP_DIR/backups
chown -R $APP_USER:$APP_USER $APP_DIR/data $APP_DIR/backups

echo "── 8. Configurar .env ───────────────────────────────────"
if [ ! -f $APP_DIR/.env ]; then
  cp $APP_DIR/.env.example $APP_DIR/.env
  SESSION_SECRET=$(openssl rand -hex 32)
  sed -i "s/cambia_esto_por_un_secreto_largo/$SESSION_SECRET/" $APP_DIR/.env
  echo "✓ SESSION_SECRET generado automáticamente"
fi

echo "── 9. Backup diario (cron) ──────────────────────────────"
chmod +x $APP_DIR/scripts/backup.sh
(crontab -u $APP_USER -l 2>/dev/null; echo "0 3 * * * $APP_DIR/scripts/backup.sh >> /var/log/lacty-backup.log 2>&1") | crontab -u $APP_USER -

echo "── 10. Editar Caddyfile antes de continuar ──────────────"
echo ""
echo "  Edita el dominio en: $APP_DIR/Caddyfile"
echo "  Luego arranca la app:"
echo ""
echo "    cd $APP_DIR && docker compose up -d --build"
echo ""
echo "✓ Setup completado"

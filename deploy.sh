#!/bin/bash
# Despliega Lacty en el VPS.
# Uso: ./deploy.sh [usuario@host]
# Si no se pasa argumento, usa VPS_HOST del entorno o .env.deploy
set -e

if [ -f .env.deploy ]; then
  source .env.deploy
fi

HOST=${1:-$VPS_HOST}
if [ -z "$HOST" ]; then
  echo "Error: indica el host  →  ./deploy.sh usuario@ip"
  exit 1
fi

REMOTE_DIR=/opt/lacty

echo "→ Desplegando en $HOST..."
ssh "$HOST" "
  set -e
  cd $REMOTE_DIR
  git pull --ff-only
  docker compose up -d --build --remove-orphans
  docker image prune -f
"
echo "✓ Despliegue completado en $HOST"

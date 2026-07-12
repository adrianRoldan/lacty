#!/bin/bash
# Backup diario de la base de datos SQLite.
# Instalar en el VPS: crontab -e → 0 3 * * * /opt/lacty/scripts/backup.sh
set -e

DATA_DIR=/opt/lacty/data
BACKUP_DIR=/opt/lacty/backups
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEST="$BACKUP_DIR/lacty-$TIMESTAMP.db"

# SQLite online backup (seguro incluso con la app corriendo)
sqlite3 "$DATA_DIR/lacty.db" ".backup '$DEST'"
gzip "$DEST"

echo "Backup guardado: $DEST.gz"

# Eliminar backups más antiguos que RETENTION_DAYS días
find "$BACKUP_DIR" -name "lacty-*.db.gz" -mtime +$RETENTION_DAYS -delete

#!/bin/bash
set -e

BACKUP_ROOT=${BACKUP_ROOT:-/backup/photo-sync}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

echo "Creating backup at: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Stop services gracefully
echo "Stopping services..."
docker-compose $COMPOSE_FILES stop

# Backup database volumes
echo "Backing up custom postgres..."
docker run --rm \
  -v custom-pgdata:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/custom-postgres.tar.gz -C /data .

echo "Backing up Immich postgres..."
docker run --rm \
  -v immich-pgdata:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/immich-postgres.tar.gz -C /data .

# Backup Caddy data (SSL certificates)
echo "Backing up Caddy data..."
docker run --rm \
  -v caddy_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/caddy-data.tar.gz -C /data .

# Backup configuration files
echo "Backing up configuration..."
if [ -f .env.prod ]; then
  cp .env.prod "$BACKUP_DIR/"
fi
cp config/Caddyfile "$BACKUP_DIR/" 2>/dev/null || cp config/Caddyfile.prod "$BACKUP_DIR/" || true

# Create backup manifest
cat > "$BACKUP_DIR/manifest.txt" << MANIFEST
Backup created: $(date)
Hostname: $(hostname)
Volumes:
- custom-postgres.tar.gz
- immich-postgres.tar.gz
- caddy-data.tar.gz
Files:
- .env.prod
- Caddyfile
MANIFEST

# Restart services
echo "Restarting services..."
docker-compose $COMPOSE_FILES start

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

echo "✅ Backup complete"
echo "Location: $BACKUP_DIR"
echo "Size: $BACKUP_SIZE"
echo ""
echo "To restore from this backup, use:"
echo "  ./scripts/restore.sh $BACKUP_DIR"

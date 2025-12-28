#!/bin/bash
set -e

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

# Check if backup directory is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_directory>"
  echo ""
  echo "Example:"
  echo "  $0 /backup/photo-sync/20251228_170000"
  echo ""
  echo "Available backups:"
  if [ -d "/backup/photo-sync" ]; then
    ls -1t /backup/photo-sync/ | head -5
  fi
  exit 1
fi

BACKUP_DIR="$1"

# Validate backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Error: Backup directory does not exist: $BACKUP_DIR"
  exit 1
fi

# Validate backup contents
echo "Validating backup contents..."
MISSING_FILES=()
[ ! -f "$BACKUP_DIR/custom-postgres.tar.gz" ] && MISSING_FILES+=("custom-postgres.tar.gz")
[ ! -f "$BACKUP_DIR/immich-postgres.tar.gz" ] && MISSING_FILES+=("immich-postgres.tar.gz")
[ ! -f "$BACKUP_DIR/caddy-data.tar.gz" ] && MISSING_FILES+=("caddy-data.tar.gz")

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo "❌ Error: Missing required backup files:"
  printf '  - %s\n' "${MISSING_FILES[@]}"
  exit 1
fi

# Show backup manifest if available
if [ -f "$BACKUP_DIR/manifest.txt" ]; then
  echo ""
  echo "Backup manifest:"
  cat "$BACKUP_DIR/manifest.txt"
  echo ""
fi

# Confirm with user
echo "⚠️  WARNING: This will DELETE all current data and restore from backup!"
echo "Backup source: $BACKUP_DIR"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Stop services
echo ""
echo "Stopping services..."
docker-compose $COMPOSE_FILES down

# Remove existing volumes
echo "Removing existing volumes..."
docker volume rm custom-pgdata immich-pgdata caddy_data 2>/dev/null || true

# Restore custom postgres
echo "Restoring custom postgres..."
docker volume create custom-pgdata
docker run --rm \
  -v custom-pgdata:/data \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "cd /data && tar xzf /backup/custom-postgres.tar.gz"

# Restore Immich postgres
echo "Restoring Immich postgres..."
docker volume create immich-pgdata
docker run --rm \
  -v immich-pgdata:/data \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "cd /data && tar xzf /backup/immich-postgres.tar.gz"

# Restore Caddy data (SSL certificates)
echo "Restoring Caddy data..."
docker volume create caddy_data
docker run --rm \
  -v caddy_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine sh -c "cd /data && tar xzf /backup/caddy-data.tar.gz"

# Restore configuration files
echo "Restoring configuration files..."
if [ -f "$BACKUP_DIR/.env.prod" ]; then
  cp "$BACKUP_DIR/.env.prod" .env.prod
  chmod 600 .env.prod
  echo "  ✓ Restored .env.prod"
fi

if [ -f "$BACKUP_DIR/Caddyfile" ]; then
  cp "$BACKUP_DIR/Caddyfile" config/Caddyfile.prod
  ln -sf Caddyfile.prod config/Caddyfile
  echo "  ✓ Restored Caddyfile"
fi

# Verify volume restoration
echo ""
echo "Verifying restored volumes..."
echo "Custom postgres files:"
docker run --rm -v custom-pgdata:/data alpine ls -lh /data | head -5

echo ""
echo "Immich postgres files:"
docker run --rm -v immich-pgdata:/data alpine ls -lh /data | head -5

echo ""
echo "Caddy data files:"
docker run --rm -v caddy_data:/data alpine ls -lh /data | head -5

# Start services
echo ""
echo "Starting services..."
docker-compose $COMPOSE_FILES up -d

# Wait for services to start
echo "Waiting for services to become healthy..."
sleep 10

# Check service health
echo ""
echo "Service status:"
docker-compose $COMPOSE_FILES ps

echo ""
echo "✅ Restore complete!"
echo ""
echo "Next steps:"
echo "1. Verify data integrity by accessing the web UI"
echo "2. Check logs: docker-compose $COMPOSE_FILES logs -f"
echo "3. Test core functionality (login, view photos, etc.)"

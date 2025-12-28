# Restore Procedures

This document describes how to restore the photo-sync system from backups created by `scripts/backup.sh`.

## Prerequisites

- Docker and Docker Compose installed
- Backup directory created by `scripts/backup.sh`
- Access to the server where backup was created (or backup files transferred)

## Full System Restore

### Step 1: Stop Services

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Step 2: Remove Existing Volumes

**WARNING:** This will delete all current data. Ensure you have backups!

```bash
docker volume rm custom-pgdata immich-pgdata caddy_data
```

### Step 3: Restore Database Volumes

```bash
# Restore custom postgres
docker volume create custom-pgdata
docker run --rm \
  -v custom-pgdata:/data \
  -v /path/to/backup:/backup \
  alpine sh -c "cd /data && tar xzf /backup/custom-postgres.tar.gz"

# Restore Immich postgres
docker volume create immich-pgdata
docker run --rm \
  -v immich-pgdata:/data \
  -v /path/to/backup:/backup \
  alpine sh -c "cd /data && tar xzf /backup/immich-postgres.tar.gz"
```

### Step 4: Restore Caddy Data (SSL Certificates)

```bash
docker volume create caddy_data
docker run --rm \
  -v caddy_data:/data \
  -v /path/to/backup:/backup \
  alpine sh -c "cd /data && tar xzf /backup/caddy-data.tar.gz"
```

### Step 5: Restore Configuration Files

```bash
# Restore environment file
cp /path/to/backup/.env.prod .env.prod
chmod 600 .env.prod

# Restore Caddyfile
cp /path/to/backup/Caddyfile config/Caddyfile
```

### Step 6: Verify and Start Services

```bash
# Verify volume restoration
docker run --rm -v custom-pgdata:/data alpine ls -lh /data

# Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check health
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### Step 7: Verify Data Integrity

```bash
# Check database connectivity
docker exec custom_postgres psql -U postgres -c "\l"
docker exec immich_postgres psql -U postgres -c "\l"

# Check API gateway health
curl https://photos.yourdomain.com/health

# Check web UI
curl https://photos.yourdomain.com/
```

## Partial Restore

### Restore Only Database

If you only need to restore database data:

```bash
# Stop database containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml stop custom-postgres immich-postgres

# Remove and restore volume
docker volume rm custom-pgdata
docker volume create custom-pgdata
docker run --rm \
  -v custom-pgdata:/data \
  -v /path/to/backup:/backup \
  alpine sh -c "cd /data && tar xzf /backup/custom-postgres.tar.gz"

# Restart database
docker-compose -f docker-compose.yml -f docker-compose.prod.yml start custom-postgres
```

### Restore Only SSL Certificates

If you only need to restore Caddy SSL certificates:

```bash
# Stop Caddy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml stop caddy

# Restore certificates
docker volume rm caddy_data
docker volume create caddy_data
docker run --rm \
  -v caddy_data:/data \
  -v /path/to/backup:/backup \
  alpine sh -c "cd /data && tar xzf /backup/caddy-data.tar.gz"

# Restart Caddy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml start caddy
```

## Disaster Recovery

In case of complete server failure:

1. **Provision new server** with Docker and Docker Compose
2. **Clone repository** from git
3. **Transfer backup files** to new server
4. **Follow Full System Restore** steps above
5. **Update DNS** if server IP changed
6. **Verify SSL certificates** renewed (Caddy handles automatically)

## Backup Schedule Recommendations

- **Daily**: Automated backups of databases
- **Weekly**: Full backup including configurations
- **Before updates**: Manual backup before system changes
- **Test restores**: Quarterly test restore to verify backup integrity

## Troubleshooting

### Database won't start after restore

```bash
# Check volume permissions
docker run --rm -v custom-pgdata:/data alpine ls -lah /data

# Check postgres logs
docker-compose logs custom-postgres
```

### Caddy SSL certificates not working

```bash
# Check Caddy data volume
docker run --rm -v caddy_data:/data alpine ls -lah /data

# Force certificate renewal
docker-compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### Services can't connect to database

```bash
# Verify database is accepting connections
docker exec custom_postgres pg_isready -U postgres

# Check network connectivity
docker exec api_gateway ping -c 3 custom-postgres
```

## Backup Verification

Always verify backups periodically:

```bash
# Extract and check tar archives
tar -tzf custom-postgres.tar.gz | head -20

# Check backup manifest
cat /path/to/backup/manifest.txt

# Verify file sizes (databases should be > 1MB)
ls -lh /path/to/backup/*.tar.gz
```

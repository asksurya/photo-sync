# Deployment Guide

Quick reference for deploying photo-sync in development and production.

## Development Setup

```bash
# 1. Create environment file
cp .env.dev .env

# 2. Create test data directory
mkdir -p test-data/photos

# 3. Use development Caddyfile
ln -sf Caddyfile.dev config/Caddyfile

# 4. Start services
./scripts/deploy.sh up

# 5. Access services
# Web UI: http://localhost:8080
# Gateway: http://localhost:3000
# Immich: http://localhost:2283
```

## Production Deployment

### Initial Setup

```bash
# 1. Create production environment
cp .env.prod.example .env.prod
chmod 600 .env.prod
nano .env.prod  # Edit with real values

# 2. Use production Caddyfile
ln -sf Caddyfile.prod config/Caddyfile

# 3. Build and start
./scripts/deploy.sh --prod build
./scripts/deploy.sh --prod up

# 4. Verify health
./scripts/deploy.sh --prod health
curl https://photos.yourdomain.com/health
```

### Updates

```bash
# Pull latest code
git pull

# Rebuild changed services
./scripts/deploy.sh --prod build

# Restart services
./scripts/deploy.sh --prod restart
```

## Common Operations

### View Logs

```bash
# All services
./scripts/deploy.sh logs

# Specific service
./scripts/deploy.sh logs api-gateway

# Production logs
./scripts/deploy.sh --prod logs
```

### Service Management

```bash
# Check status
./scripts/deploy.sh ps

# Restart specific service
docker-compose restart api-gateway

# Rebuild single service
docker-compose build web-ui
```

### Backup and Restore

```bash
# Create backup
./scripts/backup.sh

# Restore from backup
# See docs/RESTORE.md
```

## Environment Variables

### Required for Production

- `DOMAIN` - Your domain name (e.g., photos.yourdomain.com)
- `ACME_EMAIL` - Email for Let's Encrypt
- `IMMICH_DB_PASSWORD` - Strong password for Immich database
- `CUSTOM_DB_PASSWORD` - Strong password for custom services
- `MEDIA_PATH` - Path to photo storage (e.g., /mnt/nas/photos)

### Optional Configuration

- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)
- `TOKEN_CACHE_TTL` - Token cache duration in seconds (default: 300)
- `PHASH_THRESHOLD` - Deduplication similarity threshold (default: 0.95)

## Troubleshooting

### Services won't start

```bash
# Check logs
./scripts/deploy.sh logs

# Verify environment file
cat .env.prod

# Check Docker resources
docker system df
```

### Caddy SSL issues

```bash
# Check Caddy logs
docker-compose logs caddy

# Verify domain DNS
dig photos.yourdomain.com

# Force certificate reload
docker-compose exec caddy caddy reload
```

### Database connection errors

```bash
# Check database health
docker exec custom_postgres pg_isready -U postgres

# Restart database
docker-compose restart custom-postgres

# Check logs
docker-compose logs custom-postgres
```

## Monitoring

### Health Checks

```bash
# All services
./scripts/deploy.sh --prod health

# API health endpoint
curl https://photos.yourdomain.com/health

# Individual service
docker inspect --format='{{.State.Health.Status}}' api_gateway
```

### Resource Usage

```bash
# Real-time stats
docker stats

# Disk usage
docker system df -v

# Container resource limits
docker inspect api_gateway | jq '.[0].HostConfig.Memory'
```

## Security Best Practices

1. **Environment files**: Keep `.env.prod` with 600 permissions
2. **Passwords**: Use strong, unique passwords for all services
3. **Updates**: Regularly update Docker images
4. **Backups**: Automate daily backups
5. **Monitoring**: Set up log monitoring and alerts
6. **Firewall**: Only expose ports 80 and 443
7. **SSL**: Let Caddy handle HTTPS automatically

## Performance Tuning

### Adjust Resource Limits

Edit `docker-compose.prod.yml` resource limits based on your server:

```yaml
deploy:
  resources:
    limits:
      memory: 1G      # Increase if needed
      cpus: '2.0'     # Increase for more CPU
```

### Database Optimization

```bash
# Connect to postgres
docker exec -it custom_postgres psql -U postgres

# Check database size
\l+

# Analyze and vacuum
VACUUM ANALYZE;
```

## Maintenance Schedule

- **Daily**: Automated backups (cron job)
- **Weekly**: Review logs for errors
- **Monthly**: Update Docker images
- **Quarterly**: Test restore procedures
- **As needed**: Prune unused Docker resources

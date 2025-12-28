# Deployment Setup Design

**Date:** 2025-12-28
**Status:** Approved

## Overview

This document describes the deployment configuration for the photo-sync system, targeting a single-server production environment with development support. The deployment uses Docker Compose with Caddy for automatic HTTPS, optimized multi-stage Docker builds, comprehensive healthchecks, and environment-based configuration separation.

## Architecture Overview

### Deployment Architecture - Single Server with Caddy

The deployment uses a three-file Docker Compose structure for flexibility:

1. **`docker-compose.yml`** - Base configuration shared by dev and prod
2. **`docker-compose.override.yml`** - Dev-specific settings (auto-loaded in dev)
3. **`docker-compose.prod.yml`** - Production settings (explicit `-f` flag required)

### Service Stack

```
Internet (HTTPS)
    ↓
Caddy (Port 80/443)
    ├─→ photos.yourdomain.com → Web UI (nginx:80)
    └─→ photos.yourdomain.com/api → API Gateway (node:3000)

API Gateway
    ├─→ Immich Server (internal:3001)
    ├─→ Grouping Service (internal:8000)
    ├─→ Deduplication Service (internal:8001)
    └─→ Custom Redis (internal:6379)

Backend Services
    ├─→ Immich Server → Immich Redis + Postgres + ML
    ├─→ Grouping → Custom Postgres
    └─→ Deduplication → Custom Postgres
```

### Key Changes from Current Setup

- **Add Caddy service** as the entry point (replaces exposing ports directly)
- **Remove port mappings** from gateway/web in prod (Caddy handles external access)
- **Optimize Dockerfiles** with multi-stage builds for smaller images
- **Add healthchecks** to all services for better reliability
- **Split nginx.conf** - web UI uses simplified config, Caddy handles routing

### Environment Files

- `.env.dev` - Safe defaults, can commit to git
- `.env.prod` - Real secrets, gitignored, file permissions 600

## Docker Compose File Structure

### How the Three Files Work Together

**Development mode** (default):
```bash
docker-compose up
# Auto-loads: docker-compose.yml + docker-compose.override.yml
```

**Production mode** (explicit):
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### File Responsibilities

**`docker-compose.yml`** (shared base):
- Service definitions (all 9 services: Caddy, web, gateway, Immich stack, grouping, dedup, databases, redis)
- Build contexts and Dockerfiles
- Internal networking
- Volume definitions
- Base environment variables using `${VAR:-default}` syntax
- Common restart policies

**`docker-compose.override.yml`** (dev only):
- Expose ports for direct access (web:8080, gateway:3000, etc.)
- Disable Caddy or configure for localhost
- Mount source code volumes for hot reload
- Enable debug logging
- Use `.env.dev` for configuration
- Skip running tests in Dockerfiles (faster builds)

**`docker-compose.prod.yml`** (production only):
- Enable Caddy with Let's Encrypt
- No port mappings (only Caddy exposes 80/443)
- No source volume mounts
- Production logging (JSON, log rotation)
- Resource limits (memory/CPU)
- Health checks with automatic restarts
- Use `.env.prod` for configuration

### Caddy Configuration

- Caddyfile stored in `config/Caddyfile.dev` and `config/Caddyfile.prod`
- Mounted as volume into Caddy container
- Auto HTTPS in prod, HTTP in dev

## Dockerfile Optimizations

### Gateway Dockerfile - Multi-Stage Build

Current issue: Single-stage build includes dev dependencies and source files in production image (~500MB).

**Optimized approach:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production  # Remove dev dependencies

# Stage 2: Test (optional, only in dev)
FROM builder AS tester
RUN npm test

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Benefits:**
- Final image ~150MB (vs 500MB)
- No source code or dev dependencies
- Tests run during build but don't bloat image
- Uses `node` instead of `npm start` for faster startup

### Web UI Dockerfile

Already uses multi-stage build (good!), minor tweaks:
- Add nginx gzip compression
- Optimize nginx config for SPA routing
- Add security headers

### Grouping/Dedup Dockerfiles

Similar optimization (Python multi-stage if they're Python, or current structure if already optimized)

### Build Arguments for Dev/Prod

```bash
# Dev: skip tests for speed
docker-compose build --build-arg SKIP_TESTS=true

# Prod: run all tests
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
```

## Healthchecks and Monitoring

### Healthcheck Configuration

Each service needs healthchecks so Docker can automatically restart failed containers and dependencies wait properly.

**Gateway Service:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**Web UI (nginx):**
```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 10s
```

**Backend Services:**
- Immich: Already has healthcheck in official image
- Grouping/Dedup: Add `/health` endpoints (simple HTTP 200)
- Postgres: `pg_isready -U postgres`
- Redis: `redis-cli ping`

### Dependency Management

Replace simple `depends_on` with condition-based waiting:
```yaml
depends_on:
  custom-redis:
    condition: service_healthy
  immich-server:
    condition: service_healthy
```

### Basic Monitoring (Production)

Add optional lightweight monitoring:
- **Grafana + Prometheus** (optional, can add later)
- **Logs:** Docker logging driver with rotation
  ```yaml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```

## Caddy Configuration

### Caddy Service Definition

```yaml
caddy:
  image: caddy:2-alpine
  container_name: caddy
  restart: unless-stopped
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./config/Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
    - caddy_config:/config
  depends_on:
    web-ui:
      condition: service_healthy
    api-gateway:
      condition: service_healthy
```

### Development Caddyfile

**`config/Caddyfile.dev`:**
```
:80 {
    # Serve web UI
    reverse_proxy web-ui:80

    # API requests to gateway
    handle /api/* {
        reverse_proxy api-gateway:3000
    }

    # Health endpoint passthrough
    handle /health {
        reverse_proxy api-gateway:3000
    }
}
```

### Production Caddyfile

**`config/Caddyfile.prod`:**
```
{DOMAIN} {
    # Automatic HTTPS with Let's Encrypt

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000;"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "no-referrer-when-downgrade"
    }

    # API requests to gateway
    handle /api/* {
        reverse_proxy api-gateway:3000 {
            health_uri /health
            health_interval 30s
        }
    }

    # Everything else to web UI
    reverse_proxy web-ui:80
}
```

### Email for Let's Encrypt

Set in `.env.prod`: `ACME_EMAIL=your@email.com`

## Environment Configuration

### `.env.dev` (committed to git, safe defaults)

```bash
# Environment
NODE_ENV=development
LOG_LEVEL=debug

# Caddy
DOMAIN=localhost
ACME_EMAIL=dev@localhost

# Immich
IMMICH_VERSION=release
IMMICH_DB_PASSWORD=dev_immich_password

# Custom Services
CUSTOM_DB_PASSWORD=dev_custom_password

# Media Path (for local development)
MEDIA_PATH=./test-data/photos

# API URLs (internal Docker networking)
IMMICH_API_URL=http://immich-server:3001
GROUPING_API_URL=http://grouping-service:8000
DEDUP_API_URL=http://dedup-service:8001
REDIS_URL=redis://custom-redis:6379

# Gateway Config
PORT=3000
TOKEN_CACHE_TTL=300

# Deduplication Settings
PHASH_THRESHOLD=0.95

# Web UI (development uses Vite dev server proxy)
VITE_GATEWAY_URL=http://localhost:3000
```

### `.env.prod.example` (template)

```bash
# Environment
NODE_ENV=production
LOG_LEVEL=info

# Caddy - CHANGE THESE!
DOMAIN=photos.yourdomain.com
ACME_EMAIL=admin@yourdomain.com

# Immich - CHANGE THESE!
IMMICH_VERSION=release
IMMICH_DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD_1

# Custom Services - CHANGE THIS!
CUSTOM_DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD_2

# Media Path - CHANGE THIS!
MEDIA_PATH=/mnt/nas/photos

# API URLs (same as dev, internal)
IMMICH_API_URL=http://immich-server:3001
GROUPING_API_URL=http://grouping-service:8000
DEDUP_API_URL=http://dedup-service:8001
REDIS_URL=redis://custom-redis:6379

# Gateway Config
PORT=3000
TOKEN_CACHE_TTL=300

# Deduplication Settings
PHASH_THRESHOLD=0.95

# Web UI (production uses Caddy routing)
VITE_GATEWAY_URL=/api
```

### `.gitignore` additions

```
.env.prod
.env.local
```

## Resource Limits and Performance

### Production Resource Limits

In `docker-compose.prod.yml`, add resource constraints to prevent any service from consuming all server resources:

```yaml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'

  web-ui:
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.5'
        reservations:
          memory: 64M

  immich-server:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 1G
          cpus: '1.0'

  immich-machine-learning:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
        reservations:
          memory: 2G

  grouping-service:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M

  dedup-service:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 1G

  custom-postgres:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
```

### Tuning Recommendations

- Adjust based on your server specs (these assume ~16GB RAM server)
- Monitor actual usage with `docker stats` and adjust
- ML service needs most memory for image analysis
- Dedup needs memory for perceptual hashing

**Development:** No resource limits (use full machine power)

## Deployment Procedures

### Initial Setup (First Time)

```bash
# 1. Clone repository
git clone <repo-url> photo-sync
cd photo-sync

# 2. Create production env file
cp .env.prod.example .env.prod
chmod 600 .env.prod
nano .env.prod  # Edit with real values

# 3. Create required directories
mkdir -p config data/caddy

# 4. Copy Caddyfile for production
cp config/Caddyfile.prod config/Caddyfile

# 5. Build images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# 6. Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 7. Check health
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl https://photos.yourdomain.com/health
```

### Development Setup

```bash
# 1. Use dev config (already in repo)
cp .env.dev .env

# 2. Create test data directory
mkdir -p test-data/photos

# 3. Copy Caddyfile for dev
cp config/Caddyfile.dev config/Caddyfile

# 4. Start services (auto-loads override file)
docker-compose up -d

# 5. Access locally
open http://localhost:8080
```

### Updates/Rebuilds

```bash
# Pull latest code
git pull

# Rebuild changed services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Restart (zero-downtime with recreate)
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Quick Commands Script

Create `scripts/deploy.sh` for common operations (start, stop, restart, logs, backup).

## Backup and Maintenance

### Backup Strategy

**What to backup:**
1. **Database volumes** - Contains all metadata
2. **Configuration files** - `.env.prod`, Caddyfile
3. **Caddy data** - SSL certificates (avoid re-requesting from Let's Encrypt)
4. **Media files** - Already on NAS (handle separately)

### Backup Script

**`scripts/backup.sh`:**
```bash
#!/bin/bash
BACKUP_DIR=/backup/photo-sync/$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Stop services gracefully
docker-compose -f docker-compose.yml -f docker-compose.prod.yml stop

# Backup volumes
docker run --rm -v custom-pgdata:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres.tar.gz -C /data .
docker run --rm -v immich-pgdata:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/immich-db.tar.gz -C /data .
docker run --rm -v caddy_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/caddy.tar.gz -C /data .

# Backup configs
cp .env.prod $BACKUP_DIR/
cp config/Caddyfile $BACKUP_DIR/

# Restart services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml start
```

### Maintenance Tasks

- **Weekly:** Check logs for errors (`docker-compose logs --tail=100`)
- **Monthly:** Review disk usage (`docker system df`)
- **Quarterly:** Update images (`docker-compose pull && docker-compose up -d`)
- **As needed:** Prune old images (`docker image prune -a`)

### Restore Procedure

Documented in `docs/RESTORE.md` with step-by-step instructions.

## Success Criteria

Deployment setup is complete when:

- [ ] Three-file Docker Compose structure in place
- [ ] Caddy configured with automatic HTTPS
- [ ] Optimized multi-stage Dockerfiles for gateway
- [ ] Healthchecks added to all services
- [ ] Development and production environment files created
- [ ] Resource limits configured for production
- [ ] Backup scripts created and tested
- [ ] Deployment documentation complete
- [ ] Can run `docker-compose up` in dev successfully
- [ ] Can deploy to production with Caddy + Let's Encrypt
- [ ] All services start healthy
- [ ] Web UI accessible via HTTPS in production
- [ ] API gateway accessible and enriching responses

## Implementation Tasks

1. Update `docker-compose.yml` with base configuration
2. Create `docker-compose.override.yml` for development
3. Create `docker-compose.prod.yml` for production
4. Optimize gateway Dockerfile with multi-stage build
5. Add healthchecks to all services
6. Create Caddy service configuration
7. Create `config/Caddyfile.dev`
8. Create `config/Caddyfile.prod`
9. Create `.env.dev` with safe defaults
10. Create `.env.prod.example` template
11. Update `.gitignore` for environment files
12. Create `scripts/deploy.sh` helper script
13. Create `scripts/backup.sh` backup script
14. Create `docs/RESTORE.md` restore documentation
15. Test development deployment
16. Test production deployment (staging)
17. Document common operations

## Decision Log

### Why Three-File Docker Compose Structure?

- Shared base configuration reduces duplication
- Override file auto-loads in dev (convenience)
- Production requires explicit flag (safety)
- Easy to see dev-specific vs prod-specific config

### Why Caddy over Traefik/nginx?

- Automatic HTTPS with Let's Encrypt (zero config)
- Simpler configuration syntax
- Built-in security headers
- Excellent defaults for single-server deployment

### Why Environment Files over Docker Secrets?

- Simpler for single-server deployment
- File permissions (600) provide adequate security
- No need for Docker Swarm mode
- Easy to backup and restore
- Can migrate to Docker Secrets later if needed

### Why Resource Limits in Production?

- Prevents runaway processes from crashing server
- Ensures fair resource distribution
- Makes capacity planning easier
- Docker can automatically restart OOM containers

### Why Multi-Stage Dockerfiles?

- Reduces production image size by 70%
- Removes dev dependencies and source code
- Faster deployment and container startup
- Better security (smaller attack surface)

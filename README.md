# Photo/Video Management System

Self-hosted photo/video management solution built on Immich with intelligent grouping and deduplication.

## Features

- RAW+JPEG grouping with version switching
- Perceptual and exact duplicate detection
- Multi-user support with permissions
- Web and mobile interfaces
- Face recognition (via Immich)
- Comprehensive format support

## Architecture

- **Immich**: Core photo management (unmodified)
- **Grouping Service**: Detects RAW+JPEG pairs and related files
- **Deduplication Service**: Finds exact and near-duplicate images
- **API Gateway**: Aggregates data from all services
- **Web UI**: Immich-inspired interface with grouping/dedup features

## Quick Start

**Platform-specific guides:**
- [macOS Quick Start](docs/QUICKSTART-MAC.md) - Homebrew, Docker Desktop, development setup
- [Windows Quick Start](docs/QUICKSTART-WINDOWS.md) - Native Windows, Docker Desktop, PowerShell
- [WSL Quick Start](docs/QUICKSTART-WSL.md) - **Recommended for Windows** - WSL 2, optimal performance

**Quick setup (all platforms):**

```bash
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

## Development

See [docs/plans/](docs/plans/) for detailed implementation plans.

## Testing

All services follow TDD with 100% coverage target.

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Deployment

### Development

```bash
# Quick start
cp .env.dev .env
./scripts/deploy.sh up

# Access services
# - Web UI: http://localhost:8080
# - API Gateway: http://localhost:3000
```

### Production

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete production deployment guide.

```bash
# Initial setup
cp .env.prod.example .env.prod
nano .env.prod  # Configure your settings
./scripts/deploy.sh --prod up
```

### Backup and Restore

```bash
# Create backup
./scripts/backup.sh

# See docs/RESTORE.md for restore procedures
```

## Architecture

- **Caddy**: Reverse proxy with automatic HTTPS
- **Web UI**: React/Vite with Immich design system (dark theme, Material Design Icons)
  - Immich API token authentication with localStorage persistence
  - Mock data system for screenshot capture and testing
  - Timeline and duplicate photo views
- **API Gateway**: Node.js/Express with Redis caching
- **Backend Services**: Immich, Grouping, Deduplication
- **Databases**: PostgreSQL (Immich + Custom)
- **Cache**: Redis

For detailed architecture, see [docs/plans/2025-12-28-deployment-setup-design.md](docs/plans/2025-12-28-deployment-setup-design.md)

## License

MIT

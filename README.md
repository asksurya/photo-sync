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
- **Web UI**: Enhanced interface with grouping/dedup features

## Quick Start

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

## License

MIT

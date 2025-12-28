# Architecture Overview

## System Components

### Immich (Core)
- Unmodified open-source photo management platform
- Handles: storage, face recognition, basic metadata, user auth
- API: REST at port 2283
- Database: PostgreSQL with pgvecto.rs extension

### Grouping Service (Custom - Python)
- Detects RAW+JPEG pairs and related files
- Watches media directory for new files
- Stores grouping relationships
- API: FastAPI at port 8000
- Database: PostgreSQL (custom-postgres)

### Deduplication Service (Custom - Python)
- Finds exact and perceptual duplicates
- Uses SHA256 for exact, pHash for perceptual
- Background processing with progress tracking
- API: FastAPI at port 8001
- Database: PostgreSQL (custom-postgres)

### API Gateway (Custom - Node.js)
- Aggregates data from all services
- Proxies requests to appropriate backends
- Response enrichment (merges Immich + custom data)
- Caching layer (Redis)
- API: Express at port 3000

### Web UI (Custom - React)
- Enhanced interface with grouping/dedup features
- Photo grid with grouped items
- Duplicates review tab
- Version switcher for RAW+JPEG pairs
- Served by nginx at port 8080

## Data Flow

```
Media Files (NAS)
    ↓
    ├─→ Immich (scans, indexes, ML)
    ├─→ Grouping Service (detects relationships)
    └─→ Dedup Service (finds duplicates)

Client Request
    ↓
API Gateway
    ├─→ Immich API
    ├─→ Grouping Service
    └─→ Dedup Service
    ↓
Merged Response → Web UI
```

## Database Schema

### Grouping Service

```sql
file_groups (
  group_id UUID PRIMARY KEY,
  group_type VARCHAR(50),
  created_at TIMESTAMP
)

group_members (
  group_id UUID REFERENCES file_groups,
  file_path VARCHAR(512),
  file_type VARCHAR(20),
  is_primary BOOLEAN,
  file_size BIGINT
)
```

### Deduplication Service

```sql
duplicate_groups (
  group_id UUID PRIMARY KEY,
  duplicate_type VARCHAR(20),
  created_at TIMESTAMP
)

duplicate_members (
  group_id UUID REFERENCES duplicate_groups,
  file_path VARCHAR(512),
  file_hash VARCHAR(64),
  perceptual_hash VARCHAR(16),
  similarity_score FLOAT,
  file_size BIGINT
)
```

## Communication

- **Inter-service**: HTTP REST APIs
- **Caching**: Redis for API Gateway
- **File watching**: inotify/fsevents via watchdog (Python)
- **Authentication**: Delegated to Immich (session tokens)

## Deployment

All services run in Docker containers orchestrated by Docker Compose.

See `docker-compose.yml` for complete service definitions.

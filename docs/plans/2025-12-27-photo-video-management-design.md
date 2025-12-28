# Photo/Video Management Solution Design

**Date:** 2025-12-27
**Status:** Approved

## Overview

A self-hosted photo/video management solution built on Immich, extended with microservices for intelligent grouping and deduplication. Designed to organize a large collection (1TB+, 100K+ files) scattered across a NAS, with multi-user support and advanced features.

## Requirements

### Core Goals
- Centralize and organize large media collection on existing NAS
- Search and discovery (date, location, people, objects)
- Deduplication (exact and perceptual)
- Web and mobile interfaces
- Face recognition
- Smart grouping of related files (RAW+JPEG pairs)

### Users & Access
- Extended group: multiple users with mix of shared and private media
- User management with granular permissions
- Multi-user concurrent access

### Technical Context
- Developer-level technical capability
- Deployment: Separate server with Docker containers
- Technology stack: Polyglot (Python for ML, Go/Node for APIs, modern frontend)
- Base platform: Immich (extended, not forked)
- Development approach: Heavy TDD with 100% coverage target

## Architecture

### High-Level Design

Three-layer architecture:

1. **Immich (Core)** - Unmodified Docker deployment
   - Photo/video storage and metadata
   - Face recognition and ML features
   - User authentication and permissions
   - Basic organization (albums, timeline)
   - Native web and mobile apps

2. **Media Intelligence Services (Custom)**
   - Grouping Service: Detects RAW+JPEG pairs and related files
   - Deduplication Service: Finds exact and near-duplicate images
   - Shared components: File scanner, metadata reader, databases

3. **Aggregation Layer (Custom)**
   - API Gateway: Merges Immich and custom service data
   - Web UI Extension: Enhanced interface with grouping/dedup features
   - Authentication delegation to Immich

### Data Flow

```
NAS Storage (/mnt/nas/photos)
    ↓
    ├─→ Immich (scans, indexes, ML processing)
    ├─→ Grouping Service (detects relationships)
    └─→ Deduplication Service (finds duplicates)

Client Request
    ↓
API Gateway
    ├─→ Immich API (base photo data)
    ├─→ Grouping Service (relationship metadata)
    └─→ Dedup Service (duplicate groups)
    ↓
Merged Response → Web UI
```

## Component Details

### Immich Layer (Unmodified)
- Standard Docker containers: server, ML, database, redis
- Media storage: `/mnt/nas/photos` mounted from NAS
- REST API: `http://immich:2283/api`
- Handles: user auth, albums, face recognition, basic metadata
- Web app and mobile apps use standard Immich functionality

### Grouping Service (Python)

**Purpose:** Detect and manage file relationships

**Features:**
- Monitor `/mnt/nas/photos` for new files
- Detect RAW+JPEG pairs by base name and timestamp proximity
- Support all RAW and processed image formats
- Auto-select primary display version (prefer JPEG for speed)
- Allow user override of primary version

**Grouping Logic:**
- Match by base filename: `IMG_1234.CR2` + `IMG_1234.JPG` → group
- Timestamp tolerance: 2 seconds (configurable)
- Support multiple versions: RAW + JPEG + PNG in same group
- Video variants: different encodings of same clip

**Database Schema:**
```sql
CREATE TABLE file_groups (
  group_id UUID PRIMARY KEY,
  group_type VARCHAR(50), -- 'raw_jpeg', 'burst', etc.
  created_at TIMESTAMP
);

CREATE TABLE group_members (
  group_id UUID REFERENCES file_groups,
  file_path VARCHAR(512),
  file_type VARCHAR(20), -- 'raw', 'jpeg', 'png', etc.
  is_primary BOOLEAN,
  file_size BIGINT,
  created_at TIMESTAMP
);
```

**API Endpoints:**
- `GET /groups` - List all groups
- `GET /groups/{id}` - Get group details
- `POST /groups/{id}/primary` - Set primary version
- `GET /scan/status` - Initial scan progress

### Deduplication Service (Python)

**Purpose:** Find exact and near-duplicate images

**Features:**
- Exact duplicates: SHA256 hash matching
- Near-duplicates: Perceptual hashing (pHash) with similarity threshold
- Configurable similarity (default: 95%)
- Background processing with progress tracking

**Detection Strategy:**
- Analyze thumbnails first (fast)
- Compare full images only for promising matches
- Batch processing: 100-500 files at a time
- Parallel workers for CPU-intensive pHash calculation

**Database Schema:**
```sql
CREATE TABLE duplicate_groups (
  group_id UUID PRIMARY KEY,
  duplicate_type VARCHAR(20), -- 'exact', 'perceptual'
  created_at TIMESTAMP
);

CREATE TABLE duplicate_members (
  group_id UUID REFERENCES duplicate_groups,
  file_path VARCHAR(512),
  file_hash VARCHAR(64),
  perceptual_hash VARCHAR(16),
  similarity_score FLOAT,
  file_size BIGINT
);
```

**API Endpoints:**
- `GET /duplicates` - List duplicate groups
- `POST /duplicates/{id}/keep` - Mark files to keep
- `DELETE /duplicates/{id}/files` - Remove duplicates

### API Gateway (Node.js/TypeScript)

**Purpose:** Aggregate data from Immich and custom services

**Features:**
- Central entry point: `http://gateway:3000/api`
- Route requests to appropriate backends
- Enrich Immich responses with grouping metadata
- Authentication via Immich session tokens
- Response caching (Redis)

**Routing:**
- `/api/immich/*` → Proxy to Immich API
- `/api/groups/*` → Grouping Service
- `/api/duplicates/*` → Deduplication Service

**Response Enrichment Example:**
```json
{
  "id": "immich-asset-123",
  "filename": "IMG_1234.JPG",
  "groupId": "grp-456",
  "groupType": "raw_jpeg",
  "alternateVersions": [
    {
      "id": "immich-asset-124",
      "filename": "IMG_1234.CR2",
      "type": "raw"
    }
  ],
  "isPrimaryVersion": true
}
```

### Web UI (React/TypeScript)

**Purpose:** Enhanced interface with grouping and deduplication

**Approach:** Custom web app reusing Immich UI components where possible

**Key Views:**

1. **Photo Grid (Main)**
   - Grouped items appear as single cards
   - Badge indicator: "📁 3 versions"
   - Default: primary version display
   - Timeline layout with date separators

2. **Version Switcher**
   - Click grouped item → modal/sidebar
   - Thumbnails of all versions
   - Labels: format and file size
   - Actions: view, set primary, download

3. **Duplicates Tab**
   - Top-level section alongside Photos/Albums/People
   - Duplicate groups sorted by: newest, size savings, similarity
   - Side-by-side comparison view
   - Similarity score indicator
   - Actions: keep selection, delete others, dismiss group

**Filters & Search:**
- Filter by group type: RAW+JPEG, exact duplicates, similar images
- Search across all versions in groups
- Smart suggestions: show ungrouped RAWs

## Format Support

### RAW Formats
Canon (CR2, CR3, CRW), Nikon (NEF, NRW), Sony (ARW, SRF, SR2), Olympus (ORF), Fujifilm (RAF), Panasonic (RW2, RAW), Pentax (PEF, DNG), Adobe (DNG), Leica (DNG, RWL), Phase One (IIQ), Hasselblad (3FR, FFF)

### Processed Images
JPEG, JPG, PNG, TIFF, TIF, HEIC, HEIF, WebP, AVIF, BMP

### Video Formats
MP4, M4V, MOV, AVI, MKV, WebM, 3GP, MPEG, MPG

**Detection:** File extension + magic bytes/MIME type validation (using `python-magic`)

## Data Synchronization

### File System Watching
- All services monitor `/mnt/nas/photos` using file watchers (Python `watchdog`)
- Event-driven: process new files as they arrive
- Initial scan on startup, then incremental updates

### Sync Strategy
- Services share file storage, maintain independent databases
- No tight coupling: services can fail independently
- Eventual consistency: new files processed within seconds
- Background reconciliation job (daily) catches missed files

### Database Relationships
- Reference Immich assets by file path (immutable identifier)
- Store only relationships and grouping metadata
- Don't duplicate Immich's metadata

## Performance & Scale

### Optimizations
- **Thumbnail analysis first:** Faster initial comparison
- **Batch processing:** 100-500 files per batch
- **Parallel workers:** Multiple processes for CPU-intensive tasks
- **Incremental indexing:** Only new/changed files
- **Database indexes:** file_path, group_id, similarity_score
- **Caching:** Redis for frequently accessed data
- **Lazy loading:** UI loads groups on-demand

### Scale Targets
- Collection size: 1TB+, 100,000+ files
- Initial analysis: hours to days (show progress)
- API pagination: 100 items per page
- Background job queue: Celery/Bull for long tasks

## Error Handling

### Strategies
- **File access errors:** Log, mark for retry, don't block scan
- **Service failures:** Gateway degrades gracefully (returns Immich data without groups)
- **Database issues:** Connection pooling, retry with exponential backoff
- **Invalid files:** Skip, log warnings
- **Race conditions:** Transactions and optimistic locking

## Testing Strategy

### TDD Workflow (Red-Green-Refactor)
- Write failing test FIRST for every feature/function
- Implement minimal code to pass test
- Refactor while keeping tests green
- **No production code without failing test first**

### Coverage Target: 100%
Exception: Truly untestable edge cases (external service failures, extreme hardware issues, third-party race conditions)

### Test Pyramid
- **Unit tests (70%):** Every function, algorithm, edge case
- **Integration tests (20%):** Component interactions
- **E2E tests (10%):** Critical user flows

### Test Categories

**Unit Tests:**
- File matching: all naming patterns, timestamp variations
- pHash: different image types, sizes, corrupted files
- Database operations: CRUD, transactions, conflicts
- Format detection: all supported formats

**Integration Tests:**
- Service-to-service communication
- Database transactions across services
- File watcher → processing pipeline
- API Gateway enrichment logic

**E2E Tests:**
- Upload → group detection → UI display
- Duplicate detection → review → action
- Multi-user concurrent access

**Test Data:**
- Curated samples: RAW+JPEG pairs, various naming patterns
- Duplicate sets: exact copies, similar edits, crops
- Edge cases: orphaned RAWs, multiple JPEGs from one RAW

## Deployment

### Docker Compose Architecture

```yaml
services:
  # Immich (unmodified)
  immich-server:
    image: ghcr.io/immich-app/immich-server:latest
  immich-ml:
    image: ghcr.io/immich-app/immich-machine-learning:latest
  immich-db:
    image: postgres:14
  immich-redis:
    image: redis:7

  # Custom services
  grouping-service:
    build: ./services/grouping
  dedup-service:
    build: ./services/deduplication
  api-gateway:
    build: ./services/gateway
    ports: ["3000:3000"]
  web-ui:
    build: ./services/web
    ports: ["8080:80"]

  # Shared infrastructure
  postgres-custom:
    image: postgres:14
  redis-cache:
    image: redis:7
```

### Volume Mounts
- `/mnt/nas/photos:/data/photos:ro` (read-only for safety)
- Separate volumes per database
- Configuration volumes for service configs

### Networking
- Internal Docker network for inter-service communication
- Only API Gateway and Web UI exposed to host
- Immich API accessed through gateway only

### Resource Allocation
- Dedup service: High CPU (pHash computation)
- Immich ML: GPU passthrough if available
- Databases: 4GB+ memory each for large collections

## Setup & Configuration

### Initial Installation
1. Clone repository
2. Configure `.env` file:
   - `MEDIA_PATH=/mnt/nas/photos`
   - Database passwords
3. `docker-compose up -d`
4. Create Immich admin user (standard setup)
5. Initial scan triggers automatically

### Configuration Files

**grouping-service/config.yml:**
```yaml
matching:
  timestamp_tolerance_seconds: 2
  filename_patterns:
    - '{base}.{ext}'
    - '{base}_{suffix}.{ext}'
  auto_primary_preference:
    - 'jpg'
    - 'jpeg'
    - 'png'
    - 'raw'
```

**dedup-service/config.yml:**
```yaml
detection:
  phash_threshold: 0.95
  enable_exact_match: true
  enable_perceptual_match: true
  batch_size: 500
```

### User Preferences
- Stored in custom database, linked to Immich user ID
- Settings: preferred primary format, duplicate sensitivity, auto-group toggle

## Monitoring & Maintenance

### Monitoring
- Centralized logging: Structured JSON to stdout
- Key metrics: processing rate, API response times, disk usage
- Health check endpoints: `/health` on all services
- Optional: Prometheus + Grafana (Phase 2)

### Maintenance
- **Immich updates:** Standard Docker image updates
- **Database migrations:** Alembic for schema changes
- **Backups:**
  - Media: NAS backup (existing)
  - Databases: Regular pg_dump
  - Config: Git repository
- **Cleanup:** Scheduled jobs for orphaned records

## Future Extensions

### PhotoPrism/LibrePhotos Research (Phase 2)
- After core features stable (3-6 months)
- Evaluate: natural language search, auto-categorization, map view
- Test alongside main system before integration

### Plugin Architecture
- Design services with clear interfaces
- Easy addition of new analysis modules
- Version services independently

### Potential Additions
- Advanced search (natural language)
- Better auto-tagging/categorization
- Map view integration
- Enhanced face clustering

## Decision Log

### Why Microservices vs Fork?
- Keep Immich upgradeable without conflicts
- Use best language per component
- Independent evolution and testing
- Can contribute features back to Immich

### Why JPEG Primary Display Default?
- Faster loading and thumbnails
- Most common viewing scenario
- RAW available on-demand via toggle

### Why TDD with 100% Coverage?
- Complex system with many edge cases
- High reliability requirement for personal data
- Confidence for refactoring and extensions

### Why Custom Web UI vs Extend Immich UI?
- Full control over grouping/dedup UX
- No coupling to Immich's frontend changes
- Can reuse components without forking

## Success Criteria

- [ ] All existing media organized and accessible
- [ ] RAW+JPEG pairs grouped and toggle-able
- [ ] Duplicates identified and reviewable
- [ ] Sub-second API response for photo grid
- [ ] Initial scan completes without errors
- [ ] Multi-user access works with permissions
- [ ] All tests passing with 100% coverage
- [ ] Web UI responsive on desktop and mobile

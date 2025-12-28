# Phase 3: API Gateway & Web UI Extension - Design

**Date:** 2025-12-28
**Status:** Approved

## Overview

Phase 3 implements the Aggregation Layer for the photo management system, consisting of an API Gateway (Node.js/Express) and Web UI (React/Vite). The gateway provides intelligent proxying, response enrichment, authentication validation, and caching. The web UI delivers an enhanced photo browsing experience with grouping and deduplication features.

## Architecture Overview

### Gateway Architecture (Node.js/Express/TypeScript)

The gateway acts as a smart proxy sitting between clients and three backend services: Immich, Grouping, and Deduplication.

**Core Responsibilities:**

1. **Authentication proxy** - Validates incoming Immich session tokens by calling Immich's validation endpoint, caches valid results in Redis (5-10 min TTL) to reduce auth overhead.

2. **Request routing** - Routes requests to appropriate backends:
   - `/api/immich/*` → Immich API (proxied through)
   - `/api/groups/*` → Grouping service
   - `/api/duplicates/*` → Deduplication service
   - `/api/assets` (special) → Immich + enrichment

3. **Response enrichment** - For photo list requests, fetches data from all three services in parallel, merges grouping and deduplication metadata into each photo object, returns unified response.

4. **Health monitoring** - Tracks backend service availability, fails fast with 503 if any required service is down during enrichment requests.

### Web UI Architecture (React/TypeScript/Vite)

Single-page application with three main views:

1. **Photo Grid** - Timeline layout with enriched photo cards showing group badges
2. **Version Switcher** - Modal/sidebar for viewing alternate versions (RAW+JPEG)
3. **Duplicates Tab** - Side-by-side comparison view for managing duplicates

The UI calls only the gateway, never directly to backend services. It handles 503 errors by showing error states.

## Gateway Component Details

### Middleware Stack

The Express app uses middleware in this order:

1. **CORS** - Allow requests from web UI origin
2. **JSON body parser** - Parse request bodies
3. **Request logging** - Winston structured logs (request ID, method, path, duration)
4. **Auth validator** - Check Authorization header, validate token with Immich (with Redis cache), attach user info to request
5. **Route handlers** - Proxy or enrichment logic
6. **Error handler** - Convert backend errors to appropriate HTTP status codes

### Redis Integration

Used only for token validation caching:

- **Key format:** `auth:token:{sha256(token)}`
- **Value:** `{userId, email, validatedAt}`
- **TTL:** 300 seconds (5 minutes)
- **On cache miss:** call Immich `/api/auth/validateToken`, cache result
- **On validation failure:** return 401, don't cache

### HTTP Client Configuration

Using `axios` with:

- **Timeout:** 5 seconds for auth checks, 30 seconds for data requests
- **Retry logic:** none (fail fast)
- **Connection pooling:** enabled via `http.Agent` with `keepAlive: true`
- **Error handling:** network errors → 503, backend 4xx/5xx → pass through status code

### Enrichment Algorithm

For `GET /api/assets`:

1. Validate token (with cache)
2. Proxy request to Immich → get photos array
3. Extract file paths from photos
4. **Parallel fetch:** Call grouping service (by file paths) + deduplication service (by file paths)
5. Build lookup maps: `filePath → groupInfo`, `filePath → dupInfo`
6. Merge into each photo: add `groupId`, `groupType`, `alternateVersions`, `duplicateGroupId`, `similarityScore`
7. Return enriched response

If grouping OR deduplication service fails: return 503 with error details.

## API Contracts

### Proxied Endpoints (Pass-through)

These endpoints simply proxy to backend services with validated auth:

```typescript
// Immich proxy
GET /api/immich/server-info → GET http://immich:2283/api/server-info
GET /api/immich/albums → GET http://immich:2283/api/albums
POST /api/immich/assets → POST http://immich:2283/api/assets
// ... all other Immich endpoints

// Grouping service proxy
GET /api/groups → GET http://grouping:8000/groups
POST /api/groups → POST http://grouping:8000/groups
GET /api/groups/{id} → GET http://grouping:8000/groups/{id}
// ... etc

// Deduplication service proxy
GET /api/duplicates → GET http://deduplication:8001/duplicates
POST /api/duplicates → POST http://deduplication:8001/duplicates
// ... etc
```

### Enriched Endpoint (Special handling)

```typescript
GET /api/assets?skip=0&limit=100

// Returns enriched response:
{
  "assets": [
    {
      // Original Immich fields
      "id": "immich-123",
      "originalPath": "/data/photos/IMG_1234.JPG",
      "type": "IMAGE",
      "createdAt": "2024-01-15T10:30:00Z",

      // Enrichment from grouping service
      "groupId": "grp-456",
      "groupType": "raw_jpeg",
      "isPrimaryVersion": true,
      "alternateVersions": [
        {
          "id": "immich-124",
          "originalPath": "/data/photos/IMG_1234.CR2",
          "fileType": "raw",
          "fileSize": 25165824
        }
      ],

      // Enrichment from deduplication service
      "duplicateGroupId": "dup-789",
      "duplicateType": "perceptual",
      "similarityScore": 0.97
    }
  ]
}
```

### Health Endpoint

```typescript
GET /health

// Returns:
{
  "status": "ok",
  "services": {
    "immich": {"status": "up", "latency": 12},
    "grouping": {"status": "up", "latency": 8},
    "deduplication": {"status": "up", "latency": 15},
    "redis": {"status": "up"}
  }
}
```

## Web UI Component Details

### Technology Stack

- **React 18** with TypeScript
- **Vite** for build tooling and dev server
- **React Router** for navigation
- **TanStack Query (React Query)** for API state management and caching
- **Tailwind CSS** for styling
- **Radix UI** for accessible component primitives (modals, dropdowns)

### Main Views

#### 1. Photo Grid View (`/photos`)

Component hierarchy:
```
PhotoGrid
├─ PhotoTimeline (date-based grouping)
│  ├─ DateSeparator (e.g., "December 28, 2024")
│  └─ PhotoCard[] (grid of photos)
│     ├─ Thumbnail (lazy loaded image)
│     ├─ GroupBadge (if grouped: "📁 3 versions")
│     └─ DuplicateBadge (if duplicate: "⚠️ Similar")
└─ InfiniteScroll (load more on scroll)
```

Features:
- Infinite scroll with TanStack Query's `useInfiniteQuery`
- Click photo → open lightbox view
- Click group badge → open version switcher modal
- Click duplicate badge → navigate to duplicates tab with that group highlighted

#### 2. Version Switcher Modal

Opens when clicking a grouped photo card:
```
VersionSwitcherModal
├─ VersionGrid (thumbnails of all versions)
│  └─ VersionCard[]
│     ├─ Thumbnail
│     ├─ FileTypeLabel ("RAW", "JPEG", etc.)
│     ├─ FileSizeLabel
│     └─ PrimaryBadge (if is_primary)
└─ Actions
   ├─ SetPrimaryButton
   ├─ DownloadButton
   └─ ViewFullButton
```

#### 3. Duplicates Tab (`/duplicates`)

```
DuplicatesView
├─ DuplicateGroupList
│  └─ DuplicateGroupCard[]
│     ├─ ComparisonView (side-by-side images)
│     ├─ SimilarityScore (e.g., "97% similar")
│     └─ Actions
│        ├─ KeepLeftButton
│        ├─ KeepRightButton
│        ├─ KeepBothButton
│        └─ DismissButton
└─ Filters (sort by: newest, size savings, similarity)
```

## Error Handling & State Management

### Gateway Error Handling

Error hierarchy and responses:

```typescript
// 1. Auth failures
401 Unauthorized
{
  "error": "invalid_token",
  "message": "Token validation failed"
}

// 2. Backend service unavailable
503 Service Unavailable
{
  "error": "service_unavailable",
  "message": "Grouping service is unavailable",
  "service": "grouping"
}

// 3. Backend returns error (pass through status code)
404 Not Found
{
  "error": "not_found",
  "message": "Group not found"
}

// 4. Gateway internal error
500 Internal Server Error
{
  "error": "internal_error",
  "message": "Failed to enrich response",
  "requestId": "req-12345"
}
```

All errors logged to Winston with structured context (request ID, user ID, error stack).

### UI State Management

Using TanStack Query for all API state:

```typescript
// Photo grid with infinite scroll
const { data, fetchNextPage, hasNextPage, isLoading, error } =
  useInfiniteQuery({
    queryKey: ['assets'],
    queryFn: ({ pageParam = 0 }) =>
      gatewayApi.getAssets({ skip: pageParam, limit: 100 }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.assets.length === 100 ? pages.length * 100 : undefined
  });

// Auto-refetch on window focus
// Stale time: 30 seconds
// Cache time: 5 minutes
```

### UI Error States

Three error UI patterns:

1. **Full-page error** - When initial load fails (show retry button)
2. **Inline error** - When action fails (toast notification)
3. **Service degraded** - When 503 from gateway (banner: "Some features unavailable")

## Testing Strategy

### Coverage Target: 100%

Exception criteria (same as Phase 2):
- Truly untestable edge cases (external service failures, extreme hardware issues, third-party race conditions)
- Must document WHY each exclusion is untestable

### Gateway Tests (Jest + Supertest)

Test structure mirroring Phase 2's TDD approach:

```
src/__tests__/
├── middleware/
│   ├── auth.test.ts (token validation, caching, cache miss, validation failure, network errors)
│   ├── errorHandler.test.ts (all error types, status code mapping)
│   └── logging.test.ts (request logging, error logging, structured fields)
├── services/
│   ├── enrichment.test.ts (parallel fetch, merging, partial failures, empty responses)
│   ├── immichClient.test.ts (proxy logic, timeout handling, connection errors)
│   ├── groupingClient.test.ts (all endpoints, error cases)
│   ├── deduplicationClient.test.ts (all endpoints, error cases)
│   └── redis.test.ts (cache operations, connection failures, serialization)
├── routes/
│   ├── assets.test.ts (enriched endpoint, pagination, empty results, backend failures)
│   ├── proxy.test.ts (passthrough routes, header forwarding, error passthrough)
│   └── health.test.ts (all services up, partial down, all down)
└── integration/
    └── endToEnd.test.ts (full request flows, auth → proxy → enrichment)
```

**Comprehensive test coverage:**

- Every function, every branch, every error path
- Network failures, timeout scenarios
- Redis connection failures
- All HTTP status codes
- Edge cases: empty arrays, null responses, malformed data
- Race conditions in parallel fetching
- Token expiration during request

### Web UI Tests (Vitest + React Testing Library)

```
src/__tests__/
├── components/
│   ├── PhotoCard.test.tsx (all states: loading, error, grouped, duplicate, normal)
│   ├── VersionSwitcher.test.tsx (modal open/close, set primary, download, keyboard nav)
│   ├── DuplicateGroupCard.test.tsx (all actions, loading states, error states)
│   ├── PhotoTimeline.test.tsx (date grouping, empty states)
│   └── ErrorBoundary.test.tsx (error catching, retry)
├── hooks/
│   ├── useAssets.test.ts (success, loading, error, refetch, cache)
│   ├── useEnrichment.test.ts (data transformations, null handling)
│   ├── useGroups.test.ts (CRUD operations, optimistic updates)
│   └── useDuplicates.test.ts (filtering, sorting, actions)
├── views/
│   ├── PhotoGrid.test.tsx (infinite scroll, loading more, end of list, errors)
│   ├── DuplicatesView.test.tsx (filtering, sorting, empty state, actions)
│   └── VersionSwitcherModal.test.tsx (full modal workflow)
├── utils/
│   ├── apiClient.test.ts (all HTTP methods, error handling, retries)
│   └── enrichmentHelpers.test.ts (data merging logic)
└── integration/
    └── userFlows.test.tsx (photo view → group → duplicate workflows)
```

**Comprehensive UI coverage:**

- Every component in all states
- Every user interaction (click, keyboard, scroll)
- All error boundaries
- Loading states, empty states, error states
- Accessibility (keyboard navigation, screen readers)
- Edge cases: network errors mid-scroll, race conditions

### TDD Workflow (Mandatory)

1. Write failing test FIRST
2. Run test, verify it fails
3. Write minimal code to pass
4. Run test, verify it passes
5. Refactor while keeping tests green
6. **No production code without failing test first**

## Deployment & Configuration

### Docker Setup

Both services use multi-stage builds for minimal production images.

**Gateway Dockerfile:**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

**Web UI Dockerfile:**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage (nginx)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Configuration

**Gateway (.env):**
```
PORT=3000
IMMICH_API_URL=http://immich:2283
GROUPING_API_URL=http://grouping:8000
DEDUPLICATION_API_URL=http://deduplication:8001
REDIS_URL=redis://redis-cache:6379
TOKEN_CACHE_TTL=300
REQUEST_TIMEOUT=30000
LOG_LEVEL=info
NODE_ENV=production
```

**Web UI (runtime config):**
```
VITE_GATEWAY_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

### Docker Compose Integration

Updates to existing docker-compose.yml:
```yaml
services:
  api-gateway:
    build: ./services/gateway
    ports:
      - "3000:3000"
    environment:
      - IMMICH_API_URL=http://immich-server:2283
      - GROUPING_API_URL=http://grouping-service:8000
      - DEDUPLICATION_API_URL=http://dedup-service:8001
      - REDIS_URL=redis://redis-cache:6379
    depends_on:
      - immich-server
      - grouping-service
      - dedup-service
      - redis-cache
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  web-ui:
    build: ./services/web
    ports:
      - "8080:80"
    environment:
      - VITE_GATEWAY_URL=http://api-gateway:3000
    depends_on:
      - api-gateway
```

## Complete Data Flow

### End-to-End Request Flow

```
User Browser
    ↓ GET /photos
Web UI (React)
    ↓ GET /api/assets?skip=0&limit=100
    ↓ Authorization: Bearer {immich-token}
API Gateway
    ↓
    ├─→ [Auth Middleware]
    │   ├─→ Check Redis cache for token
    │   ├─→ (miss) Call Immich /api/auth/validateToken
    │   ├─→ Cache result (5 min TTL)
    │   └─→ Attach userId to request
    ↓
    ├─→ [Enrichment Handler]
    │   ├─→ GET Immich /api/assets → photos[]
    │   ├─→ Parallel:
    │   │   ├─→ GET Grouping /groups?paths=...
    │   │   └─→ GET Deduplication /duplicates?paths=...
    │   ├─→ Build lookup maps
    │   ├─→ Merge enrichment into each photo
    │   └─→ Return enriched response
    ↓
Web UI
    ├─→ TanStack Query caches response
    ├─→ PhotoGrid renders enriched data
    ├─→ PhotoCard shows group/duplicate badges
    └─→ User sees photos with metadata
```

## Success Criteria

Phase 3 is complete when:

- [ ] Gateway proxies all requests to 3 backend services
- [ ] Token validation works with Redis caching
- [ ] Response enrichment merges group + duplicate data
- [ ] Gateway fails with 503 when any backend is down
- [ ] Health endpoint reports all service statuses
- [ ] Web UI displays photo grid with infinite scroll
- [ ] Group badges show on photos with alternate versions
- [ ] Duplicate badges show on similar photos
- [ ] Version switcher modal opens and sets primary version
- [ ] Duplicates tab shows comparison view with actions
- [ ] All gateway tests passing with 100% coverage
- [ ] All UI tests passing with 100% coverage
- [ ] Docker builds succeed for both services
- [ ] Integration with existing services verified
- [ ] API response time < 500ms for enriched requests (100 photos)
- [ ] UI renders initial photos < 1 second

## Performance Targets

- Gateway enrichment latency: < 200ms for 100 photos
- Token cache hit rate: > 80%
- UI first contentful paint: < 1.5s
- UI time to interactive: < 2.5s
- Infinite scroll: load next page < 500ms

## Decision Log

### Why Fail Fast on Backend Unavailability?

- Clear error feedback to users when system is degraded
- Prevents partial/confusing state in UI
- Simpler error handling than graceful degradation
- Can add graceful degradation later if needed

### Why Cache Only Token Validations?

- Token validation results are stable for token lifetime
- Photo data changes frequently (new uploads, edits)
- Enrichment data (groups, duplicates) changes with file operations
- Caching data risks stale UI, caching tokens doesn't

### Why TanStack Query for UI State?

- Built-in caching, refetching, and invalidation
- Infinite scroll support out of the box
- Loading/error states handled declaratively
- Industry standard for React API state

### Why 100% Test Coverage Target?

- Maintains same rigor as Phase 2
- Critical integration layer between all services
- Complex error handling requires comprehensive testing
- UI interactions have many edge cases

## Implementation Notes

- Follow Phase 2's subagent-driven development workflow
- Maintain same commit patterns and code quality standards
- Use existing TypeScript configs from Phase 1 scaffolding
- Integrate with existing Docker Compose setup
- Reuse patterns from grouping/deduplication services where applicable

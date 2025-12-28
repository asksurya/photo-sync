# Photo/Video Management System - Initial Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up project structure, Docker infrastructure, and foundational components for a self-hosted photo/video management system built on Immich with custom microservices.

**Architecture:** Microservices architecture with Immich as core (unmodified), custom Python services for grouping/deduplication, Node.js API Gateway for aggregation, and React web UI. All services containerized with Docker Compose.

**Tech Stack:** Docker, Docker Compose, Python 3.11+, Node.js 20+, TypeScript, React, PostgreSQL, Redis, pytest, jest

---

## Phase 1: Project Structure & Docker Foundation

### Task 1: Create Project Directory Structure

**Files:**
- Create: `README.md`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `services/grouping/Dockerfile`
- Create: `services/grouping/requirements.txt`
- Create: `services/grouping/pyproject.toml`
- Create: `services/deduplication/Dockerfile`
- Create: `services/deduplication/requirements.txt`
- Create: `services/deduplication/pyproject.toml`
- Create: `services/gateway/Dockerfile`
- Create: `services/gateway/package.json`
- Create: `services/web/Dockerfile`
- Create: `services/web/package.json`

**Step 1: Create README.md**

```bash
cat > README.md << 'EOF'
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
EOF
```

**Step 2: Create docker-compose.yml**

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Immich services (unmodified)
  immich-server:
    container_name: immich_server
    image: ghcr.io/immich-app/immich-server:${IMMICH_VERSION:-release}
    environment:
      - DB_HOSTNAME=immich-postgres
      - DB_USERNAME=postgres
      - DB_PASSWORD=${IMMICH_DB_PASSWORD}
      - DB_DATABASE_NAME=immich
      - REDIS_HOSTNAME=immich-redis
      - UPLOAD_LOCATION=/data/photos
    volumes:
      - ${MEDIA_PATH}:/data/photos:ro
      - immich-data:/usr/src/app/upload
    ports:
      - 2283:3001
    depends_on:
      - immich-redis
      - immich-postgres
    restart: unless-stopped

  immich-machine-learning:
    container_name: immich_machine_learning
    image: ghcr.io/immich-app/immich-machine-learning:${IMMICH_VERSION:-release}
    volumes:
      - immich-ml-cache:/cache
    restart: unless-stopped

  immich-redis:
    container_name: immich_redis
    image: redis:7-alpine
    restart: unless-stopped

  immich-postgres:
    container_name: immich_postgres
    image: tensorchord/pgvecto-rs:pg14-v0.2.0
    environment:
      - POSTGRES_PASSWORD=${IMMICH_DB_PASSWORD}
      - POSTGRES_USER=postgres
      - POSTGRES_DB=immich
    volumes:
      - immich-pgdata:/var/lib/postgresql/data
    restart: unless-stopped

  # Custom services
  grouping-service:
    container_name: grouping_service
    build:
      context: ./services/grouping
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:${CUSTOM_DB_PASSWORD}@custom-postgres:5432/grouping
      - MEDIA_PATH=/data/photos
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    volumes:
      - ${MEDIA_PATH}:/data/photos:ro
    depends_on:
      - custom-postgres
      - custom-redis
    restart: unless-stopped

  dedup-service:
    container_name: dedup_service
    build:
      context: ./services/deduplication
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://postgres:${CUSTOM_DB_PASSWORD}@custom-postgres:5432/deduplication
      - MEDIA_PATH=/data/photos
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
      - PHASH_THRESHOLD=${PHASH_THRESHOLD:-0.95}
    volumes:
      - ${MEDIA_PATH}:/data/photos:ro
    depends_on:
      - custom-postgres
      - custom-redis
    restart: unless-stopped

  api-gateway:
    container_name: api_gateway
    build:
      context: ./services/gateway
      dockerfile: Dockerfile
    environment:
      - IMMICH_API_URL=http://immich-server:3001
      - GROUPING_API_URL=http://grouping-service:8000
      - DEDUP_API_URL=http://dedup-service:8001
      - REDIS_URL=redis://custom-redis:6379
      - LOG_LEVEL=${LOG_LEVEL:-info}
    ports:
      - 3000:3000
    depends_on:
      - immich-server
      - grouping-service
      - dedup-service
      - custom-redis
    restart: unless-stopped

  web-ui:
    container_name: web_ui
    build:
      context: ./services/web
      dockerfile: Dockerfile
    environment:
      - REACT_APP_API_URL=http://localhost:3000
    ports:
      - 8080:80
    depends_on:
      - api-gateway
    restart: unless-stopped

  # Shared infrastructure for custom services
  custom-postgres:
    container_name: custom_postgres
    image: postgres:14-alpine
    environment:
      - POSTGRES_PASSWORD=${CUSTOM_DB_PASSWORD}
      - POSTGRES_USER=postgres
    volumes:
      - custom-pgdata:/var/lib/postgresql/data
      - ./scripts/init-databases.sql:/docker-entrypoint-initdb.d/init-databases.sql
    restart: unless-stopped

  custom-redis:
    container_name: custom_redis
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  immich-data:
  immich-pgdata:
  immich-ml-cache:
  custom-pgdata:

networks:
  default:
    name: photo-sync-network
EOF
```

**Step 3: Create .env.example**

```bash
cat > .env.example << 'EOF'
# Immich Configuration
IMMICH_VERSION=release
IMMICH_DB_PASSWORD=changeme_immich_db_password

# Custom Services Configuration
CUSTOM_DB_PASSWORD=changeme_custom_db_password

# Media Storage Path (absolute path to your NAS mount)
MEDIA_PATH=/mnt/nas/photos

# Deduplication Settings
PHASH_THRESHOLD=0.95

# Logging
LOG_LEVEL=INFO
EOF
```

**Step 4: Create database initialization script**

```bash
mkdir -p scripts
cat > scripts/init-databases.sql << 'EOF'
-- Create separate databases for each service
CREATE DATABASE grouping;
CREATE DATABASE deduplication;
EOF
```

**Step 5: Commit project structure**

```bash
git add README.md docker-compose.yml .env.example scripts/
git commit -m "feat: add project structure and Docker Compose setup

- Docker Compose with Immich and custom services
- Environment configuration template
- Database initialization script
- Project README"
```

### Task 2: Create Grouping Service Foundation

**Files:**
- Create: `services/grouping/Dockerfile`
- Create: `services/grouping/requirements.txt`
- Create: `services/grouping/pyproject.toml`
- Create: `services/grouping/src/__init__.py`
- Create: `services/grouping/src/config.py`
- Create: `services/grouping/tests/__init__.py`
- Create: `services/grouping/tests/test_config.py`
- Create: `services/grouping/pytest.ini`

**Step 1: Write failing test for config loading**

```bash
mkdir -p services/grouping/tests
cat > services/grouping/tests/test_config.py << 'EOF'
"""Tests for configuration loading."""
import pytest
from src.config import Config


def test_config_loads_from_environment(monkeypatch):
    """Test that Config loads values from environment variables."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost/test")
    monkeypatch.setenv("MEDIA_PATH", "/test/path")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")

    config = Config()

    assert config.database_url == "postgresql://test:test@localhost/test"
    assert config.media_path == "/test/path"
    assert config.log_level == "DEBUG"


def test_config_has_default_values():
    """Test that Config provides sensible defaults."""
    config = Config()

    assert config.timestamp_tolerance == 2
    assert config.batch_size == 500
    assert "jpg" in config.primary_preference
    assert "jpeg" in config.primary_preference
EOF
```

**Step 2: Run test to verify it fails**

```bash
cd services/grouping
python -m pytest tests/test_config.py -v
# Expected: FAIL - ModuleNotFoundError: No module named 'src.config'
```

**Step 3: Write minimal Config implementation**

```bash
mkdir -p services/grouping/src
cat > services/grouping/src/__init__.py << 'EOF'
"""Grouping service package."""
__version__ = "0.1.0"
EOF

cat > services/grouping/src/config.py << 'EOF'
"""Configuration management for grouping service."""
import os
from typing import List


class Config:
    """Application configuration loaded from environment variables."""

    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/grouping")
        self.media_path = os.getenv("MEDIA_PATH", "/data/photos")
        self.log_level = os.getenv("LOG_LEVEL", "INFO")

        # Grouping algorithm configuration
        self.timestamp_tolerance = int(os.getenv("TIMESTAMP_TOLERANCE", "2"))
        self.batch_size = int(os.getenv("BATCH_SIZE", "500"))

        # Primary version preference (in order of preference)
        self.primary_preference: List[str] = ["jpg", "jpeg", "png", "heic", "tiff", "raw"]
EOF
```

**Step 4: Create Python package configuration**

```bash
cat > services/grouping/requirements.txt << 'EOF'
# Core dependencies
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.5.3
pydantic-settings==2.1.0

# File watching and processing
watchdog==3.0.0
python-magic==0.4.27
pillow==10.2.0

# Utilities
python-dateutil==2.8.2
structlog==24.1.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx==0.26.0
EOF

cat > services/grouping/pyproject.toml << 'EOF'
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[project]
name = "grouping-service"
version = "0.1.0"
description = "Media file grouping service"
requires-python = ">=3.11"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
addopts = "--strict-markers --cov=src --cov-report=term-missing --cov-report=html --cov-fail-under=100"
asyncio_mode = "auto"

[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/__pycache__/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
]
EOF

cat > services/grouping/pytest.ini << 'EOF'
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
EOF
```

**Step 5: Run test to verify it passes**

```bash
cd services/grouping
pip install -r requirements.txt
python -m pytest tests/test_config.py -v
# Expected: PASS - 2 passed
```

**Step 6: Create Dockerfile**

```bash
cat > services/grouping/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for python-magic and image processing
RUN apt-get update && apt-get install -y \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run tests during build to ensure image is valid
RUN python -m pytest tests/ -v

# Expose API port
EXPOSE 8000

# Run the service
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
```

**Step 7: Commit grouping service foundation**

```bash
cd ../..
git add services/grouping/
git commit -m "feat: add grouping service foundation

- Configuration management with environment variables
- Python package structure with pytest
- Docker container setup
- 100% test coverage for config module"
```

### Task 3: Create Deduplication Service Foundation

**Files:**
- Create: `services/deduplication/Dockerfile`
- Create: `services/deduplication/requirements.txt`
- Create: `services/deduplication/pyproject.toml`
- Create: `services/deduplication/src/__init__.py`
- Create: `services/deduplication/src/config.py`
- Create: `services/deduplication/tests/__init__.py`
- Create: `services/deduplication/tests/test_config.py`
- Create: `services/deduplication/pytest.ini`

**Step 1: Write failing test for dedup config**

```bash
mkdir -p services/deduplication/tests
cat > services/deduplication/tests/test_config.py << 'EOF'
"""Tests for deduplication service configuration."""
import pytest
from src.config import Config


def test_config_loads_dedup_settings(monkeypatch):
    """Test that Config loads deduplication-specific settings."""
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost/dedup")
    monkeypatch.setenv("MEDIA_PATH", "/test/path")
    monkeypatch.setenv("PHASH_THRESHOLD", "0.92")

    config = Config()

    assert config.database_url == "postgresql://test:test@localhost/dedup"
    assert config.media_path == "/test/path"
    assert config.phash_threshold == 0.92


def test_config_has_dedup_defaults():
    """Test that Config provides dedup-specific defaults."""
    config = Config()

    assert config.phash_threshold == 0.95
    assert config.enable_exact_match is True
    assert config.enable_perceptual_match is True
    assert config.batch_size == 500
EOF
```

**Step 2: Run test to verify it fails**

```bash
cd services/deduplication
python -m pytest tests/test_config.py -v
# Expected: FAIL - ModuleNotFoundError: No module named 'src.config'
```

**Step 3: Write minimal Config implementation**

```bash
mkdir -p services/deduplication/src
cat > services/deduplication/src/__init__.py << 'EOF'
"""Deduplication service package."""
__version__ = "0.1.0"
EOF

cat > services/deduplication/src/config.py << 'EOF'
"""Configuration management for deduplication service."""
import os


class Config:
    """Application configuration loaded from environment variables."""

    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/deduplication")
        self.media_path = os.getenv("MEDIA_PATH", "/data/photos")
        self.log_level = os.getenv("LOG_LEVEL", "INFO")

        # Deduplication algorithm configuration
        self.phash_threshold = float(os.getenv("PHASH_THRESHOLD", "0.95"))
        self.enable_exact_match = os.getenv("ENABLE_EXACT_MATCH", "true").lower() == "true"
        self.enable_perceptual_match = os.getenv("ENABLE_PERCEPTUAL_MATCH", "true").lower() == "true"
        self.batch_size = int(os.getenv("BATCH_SIZE", "500"))
EOF
```

**Step 4: Create Python package configuration**

```bash
cat > services/deduplication/requirements.txt << 'EOF'
# Core dependencies
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.5.3
pydantic-settings==2.1.0

# Image processing and hashing
pillow==10.2.0
imagehash==4.3.1
python-magic==0.4.27

# File watching
watchdog==3.0.0

# Utilities
python-dateutil==2.8.2
structlog==24.1.0

# Testing
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
httpx==0.26.0
EOF

cat > services/deduplication/pyproject.toml << 'EOF'
[build-system]
requires = ["setuptools>=68.0"]
build-backend = "setuptools.build_meta"

[project]
name = "deduplication-service"
version = "0.1.0"
description = "Media file deduplication service"
requires-python = ">=3.11"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
addopts = "--strict-markers --cov=src --cov-report=term-missing --cov-report=html --cov-fail-under=100"
asyncio_mode = "auto"

[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/__pycache__/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
]
EOF

cat > services/deduplication/pytest.ini << 'EOF'
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
EOF
```

**Step 5: Run test to verify it passes**

```bash
cd services/deduplication
pip install -r requirements.txt
python -m pytest tests/test_config.py -v
# Expected: PASS - 2 passed
```

**Step 6: Create Dockerfile**

```bash
cat > services/deduplication/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libmagic1 \
    libmagic-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Run tests during build
RUN python -m pytest tests/ -v

# Expose API port
EXPOSE 8001

# Run the service
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
EOF
```

**Step 7: Commit deduplication service foundation**

```bash
cd ../..
git add services/deduplication/
git commit -m "feat: add deduplication service foundation

- Configuration with perceptual hash threshold
- Python package structure with pytest
- Docker container setup
- 100% test coverage for config module"
```

### Task 4: Create API Gateway Foundation

**Files:**
- Create: `services/gateway/Dockerfile`
- Create: `services/gateway/package.json`
- Create: `services/gateway/tsconfig.json`
- Create: `services/gateway/jest.config.js`
- Create: `services/gateway/src/config.ts`
- Create: `services/gateway/src/__tests__/config.test.ts`

**Step 1: Write failing test for gateway config**

```bash
mkdir -p services/gateway/src/__tests__
cat > services/gateway/src/__tests__/config.test.ts << 'EOF'
import { Config } from '../config';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads configuration from environment variables', () => {
    process.env.IMMICH_API_URL = 'http://test-immich:3001';
    process.env.GROUPING_API_URL = 'http://test-grouping:8000';
    process.env.DEDUP_API_URL = 'http://test-dedup:8001';
    process.env.REDIS_URL = 'redis://test-redis:6379';

    const config = new Config();

    expect(config.immichApiUrl).toBe('http://test-immich:3001');
    expect(config.groupingApiUrl).toBe('http://test-grouping:8000');
    expect(config.dedupApiUrl).toBe('http://test-dedup:8001');
    expect(config.redisUrl).toBe('redis://test-redis:6379');
  });

  it('provides default values', () => {
    const config = new Config();

    expect(config.port).toBe(3000);
    expect(config.logLevel).toBe('info');
    expect(config.cacheExpiry).toBe(300);
  });
});
EOF
```

**Step 2: Run test to verify it fails**

```bash
cd services/gateway
npm test
# Expected: FAIL - Cannot find module '../config'
```

**Step 3: Write minimal Config implementation**

```bash
cat > services/gateway/src/config.ts << 'EOF'
/**
 * Configuration management for API Gateway
 */
export class Config {
  public readonly immichApiUrl: string;
  public readonly groupingApiUrl: string;
  public readonly dedupApiUrl: string;
  public readonly redisUrl: string;
  public readonly port: number;
  public readonly logLevel: string;
  public readonly cacheExpiry: number;

  constructor() {
    this.immichApiUrl = process.env.IMMICH_API_URL || 'http://immich-server:3001';
    this.groupingApiUrl = process.env.GROUPING_API_URL || 'http://grouping-service:8000';
    this.dedupApiUrl = process.env.DEDUP_API_URL || 'http://dedup-service:8001';
    this.redisUrl = process.env.REDIS_URL || 'redis://custom-redis:6379';
    this.port = parseInt(process.env.PORT || '3000', 10);
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.cacheExpiry = parseInt(process.env.CACHE_EXPIRY || '300', 10);
  }
}
EOF
```

**Step 4: Create package.json with TypeScript setup**

```bash
cat > services/gateway/package.json << 'EOF'
{
  "name": "api-gateway",
  "version": "0.1.0",
  "description": "API Gateway for photo management system",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn src/server.ts",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.5",
    "redis": "^4.6.12",
    "winston": "^3.11.0",
    "http-proxy-middleware": "^2.0.6",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.11.0",
    "@types/cors": "^2.8.17",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF

cat > services/gateway/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
EOF

cat > services/gateway/jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
EOF
```

**Step 5: Run test to verify it passes**

```bash
cd services/gateway
npm install
npm test
# Expected: PASS - 2 passed, 100% coverage
```

**Step 6: Create Dockerfile**

```bash
cat > services/gateway/Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Run tests
RUN npm test

# Expose API port
EXPOSE 3000

# Run the service
CMD ["npm", "start"]
EOF
```

**Step 7: Commit API gateway foundation**

```bash
cd ../..
git add services/gateway/
git commit -m "feat: add API gateway foundation

- TypeScript configuration and project setup
- Configuration management with environment variables
- Jest testing framework with 100% coverage
- Docker container setup"
```

### Task 5: Create Web UI Foundation

**Files:**
- Create: `services/web/Dockerfile`
- Create: `services/web/package.json`
- Create: `services/web/tsconfig.json`
- Create: `services/web/vite.config.ts`
- Create: `services/web/index.html`
- Create: `services/web/src/config.ts`
- Create: `services/web/src/__tests__/config.test.ts`

**Step 1: Write failing test for web config**

```bash
mkdir -p services/web/src/__tests__
cat > services/web/src/__tests__/config.test.ts << 'EOF'
import { config } from '../config';

describe('Config', () => {
  it('exports configuration object', () => {
    expect(config).toBeDefined();
    expect(config.apiUrl).toBeDefined();
  });

  it('uses environment variable for API URL', () => {
    // Vite uses import.meta.env, which is set at build time
    expect(typeof config.apiUrl).toBe('string');
  });
});
EOF
```

**Step 2: Run test to verify it fails**

```bash
cd services/web
npm test
# Expected: FAIL - Cannot find module '../config'
```

**Step 3: Write minimal Config implementation**

```bash
mkdir -p services/web/src
cat > services/web/src/config.ts << 'EOF'
/**
 * Configuration management for Web UI
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
};
EOF
```

**Step 4: Create package.json with React and Vite**

```bash
cat > services/web/package.json << 'EOF'
{
  "name": "photo-sync-web",
  "version": "0.1.0",
  "description": "Web UI for photo management system",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run --coverage",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@typescript-eslint/eslint-plugin": "^6.18.1",
    "@typescript-eslint/parser": "^6.18.1",
    "@vitejs/plugin-react": "^4.2.1",
    "@vitest/coverage-v8": "^1.2.0",
    "eslint": "^8.56.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "vitest": "^1.2.0",
    "jsdom": "^23.2.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF

cat > services/web/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat > services/web/tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

cat > services/web/vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
});
EOF

cat > services/web/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Photo Sync</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
```

**Step 5: Run test to verify it passes**

```bash
cd services/web
npm install
npm test
# Expected: PASS - 2 passed, 100% coverage
```

**Step 6: Create Dockerfile with nginx**

```bash
cat > services/web/Dockerfile << 'EOF'
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Run tests
RUN npm test

# Build production bundle
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

cat > services/web/nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy to avoid CORS issues
    location /api {
        proxy_pass http://api-gateway:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

**Step 7: Commit web UI foundation**

```bash
cd ../..
git add services/web/
git commit -m "feat: add web UI foundation

- React + TypeScript + Vite setup
- Configuration management
- Vitest testing framework with 100% coverage
- Docker multi-stage build with nginx"
```

### Task 6: Add Development Documentation

**Files:**
- Create: `docs/development/setup.md`
- Create: `docs/development/testing.md`
- Create: `docs/development/architecture.md`

**Step 1: Create setup guide**

```bash
mkdir -p docs/development
cat > docs/development/setup.md << 'EOF'
# Development Setup

## Prerequisites

- Docker and Docker Compose
- Node.js 20+
- Python 3.11+
- Git

## Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd photo-sync
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. Start services:
   ```bash
   docker-compose up -d
   ```

## Local Development

### Grouping Service

```bash
cd services/grouping
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
pytest
```

### Deduplication Service

```bash
cd services/deduplication
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest
```

### API Gateway

```bash
cd services/gateway
npm install
npm test
npm run dev
```

### Web UI

```bash
cd services/web
npm install
npm test
npm run dev
```

## Running Tests

### All Services

```bash
./scripts/test-all.sh
```

### Individual Services

```bash
# Grouping
cd services/grouping && pytest

# Deduplication
cd services/deduplication && pytest

# Gateway
cd services/gateway && npm test

# Web
cd services/web && npm test
```

## Database Migrations

### Grouping Service

```bash
cd services/grouping
alembic upgrade head
```

### Deduplication Service

```bash
cd services/deduplication
alembic upgrade head
```
EOF
```

**Step 2: Create testing guide**

```bash
cat > docs/development/testing.md << 'EOF'
# Testing Guidelines

## Test-Driven Development (TDD)

All features MUST follow TDD:

1. Write failing test
2. Run test to verify it fails
3. Write minimal code to pass test
4. Run test to verify it passes
5. Refactor if needed
6. Commit

## Coverage Requirements

- **Target**: 100% coverage
- **Exceptions**: Only extreme edge cases that cannot be tested
- **Tools**: pytest (Python), jest/vitest (JavaScript/TypeScript)

## Test Structure

### Python Services

```python
# tests/test_module.py
import pytest

def test_specific_behavior():
    """Test description."""
    # Arrange
    input_data = create_test_data()

    # Act
    result = function_under_test(input_data)

    # Assert
    assert result == expected_output
```

### TypeScript Services

```typescript
// src/__tests__/module.test.ts
describe('Module', () => {
  it('should handle specific behavior', () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

## Running Tests

### With Coverage

```bash
# Python
pytest --cov=src --cov-report=html

# TypeScript
npm test -- --coverage
```

### Watch Mode

```bash
# Python
pytest-watch

# TypeScript
npm run test:watch
```

## Test Data

- Use fixtures for reusable test data
- Create minimal test data (YAGNI)
- Clean up after tests (especially file operations)
EOF
```

**Step 3: Create architecture documentation**

```bash
cat > docs/development/architecture.md << 'EOF'
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
EOF
```

**Step 4: Create test script**

```bash
cat > scripts/test-all.sh << 'EOF'
#!/bin/bash
set -e

echo "Running all tests..."

echo ""
echo "=== Grouping Service ==="
cd services/grouping
python -m pytest --cov=src --cov-report=term-missing
cd ../..

echo ""
echo "=== Deduplication Service ==="
cd services/deduplication
python -m pytest --cov=src --cov-report=term-missing
cd ../..

echo ""
echo "=== API Gateway ==="
cd services/gateway
npm test
cd ../..

echo ""
echo "=== Web UI ==="
cd services/web
npm test
cd ../..

echo ""
echo "✅ All tests passed!"
EOF

chmod +x scripts/test-all.sh
```

**Step 5: Commit documentation**

```bash
git add docs/development/ scripts/test-all.sh
git commit -m "docs: add development setup and testing guides

- Development setup instructions
- Testing guidelines with TDD workflow
- Architecture documentation
- Test runner script for all services"
```

## Summary

This initial setup plan creates:

1. **Project structure** with Docker Compose orchestration
2. **Grouping service** foundation (Python/FastAPI)
3. **Deduplication service** foundation (Python/FastAPI)
4. **API Gateway** foundation (Node.js/Express)
5. **Web UI** foundation (React/Vite)
6. **Documentation** for development and testing

All services have:
- Configuration management
- Test framework setup
- Docker containerization
- 100% test coverage for initial modules

## Next Steps

After completing this initial setup, the next implementation phases will be:

1. **Database models and migrations** for grouping/dedup services
2. **File watching and scanning** implementation
3. **Grouping algorithm** (RAW+JPEG detection)
4. **Deduplication algorithm** (hash computation and matching)
5. **API endpoints** for all services
6. **API Gateway integration** and response enrichment
7. **Web UI components** (photo grid, version switcher, duplicates tab)

Each phase will follow the same TDD approach with bite-sized tasks.

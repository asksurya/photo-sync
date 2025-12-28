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

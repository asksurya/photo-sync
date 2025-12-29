# Import Intelligence Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Analysis Service that automates photo triage by detecting duplicates, scoring quality, finding burst sequences, and presenting smart recommendations in a triage dashboard.

**Architecture:** New Python/FastAPI microservice that analyzes photos from Immich imports, stores results in PostgreSQL, and exposes triage API endpoints consumed by the web UI via API Gateway.

**Tech Stack:** Python 3.11+, FastAPI, OpenCV, PIL/Pillow, PostgreSQL, pytest, Alembic

---

## Phase 1: Service Foundation & Database (Tasks 1-15)

### Task 1: Create Analysis Service Directory Structure

**Files:**
- Create: `services/analysis/src/__init__.py`
- Create: `services/analysis/tests/__init__.py`
- Create: `services/analysis/alembic/`
- Create: `services/analysis/requirements.txt`
- Create: `services/analysis/Dockerfile`
- Create: `services/analysis/pyproject.toml`
- Create: `services/analysis/pytest.ini`
- Create: `services/analysis/.gitignore`

**Step 1: Create directory structure**

Run:
```bash
cd services
mkdir -p analysis/src analysis/tests analysis/alembic
touch analysis/src/__init__.py analysis/tests/__init__.py
```

**Step 2: Create requirements.txt**

Create `services/analysis/requirements.txt`:
```
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
alembic==1.13.1
psycopg2-binary==2.9.9
pydantic==2.5.3
pydantic-settings==2.1.0
opencv-python-headless==4.9.0.80
pillow==10.2.0
httpx==0.26.0
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
```

**Step 3: Create pyproject.toml**

Create `services/analysis/pyproject.toml`:
```toml
[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "analysis-service"
version = "0.1.0"
description = "Photo import intelligence and triage service"
requires-python = ">=3.11"

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"
addopts = "-v --cov=src --cov-report=term-missing"
asyncio_mode = "auto"
```

**Step 4: Create pytest.ini**

Create `services/analysis/pytest.ini`:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

**Step 5: Create .gitignore**

Create `services/analysis/.gitignore`:
```
__pycache__/
*.py[cod]
*$py.class
.coverage
.pytest_cache/
htmlcov/
*.egg-info/
dist/
build/
.env
venv/
```

**Step 6: Create Dockerfile**

Create `services/analysis/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8002

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002"]
```

**Step 7: Commit service foundation**

Run:
```bash
cd services/analysis
git add .
git commit -m "feat(analysis): initialize analysis service structure"
```

---

### Task 2: Database Configuration & Models

**Files:**
- Create: `services/analysis/src/config.py`
- Create: `services/analysis/src/database.py`
- Create: `services/analysis/src/models.py`
- Test: `services/analysis/tests/test_config.py`
- Test: `services/analysis/tests/test_models.py`

**Step 1: Write config test**

Create `services/analysis/tests/test_config.py`:
```python
import os
from src.config import Settings


def test_settings_from_env():
    os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
    os.environ["IMMICH_API_URL"] = "http://localhost:2283"

    settings = Settings()

    assert settings.DATABASE_URL == "postgresql://test:test@localhost/test"
    assert settings.IMMICH_API_URL == "http://localhost:2283"
    assert settings.API_PORT == 8002  # default


def test_settings_defaults():
    settings = Settings()

    assert settings.API_PORT == 8002
    assert settings.LOG_LEVEL == "INFO"
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd services/analysis
pytest tests/test_config.py -v
```

Expected: FAIL with "ModuleNotFoundError: No module named 'src.config'"

**Step 3: Implement config**

Create `services/analysis/src/config.py`:
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://analysis:analysis@custom-postgres:5432/custom_db"
    IMMICH_API_URL: str = "http://immich_server:2283"
    API_PORT: int = 8002
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
```

**Step 4: Run test to verify it passes**

Run:
```bash
pytest tests/test_config.py -v
```

Expected: PASS (2 tests)

**Step 5: Write database test**

Create `services/analysis/tests/test_models.py`:
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base
from src.models import ImportBatch, AssetQualityScore, BurstSequence, TriageAction


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_import_batch_creation(db_session):
    batch = ImportBatch(
        immich_user_id="test-user-123",
        total_assets=100,
        status="processing"
    )
    db_session.add(batch)
    db_session.commit()

    assert batch.id is not None
    assert batch.immich_user_id == "test-user-123"
    assert batch.total_assets == 100
    assert batch.analyzed_assets == 0
    assert batch.status == "processing"


def test_asset_quality_score_creation(db_session):
    batch = ImportBatch(immich_user_id="user", total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset-123",
        import_batch_id=batch.id,
        blur_score=85.5,
        exposure_score=92.0,
        overall_quality=88.0,
        is_corrupted=False
    )
    db_session.add(score)
    db_session.commit()

    assert score.id is not None
    assert score.blur_score == 85.5
    assert score.overall_quality == 88.0


def test_burst_sequence_creation(db_session):
    batch = ImportBatch(immich_user_id="user", total_assets=5, status="processing")
    db_session.add(batch)
    db_session.commit()

    burst = BurstSequence(
        import_batch_id=batch.id,
        immich_asset_ids=["asset-1", "asset-2", "asset-3"],
        recommended_asset_id="asset-2"
    )
    db_session.add(burst)
    db_session.commit()

    assert burst.id is not None
    assert len(burst.immich_asset_ids) == 3
    assert burst.recommended_asset_id == "asset-2"


def test_triage_action_creation(db_session):
    batch = ImportBatch(immich_user_id="user", total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    action = TriageAction(
        import_batch_id=batch.id,
        action_type="delete",
        immich_asset_id="asset-456",
        applied=False,
        user_overridden=False
    )
    db_session.add(action)
    db_session.commit()

    assert action.id is not None
    assert action.action_type == "delete"
    assert action.applied is False


def test_cascade_delete_on_batch(db_session):
    batch = ImportBatch(immich_user_id="user", total_assets=1, status="complete")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset",
        import_batch_id=batch.id,
        overall_quality=50.0
    )
    db_session.add(score)
    db_session.commit()

    db_session.delete(batch)
    db_session.commit()

    # Score should be cascade deleted
    assert db_session.query(AssetQualityScore).count() == 0
```

**Step 6: Run test to verify it fails**

Run:
```bash
pytest tests/test_models.py -v
```

Expected: FAIL with import errors

**Step 7: Implement database.py**

Create `services/analysis/src/database.py`:
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 8: Implement models.py**

Create `services/analysis/src/models.py`:
```python
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, TIMESTAMP, ForeignKey, ARRAY, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    immich_user_id = Column(String(255), nullable=False, index=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    status = Column(String(20), nullable=False, index=True)
    total_assets = Column(Integer, nullable=False)
    analyzed_assets = Column(Integer, default=0)
    skipped_assets = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Relationships
    quality_scores = relationship("AssetQualityScore", back_populates="batch", cascade="all, delete-orphan")
    burst_sequences = relationship("BurstSequence", back_populates="batch", cascade="all, delete-orphan")
    triage_actions = relationship("TriageAction", back_populates="batch", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('processing', 'complete', 'failed')", name="check_status"),
    )


class AssetQualityScore(Base):
    __tablename__ = "asset_quality_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    immich_asset_id = Column(String(255), nullable=False, index=True)
    import_batch_id = Column(UUID(as_uuid=True), ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    blur_score = Column(Float, nullable=True)
    exposure_score = Column(Float, nullable=True)
    overall_quality = Column(Float, nullable=True, index=True)
    is_corrupted = Column(Boolean, default=False)
    analyzed_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationship
    batch = relationship("ImportBatch", back_populates="quality_scores")

    __table_args__ = (
        CheckConstraint("blur_score IS NULL OR (blur_score >= 0 AND blur_score <= 100)", name="check_blur_score"),
        CheckConstraint("exposure_score IS NULL OR (exposure_score >= 0 AND exposure_score <= 100)", name="check_exposure_score"),
        CheckConstraint("overall_quality IS NULL OR (overall_quality >= 0 AND overall_quality <= 100)", name="check_overall_quality"),
    )


class BurstSequence(Base):
    __tablename__ = "burst_sequences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_batch_id = Column(UUID(as_uuid=True), ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    immich_asset_ids = Column(ARRAY(String(255)), nullable=False)
    recommended_asset_id = Column(String(255), nullable=True, index=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationship
    batch = relationship("ImportBatch", back_populates="burst_sequences")


class TriageAction(Base):
    __tablename__ = "triage_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_batch_id = Column(UUID(as_uuid=True), ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    action_type = Column(String(20), nullable=False)
    immich_asset_id = Column(String(255), nullable=False, index=True)
    applied = Column(Boolean, default=False, index=True)
    applied_at = Column(TIMESTAMP, nullable=True)
    user_overridden = Column(Boolean, default=False)

    # Relationship
    batch = relationship("ImportBatch", back_populates="triage_actions")

    __table_args__ = (
        CheckConstraint("action_type IN ('delete', 'keep', 'organize')", name="check_action_type"),
    )
```

**Step 9: Run tests to verify they pass**

Run:
```bash
pytest tests/test_models.py -v
```

Expected: PASS (5 tests)

**Step 10: Commit database models**

Run:
```bash
git add src/config.py src/database.py src/models.py tests/test_config.py tests/test_models.py
git commit -m "feat(analysis): add database models and config"
```

---

### Task 3: Alembic Database Migrations

**Files:**
- Create: `services/analysis/alembic.ini`
- Create: `services/analysis/alembic/env.py`
- Create: `services/analysis/alembic/script.py.mako`
- Create: `services/analysis/alembic/versions/001_initial_schema.py`
- Test: `services/analysis/tests/test_migrations.py`

**Step 1: Create alembic.ini**

Create `services/analysis/alembic.ini`:
```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql://analysis:analysis@localhost:5432/custom_db

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

**Step 2: Create alembic/env.py**

Create `services/analysis/alembic/env.py`:
```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.database import Base
from src.models import ImportBatch, AssetQualityScore, BurstSequence, TriageAction
from src.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

**Step 3: Create migration script template**

Create `services/analysis/alembic/script.py.mako`:
```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

# revision identifiers, used by Alembic.
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

**Step 4: Generate initial migration**

Run:
```bash
cd services/analysis
alembic revision --autogenerate -m "initial_schema"
```

This creates `alembic/versions/xxx_initial_schema.py`

**Step 5: Write migration test**

Create `services/analysis/tests/test_migrations.py`:
```python
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_migrations_run_successfully():
    engine = create_engine("sqlite:///:memory:")

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", "sqlite:///:memory:")

    # Run upgrade
    command.upgrade(alembic_cfg, "head")

    # Verify tables exist
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    assert "import_batches" in tables
    assert "asset_quality_scores" in tables
    assert "burst_sequences" in tables
    assert "triage_actions" in tables
```

**Step 6: Run migration test**

Run:
```bash
pytest tests/test_migrations.py -v
```

Expected: PASS

**Step 7: Commit migrations**

Run:
```bash
git add alembic/ alembic.ini tests/test_migrations.py
git commit -m "feat(analysis): add database migrations"
```

---

### Task 4: FastAPI Application Setup

**Files:**
- Create: `services/analysis/src/main.py`
- Create: `services/analysis/src/schemas.py`
- Test: `services/analysis/tests/test_main.py`

**Step 1: Write main.py test**

Create `services/analysis/tests/test_main.py`:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "analysis"}


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "analysis" in response.json()["service"].lower()
```

**Step 2: Run test to verify it fails**

Run:
```bash
pytest tests/test_main.py -v
```

Expected: FAIL with import error

**Step 3: Create schemas.py**

Create `services/analysis/src/schemas.py`:
```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class ImportBatchCreate(BaseModel):
    immich_user_id: str
    asset_ids: List[str]


class ImportBatchResponse(BaseModel):
    batch_id: UUID
    status: str

    class Config:
        from_attributes = True


class AnalysisStatus(BaseModel):
    status: str
    progress_percent: float
    eta_seconds: Optional[int]
    total_assets: int
    analyzed_assets: int
    skipped_assets: int

    class Config:
        from_attributes = True


class QualityScoreResponse(BaseModel):
    immich_asset_id: str
    blur_score: Optional[float]
    exposure_score: Optional[float]
    overall_quality: Optional[float]
    is_corrupted: bool

    class Config:
        from_attributes = True


class BurstSequenceResponse(BaseModel):
    immich_asset_ids: List[str]
    recommended_asset_id: Optional[str]

    class Config:
        from_attributes = True


class TriageCategory(BaseModel):
    category_type: str
    count: int
    estimated_savings_bytes: Optional[int]
    badge_color: str  # green, yellow, orange


class TriageDashboard(BaseModel):
    categories: List[TriageCategory]
    total_assets: int
    analyzed_assets: int

    class Config:
        from_attributes = True


class TriageActionRequest(BaseModel):
    asset_id: str
    action_type: str  # delete, keep, organize


class TriageActionsApply(BaseModel):
    actions: List[TriageActionRequest]


class TriageActionsResponse(BaseModel):
    applied_count: int
    failed_count: int
    errors: Optional[List[str]]
```

**Step 4: Implement main.py**

Create `services/analysis/src/main.py`:
```python
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import get_db, engine, Base
from .config import settings
import logging

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Analysis Service",
    description="Photo import intelligence and triage service",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "service": "Analysis Service",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "analysis"}
```

**Step 5: Run test to verify it passes**

Run:
```bash
pytest tests/test_main.py -v
```

Expected: PASS (2 tests)

**Step 6: Commit FastAPI setup**

Run:
```bash
git add src/main.py src/schemas.py tests/test_main.py
git commit -m "feat(analysis): add FastAPI application setup"
```

---

## Phase 2: Quality Scoring Engine (Tasks 5-10)

### Task 5: Blur Detection Module

**Files:**
- Create: `services/analysis/src/quality/blur_detector.py`
- Test: `services/analysis/tests/test_blur_detector.py`
- Test Data: `services/analysis/tests/fixtures/sharp_photo.jpg`
- Test Data: `services/analysis/tests/fixtures/blurry_photo.jpg`

**Step 1: Write blur detector test**

Create `services/analysis/tests/test_blur_detector.py`:
```python
import pytest
import numpy as np
from PIL import Image
from src.quality.blur_detector import BlurDetector


@pytest.fixture
def blur_detector():
    return BlurDetector()


@pytest.fixture
def sharp_image():
    # Create synthetic sharp image with high-frequency content
    img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    for i in range(0, 100, 10):
        img[i:i+5, :] = 255  # Sharp vertical lines
    return Image.fromarray(img)


@pytest.fixture
def blurry_image():
    # Create synthetic blurry image (uniform gray)
    img = np.full((100, 100, 3), 128, dtype=np.uint8)
    return Image.fromarray(img)


def test_blur_detector_initialization(blur_detector):
    assert blur_detector is not None


def test_detect_sharp_image(blur_detector, sharp_image):
    score = blur_detector.calculate_blur_score(sharp_image)
    assert score > 50.0  # Sharp images should score high
    assert score <= 100.0


def test_detect_blurry_image(blur_detector, blurry_image):
    score = blur_detector.calculate_blur_score(blurry_image)
    assert score < 50.0  # Blurry images should score low
    assert score >= 0.0


def test_blur_score_range(blur_detector, sharp_image):
    score = blur_detector.calculate_blur_score(sharp_image)
    assert 0.0 <= score <= 100.0


def test_blur_detector_with_numpy_array(blur_detector):
    img_array = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    img = Image.fromarray(img_array)
    score = blur_detector.calculate_blur_score(img)
    assert 0.0 <= score <= 100.0
```

**Step 2: Run test to verify it fails**

Run:
```bash
pytest tests/test_blur_detector.py -v
```

Expected: FAIL with import error

**Step 3: Implement blur detector**

Create `services/analysis/src/quality/__init__.py`:
```python
# Quality analysis modules
```

Create `services/analysis/src/quality/blur_detector.py`:
```python
import cv2
import numpy as np
from PIL import Image
from typing import Union


class BlurDetector:
    """Detects blur in images using Laplacian variance method."""

    def __init__(self, threshold: float = 100.0):
        """
        Args:
            threshold: Laplacian variance threshold for blur detection.
                      Higher values = sharper images required.
        """
        self.threshold = threshold

    def calculate_blur_score(self, image: Union[Image.Image, np.ndarray]) -> float:
        """
        Calculate blur score for an image (0-100, higher = sharper).

        Args:
            image: PIL Image or numpy array

        Returns:
            Blur score between 0 (very blurry) and 100 (very sharp)
        """
        # Convert PIL Image to numpy array if needed
        if isinstance(image, Image.Image):
            img_array = np.array(image)
        else:
            img_array = image

        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Calculate Laplacian variance
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()

        # Normalize to 0-100 scale
        # Using sigmoid-like function to map variance to score
        # Typical sharp images have variance 100-1000+
        # Blurry images have variance 0-100
        normalized_score = min(100.0, (variance / self.threshold) * 100.0)

        return float(normalized_score)
```

**Step 4: Run test to verify it passes**

Run:
```bash
pytest tests/test_blur_detector.py -v
```

Expected: PASS (5 tests)

**Step 5: Commit blur detector**

Run:
```bash
git add src/quality/ tests/test_blur_detector.py
git commit -m "feat(analysis): add blur detection module"
```

---

### Task 6: Exposure Analysis Module

**Files:**
- Create: `services/analysis/src/quality/exposure_analyzer.py`
- Test: `services/analysis/tests/test_exposure_analyzer.py`

**Step 1: Write exposure analyzer test**

Create `services/analysis/tests/test_exposure_analyzer.py`:
```python
import pytest
import numpy as np
from PIL import Image
from src.quality.exposure_analyzer import ExposureAnalyzer


@pytest.fixture
def exposure_analyzer():
    return ExposureAnalyzer()


@pytest.fixture
def well_exposed_image():
    # Create image with good histogram distribution (centered around 128)
    img = np.random.normal(128, 30, (100, 100, 3)).clip(0, 255).astype(np.uint8)
    return Image.fromarray(img)


@pytest.fixture
def dark_image():
    # Create very dark image
    img = np.random.normal(30, 20, (100, 100, 3)).clip(0, 255).astype(np.uint8)
    return Image.fromarray(img)


@pytest.fixture
def bright_image():
    # Create very bright/overexposed image
    img = np.random.normal(220, 20, (100, 100, 3)).clip(0, 255).astype(np.uint8)
    return Image.fromarray(img)


def test_exposure_analyzer_initialization(exposure_analyzer):
    assert exposure_analyzer is not None


def test_well_exposed_image_scores_high(exposure_analyzer, well_exposed_image):
    score = exposure_analyzer.calculate_exposure_score(well_exposed_image)
    assert score > 70.0
    assert score <= 100.0


def test_dark_image_scores_low(exposure_analyzer, dark_image):
    score = exposure_analyzer.calculate_exposure_score(dark_image)
    assert score < 50.0


def test_bright_image_scores_low(exposure_analyzer, bright_image):
    score = exposure_analyzer.calculate_exposure_score(bright_image)
    assert score < 50.0


def test_exposure_score_range(exposure_analyzer, well_exposed_image):
    score = exposure_analyzer.calculate_exposure_score(well_exposed_image)
    assert 0.0 <= score <= 100.0
```

**Step 2: Run test to verify it fails**

Run:
```bash
pytest tests/test_exposure_analyzer.py -v
```

Expected: FAIL with import error

**Step 3: Implement exposure analyzer**

Create `services/analysis/src/quality/exposure_analyzer.py`:
```python
import cv2
import numpy as np
from PIL import Image
from typing import Union


class ExposureAnalyzer:
    """Analyzes image exposure using histogram distribution."""

    def calculate_exposure_score(self, image: Union[Image.Image, np.ndarray]) -> float:
        """
        Calculate exposure quality score (0-100, higher = better exposed).

        Good exposure has histogram centered around mid-tones (128).
        Poor exposure is too dark (histogram left) or too bright (histogram right).

        Args:
            image: PIL Image or numpy array

        Returns:
            Exposure score between 0 (very poor) and 100 (excellent)
        """
        # Convert PIL Image to numpy array if needed
        if isinstance(image, Image.Image):
            img_array = np.array(image)
        else:
            img_array = image

        # Convert to grayscale for histogram
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Calculate histogram
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten() / hist.sum()  # Normalize

        # Calculate mean brightness
        mean_brightness = np.average(np.arange(256), weights=hist)

        # Calculate histogram spread (standard deviation)
        std_dev = np.sqrt(np.average((np.arange(256) - mean_brightness)**2, weights=hist))

        # Score based on mean brightness (penalty for too dark or too bright)
        # Ideal mean is around 128, with some tolerance
        brightness_penalty = abs(mean_brightness - 128) / 128
        brightness_score = max(0, 1.0 - brightness_penalty)

        # Score based on histogram spread (good images have reasonable spread)
        # Too narrow = flat/dull, too wide = potentially overexposed highlights + dark shadows
        spread_score = min(1.0, std_dev / 50.0)  # Normalize to 0-1

        # Combine scores (weighted average)
        final_score = (brightness_score * 0.6 + spread_score * 0.4) * 100.0

        return float(max(0.0, min(100.0, final_score)))
```

**Step 4: Run test to verify it passes**

Run:
```bash
pytest tests/test_exposure_analyzer.py -v
```

Expected: PASS (5 tests)

**Step 5: Commit exposure analyzer**

Run:
```bash
git add src/quality/exposure_analyzer.py tests/test_exposure_analyzer.py
git commit -m "feat(analysis): add exposure analysis module"
```

---

### Task 7: Corruption Detector Module

**Files:**
- Create: `services/analysis/src/quality/corruption_detector.py`
- Test: `services/analysis/tests/test_corruption_detector.py`

**Step 1: Write corruption detector test**

Create `services/analysis/tests/test_corruption_detector.py`:
```python
import pytest
from PIL import Image
import io
from src.quality.corruption_detector import CorruptionDetector


@pytest.fixture
def corruption_detector():
    return CorruptionDetector()


@pytest.fixture
def valid_image_bytes():
    img = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return buffer.getvalue()


@pytest.fixture
def corrupted_image_bytes():
    # Truncated JPEG data
    return b'\xff\xd8\xff\xe0\x00\x10JFIF'  # Incomplete JPEG header


def test_corruption_detector_initialization(corruption_detector):
    assert corruption_detector is not None


def test_detect_valid_image(corruption_detector, valid_image_bytes):
    is_corrupted = corruption_detector.is_corrupted(valid_image_bytes)
    assert is_corrupted is False


def test_detect_corrupted_image(corruption_detector, corrupted_image_bytes):
    is_corrupted = corruption_detector.is_corrupted(corrupted_image_bytes)
    assert is_corrupted is True


def test_detect_empty_bytes(corruption_detector):
    is_corrupted = corruption_detector.is_corrupted(b'')
    assert is_corrupted is True


def test_detect_invalid_format(corruption_detector):
    is_corrupted = corruption_detector.is_corrupted(b'not an image')
    assert is_corrupted is True
```

**Step 2: Run test to verify it fails**

Run:
```bash
pytest tests/test_corruption_detector.py -v
```

Expected: FAIL with import error

**Step 3: Implement corruption detector**

Create `services/analysis/src/quality/corruption_detector.py`:
```python
from PIL import Image
import io
from typing import Union


class CorruptionDetector:
    """Detects corrupted or invalid image files."""

    def is_corrupted(self, image_data: Union[bytes, str]) -> bool:
        """
        Check if image data is corrupted.

        Args:
            image_data: Image bytes or file path

        Returns:
            True if corrupted/invalid, False if valid
        """
        try:
            if isinstance(image_data, bytes):
                if len(image_data) == 0:
                    return True
                img = Image.open(io.BytesIO(image_data))
            else:
                img = Image.open(image_data)

            # Verify by loading the image
            img.verify()

            # Re-open to actually load pixel data (verify() closes the file)
            if isinstance(image_data, bytes):
                img = Image.open(io.BytesIO(image_data))
            else:
                img = Image.open(image_data)

            img.load()

            return False
        except Exception:
            return True
```

**Step 4: Run test to verify it passes**

Run:
```bash
pytest tests/test_corruption_detector.py -v
```

Expected: PASS (5 tests)

**Step 5: Commit corruption detector**

Run:
```bash
git add src/quality/corruption_detector.py tests/test_corruption_detector.py
git commit -m "feat(analysis): add corruption detection module"
```

---

### Task 8: Quality Scorer Integration

**Files:**
- Create: `services/analysis/src/quality/scorer.py`
- Test: `services/analysis/tests/test_quality_scorer.py`

**Step 1: Write quality scorer test**

Create `services/analysis/tests/test_quality_scorer.py`:
```python
import pytest
import numpy as np
from PIL import Image
from src.quality.scorer import QualityScorer


@pytest.fixture
def quality_scorer():
    return QualityScorer()


@pytest.fixture
def high_quality_image():
    # Sharp, well-exposed image
    img = np.random.normal(128, 30, (200, 200, 3)).clip(0, 255).astype(np.uint8)
    for i in range(0, 200, 10):
        img[i:i+5, :] = 200  # Sharp edges
    return Image.fromarray(img)


@pytest.fixture
def low_quality_image():
    # Blurry, dark image
    img = np.full((200, 200, 3), 30, dtype=np.uint8)
    return Image.fromarray(img)


def test_quality_scorer_initialization(quality_scorer):
    assert quality_scorer is not None
    assert quality_scorer.blur_detector is not None
    assert quality_scorer.exposure_analyzer is not None


def test_score_high_quality_image(quality_scorer, high_quality_image):
    result = quality_scorer.analyze_image(high_quality_image)

    assert result['blur_score'] > 50.0
    assert result['exposure_score'] > 50.0
    assert result['overall_quality'] > 50.0
    assert result['is_corrupted'] is False


def test_score_low_quality_image(quality_scorer, low_quality_image):
    result = quality_scorer.analyze_image(low_quality_image)

    assert result['blur_score'] < 50.0
    assert result['overall_quality'] < 50.0
    assert result['is_corrupted'] is False


def test_score_corrupted_image_bytes(quality_scorer):
    result = quality_scorer.analyze_image_bytes(b'corrupted')

    assert result['is_corrupted'] is True
    assert result['blur_score'] is None
    assert result['exposure_score'] is None
    assert result['overall_quality'] == 0.0


def test_overall_quality_calculation(quality_scorer, high_quality_image):
    result = quality_scorer.analyze_image(high_quality_image)

    # Overall should be weighted average of blur (60%) and exposure (40%)
    expected_overall = result['blur_score'] * 0.6 + result['exposure_score'] * 0.4
    assert abs(result['overall_quality'] - expected_overall) < 0.1
```

**Step 2: Run test to verify it fails**

Run:
```bash
pytest tests/test_quality_scorer.py -v
```

Expected: FAIL with import error

**Step 3: Implement quality scorer**

Create `services/analysis/src/quality/scorer.py`:
```python
from PIL import Image
import io
from typing import Dict, Union, Optional
from .blur_detector import BlurDetector
from .exposure_analyzer import ExposureAnalyzer
from .corruption_detector import CorruptionDetector


class QualityScorer:
    """Combines blur, exposure, and corruption detection into overall quality score."""

    def __init__(self):
        self.blur_detector = BlurDetector()
        self.exposure_analyzer = ExposureAnalyzer()
        self.corruption_detector = CorruptionDetector()

    def analyze_image(self, image: Image.Image) -> Dict[str, Optional[float]]:
        """
        Analyze image quality.

        Args:
            image: PIL Image

        Returns:
            Dict with blur_score, exposure_score, overall_quality, is_corrupted
        """
        blur_score = self.blur_detector.calculate_blur_score(image)
        exposure_score = self.exposure_analyzer.calculate_exposure_score(image)

        # Overall quality: weighted average (blur 60%, exposure 40%)
        overall_quality = blur_score * 0.6 + exposure_score * 0.4

        return {
            'blur_score': blur_score,
            'exposure_score': exposure_score,
            'overall_quality': overall_quality,
            'is_corrupted': False
        }

    def analyze_image_bytes(self, image_data: bytes) -> Dict[str, Optional[float]]:
        """
        Analyze image quality from bytes.

        Args:
            image_data: Image file bytes

        Returns:
            Dict with blur_score, exposure_score, overall_quality, is_corrupted
        """
        # Check for corruption first
        if self.corruption_detector.is_corrupted(image_data):
            return {
                'blur_score': None,
                'exposure_score': None,
                'overall_quality': 0.0,
                'is_corrupted': True
            }

        # Load and analyze
        image = Image.open(io.BytesIO(image_data))
        return self.analyze_image(image)
```

**Step 4: Run test to verify it passes**

Run:
```bash
pytest tests/test_quality_scorer.py -v
```

Expected: PASS (5 tests)

**Step 5: Commit quality scorer**

Run:
```bash
git add src/quality/scorer.py tests/test_quality_scorer.py
git commit -m "feat(analysis): add quality scorer integration"
```

---

## Phase 3: Burst Detection (Tasks 9-10)

### Task 9: Burst Detector Module

**Files:**
- Create: `services/analysis/src/burst/detector.py`
- Test: `services/analysis/tests/test_burst_detector.py`

**Step 1: Write burst detector test**

Create `services/analysis/tests/test_burst_detector.py`:
```python
import pytest
from datetime import datetime, timedelta
from src.burst.detector import BurstDetector


@pytest.fixture
def burst_detector():
    return BurstDetector(interval_seconds=2.0)


@pytest.fixture
def burst_sequence_photos():
    """5 photos in rapid succession (burst)"""
    base_time = datetime(2025, 1, 1, 12, 0, 0)
    return [
        {'id': f'photo-{i}', 'timestamp': base_time + timedelta(seconds=i * 0.5)}
        for i in range(5)
    ]


@pytest.fixture
def non_burst_photos():
    """Photos with large time gaps (not burst)"""
    base_time = datetime(2025, 1, 1, 12, 0, 0)
    return [
        {'id': 'photo-1', 'timestamp': base_time},
        {'id': 'photo-2', 'timestamp': base_time + timedelta(minutes=5)},
        {'id': 'photo-3', 'timestamp': base_time + timedelta(minutes=10)},
    ]


@pytest.fixture
def mixed_photos():
    """Mix of burst and non-burst photos"""
    base_time = datetime(2025, 1, 1, 12, 0, 0)
    photos = []

    # First burst
    for i in range(3):
        photos.append({
            'id': f'burst1-{i}',
            'timestamp': base_time + timedelta(seconds=i * 0.5)
        })

    # Gap
    photos.append({
        'id': 'single-1',
        'timestamp': base_time + timedelta(minutes=5)
    })

    # Second burst
    for i in range(4):
        photos.append({
            'id': f'burst2-{i}',
            'timestamp': base_time + timedelta(minutes=6, seconds=i * 0.5)
        })

    return photos


def test_burst_detector_initialization(burst_detector):
    assert burst_detector is not None
    assert burst_detector.interval_seconds == 2.0


def test_detect_single_burst_sequence(burst_detector, burst_sequence_photos):
    bursts = burst_detector.detect_bursts(burst_sequence_photos)

    assert len(bursts) == 1
    assert len(bursts[0]) == 5
    assert all(p['id'] in [photo['id'] for photo in burst_sequence_photos] for p in bursts[0])


def test_detect_no_bursts(burst_detector, non_burst_photos):
    bursts = burst_detector.detect_bursts(non_burst_photos)

    assert len(bursts) == 0


def test_detect_multiple_bursts(burst_detector, mixed_photos):
    bursts = burst_detector.detect_bursts(mixed_photos)

    assert len(bursts) == 2
    assert len(bursts[0]) == 3  # First burst
    assert len(bursts[1]) == 4  # Second burst


def test_single_photo_not_burst(burst_detector):
    photos = [{'id': 'single', 'timestamp': datetime.now()}]
    bursts = burst_detector.detect_bursts(photos)

    assert len(bursts) == 0


def test_empty_photos_list(burst_detector):
    bursts = burst_detector.detect_bursts([])
    assert len(bursts) == 0
```

**Step 2: Run test to verify it fails**

Run:
```bash
pytest tests/test_burst_detector.py -v
```

Expected: FAIL with import error

**Step 3: Implement burst detector**

Create `services/analysis/src/burst/__init__.py`:
```python
# Burst detection modules
```

Create `services/analysis/src/burst/detector.py`:
```python
from typing import List, Dict, Any
from datetime import datetime, timedelta


class BurstDetector:
    """Detects burst sequences in photo collections."""

    def __init__(self, interval_seconds: float = 2.0, min_burst_size: int = 2):
        """
        Args:
            interval_seconds: Maximum time gap between photos in a burst
            min_burst_size: Minimum number of photos to form a burst
        """
        self.interval_seconds = interval_seconds
        self.min_burst_size = min_burst_size

    def detect_bursts(self, photos: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Detect burst sequences in photos.

        Args:
            photos: List of photo dicts with 'id' and 'timestamp' keys

        Returns:
            List of burst sequences, each sequence is a list of photos
        """
        if not photos:
            return []

        # Sort by timestamp
        sorted_photos = sorted(photos, key=lambda p: p['timestamp'])

        bursts = []
        current_burst = [sorted_photos[0]]

        for i in range(1, len(sorted_photos)):
            current_photo = sorted_photos[i]
            previous_photo = sorted_photos[i-1]

            # Calculate time difference
            time_diff = (current_photo['timestamp'] - previous_photo['timestamp']).total_seconds()

            if time_diff <= self.interval_seconds:
                # Part of current burst
                current_burst.append(current_photo)
            else:
                # End of burst, start new one
                if len(current_burst) >= self.min_burst_size:
                    bursts.append(current_burst)
                current_burst = [current_photo]

        # Check final burst
        if len(current_burst) >= self.min_burst_size:
            bursts.append(current_burst)

        return bursts
```

**Step 4: Run test to verify it passes**

Run:
```bash
pytest tests/test_burst_detector.py -v
```

Expected: PASS (7 tests)

**Step 5: Commit burst detector**

Run:
```bash
git add src/burst/ tests/test_burst_detector.py
git commit -m "feat(analysis): add burst sequence detection"
```

---

### Task 10: Burst Scorer (Recommend Best Shot)

**Files:**
- Create: `services/analysis/src/burst/scorer.py`
- Test: `services/analysis/tests/test_burst_scorer.py`

**Step 1: Write burst scorer test**

Create `services/analysis/tests/test_burst_scorer.py`:
```python
import pytest
from src.burst.scorer import BurstScorer


@pytest.fixture
def burst_scorer():
    return BurstScorer()


@pytest.fixture
def burst_with_quality_scores():
    """Burst sequence with varying quality scores"""
    return [
        {'id': 'photo-1', 'quality_score': 45.0},
        {'id': 'photo-2', 'quality_score': 85.0},  # Best
        {'id': 'photo-3', 'quality_score': 60.0},
        {'id': 'photo-4', 'quality_score': 55.0},
    ]


def test_burst_scorer_initialization(burst_scorer):
    assert burst_scorer is not None


def test_recommend_best_shot(burst_scorer, burst_with_quality_scores):
    best_id = burst_scorer.recommend_best_shot(burst_with_quality_scores)

    assert best_id == 'photo-2'  # Highest quality score


def test_recommend_from_single_photo(burst_scorer):
    burst = [{'id': 'only-one', 'quality_score': 50.0}]
    best_id = burst_scorer.recommend_best_shot(burst)

    assert best_id == 'only-one'


def test_recommend_with_ties(burst_scorer):
    burst = [
        {'id': 'photo-1', 'quality_score': 80.0},
        {'id': 'photo-2', 'quality_score': 80.0},  # Tie, but first
    ]
    best_id = burst_scorer.recommend_best_shot(burst)

    # Should pick first one in case of tie
    assert best_id == 'photo-1'


def test_empty_burst_returns_none(burst_scorer):
    best_id = burst_scorer.recommend_best_shot([])

    assert best_id is None
```

**Step 2: Run test to verify it fails**

Run:
```bash
pytest tests/test_burst_scorer.py -v
```

Expected: FAIL with import error

**Step 3: Implement burst scorer**

Create `services/analysis/src/burst/scorer.py`:
```python
from typing import List, Dict, Any, Optional


class BurstScorer:
    """Scores burst sequences and recommends best shot."""

    def recommend_best_shot(self, burst: List[Dict[str, Any]]) -> Optional[str]:
        """
        Recommend the best photo from a burst sequence.

        Uses quality_score to pick the sharpest, best-exposed shot.

        Args:
            burst: List of photo dicts with 'id' and 'quality_score' keys

        Returns:
            ID of recommended photo, or None if burst is empty
        """
        if not burst:
            return None

        # Find photo with highest quality score
        best_photo = max(burst, key=lambda p: p.get('quality_score', 0))

        return best_photo['id']
```

**Step 4: Run test to verify it passes**

Run:
```bash
pytest tests/test_burst_scorer.py -v
```

Expected: PASS (5 tests)

**Step 5: Commit burst scorer**

Run:
```bash
git add src/burst/scorer.py tests/test_burst_scorer.py
git commit -m "feat(analysis): add burst best-shot recommendation"
```

---

## Summary

**Phase 1 Complete:** Service foundation with database models, migrations, and FastAPI setup

**Phase 2 Complete:** Quality scoring engine with blur detection, exposure analysis, corruption detection, and integrated scorer

**Phase 3 Complete:** Burst detection with sequence identification and best-shot recommendation

**Next Steps:**
- Phase 4: Exact duplicate detection (MD5 hashing)
- Phase 5: Analysis orchestration and API endpoints
- Phase 6: Integration with Immich, dedup, and grouping services
- Phase 7: Frontend triage dashboard UI

**Current Progress:** 10 of ~40 tasks completed (Foundation + Core Analysis complete)

---


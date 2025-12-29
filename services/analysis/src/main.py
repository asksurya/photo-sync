from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import asynccontextmanager
from .database import get_db, engine, Base
from .config import settings
from .models import ImportBatch
from .schemas import ImportBatchCreate, ImportBatchResponse
import logging
from datetime import datetime

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

VERSION = "0.1.0"


# Note: Using lifespan event handler instead of module-level create_all()
# to prevent database connection attempts during test imports
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Analysis Service",
    description="Photo import intelligence and triage service",
    version=VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "Analysis Service",
        "version": VERSION,
        "status": "running"
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        # Test database connectivity
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "analysis",
        "database": db_status
    }


@app.post("/batches", response_model=ImportBatchResponse, status_code=status.HTTP_201_CREATED)
def create_import_batch(
    batch_data: ImportBatchCreate,
    db: Session = Depends(get_db)
):
    """Create a new import batch for analysis"""
    # Validate that asset_ids is not empty
    if not batch_data.asset_ids:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="asset_ids cannot be empty"
        )

    # Create import batch
    import_batch = ImportBatch(
        immich_user_id=batch_data.immich_user_id,
        status="processing",
        total_assets=len(batch_data.asset_ids),
        analyzed_assets=0,
        skipped_assets=0
    )

    db.add(import_batch)
    db.commit()
    db.refresh(import_batch)

    return ImportBatchResponse(
        batch_id=import_batch.id,
        status=import_batch.status
    )

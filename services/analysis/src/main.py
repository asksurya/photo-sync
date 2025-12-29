from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import asynccontextmanager
from typing import Dict, Any
from uuid import UUID
import httpx
from .database import get_db, engine, Base
from .config import settings
from .models import ImportBatch, AssetQualityScore, BurstSequence
from .schemas import ImportBatchCreate, ImportBatchResponse, AnalysisStatus, QualityScoreResponse, BurstSequenceResponse
from .quality.scorer import QualityScorer
from .burst.detector import BurstDetector
from .burst.scorer import BurstScorer
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
        asset_ids=batch_data.asset_ids,
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


def fetch_image_from_immich(asset_id: str) -> bytes:
    """
    Fetch image bytes from Immich API.

    Args:
        asset_id: Immich asset ID

    Returns:
        Image bytes

    Raises:
        HTTPException: If image cannot be fetched
    """
    try:
        url = f"{settings.IMMICH_API_URL}/api/asset/file/{asset_id}"
        response = httpx.get(url, timeout=30.0)
        response.raise_for_status()
        return response.content
    except Exception as e:
        logger.error(f"Failed to fetch image for asset {asset_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch image from Immich: {str(e)}"
        )


@app.post("/batches/{batch_id}/analyze", response_model=AnalysisStatus)
def analyze_batch(
    batch_id: UUID,
    db: Session = Depends(get_db)
):
    """Trigger analysis on a batch of imported assets"""
    # Retrieve batch from database
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import batch {batch_id} not found"
        )

    # Initialize quality scorer and burst detector
    quality_scorer = QualityScorer()
    burst_detector = BurstDetector(interval_seconds=2.0)
    burst_scorer = BurstScorer()

    # Analyze each asset
    analyzed_count = 0
    asset_metadata_list = []

    for asset_id in batch.asset_ids:
        try:
            # Fetch image from Immich
            image_bytes = fetch_image_from_immich(asset_id)

            # Analyze quality
            quality_result = quality_scorer.analyze_image_bytes(image_bytes)

            # Create quality score record
            quality_score = AssetQualityScore(
                immich_asset_id=asset_id,
                import_batch_id=batch_id,
                blur_score=quality_result.get('blur_score'),
                exposure_score=quality_result.get('exposure_score'),
                overall_quality=quality_result.get('overall_quality'),
                is_corrupted=quality_result.get('is_corrupted', False)
            )
            db.add(quality_score)

            # Store metadata for burst detection (using timestamp from creation time as placeholder)
            # In real implementation, would fetch actual EXIF timestamp from Immich
            asset_metadata_list.append({
                'id': asset_id,
                'timestamp': datetime.utcnow(),  # Placeholder - would be EXIF timestamp
                'quality_score': quality_result.get('overall_quality', 0.0)
            })

            analyzed_count += 1

        except Exception as e:
            logger.error(f"Failed to analyze asset {asset_id}: {e}")
            # Continue with next asset (this one will be skipped)
            batch.skipped_assets += 1

    # Update batch progress
    batch.analyzed_assets = analyzed_count

    # Detect burst sequences
    bursts = burst_detector.detect_bursts(asset_metadata_list)

    for burst in bursts:
        # Recommend best shot
        best_asset_id = burst_scorer.recommend_best_shot(burst)

        # Create burst sequence record
        burst_sequence = BurstSequence(
            import_batch_id=batch_id,
            immich_asset_ids=[photo['id'] for photo in burst],
            recommended_asset_id=best_asset_id
        )
        db.add(burst_sequence)

    # Update batch status
    batch.status = "complete"
    db.commit()

    # Calculate progress percentage
    progress_percent = (batch.analyzed_assets / batch.total_assets * 100) if batch.total_assets > 0 else 0

    return AnalysisStatus(
        status=batch.status,
        progress_percent=progress_percent,
        eta_seconds=None,
        total_assets=batch.total_assets,
        analyzed_assets=batch.analyzed_assets,
        skipped_assets=batch.skipped_assets
    )


@app.get("/batches/{batch_id}/status", response_model=AnalysisStatus)
def get_batch_status(
    batch_id: UUID,
    db: Session = Depends(get_db)
):
    """Get analysis progress for a batch"""
    # Retrieve batch from database
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import batch {batch_id} not found"
        )

    # Calculate progress percentage
    progress_percent = (batch.analyzed_assets / batch.total_assets * 100) if batch.total_assets > 0 else 0

    return AnalysisStatus(
        status=batch.status,
        progress_percent=progress_percent,
        eta_seconds=None,
        total_assets=batch.total_assets,
        analyzed_assets=batch.analyzed_assets,
        skipped_assets=batch.skipped_assets
    )


@app.get("/batches/{batch_id}/quality-scores", response_model=list[QualityScoreResponse])
def get_quality_scores(
    batch_id: UUID,
    db: Session = Depends(get_db)
):
    """Retrieve quality scores for all assets in a batch"""
    # Verify batch exists
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import batch {batch_id} not found"
        )

    # Query quality scores
    scores = db.query(AssetQualityScore).filter(
        AssetQualityScore.import_batch_id == batch_id
    ).all()

    return scores


@app.get("/batches/{batch_id}/bursts", response_model=list[BurstSequenceResponse])
def get_bursts(
    batch_id: UUID,
    db: Session = Depends(get_db)
):
    """Retrieve burst sequences for a batch"""
    # Verify batch exists
    batch = db.query(ImportBatch).filter(ImportBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Import batch {batch_id} not found"
        )

    # Query burst sequences
    bursts = db.query(BurstSequence).filter(
        BurstSequence.import_batch_id == batch_id
    ).all()

    return bursts

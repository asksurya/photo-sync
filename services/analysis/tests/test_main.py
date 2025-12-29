import pytest
import io
from PIL import Image
from unittest.mock import patch, MagicMock
from src.main import lifespan, app
from src.models import ImportBatch, AssetQualityScore, BurstSequence
from sqlalchemy.exc import OperationalError
from datetime import datetime, timedelta


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["service"] == "analysis"
    assert "database" in data
    assert data["database"] in ["healthy", "unhealthy"]


def test_health_endpoint_database_failure():
    """Test health endpoint when database connection fails"""
    from fastapi.testclient import TestClient

    # Create a separate client without the test database fixture
    with patch("src.main.Base.metadata.create_all"):
        with patch("src.main.get_db") as mock_get_db:
            mock_session = MagicMock()
            mock_session.execute.side_effect = OperationalError("Connection failed", None, None)
            mock_get_db.return_value = iter([mock_session])

            with TestClient(app) as test_client:
                response = test_client.get("/health")
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "degraded"
                assert data["service"] == "analysis"
                assert data["database"] == "unhealthy"


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "analysis" in response.json()["service"].lower()


@pytest.mark.asyncio
async def test_lifespan_context():
    """Test lifespan context manager for startup/shutdown"""
    from fastapi import FastAPI
    test_app = FastAPI()

    # Mock the database metadata create_all to avoid actual database connection
    with patch("src.main.Base.metadata.create_all") as mock_create_all:
        # Test that lifespan context can be entered and exited
        async with lifespan(test_app):
            # During lifespan, app is running
            # Verify that create_all was called during startup
            mock_create_all.assert_called_once()
        # After lifespan, cleanup has occurred


def test_create_import_batch(client):
    """Test creating a new import batch"""
    payload = {
        "immich_user_id": "user-123",
        "asset_ids": ["asset-1", "asset-2", "asset-3"]
    }
    response = client.post("/batches", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "batch_id" in data
    assert data["status"] == "processing"


def test_create_import_batch_empty_assets(client):
    """Test creating batch with no assets fails"""
    payload = {
        "immich_user_id": "user-123",
        "asset_ids": []
    }
    response = client.post("/batches", json=payload)
    assert response.status_code == 422  # Validation error


def test_analyze_batch_not_found(client):
    """Test analyzing a non-existent batch returns 404"""
    batch_id = "00000000-0000-0000-0000-000000000000"
    response = client.post(f"/batches/{batch_id}/analyze")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_analyze_batch_success(client, db_session):
    """Test successful batch analysis"""
    # Create a batch with some assets
    asset_ids = ["asset-1", "asset-2", "asset-3"]
    batch = ImportBatch(
        immich_user_id="user-123",
        asset_ids=asset_ids,
        status="processing",
        total_assets=3,
        analyzed_assets=0,
        skipped_assets=0
    )
    db_session.add(batch)
    db_session.commit()
    batch_id = batch.id

    # Create mock image bytes
    def create_mock_image():
        img = Image.new('RGB', (100, 100), color='red')
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        return buffer.getvalue()

    mock_image_bytes = create_mock_image()

    # Mock Immich API to return image bytes
    with patch("src.main.httpx.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = mock_image_bytes
        mock_get.return_value = mock_response

        response = client.post(f"/batches/{batch_id}/analyze")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "complete"
    assert data["total_assets"] == 3
    assert data["analyzed_assets"] == 3

    # Refresh session to see changes committed by endpoint
    db_session.expire_all()

    # Verify quality scores were created
    scores = db_session.query(AssetQualityScore).filter_by(import_batch_id=batch_id).all()
    assert len(scores) == 3
    for score in scores:
        assert score.overall_quality is not None
        assert score.blur_score is not None
        assert score.exposure_score is not None

    # Verify burst sequence was created (3 photos within 2 seconds = burst)
    # Note: Since we're using datetime.utcnow() as placeholder timestamps,
    # all photos will have very close timestamps and form a burst
    bursts = db_session.query(BurstSequence).filter_by(import_batch_id=batch_id).all()
    assert len(bursts) == 1
    assert len(bursts[0].immich_asset_ids) == 3
    assert bursts[0].recommended_asset_id is not None

    # Verify batch status was updated
    updated_batch = db_session.query(ImportBatch).filter_by(id=batch_id).first()
    assert updated_batch.status == "complete"
    assert updated_batch.analyzed_assets == 3


def test_analyze_batch_with_corrupted_image(client, db_session):
    """Test batch analysis with corrupted image (should mark as corrupted)"""
    asset_ids = ["asset-corrupted"]
    batch = ImportBatch(
        immich_user_id="user-123",
        asset_ids=asset_ids,
        status="processing",
        total_assets=1,
        analyzed_assets=0,
        skipped_assets=0
    )
    db_session.add(batch)
    db_session.commit()
    batch_id = batch.id

    # Mock Immich API to return corrupted image bytes
    with patch("src.main.httpx.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"corrupted image data"
        mock_get.return_value = mock_response

        response = client.post(f"/batches/{batch_id}/analyze")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "complete"

    # Refresh session to see changes committed by endpoint
    db_session.expire_all()

    # Verify quality score was created marking it as corrupted
    score = db_session.query(AssetQualityScore).filter_by(import_batch_id=batch_id).first()
    assert score is not None
    assert score.is_corrupted is True
    assert score.overall_quality == 0.0


def test_get_batch_status_not_found(client):
    """Test getting status for non-existent batch returns 404"""
    batch_id = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/batches/{batch_id}/status")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_batch_status_processing(client, db_session):
    """Test getting status for a batch in processing state"""
    batch = ImportBatch(
        immich_user_id="user-123",
        asset_ids=["asset-1", "asset-2", "asset-3", "asset-4", "asset-5"],
        status="processing",
        total_assets=5,
        analyzed_assets=2,
        skipped_assets=1
    )
    db_session.add(batch)
    db_session.commit()
    batch_id = batch.id

    response = client.get(f"/batches/{batch_id}/status")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processing"
    assert data["total_assets"] == 5
    assert data["analyzed_assets"] == 2
    assert data["skipped_assets"] == 1
    assert data["progress_percent"] == 40.0  # 2/5 * 100


def test_get_batch_status_complete(client, db_session):
    """Test getting status for a completed batch"""
    batch = ImportBatch(
        immich_user_id="user-123",
        asset_ids=["asset-1", "asset-2"],
        status="complete",
        total_assets=2,
        analyzed_assets=2,
        skipped_assets=0
    )
    db_session.add(batch)
    db_session.commit()
    batch_id = batch.id

    response = client.get(f"/batches/{batch_id}/status")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "complete"
    assert data["total_assets"] == 2
    assert data["analyzed_assets"] == 2
    assert data["skipped_assets"] == 0
    assert data["progress_percent"] == 100.0


def test_get_quality_scores_not_found(client):
    """Test getting quality scores for non-existent batch returns 404"""
    batch_id = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/batches/{batch_id}/quality-scores")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_quality_scores_empty(client, db_session):
    """Test getting quality scores for batch with no scores"""
    batch = ImportBatch(
        immich_user_id="user-123",
        asset_ids=["asset-1"],
        status="processing",
        total_assets=1,
        analyzed_assets=0,
        skipped_assets=0
    )
    db_session.add(batch)
    db_session.commit()
    batch_id = batch.id

    response = client.get(f"/batches/{batch_id}/quality-scores")

    assert response.status_code == 200
    data = response.json()
    assert data == []


def test_get_quality_scores_success(client, db_session):
    """Test getting quality scores for batch with scores"""
    batch = ImportBatch(
        immich_user_id="user-123",
        asset_ids=["asset-1", "asset-2", "asset-3"],
        status="complete",
        total_assets=3,
        analyzed_assets=3,
        skipped_assets=0
    )
    db_session.add(batch)
    db_session.commit()
    batch_id = batch.id

    # Add quality scores
    scores = [
        AssetQualityScore(
            immich_asset_id="asset-1",
            import_batch_id=batch_id,
            blur_score=85.5,
            exposure_score=92.0,
            overall_quality=88.0,
            is_corrupted=False
        ),
        AssetQualityScore(
            immich_asset_id="asset-2",
            import_batch_id=batch_id,
            blur_score=45.0,
            exposure_score=50.0,
            overall_quality=47.0,
            is_corrupted=False
        ),
        AssetQualityScore(
            immich_asset_id="asset-3",
            import_batch_id=batch_id,
            blur_score=None,
            exposure_score=None,
            overall_quality=0.0,
            is_corrupted=True
        )
    ]
    for score in scores:
        db_session.add(score)
    db_session.commit()

    response = client.get(f"/batches/{batch_id}/quality-scores")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3

    # Check first score
    assert data[0]["immich_asset_id"] == "asset-1"
    assert data[0]["blur_score"] == 85.5
    assert data[0]["exposure_score"] == 92.0
    assert data[0]["overall_quality"] == 88.0
    assert data[0]["is_corrupted"] is False

    # Check corrupted score
    assert data[2]["immich_asset_id"] == "asset-3"
    assert data[2]["is_corrupted"] is True
    assert data[2]["blur_score"] is None
    assert data[2]["exposure_score"] is None

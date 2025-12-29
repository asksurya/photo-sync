import pytest
from unittest.mock import patch, MagicMock
from src.main import lifespan, app
from sqlalchemy.exc import OperationalError


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

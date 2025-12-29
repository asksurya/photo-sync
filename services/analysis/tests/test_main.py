import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from src.main import app, lifespan
from sqlalchemy.exc import OperationalError


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["service"] == "analysis"
    assert "database" in data
    assert data["database"] in ["healthy", "unhealthy"]


def test_health_endpoint_database_failure(client):
    """Test health endpoint when database connection fails"""
    with patch("src.main.get_db") as mock_get_db:
        mock_session = MagicMock()
        mock_session.execute.side_effect = OperationalError("Connection failed", None, None)
        mock_get_db.return_value = iter([mock_session])

        response = client.get("/health")
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

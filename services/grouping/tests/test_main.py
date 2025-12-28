"""Tests for main application entry point."""
import pytest
from fastapi.testclient import TestClient


def test_health_endpoint():
    """Test that health check endpoint returns correct response."""
    from src.main import app

    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "grouping"}


def test_app_title():
    """Test that app has correct title."""
    from src.main import app

    assert app.title == "Grouping Service"

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

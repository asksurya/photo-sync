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

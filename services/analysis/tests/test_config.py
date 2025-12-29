import os
from src.config import Settings


def test_settings_from_env():
    # Set environment variables
    os.environ["DATABASE_URL"] = "postgresql://test:test@localhost/test"
    os.environ["IMMICH_API_URL"] = "http://localhost:2283"

    try:
        settings = Settings()

        assert settings.DATABASE_URL == "postgresql://test:test@localhost/test"
        assert settings.IMMICH_API_URL == "http://localhost:2283"
        assert settings.API_PORT == 8002  # default
    finally:
        # Clean up environment variables
        os.environ.pop("DATABASE_URL", None)
        os.environ.pop("IMMICH_API_URL", None)


def test_settings_defaults():
    settings = Settings()

    assert settings.API_PORT == 8002
    assert settings.LOG_LEVEL == "INFO"

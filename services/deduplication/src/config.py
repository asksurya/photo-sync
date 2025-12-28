"""Configuration management for deduplication service."""
import os


class Config:
    """Application configuration loaded from environment variables."""

    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/deduplication")
        self.media_path = os.getenv("MEDIA_PATH", "/data/photos")
        self.log_level = os.getenv("LOG_LEVEL", "INFO")

        # Deduplication algorithm configuration
        self.phash_threshold = float(os.getenv("PHASH_THRESHOLD", "0.95"))
        self.enable_exact_match = os.getenv("ENABLE_EXACT_MATCH", "true").lower() == "true"
        self.enable_perceptual_match = os.getenv("ENABLE_PERCEPTUAL_MATCH", "true").lower() == "true"
        self.batch_size = int(os.getenv("BATCH_SIZE", "500"))

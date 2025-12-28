"""Configuration management for grouping service."""
import os
from typing import List


class Config:
    """Application configuration loaded from environment variables."""

    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/grouping")
        self.media_path = os.getenv("MEDIA_PATH", "/data/photos")
        self.log_level = os.getenv("LOG_LEVEL", "INFO")

        # Grouping algorithm configuration
        self.timestamp_tolerance = int(os.getenv("TIMESTAMP_TOLERANCE", "2"))
        self.batch_size = int(os.getenv("BATCH_SIZE", "500"))

        # Primary version preference (in order of preference)
        self.primary_preference: List[str] = ["jpg", "jpeg", "png", "heic", "tiff", "raw"]

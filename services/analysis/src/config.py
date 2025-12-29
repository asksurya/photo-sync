from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", case_sensitive=True)

    DATABASE_URL: str = "postgresql://analysis:analysis@custom-postgres:5432/custom_db"
    IMMICH_API_URL: str = "http://immich_server:2283"
    API_PORT: int = 8002
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8080"


settings = Settings()

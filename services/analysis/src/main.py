from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import asynccontextmanager
from .database import get_db, engine, Base
from .config import settings
import logging

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

VERSION = "0.1.0"


# Note: Using lifespan event handler instead of module-level create_all()
# to prevent database connection attempts during test imports
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Analysis Service",
    description="Photo import intelligence and triage service",
    version=VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "service": "Analysis Service",
        "version": VERSION,
        "status": "running"
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        # Test database connectivity
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "analysis",
        "database": db_status
    }

"""Main application entry point for deduplication service."""
from fastapi import FastAPI
from .config import Config

config = Config()
app = FastAPI(title="Deduplication Service")


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "deduplication"}

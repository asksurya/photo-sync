"""Main application entry point for grouping service."""
from fastapi import FastAPI
from .config import Config

config = Config()
app = FastAPI(title="Grouping Service")


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "grouping"}

"""Main application entry point for deduplication service."""
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from .config import Config
from .database import get_db, engine, Base
from . import crud, schemas

config = Config()
app = FastAPI(title="Deduplication Service")


@app.on_event("startup")
def startup_event():
    """Create tables on startup."""
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "deduplication"}


@app.post("/duplicates", response_model=schemas.DuplicateGroup)
def create_duplicate_group(
    group: schemas.DuplicateGroupCreate,
    db: Session = Depends(get_db)
):
    """Create a new duplicate group."""
    return crud.create_duplicate_group(db, group)


@app.get("/duplicates", response_model=List[schemas.DuplicateGroup])
def list_duplicate_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all duplicate groups."""
    return crud.list_duplicate_groups(db, skip=skip, limit=limit)


@app.get("/duplicates/{group_id}", response_model=schemas.DuplicateGroup)
def get_duplicate_group(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific duplicate group by ID."""
    db_group = crud.get_duplicate_group(db, group_id)
    if db_group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_group


@app.delete("/duplicates/{group_id}")
def delete_duplicate_group(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a duplicate group."""
    success = crud.delete_duplicate_group(db, group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Group deleted successfully"}


@app.post("/duplicates/{group_id}/members", response_model=schemas.DuplicateMember)
def add_member(
    group_id: UUID,
    member: schemas.DuplicateMemberCreate,
    db: Session = Depends(get_db)
):
    """Add a member to a duplicate group."""
    db_member = crud.create_duplicate_member(db, group_id, member)
    if db_member is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_member

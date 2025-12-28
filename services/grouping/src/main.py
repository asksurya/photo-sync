"""Main application entry point for grouping service."""
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from .config import Config
from .database import get_db, engine, Base
from . import crud, schemas

config = Config()
app = FastAPI(title="Grouping Service")


@app.on_event("startup")
def startup_event():
    """Create tables on startup."""
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "grouping"}


@app.post("/groups", response_model=schemas.FileGroup)
def create_group(
    group: schemas.FileGroupCreate,
    db: Session = Depends(get_db)
):
    """Create a new file group."""
    return crud.create_file_group(db, group)


@app.get("/groups", response_model=List[schemas.FileGroup])
def list_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all file groups."""
    return crud.list_file_groups(db, skip=skip, limit=limit)


@app.get("/groups/{group_id}", response_model=schemas.FileGroup)
def get_group(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific file group by ID."""
    db_group = crud.get_file_group(db, group_id)
    if db_group is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_group


@app.delete("/groups/{group_id}")
def delete_group(
    group_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a file group."""
    success = crud.delete_file_group(db, group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Group not found")
    return {"message": "Group deleted successfully"}


@app.post("/groups/{group_id}/members", response_model=schemas.GroupMember)
def add_member(
    group_id: UUID,
    member: schemas.GroupMemberCreate,
    db: Session = Depends(get_db)
):
    """Add a member to a group."""
    db_member = crud.create_group_member(db, group_id, member)
    if db_member is None:
        raise HTTPException(status_code=404, detail="Group not found")
    return db_member


@app.post("/groups/{group_id}/primary/{member_id}")
def set_primary(
    group_id: UUID,
    member_id: UUID,
    db: Session = Depends(get_db)
):
    """Set a member as the primary version."""
    success = crud.set_primary_member(db, group_id, member_id)
    if not success:
        raise HTTPException(status_code=404, detail="Member not found in group")
    return {"message": "Primary member updated successfully"}

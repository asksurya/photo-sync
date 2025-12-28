"""CRUD operations for deduplication service."""
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from uuid import UUID

from . import models, schemas


def create_duplicate_group(db: Session, group: schemas.DuplicateGroupCreate) -> models.DuplicateGroup:
    """Create a new duplicate group."""
    try:
        db_group = models.DuplicateGroup(duplicate_type=group.duplicate_type)
        db.add(db_group)
        db.commit()
        db.refresh(db_group)
        return db_group
    except Exception:
        db.rollback()
        raise


def get_duplicate_group(db: Session, group_id: UUID) -> Optional[models.DuplicateGroup]:
    """Get a duplicate group by ID."""
    return db.query(models.DuplicateGroup).filter(models.DuplicateGroup.group_id == group_id).first()


def list_duplicate_groups(
    db: Session, skip: int = 0, limit: int = 100
) -> List[models.DuplicateGroup]:
    """List duplicate groups with pagination."""
    return db.query(models.DuplicateGroup).offset(skip).limit(limit).all()


def delete_duplicate_group(db: Session, group_id: UUID) -> bool:
    """Delete a duplicate group by ID."""
    try:
        db_group = get_duplicate_group(db, group_id)
        if db_group:
            db.delete(db_group)
            db.commit()
            return True
        return False
    except Exception:
        db.rollback()
        raise


def create_duplicate_member(
    db: Session, group_id: UUID, member: schemas.DuplicateMemberCreate
) -> Optional[models.DuplicateMember]:
    """Add a member to a duplicate group."""
    try:
        db_group = get_duplicate_group(db, group_id)
        if not db_group:
            return None

        db_member = models.DuplicateMember(
            group_id=group_id,
            file_path=member.file_path,
            file_hash=member.file_hash,
            perceptual_hash=member.perceptual_hash,
            similarity_score=member.similarity_score,
            file_size=member.file_size
        )
        db.add(db_member)
        db.commit()
        db.refresh(db_member)
        return db_member
    except IntegrityError:
        db.rollback()
        return None  # Duplicate file_path
    except Exception:
        db.rollback()
        raise

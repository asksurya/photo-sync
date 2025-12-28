"""CRUD operations for grouping service."""
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from . import models, schemas


def create_file_group(db: Session, group: schemas.FileGroupCreate) -> models.FileGroup:
    """Create a new file group."""
    db_group = models.FileGroup(group_type=group.group_type)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


def get_file_group(db: Session, group_id: UUID) -> Optional[models.FileGroup]:
    """Get a file group by ID."""
    return db.query(models.FileGroup).filter(models.FileGroup.group_id == group_id).first()


def list_file_groups(
    db: Session, skip: int = 0, limit: int = 100
) -> List[models.FileGroup]:
    """List file groups with pagination."""
    return db.query(models.FileGroup).offset(skip).limit(limit).all()


def delete_file_group(db: Session, group_id: UUID) -> bool:
    """Delete a file group by ID."""
    db_group = get_file_group(db, group_id)
    if db_group:
        db.delete(db_group)
        db.commit()
        return True
    return False


def create_group_member(
    db: Session, group_id: UUID, member: schemas.GroupMemberCreate
) -> Optional[models.GroupMember]:
    """Add a member to a group."""
    db_group = get_file_group(db, group_id)
    if not db_group:
        return None

    db_member = models.GroupMember(
        group_id=group_id,
        file_path=member.file_path,
        file_type=member.file_type,
        is_primary=member.is_primary,
        file_size=member.file_size
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


def set_primary_member(db: Session, group_id: UUID, member_id: UUID) -> bool:
    """Set a member as the primary version in its group."""
    # First, unset all primary flags for this group
    db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id
    ).update({"is_primary": False})

    # Then set the specified member as primary
    db_member = db.query(models.GroupMember).filter(
        models.GroupMember.id == member_id,
        models.GroupMember.group_id == group_id
    ).first()

    if db_member:
        db_member.is_primary = True
        db.commit()
        return True
    return False

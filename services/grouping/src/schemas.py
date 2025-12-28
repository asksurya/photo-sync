"""Pydantic schemas for API validation."""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import List, Optional


# FileGroup schemas
class FileGroupBase(BaseModel):
    """Base schema for FileGroup."""
    group_type: str = Field(..., max_length=50)


class FileGroupCreate(FileGroupBase):
    """Schema for creating a FileGroup."""
    pass


class GroupMemberBase(BaseModel):
    """Base schema for GroupMember."""
    file_path: str = Field(..., max_length=512)
    file_type: str = Field(..., max_length=20)
    is_primary: bool = False
    file_size: int = Field(..., gt=0)


class GroupMemberCreate(GroupMemberBase):
    """Schema for creating a GroupMember."""
    pass


class GroupMember(GroupMemberBase):
    """Schema for GroupMember response."""
    id: UUID
    group_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FileGroup(FileGroupBase):
    """Schema for FileGroup response."""
    group_id: UUID
    created_at: datetime
    members: List[GroupMember] = []

    model_config = ConfigDict(from_attributes=True)

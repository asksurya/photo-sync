"""Pydantic schemas for API validation."""
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from uuid import UUID
from typing import List, Optional


# DuplicateGroup schemas
class DuplicateGroupBase(BaseModel):
    """Base schema for DuplicateGroup."""
    duplicate_type: str = Field(..., max_length=20)


class DuplicateGroupCreate(DuplicateGroupBase):
    """Schema for creating a DuplicateGroup."""
    pass


class DuplicateMemberBase(BaseModel):
    """Base schema for DuplicateMember."""
    file_path: str = Field(..., max_length=512)
    file_hash: Optional[str] = Field(None, max_length=64)
    perceptual_hash: Optional[str] = Field(None, max_length=16)
    similarity_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    file_size: int = Field(..., gt=0)


class DuplicateMemberCreate(DuplicateMemberBase):
    """Schema for creating a DuplicateMember."""
    pass


class DuplicateMember(DuplicateMemberBase):
    """Schema for DuplicateMember response."""
    id: UUID
    group_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DuplicateGroup(DuplicateGroupBase):
    """Schema for DuplicateGroup response."""
    group_id: UUID
    created_at: datetime
    members: List[DuplicateMember] = []

    model_config = ConfigDict(from_attributes=True)

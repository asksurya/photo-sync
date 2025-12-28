"""Database models for deduplication service."""
from sqlalchemy import Column, String, DateTime, Float, BigInteger, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from .database import Base


class UUID(TypeDecorator):
    """Platform-independent UUID type.

    Uses PostgreSQL's UUID type when available, otherwise uses
    CHAR(36) storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            else:
                return value


class DuplicateGroup(Base):
    """Represents a group of duplicate files."""
    __tablename__ = "duplicate_groups"

    group_id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    duplicate_type = Column(String(20), nullable=False)  # 'exact', 'perceptual'
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship to members
    members = relationship("DuplicateMember", back_populates="group", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DuplicateGroup(group_id={self.group_id}, duplicate_type={self.duplicate_type})>"


class DuplicateMember(Base):
    """Represents a file that is part of a duplicate group."""
    __tablename__ = "duplicate_members"

    __table_args__ = (
        Index('ix_duplicate_member_group', 'group_id'),
        Index('ix_duplicate_member_hash', 'file_hash'),
    )

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(), ForeignKey("duplicate_groups.group_id", ondelete='CASCADE'), nullable=False)
    file_path = Column(String(512), nullable=False, unique=True)
    file_hash = Column(String(64), nullable=True)  # SHA256 hash
    perceptual_hash = Column(String(16), nullable=True)  # pHash
    similarity_score = Column(Float, nullable=True)
    file_size = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship to group
    group = relationship("DuplicateGroup", back_populates="members")

    def __repr__(self):
        return f"<DuplicateMember(file_path={self.file_path}, similarity_score={self.similarity_score})>"

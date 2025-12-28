"""Database models for grouping service."""
from sqlalchemy import Column, String, DateTime, Boolean, BigInteger, ForeignKey, TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from .database import Base


class UUID(TypeDecorator):
    """Platform-independent UUID type.

    Uses PostgreSQL's UUID type when available, otherwise uses CHAR(36) for SQLite.
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


class FileGroup(Base):
    """Represents a group of related files (e.g., RAW+JPEG pairs)."""
    __tablename__ = "file_groups"

    group_id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    group_type = Column(String(50), nullable=False)  # 'raw_jpeg', 'burst', etc.
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship to members
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FileGroup(group_id={self.group_id}, group_type={self.group_type})>"


class GroupMember(Base):
    """Represents a file that belongs to a group."""
    __tablename__ = "group_members"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(), ForeignKey("file_groups.group_id"), nullable=False)
    file_path = Column(String(512), nullable=False, unique=True)
    file_type = Column(String(20), nullable=False)  # 'raw', 'jpeg', 'png', etc.
    is_primary = Column(Boolean, nullable=False, default=False)
    file_size = Column(BigInteger, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationship to group
    group = relationship("FileGroup", back_populates="members")

    def __repr__(self):
        return f"<GroupMember(file_path={self.file_path}, file_type={self.file_type})>"

import uuid
import json
from sqlalchemy import Column, String, Integer, Float, Boolean, TIMESTAMP, ForeignKey, ARRAY, Text, CheckConstraint, TypeDecorator, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import relationship
from .database import Base


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses String(36).
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgresUUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, str):
                return uuid.UUID(value)
            return value


class StringArray(TypeDecorator):
    """Platform-independent array type.
    Uses PostgreSQL's ARRAY type, otherwise uses JSON string.
    """
    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(ARRAY(String(255)))
        else:
            return dialect.type_descriptor(Text)

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            return json.loads(value)


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    immich_user_id = Column(String(255), nullable=False, index=True)
    asset_ids = Column(StringArray, nullable=False)
    created_at = Column(TIMESTAMP, default=func.now())
    status = Column(String(20), nullable=False, index=True)
    total_assets = Column(Integer, nullable=False)
    analyzed_assets = Column(Integer, default=0)
    skipped_assets = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Relationships
    quality_scores = relationship("AssetQualityScore", back_populates="batch", cascade="all, delete-orphan")
    burst_sequences = relationship("BurstSequence", back_populates="batch", cascade="all, delete-orphan")
    triage_actions = relationship("TriageAction", back_populates="batch", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('processing', 'complete', 'failed')", name="check_status"),
    )


class AssetQualityScore(Base):
    __tablename__ = "asset_quality_scores"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    immich_asset_id = Column(String(255), nullable=False, index=True)
    import_batch_id = Column(GUID, ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    blur_score = Column(Float, nullable=True)
    exposure_score = Column(Float, nullable=True)
    overall_quality = Column(Float, nullable=True, index=True)
    is_corrupted = Column(Boolean, default=False)
    analyzed_at = Column(TIMESTAMP, default=func.now())

    # Relationship
    batch = relationship("ImportBatch", back_populates="quality_scores")

    __table_args__ = (
        UniqueConstraint("immich_asset_id", "import_batch_id", name="uq_asset_per_batch"),
        CheckConstraint("blur_score IS NULL OR (blur_score >= 0 AND blur_score <= 100)", name="check_blur_score"),
        CheckConstraint("exposure_score IS NULL OR (exposure_score >= 0 AND exposure_score <= 100)", name="check_exposure_score"),
        CheckConstraint("overall_quality IS NULL OR (overall_quality >= 0 AND overall_quality <= 100)", name="check_overall_quality"),
    )


class BurstSequence(Base):
    __tablename__ = "burst_sequences"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    import_batch_id = Column(GUID, ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    immich_asset_ids = Column(StringArray, nullable=False)
    recommended_asset_id = Column(String(255), nullable=True, index=True)
    created_at = Column(TIMESTAMP, default=func.now())

    # Relationship
    batch = relationship("ImportBatch", back_populates="burst_sequences")


class TriageAction(Base):
    __tablename__ = "triage_actions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    import_batch_id = Column(GUID, ForeignKey("import_batches.id", ondelete="CASCADE"), index=True)
    action_type = Column(String(20), nullable=False)
    immich_asset_id = Column(String(255), nullable=False, index=True)
    applied = Column(Boolean, default=False, index=True)
    applied_at = Column(TIMESTAMP, nullable=True)
    user_overridden = Column(Boolean, default=False)

    # Relationship
    batch = relationship("ImportBatch", back_populates="triage_actions")

    __table_args__ = (
        CheckConstraint("action_type IN ('delete', 'keep', 'organize')", name="check_action_type"),
    )

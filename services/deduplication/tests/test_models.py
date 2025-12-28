import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import uuid

from src.models import Base, DuplicateGroup, DuplicateMember


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_create_duplicate_group(db_session):
    """Test creating a duplicate group."""
    group = DuplicateGroup(
        duplicate_type="exact"
    )
    db_session.add(group)
    db_session.commit()

    assert group.group_id is not None
    assert isinstance(group.group_id, uuid.UUID)
    assert group.duplicate_type == "exact"
    assert group.created_at is not None
    assert isinstance(group.created_at, datetime)


def test_create_duplicate_member(db_session):
    """Test creating a duplicate member."""
    # First create a group
    group = DuplicateGroup(duplicate_type="exact")
    db_session.add(group)
    db_session.commit()

    # Create member
    member = DuplicateMember(
        group_id=group.group_id,
        file_path="/data/photos/IMG_1234.JPG",
        file_hash="abc123def456",
        file_size=2048576,
        similarity_score=1.0
    )
    db_session.add(member)
    db_session.commit()

    assert member.id is not None
    assert member.group_id == group.group_id
    assert member.file_path == "/data/photos/IMG_1234.JPG"
    assert member.file_hash == "abc123def456"
    assert member.file_size == 2048576
    assert member.similarity_score == 1.0
    assert member.created_at is not None


def test_duplicate_group_member_relationship(db_session):
    """Test relationship between duplicate group and members."""
    # Create group with two members
    group = DuplicateGroup(duplicate_type="perceptual")

    member1 = DuplicateMember(
        group=group,
        file_path="/data/photos/IMG_1234.JPG",
        perceptual_hash="fedcba9876543210",
        file_size=2048576,
        similarity_score=0.98
    )
    member2 = DuplicateMember(
        group=group,
        file_path="/data/photos/IMG_1235.JPG",
        perceptual_hash="fedcba9876543211",
        file_size=2051200,
        similarity_score=0.97
    )

    db_session.add(group)
    db_session.commit()

    # Verify relationship
    assert len(group.members) == 2
    assert member1 in group.members
    assert member2 in group.members
    assert member1.group == group
    assert member2.group == group


def test_cascade_delete_removes_members(db_session):
    """Test that deleting a group cascades to members."""
    group = DuplicateGroup(duplicate_type="exact")
    member = DuplicateMember(
        group=group,
        file_path="/data/photos/IMG_1234.JPG",
        file_hash="abc123",
        file_size=1024,
        similarity_score=1.0
    )
    db_session.add(group)
    db_session.commit()

    member_id = member.id

    # Delete group
    db_session.delete(group)
    db_session.commit()

    # Verify member was deleted
    assert db_session.query(DuplicateMember).filter_by(id=member_id).first() is None

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import uuid

from src.models import Base, FileGroup, GroupMember


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_create_file_group(db_session):
    """Test creating a file group."""
    group = FileGroup(
        group_type="raw_jpeg"
    )
    db_session.add(group)
    db_session.commit()

    assert group.group_id is not None
    assert isinstance(group.group_id, uuid.UUID)
    assert group.group_type == "raw_jpeg"
    assert group.created_at is not None
    assert isinstance(group.created_at, datetime)


def test_create_group_member(db_session):
    """Test creating a group member."""
    # First create a group
    group = FileGroup(group_type="raw_jpeg")
    db_session.add(group)
    db_session.commit()

    # Create member
    member = GroupMember(
        group_id=group.group_id,
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=True,
        file_size=2048576
    )
    db_session.add(member)
    db_session.commit()

    assert member.id is not None
    assert member.group_id == group.group_id
    assert member.file_path == "/data/photos/IMG_1234.JPG"
    assert member.file_type == "jpeg"
    assert member.is_primary is True
    assert member.file_size == 2048576
    assert member.created_at is not None


def test_group_member_relationship(db_session):
    """Test relationship between group and members."""
    # Create group with two members
    group = FileGroup(group_type="raw_jpeg")

    member1 = GroupMember(
        group=group,
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=True,
        file_size=2048576
    )
    member2 = GroupMember(
        group=group,
        file_path="/data/photos/IMG_1234.CR2",
        file_type="raw",
        is_primary=False,
        file_size=25165824
    )

    db_session.add(group)
    db_session.commit()

    # Verify relationship
    assert len(group.members) == 2
    assert member1 in group.members
    assert member2 in group.members
    assert member1.group == group
    assert member2.group == group

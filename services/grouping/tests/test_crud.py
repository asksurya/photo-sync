import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock, patch
from datetime import datetime
import uuid

from src.models import Base
from src.crud import create_file_group, get_file_group, list_file_groups
from src.schemas import FileGroupCreate


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
    """Test creating a file group via CRUD."""
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    assert group.group_id is not None
    assert group.group_type == "raw_jpeg"
    assert group.created_at is not None


def test_get_file_group(db_session):
    """Test retrieving a file group."""
    group_data = FileGroupCreate(group_type="raw_jpeg")
    created_group = create_file_group(db_session, group_data)

    retrieved_group = get_file_group(db_session, created_group.group_id)

    assert retrieved_group is not None
    assert retrieved_group.group_id == created_group.group_id
    assert retrieved_group.group_type == "raw_jpeg"


def test_list_file_groups(db_session):
    """Test listing file groups with pagination."""
    # Create 3 groups
    for i in range(3):
        group_data = FileGroupCreate(group_type=f"type_{i}")
        create_file_group(db_session, group_data)

    # List all
    groups = list_file_groups(db_session)
    assert len(groups) == 3

    # List with limit
    groups = list_file_groups(db_session, limit=2)
    assert len(groups) == 2

    # List with skip
    groups = list_file_groups(db_session, skip=2, limit=2)
    assert len(groups) == 1


def test_delete_file_group(db_session):
    """Test deleting a file group."""
    from src.crud import delete_file_group

    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    # Delete
    result = delete_file_group(db_session, group.group_id)
    assert result is True

    # Verify deleted
    retrieved = get_file_group(db_session, group.group_id)
    assert retrieved is None

    # Try to delete non-existent
    result = delete_file_group(db_session, uuid.uuid4())
    assert result is False


def test_create_group_member(db_session):
    """Test adding a member to a group."""
    from src.crud import create_group_member
    from src.schemas import GroupMemberCreate

    # Create group
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    # Add member
    member_data = GroupMemberCreate(
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=True,
        file_size=2048576
    )
    member = create_group_member(db_session, group.group_id, member_data)

    assert member is not None
    assert member.group_id == group.group_id
    assert member.file_path == "/data/photos/IMG_1234.JPG"


def test_create_group_member_nonexistent_group(db_session):
    """Test adding a member to a non-existent group returns None."""
    from src.crud import create_group_member
    from src.schemas import GroupMemberCreate

    # Try to add member to non-existent group
    member_data = GroupMemberCreate(
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=True,
        file_size=2048576
    )
    member = create_group_member(db_session, uuid.uuid4(), member_data)

    assert member is None


def test_set_primary_member(db_session):
    """Test setting primary member in a group."""
    from src.crud import create_group_member, set_primary_member
    from src.schemas import GroupMemberCreate

    # Create group with two members
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    member1_data = GroupMemberCreate(
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=True,
        file_size=2048576
    )
    member1 = create_group_member(db_session, group.group_id, member1_data)

    member2_data = GroupMemberCreate(
        file_path="/data/photos/IMG_1234.CR2",
        file_type="raw",
        is_primary=False,
        file_size=25165824
    )
    member2 = create_group_member(db_session, group.group_id, member2_data)

    # Set member2 as primary
    result = set_primary_member(db_session, group.group_id, member2.id)
    assert result is True

    # Verify
    db_session.refresh(member1)
    db_session.refresh(member2)
    assert member1.is_primary is False
    assert member2.is_primary is True


def test_set_primary_member_nonexistent_member(db_session):
    """Test setting non-existent member as primary returns False."""
    from src.crud import set_primary_member

    # Create group
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    # Try to set non-existent member as primary
    result = set_primary_member(db_session, group.group_id, uuid.uuid4())
    assert result is False


def test_create_file_group_rollback_on_error(db_session):
    """Test that create_file_group rolls back on error."""
    from src.crud import create_file_group

    group_data = FileGroupCreate(group_type="raw_jpeg")

    # Mock commit to raise an exception
    with patch.object(db_session, 'commit', side_effect=Exception("Database error")):
        with pytest.raises(Exception, match="Database error"):
            create_file_group(db_session, group_data)

    # Verify rollback was called
    assert db_session.query(Base.metadata.tables['file_groups']).count() == 0


def test_delete_file_group_rollback_on_error(db_session):
    """Test that delete_file_group rolls back on error."""
    from src.crud import delete_file_group

    # Create a group
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    # Mock commit to raise an exception
    with patch.object(db_session, 'commit', side_effect=Exception("Database error")):
        with pytest.raises(Exception, match="Database error"):
            delete_file_group(db_session, group.group_id)

    # Verify group still exists (rollback occurred)
    retrieved = get_file_group(db_session, group.group_id)
    assert retrieved is not None


def test_create_group_member_duplicate_file_path(db_session):
    """Test that duplicate file_path returns None."""
    from src.crud import create_group_member
    from src.schemas import GroupMemberCreate

    # Create group
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    # Add first member
    member_data = GroupMemberCreate(
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=True,
        file_size=2048576
    )
    member1 = create_group_member(db_session, group.group_id, member_data)
    assert member1 is not None

    # Try to add duplicate file_path
    member2 = create_group_member(db_session, group.group_id, member_data)
    assert member2 is None


def test_create_group_member_rollback_on_error(db_session):
    """Test that create_group_member rolls back on non-integrity errors."""
    from src.crud import create_group_member
    from src.schemas import GroupMemberCreate

    # Create group
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    member_data = GroupMemberCreate(
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=True,
        file_size=2048576
    )

    # Mock commit to raise a non-integrity exception
    with patch.object(db_session, 'commit', side_effect=Exception("Database error")):
        with pytest.raises(Exception, match="Database error"):
            create_group_member(db_session, group.group_id, member_data)


def test_set_primary_member_rollback_on_error(db_session):
    """Test that set_primary_member rolls back on error."""
    from src.crud import create_group_member, set_primary_member
    from src.schemas import GroupMemberCreate

    # Create group with member
    group_data = FileGroupCreate(group_type="raw_jpeg")
    group = create_file_group(db_session, group_data)

    member_data = GroupMemberCreate(
        file_path="/data/photos/IMG_1234.JPG",
        file_type="jpeg",
        is_primary=False,
        file_size=2048576
    )
    member = create_group_member(db_session, group.group_id, member_data)

    # Mock commit to raise an exception
    with patch.object(db_session, 'commit', side_effect=Exception("Database error")):
        with pytest.raises(Exception, match="Database error"):
            set_primary_member(db_session, group.group_id, member.id)

    # Verify member is still not primary (rollback occurred)
    db_session.refresh(member)
    assert member.is_primary is False

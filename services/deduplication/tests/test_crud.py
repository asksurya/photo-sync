"""Tests for CRUD operations."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from uuid import uuid4

from src.database import Base
from src import models, schemas, crud


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_create_duplicate_group(db_session):
    """Test creating a duplicate group."""
    group_data = schemas.DuplicateGroupCreate(duplicate_type="exact")
    group = crud.create_duplicate_group(db_session, group_data)

    assert group is not None
    assert group.duplicate_type == "exact"
    assert group.group_id is not None
    assert group.created_at is not None


def test_create_duplicate_group_perceptual(db_session):
    """Test creating a perceptual duplicate group."""
    group_data = schemas.DuplicateGroupCreate(duplicate_type="perceptual")
    group = crud.create_duplicate_group(db_session, group_data)

    assert group is not None
    assert group.duplicate_type == "perceptual"


def test_get_duplicate_group(db_session):
    """Test retrieving a duplicate group."""
    # Create a group first
    group_data = schemas.DuplicateGroupCreate(duplicate_type="exact")
    created_group = crud.create_duplicate_group(db_session, group_data)

    # Retrieve it
    retrieved_group = crud.get_duplicate_group(db_session, created_group.group_id)

    assert retrieved_group is not None
    assert retrieved_group.group_id == created_group.group_id
    assert retrieved_group.duplicate_type == "exact"


def test_get_duplicate_group_not_found(db_session):
    """Test retrieving a non-existent duplicate group."""
    non_existent_id = uuid4()
    group = crud.get_duplicate_group(db_session, non_existent_id)

    assert group is None


def test_list_duplicate_groups(db_session):
    """Test listing duplicate groups."""
    # Create multiple groups
    group1 = crud.create_duplicate_group(
        db_session, schemas.DuplicateGroupCreate(duplicate_type="exact")
    )
    group2 = crud.create_duplicate_group(
        db_session, schemas.DuplicateGroupCreate(duplicate_type="perceptual")
    )

    # List all groups
    groups = crud.list_duplicate_groups(db_session)

    assert len(groups) == 2
    assert any(g.group_id == group1.group_id for g in groups)
    assert any(g.group_id == group2.group_id for g in groups)


def test_list_duplicate_groups_pagination(db_session):
    """Test listing duplicate groups with pagination."""
    # Create 3 groups
    for i in range(3):
        crud.create_duplicate_group(
            db_session, schemas.DuplicateGroupCreate(duplicate_type="exact")
        )

    # Test pagination
    first_page = crud.list_duplicate_groups(db_session, skip=0, limit=2)
    assert len(first_page) == 2

    second_page = crud.list_duplicate_groups(db_session, skip=2, limit=2)
    assert len(second_page) == 1


def test_delete_duplicate_group(db_session):
    """Test deleting a duplicate group."""
    # Create a group
    group_data = schemas.DuplicateGroupCreate(duplicate_type="exact")
    group = crud.create_duplicate_group(db_session, group_data)

    # Delete it
    result = crud.delete_duplicate_group(db_session, group.group_id)
    assert result is True

    # Verify it's gone
    retrieved = crud.get_duplicate_group(db_session, group.group_id)
    assert retrieved is None


def test_delete_duplicate_group_not_found(db_session):
    """Test deleting a non-existent duplicate group."""
    non_existent_id = uuid4()
    result = crud.delete_duplicate_group(db_session, non_existent_id)

    assert result is False


def test_create_duplicate_member(db_session):
    """Test adding a member to a duplicate group."""
    # Create a group
    group_data = schemas.DuplicateGroupCreate(duplicate_type="exact")
    group = crud.create_duplicate_group(db_session, group_data)

    # Add a member
    member_data = schemas.DuplicateMemberCreate(
        file_path="/path/to/file1.jpg",
        file_hash="abc123",
        perceptual_hash="1234567890abcdef",
        similarity_score=1.0,
        file_size=1024
    )
    member = crud.create_duplicate_member(db_session, group.group_id, member_data)

    assert member is not None
    assert member.file_path == "/path/to/file1.jpg"
    assert member.file_hash == "abc123"
    assert member.perceptual_hash == "1234567890abcdef"
    assert member.similarity_score == 1.0
    assert member.file_size == 1024
    assert member.group_id == group.group_id


def test_create_duplicate_member_minimal(db_session):
    """Test adding a member with minimal fields."""
    # Create a group
    group_data = schemas.DuplicateGroupCreate(duplicate_type="perceptual")
    group = crud.create_duplicate_group(db_session, group_data)

    # Add a member with only required fields
    member_data = schemas.DuplicateMemberCreate(
        file_path="/path/to/file2.jpg",
        file_size=2048
    )
    member = crud.create_duplicate_member(db_session, group.group_id, member_data)

    assert member is not None
    assert member.file_path == "/path/to/file2.jpg"
    assert member.file_hash is None
    assert member.perceptual_hash is None
    assert member.similarity_score is None
    assert member.file_size == 2048


def test_create_duplicate_member_group_not_found(db_session):
    """Test adding a member to a non-existent group."""
    non_existent_id = uuid4()
    member_data = schemas.DuplicateMemberCreate(
        file_path="/path/to/file.jpg",
        file_size=1024
    )
    member = crud.create_duplicate_member(db_session, non_existent_id, member_data)

    assert member is None


def test_create_duplicate_member_duplicate_path(db_session):
    """Test adding a member with a duplicate file path."""
    # Create a group
    group_data = schemas.DuplicateGroupCreate(duplicate_type="exact")
    group = crud.create_duplicate_group(db_session, group_data)

    # Add first member
    member_data = schemas.DuplicateMemberCreate(
        file_path="/path/to/duplicate.jpg",
        file_size=1024
    )
    first_member = crud.create_duplicate_member(db_session, group.group_id, member_data)
    assert first_member is not None

    # Try to add second member with same path (should fail due to unique constraint)
    second_member = crud.create_duplicate_member(db_session, group.group_id, member_data)
    assert second_member is None


def test_delete_group_cascades_to_members(db_session):
    """Test that deleting a group also deletes its members."""
    # Create a group
    group_data = schemas.DuplicateGroupCreate(duplicate_type="exact")
    group = crud.create_duplicate_group(db_session, group_data)

    # Add members
    for i in range(3):
        member_data = schemas.DuplicateMemberCreate(
            file_path=f"/path/to/file{i}.jpg",
            file_size=1024
        )
        crud.create_duplicate_member(db_session, group.group_id, member_data)

    # Verify members exist
    group_with_members = crud.get_duplicate_group(db_session, group.group_id)
    assert len(group_with_members.members) == 3

    # Delete the group
    crud.delete_duplicate_group(db_session, group.group_id)

    # Verify members are also deleted (cascade)
    members = db_session.query(models.DuplicateMember).filter(
        models.DuplicateMember.group_id == group.group_id
    ).all()
    assert len(members) == 0

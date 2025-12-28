import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.database import get_db
from src.models import Base  # Import Base from models to ensure models are registered


# Create test database using StaticPool to keep same in-memory database across connections
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables immediately at module level
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# Create client after tables exist
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    """Reset database state between tests."""
    yield
    # Clean up data after each test (but keep schema)
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


def test_create_group_endpoint():
    """Test POST /groups endpoint."""
    response = client.post(
        "/groups",
        json={"group_type": "raw_jpeg"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "group_id" in data
    assert data["group_type"] == "raw_jpeg"
    assert "created_at" in data


def test_list_groups_endpoint():
    """Test GET /groups endpoint."""
    # Create some groups
    client.post("/groups", json={"group_type": "raw_jpeg"})
    client.post("/groups", json={"group_type": "burst"})

    # List all
    response = client.get("/groups")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["group_type"] in ["raw_jpeg", "burst"]


def test_get_group_endpoint():
    """Test GET /groups/{id} endpoint."""
    # Create a group
    create_response = client.post("/groups", json={"group_type": "raw_jpeg"})
    group_id = create_response.json()["group_id"]

    # Get it
    response = client.get(f"/groups/{group_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["group_id"] == group_id
    assert data["group_type"] == "raw_jpeg"


def test_get_nonexistent_group():
    """Test GET /groups/{id} for non-existent group."""
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.get(f"/groups/{fake_id}")
    assert response.status_code == 404


def test_delete_group_endpoint():
    """Test DELETE /groups/{id} endpoint."""
    # Create a group
    create_response = client.post("/groups", json={"group_type": "raw_jpeg"})
    group_id = create_response.json()["group_id"]

    # Delete it
    response = client.delete(f"/groups/{group_id}")
    assert response.status_code == 200

    # Verify it's gone
    get_response = client.get(f"/groups/{group_id}")
    assert get_response.status_code == 404


def test_add_member_endpoint():
    """Test POST /groups/{id}/members endpoint."""
    # Create a group
    create_response = client.post("/groups", json={"group_type": "raw_jpeg"})
    group_id = create_response.json()["group_id"]

    # Add member
    member_data = {
        "file_path": "/data/photos/IMG_1234.JPG",
        "file_type": "jpeg",
        "is_primary": True,
        "file_size": 2048576
    }
    response = client.post(f"/groups/{group_id}/members", json=member_data)
    assert response.status_code == 200
    data = response.json()
    assert data["file_path"] == "/data/photos/IMG_1234.JPG"
    assert data["group_id"] == group_id


def test_set_primary_member_endpoint():
    """Test POST /groups/{group_id}/primary/{member_id} endpoint."""
    # Create a group
    create_response = client.post("/groups", json={"group_type": "raw_jpeg"})
    group_id = create_response.json()["group_id"]

    # Add two members
    member1_data = {
        "file_path": "/data/photos/IMG_1234.JPG",
        "file_type": "jpeg",
        "is_primary": True,
        "file_size": 2048576
    }
    member1_response = client.post(f"/groups/{group_id}/members", json=member1_data)
    member1_id = member1_response.json()["id"]

    member2_data = {
        "file_path": "/data/photos/IMG_1234.CR2",
        "file_type": "raw",
        "is_primary": False,
        "file_size": 25165824
    }
    member2_response = client.post(f"/groups/{group_id}/members", json=member2_data)
    member2_id = member2_response.json()["id"]

    # Set member2 as primary
    response = client.post(f"/groups/{group_id}/primary/{member2_id}")
    assert response.status_code == 200

    # Verify by getting the group
    group_response = client.get(f"/groups/{group_id}")
    group_data = group_response.json()

    # Find the members and check primary status
    members = {m["id"]: m for m in group_data["members"]}
    assert members[member2_id]["is_primary"] is True
    assert members[member1_id]["is_primary"] is False

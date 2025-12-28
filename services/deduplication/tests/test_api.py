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


def test_create_duplicate_group_endpoint():
    """Test POST /duplicates endpoint."""
    response = client.post(
        "/duplicates",
        json={"duplicate_type": "exact"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "group_id" in data
    assert data["duplicate_type"] == "exact"
    assert "created_at" in data
    assert data["members"] == []


def test_create_duplicate_group_perceptual():
    """Test POST /duplicates endpoint with perceptual type."""
    response = client.post(
        "/duplicates",
        json={"duplicate_type": "perceptual"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["duplicate_type"] == "perceptual"


def test_list_duplicate_groups_endpoint():
    """Test GET /duplicates endpoint."""
    # Create some groups
    client.post("/duplicates", json={"duplicate_type": "exact"})
    client.post("/duplicates", json={"duplicate_type": "perceptual"})

    # List all
    response = client.get("/duplicates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["duplicate_type"] in ["exact", "perceptual"]


def test_list_duplicate_groups_pagination():
    """Test GET /duplicates endpoint with pagination."""
    # Create 3 groups
    for _ in range(3):
        client.post("/duplicates", json={"duplicate_type": "exact"})

    # Get first page
    response = client.get("/duplicates?skip=0&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

    # Get second page
    response = client.get("/duplicates?skip=2&limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_get_duplicate_group_endpoint():
    """Test GET /duplicates/{id} endpoint."""
    # Create a group
    create_response = client.post("/duplicates", json={"duplicate_type": "exact"})
    group_id = create_response.json()["group_id"]

    # Get it
    response = client.get(f"/duplicates/{group_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["group_id"] == group_id
    assert data["duplicate_type"] == "exact"


def test_get_nonexistent_duplicate_group():
    """Test GET /duplicates/{id} for non-existent group."""
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.get(f"/duplicates/{fake_id}")
    assert response.status_code == 404


def test_delete_duplicate_group_endpoint():
    """Test DELETE /duplicates/{id} endpoint."""
    # Create a group
    create_response = client.post("/duplicates", json={"duplicate_type": "exact"})
    group_id = create_response.json()["group_id"]

    # Delete it
    response = client.delete(f"/duplicates/{group_id}")
    assert response.status_code == 200

    # Verify it's gone
    get_response = client.get(f"/duplicates/{group_id}")
    assert get_response.status_code == 404


def test_delete_nonexistent_duplicate_group():
    """Test DELETE /duplicates/{id} for non-existent group."""
    import uuid
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/duplicates/{fake_id}")
    assert response.status_code == 404


def test_add_member_endpoint():
    """Test POST /duplicates/{id}/members endpoint."""
    # Create a group
    create_response = client.post("/duplicates", json={"duplicate_type": "exact"})
    group_id = create_response.json()["group_id"]

    # Add member with all fields
    member_data = {
        "file_path": "/data/photos/IMG_1234.jpg",
        "file_hash": "abc123def456",
        "perceptual_hash": "1234567890abcdef",
        "similarity_score": 1.0,
        "file_size": 2048576
    }
    response = client.post(f"/duplicates/{group_id}/members", json=member_data)
    assert response.status_code == 200
    data = response.json()
    assert data["file_path"] == "/data/photos/IMG_1234.jpg"
    assert data["file_hash"] == "abc123def456"
    assert data["perceptual_hash"] == "1234567890abcdef"
    assert data["similarity_score"] == 1.0
    assert data["file_size"] == 2048576
    assert data["group_id"] == group_id


def test_add_member_minimal_fields():
    """Test POST /duplicates/{id}/members with minimal fields."""
    # Create a group
    create_response = client.post("/duplicates", json={"duplicate_type": "perceptual"})
    group_id = create_response.json()["group_id"]

    # Add member with only required fields
    member_data = {
        "file_path": "/data/photos/IMG_5678.jpg",
        "file_size": 1024000
    }
    response = client.post(f"/duplicates/{group_id}/members", json=member_data)
    assert response.status_code == 200
    data = response.json()
    assert data["file_path"] == "/data/photos/IMG_5678.jpg"
    assert data["file_hash"] is None
    assert data["perceptual_hash"] is None
    assert data["similarity_score"] is None
    assert data["file_size"] == 1024000


def test_add_member_to_nonexistent_group():
    """Test POST /duplicates/{id}/members for non-existent group."""
    import uuid
    fake_id = str(uuid.uuid4())

    member_data = {
        "file_path": "/data/photos/IMG_9999.jpg",
        "file_size": 1024
    }
    response = client.post(f"/duplicates/{fake_id}/members", json=member_data)
    assert response.status_code == 404


def test_get_group_with_members():
    """Test that GET /duplicates/{id} includes members."""
    # Create a group
    create_response = client.post("/duplicates", json={"duplicate_type": "exact"})
    group_id = create_response.json()["group_id"]

    # Add members
    member1_data = {
        "file_path": "/data/photos/IMG_1.jpg",
        "file_size": 1024
    }
    client.post(f"/duplicates/{group_id}/members", json=member1_data)

    member2_data = {
        "file_path": "/data/photos/IMG_2.jpg",
        "file_size": 1024
    }
    client.post(f"/duplicates/{group_id}/members", json=member2_data)

    # Get the group
    response = client.get(f"/duplicates/{group_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["members"]) == 2
    assert any(m["file_path"] == "/data/photos/IMG_1.jpg" for m in data["members"])
    assert any(m["file_path"] == "/data/photos/IMG_2.jpg" for m in data["members"])


def test_similarity_score_validation():
    """Test that similarity_score validation works (must be 0.0-1.0)."""
    # Create a group
    create_response = client.post("/duplicates", json={"duplicate_type": "perceptual"})
    group_id = create_response.json()["group_id"]

    # Try to add member with invalid similarity score > 1.0
    member_data = {
        "file_path": "/data/photos/IMG_BAD.jpg",
        "similarity_score": 1.5,
        "file_size": 1024
    }
    response = client.post(f"/duplicates/{group_id}/members", json=member_data)
    assert response.status_code == 422  # Validation error

    # Try with negative similarity score
    member_data["similarity_score"] = -0.1
    response = client.post(f"/duplicates/{group_id}/members", json=member_data)
    assert response.status_code == 422


def test_delete_group_cascades_to_members_via_api():
    """Test that deleting a group also deletes its members (cascade)."""
    # Create a group
    create_response = client.post("/duplicates", json={"duplicate_type": "exact"})
    group_id = create_response.json()["group_id"]

    # Add members
    for i in range(3):
        member_data = {
            "file_path": f"/data/photos/IMG_{i}.jpg",
            "file_size": 1024
        }
        client.post(f"/duplicates/{group_id}/members", json=member_data)

    # Verify members exist
    group_response = client.get(f"/duplicates/{group_id}")
    assert len(group_response.json()["members"]) == 3

    # Delete the group
    delete_response = client.delete(f"/duplicates/{group_id}")
    assert delete_response.status_code == 200

    # Verify group is gone
    get_response = client.get(f"/duplicates/{group_id}")
    assert get_response.status_code == 404

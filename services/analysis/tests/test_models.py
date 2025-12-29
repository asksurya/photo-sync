import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base
from src.models import ImportBatch, AssetQualityScore, BurstSequence, TriageAction


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_import_batch_creation(db_session):
    batch = ImportBatch(
        immich_user_id="test-user-123",
        asset_ids=["asset-1", "asset-2"],
        total_assets=100,
        status="processing"
    )
    db_session.add(batch)
    db_session.commit()

    assert batch.id is not None
    assert batch.immich_user_id == "test-user-123"
    assert batch.total_assets == 100
    assert batch.analyzed_assets == 0
    assert batch.status == "processing"


def test_asset_quality_score_creation(db_session):
    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset-123",
        import_batch_id=batch.id,
        blur_score=85.5,
        exposure_score=92.0,
        overall_quality=88.0,
        is_corrupted=False
    )
    db_session.add(score)
    db_session.commit()

    assert score.id is not None
    assert score.blur_score == 85.5
    assert score.overall_quality == 88.0


def test_burst_sequence_creation(db_session):
    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1", "asset-2", "asset-3", "asset-4", "asset-5"], total_assets=5, status="processing")
    db_session.add(batch)
    db_session.commit()

    burst = BurstSequence(
        import_batch_id=batch.id,
        immich_asset_ids=["asset-1", "asset-2", "asset-3"],
        recommended_asset_id="asset-2"
    )
    db_session.add(burst)
    db_session.commit()

    assert burst.id is not None
    assert len(burst.immich_asset_ids) == 3
    assert burst.recommended_asset_id == "asset-2"


def test_triage_action_creation(db_session):
    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    action = TriageAction(
        import_batch_id=batch.id,
        action_type="delete",
        immich_asset_id="asset-456",
        applied=False,
        user_overridden=False
    )
    db_session.add(action)
    db_session.commit()

    assert action.id is not None
    assert action.action_type == "delete"
    assert action.applied is False


def test_cascade_delete_on_batch(db_session):
    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="complete")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset",
        import_batch_id=batch.id,
        overall_quality=50.0
    )
    db_session.add(score)
    db_session.commit()

    db_session.delete(batch)
    db_session.commit()

    # Score should be cascade deleted
    assert db_session.query(AssetQualityScore).count() == 0


def test_import_batch_invalid_status(db_session):
    """Test that invalid status values are rejected."""
    from sqlalchemy.exc import IntegrityError

    batch = ImportBatch(
        immich_user_id="user",
        total_assets=1,
        status="invalid_status"
    )
    db_session.add(batch)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_asset_quality_score_blur_score_out_of_range(db_session):
    """Test that blur_score outside 0-100 range is rejected."""
    from sqlalchemy.exc import IntegrityError

    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset",
        import_batch_id=batch.id,
        blur_score=150.0  # Invalid: > 100
    )
    db_session.add(score)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_asset_quality_score_negative_blur_score(db_session):
    """Test that negative blur_score is rejected."""
    from sqlalchemy.exc import IntegrityError

    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset",
        import_batch_id=batch.id,
        blur_score=-10.0  # Invalid: < 0
    )
    db_session.add(score)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_asset_quality_score_exposure_score_out_of_range(db_session):
    """Test that exposure_score outside 0-100 range is rejected."""
    from sqlalchemy.exc import IntegrityError

    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset",
        import_batch_id=batch.id,
        exposure_score=101.0  # Invalid: > 100
    )
    db_session.add(score)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_asset_quality_score_overall_quality_out_of_range(db_session):
    """Test that overall_quality outside 0-100 range is rejected."""
    from sqlalchemy.exc import IntegrityError

    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    score = AssetQualityScore(
        immich_asset_id="asset",
        import_batch_id=batch.id,
        overall_quality=200.0  # Invalid: > 100
    )
    db_session.add(score)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_triage_action_invalid_action_type(db_session):
    """Test that invalid action_type values are rejected."""
    from sqlalchemy.exc import IntegrityError

    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    action = TriageAction(
        import_batch_id=batch.id,
        action_type="invalid_action",  # Invalid action type
        immich_asset_id="asset"
    )
    db_session.add(action)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_guid_type_with_uuid_value(db_session):
    """Test GUID type adapter with UUID value."""
    import uuid
    batch_id = uuid.uuid4()
    batch = ImportBatch(
        id=batch_id,
        immich_user_id="user",
        asset_ids=["asset-1"],
        total_assets=1,
        status="processing"
    )
    db_session.add(batch)
    db_session.commit()

    retrieved = db_session.query(ImportBatch).filter_by(id=batch_id).first()
    assert retrieved.id == batch_id


def test_string_array_type_with_multiple_values(db_session):
    """Test StringArray type adapter with multiple values."""
    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1", "asset-2", "asset-3", "asset-4", "asset-5"], total_assets=5, status="processing")
    db_session.add(batch)
    db_session.commit()

    asset_ids = ["asset-1", "asset-2", "asset-3", "asset-4", "asset-5"]
    burst = BurstSequence(
        import_batch_id=batch.id,
        immich_asset_ids=asset_ids
    )
    db_session.add(burst)
    db_session.commit()

    retrieved = db_session.query(BurstSequence).first()
    assert retrieved.immich_asset_ids == asset_ids
    assert len(retrieved.immich_asset_ids) == 5


def test_asset_quality_score_unique_per_batch(db_session):
    """Test that the same asset cannot have duplicate quality scores in the same batch."""
    from sqlalchemy.exc import IntegrityError

    batch = ImportBatch(immich_user_id="user", asset_ids=["asset-1"], total_assets=1, status="processing")
    db_session.add(batch)
    db_session.commit()

    # First quality score for asset-123
    score1 = AssetQualityScore(
        immich_asset_id="asset-123",
        import_batch_id=batch.id,
        overall_quality=80.0
    )
    db_session.add(score1)
    db_session.commit()

    # Try to add duplicate quality score for same asset in same batch
    score2 = AssetQualityScore(
        immich_asset_id="asset-123",
        import_batch_id=batch.id,
        overall_quality=90.0
    )
    db_session.add(score2)

    with pytest.raises(IntegrityError):
        db_session.commit()


def test_asset_quality_score_unique_across_batches(db_session):
    """Test that the same asset can have quality scores in different batches."""
    batch1 = ImportBatch(immich_user_id="user", asset_ids=["asset-123"], total_assets=1, status="processing")
    batch2 = ImportBatch(immich_user_id="user", asset_ids=["asset-123"], total_assets=1, status="processing")
    db_session.add_all([batch1, batch2])
    db_session.commit()

    # Quality score for asset-123 in batch1
    score1 = AssetQualityScore(
        immich_asset_id="asset-123",
        import_batch_id=batch1.id,
        overall_quality=80.0
    )
    db_session.add(score1)
    db_session.commit()

    # Quality score for same asset in batch2 - should be allowed
    score2 = AssetQualityScore(
        immich_asset_id="asset-123",
        import_batch_id=batch2.id,
        overall_quality=90.0
    )
    db_session.add(score2)
    db_session.commit()

    # Both scores should exist
    assert db_session.query(AssetQualityScore).count() == 2

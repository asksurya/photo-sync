import pytest
from pydantic import ValidationError
from uuid import uuid4
from src.schemas import (
    ImportBatchCreate,
    ImportBatchResponse,
    AnalysisStatus,
    QualityScoreResponse,
    BurstSequenceResponse,
    TriageCategory,
    TriageDashboard,
    TriageActionRequest,
    TriageActionsApply,
    TriageActionsResponse,
)


def test_import_batch_create():
    """Test ImportBatchCreate schema"""
    data = {
        "immich_user_id": "user123",
        "asset_ids": ["asset1", "asset2", "asset3"]
    }
    batch = ImportBatchCreate(**data)
    assert batch.immich_user_id == "user123"
    assert len(batch.asset_ids) == 3


def test_import_batch_response():
    """Test ImportBatchResponse schema"""
    batch_id = uuid4()
    data = {
        "batch_id": batch_id,
        "status": "pending"
    }
    response = ImportBatchResponse(**data)
    assert response.batch_id == batch_id
    assert response.status == "pending"


def test_analysis_status():
    """Test AnalysisStatus schema"""
    data = {
        "status": "processing",
        "progress_percent": 45.5,
        "eta_seconds": 120,
        "total_assets": 100,
        "analyzed_assets": 45,
        "skipped_assets": 5
    }
    status = AnalysisStatus(**data)
    assert status.progress_percent == 45.5
    assert status.eta_seconds == 120


def test_analysis_status_without_eta():
    """Test AnalysisStatus schema with None ETA"""
    data = {
        "status": "processing",
        "progress_percent": 45.5,
        "eta_seconds": None,
        "total_assets": 100,
        "analyzed_assets": 45,
        "skipped_assets": 5
    }
    status = AnalysisStatus(**data)
    assert status.eta_seconds is None


def test_quality_score_response():
    """Test QualityScoreResponse schema"""
    data = {
        "immich_asset_id": "asset123",
        "blur_score": 0.85,
        "exposure_score": 0.90,
        "overall_quality": 0.87,
        "is_corrupted": False
    }
    score = QualityScoreResponse(**data)
    assert score.blur_score == 0.85
    assert score.is_corrupted is False


def test_quality_score_response_with_nulls():
    """Test QualityScoreResponse schema with optional nulls"""
    data = {
        "immich_asset_id": "asset123",
        "blur_score": None,
        "exposure_score": None,
        "overall_quality": None,
        "is_corrupted": True
    }
    score = QualityScoreResponse(**data)
    assert score.blur_score is None
    assert score.is_corrupted is True


def test_burst_sequence_response():
    """Test BurstSequenceResponse schema"""
    data = {
        "immich_asset_ids": ["asset1", "asset2", "asset3"],
        "recommended_asset_id": "asset2"
    }
    burst = BurstSequenceResponse(**data)
    assert len(burst.immich_asset_ids) == 3
    assert burst.recommended_asset_id == "asset2"


def test_burst_sequence_response_without_recommendation():
    """Test BurstSequenceResponse schema without recommendation"""
    data = {
        "immich_asset_ids": ["asset1", "asset2"],
        "recommended_asset_id": None
    }
    burst = BurstSequenceResponse(**data)
    assert burst.recommended_asset_id is None


def test_triage_category_valid_colors():
    """Test TriageCategory schema with valid badge colors"""
    for color in ["green", "yellow", "orange"]:
        data = {
            "category_type": "low_quality",
            "count": 10,
            "estimated_savings_bytes": 1024000,
            "badge_color": color
        }
        category = TriageCategory(**data)
        assert category.badge_color == color


def test_triage_category_invalid_color():
    """Test TriageCategory schema rejects invalid badge color"""
    data = {
        "category_type": "low_quality",
        "count": 10,
        "estimated_savings_bytes": 1024000,
        "badge_color": "red"  # Invalid color
    }
    with pytest.raises(ValidationError) as exc_info:
        TriageCategory(**data)
    assert "badge_color" in str(exc_info.value)


def test_triage_category_without_savings():
    """Test TriageCategory schema with None savings"""
    data = {
        "category_type": "low_quality",
        "count": 10,
        "estimated_savings_bytes": None,
        "badge_color": "green"
    }
    category = TriageCategory(**data)
    assert category.estimated_savings_bytes is None


def test_triage_dashboard():
    """Test TriageDashboard schema"""
    data = {
        "categories": [
            {
                "category_type": "low_quality",
                "count": 10,
                "estimated_savings_bytes": 1024000,
                "badge_color": "orange"
            },
            {
                "category_type": "duplicates",
                "count": 5,
                "estimated_savings_bytes": 512000,
                "badge_color": "yellow"
            }
        ],
        "total_assets": 100,
        "analyzed_assets": 95
    }
    dashboard = TriageDashboard(**data)
    assert len(dashboard.categories) == 2
    assert dashboard.total_assets == 100


def test_triage_action_request_valid_actions():
    """Test TriageActionRequest schema with valid action types"""
    for action in ["delete", "keep", "organize"]:
        data = {
            "asset_id": "asset123",
            "action_type": action
        }
        action_req = TriageActionRequest(**data)
        assert action_req.action_type == action


def test_triage_action_request_invalid_action():
    """Test TriageActionRequest schema rejects invalid action type"""
    data = {
        "asset_id": "asset123",
        "action_type": "archive"  # Invalid action
    }
    with pytest.raises(ValidationError) as exc_info:
        TriageActionRequest(**data)
    assert "action_type" in str(exc_info.value)


def test_triage_actions_apply():
    """Test TriageActionsApply schema"""
    data = {
        "actions": [
            {"asset_id": "asset1", "action_type": "delete"},
            {"asset_id": "asset2", "action_type": "keep"},
            {"asset_id": "asset3", "action_type": "organize"}
        ]
    }
    actions = TriageActionsApply(**data)
    assert len(actions.actions) == 3


def test_triage_actions_response():
    """Test TriageActionsResponse schema"""
    data = {
        "applied_count": 10,
        "failed_count": 2,
        "errors": ["Error 1", "Error 2"]
    }
    response = TriageActionsResponse(**data)
    assert response.applied_count == 10
    assert len(response.errors) == 2


def test_triage_actions_response_without_errors():
    """Test TriageActionsResponse schema without errors"""
    data = {
        "applied_count": 10,
        "failed_count": 0,
        "errors": None
    }
    response = TriageActionsResponse(**data)
    assert response.errors is None

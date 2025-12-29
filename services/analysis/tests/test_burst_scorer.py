import pytest
from src.burst.scorer import BurstScorer


@pytest.fixture
def burst_scorer():
    return BurstScorer()


@pytest.fixture
def burst_with_quality_scores():
    """Burst sequence with varying quality scores"""
    return [
        {'id': 'photo-1', 'quality_score': 45.0},
        {'id': 'photo-2', 'quality_score': 85.0},  # Best
        {'id': 'photo-3', 'quality_score': 60.0},
        {'id': 'photo-4', 'quality_score': 55.0},
    ]


def test_burst_scorer_initialization(burst_scorer):
    assert burst_scorer is not None


def test_recommend_best_shot(burst_scorer, burst_with_quality_scores):
    best_id = burst_scorer.recommend_best_shot(burst_with_quality_scores)

    assert best_id == 'photo-2'  # Highest quality score


def test_recommend_from_single_photo(burst_scorer):
    burst = [{'id': 'only-one', 'quality_score': 50.0}]
    best_id = burst_scorer.recommend_best_shot(burst)

    assert best_id == 'only-one'


def test_recommend_with_ties(burst_scorer):
    burst = [
        {'id': 'photo-1', 'quality_score': 80.0},
        {'id': 'photo-2', 'quality_score': 80.0},  # Tie, but first
    ]
    best_id = burst_scorer.recommend_best_shot(burst)

    # Should pick first one in case of tie
    assert best_id == 'photo-1'


def test_empty_burst_returns_none(burst_scorer):
    best_id = burst_scorer.recommend_best_shot([])

    assert best_id is None

import pytest
from datetime import datetime, timedelta
from src.burst.detector import BurstDetector


@pytest.fixture
def burst_detector():
    return BurstDetector(interval_seconds=2.0)


@pytest.fixture
def burst_sequence_photos():
    """5 photos in rapid succession (burst)"""
    base_time = datetime(2025, 1, 1, 12, 0, 0)
    return [
        {'id': f'photo-{i}', 'timestamp': base_time + timedelta(seconds=i * 0.5)}
        for i in range(5)
    ]


@pytest.fixture
def non_burst_photos():
    """Photos with large time gaps (not burst)"""
    base_time = datetime(2025, 1, 1, 12, 0, 0)
    return [
        {'id': 'photo-1', 'timestamp': base_time},
        {'id': 'photo-2', 'timestamp': base_time + timedelta(minutes=5)},
        {'id': 'photo-3', 'timestamp': base_time + timedelta(minutes=10)},
    ]


@pytest.fixture
def mixed_photos():
    """Mix of burst and non-burst photos"""
    base_time = datetime(2025, 1, 1, 12, 0, 0)
    photos = []

    # First burst
    for i in range(3):
        photos.append({
            'id': f'burst1-{i}',
            'timestamp': base_time + timedelta(seconds=i * 0.5)
        })

    # Gap
    photos.append({
        'id': 'single-1',
        'timestamp': base_time + timedelta(minutes=5)
    })

    # Second burst
    for i in range(4):
        photos.append({
            'id': f'burst2-{i}',
            'timestamp': base_time + timedelta(minutes=6, seconds=i * 0.5)
        })

    return photos


def test_burst_detector_initialization(burst_detector):
    assert burst_detector is not None
    assert burst_detector.interval_seconds == 2.0


def test_detect_single_burst_sequence(burst_detector, burst_sequence_photos):
    bursts = burst_detector.detect_bursts(burst_sequence_photos)

    assert len(bursts) == 1
    assert len(bursts[0]) == 5
    assert all(p['id'] in [photo['id'] for photo in burst_sequence_photos] for p in bursts[0])


def test_detect_no_bursts(burst_detector, non_burst_photos):
    bursts = burst_detector.detect_bursts(non_burst_photos)

    assert len(bursts) == 0


def test_detect_multiple_bursts(burst_detector, mixed_photos):
    bursts = burst_detector.detect_bursts(mixed_photos)

    assert len(bursts) == 2
    assert len(bursts[0]) == 3  # First burst
    assert len(bursts[1]) == 4  # Second burst


def test_single_photo_not_burst(burst_detector):
    photos = [{'id': 'single', 'timestamp': datetime.now()}]
    bursts = burst_detector.detect_bursts(photos)

    assert len(bursts) == 0


def test_empty_photos_list(burst_detector):
    bursts = burst_detector.detect_bursts([])
    assert len(bursts) == 0

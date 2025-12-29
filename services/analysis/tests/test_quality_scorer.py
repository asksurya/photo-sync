import pytest
import numpy as np
from PIL import Image
from src.quality.scorer import QualityScorer


@pytest.fixture
def quality_scorer():
    return QualityScorer()


@pytest.fixture
def high_quality_image():
    # Sharp, well-exposed image
    img = np.random.normal(128, 30, (200, 200, 3)).clip(0, 255).astype(np.uint8)
    for i in range(0, 200, 10):
        img[i:i+5, :] = 200  # Sharp edges
    return Image.fromarray(img)


@pytest.fixture
def low_quality_image():
    # Blurry, dark image
    img = np.full((200, 200, 3), 30, dtype=np.uint8)
    return Image.fromarray(img)


def test_quality_scorer_initialization(quality_scorer):
    assert quality_scorer is not None
    assert quality_scorer.blur_detector is not None
    assert quality_scorer.exposure_analyzer is not None


def test_score_high_quality_image(quality_scorer, high_quality_image):
    result = quality_scorer.analyze_image(high_quality_image)

    assert result['blur_score'] > 50.0
    assert result['exposure_score'] > 50.0
    assert result['overall_quality'] > 50.0
    assert result['is_corrupted'] is False


def test_score_low_quality_image(quality_scorer, low_quality_image):
    result = quality_scorer.analyze_image(low_quality_image)

    assert result['blur_score'] < 50.0
    assert result['overall_quality'] < 50.0
    assert result['is_corrupted'] is False


def test_score_corrupted_image_bytes(quality_scorer):
    result = quality_scorer.analyze_image_bytes(b'corrupted')

    assert result['is_corrupted'] is True
    assert result['blur_score'] is None
    assert result['exposure_score'] is None
    assert result['overall_quality'] == 0.0


def test_overall_quality_calculation(quality_scorer, high_quality_image):
    result = quality_scorer.analyze_image(high_quality_image)

    # Overall should be weighted average of blur (60%) and exposure (40%)
    expected_overall = result['blur_score'] * 0.6 + result['exposure_score'] * 0.4
    assert abs(result['overall_quality'] - expected_overall) < 0.1


def test_analyze_valid_image_bytes(quality_scorer):
    # Create a valid image in bytes
    img = Image.new('RGB', (100, 100), color='blue')
    import io
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    image_bytes = buffer.getvalue()

    result = quality_scorer.analyze_image_bytes(image_bytes)

    assert result['is_corrupted'] is False
    assert result['blur_score'] is not None
    assert result['exposure_score'] is not None
    assert result['overall_quality'] > 0.0

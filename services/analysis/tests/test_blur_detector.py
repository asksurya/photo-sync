import pytest
import numpy as np
from PIL import Image
from src.quality.blur_detector import BlurDetector


@pytest.fixture
def blur_detector():
    return BlurDetector()


@pytest.fixture
def sharp_image():
    # Create synthetic sharp image with high-frequency content
    img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    for i in range(0, 100, 10):
        img[i:i+5, :] = 255  # Sharp vertical lines
    return Image.fromarray(img)


@pytest.fixture
def blurry_image():
    # Create synthetic blurry image (uniform gray)
    img = np.full((100, 100, 3), 128, dtype=np.uint8)
    return Image.fromarray(img)


def test_blur_detector_initialization(blur_detector):
    assert blur_detector is not None


def test_detect_sharp_image(blur_detector, sharp_image):
    score = blur_detector.calculate_blur_score(sharp_image)
    assert score > 50.0  # Sharp images should score high
    assert score <= 100.0


def test_detect_blurry_image(blur_detector, blurry_image):
    score = blur_detector.calculate_blur_score(blurry_image)
    assert score < 50.0  # Blurry images should score low
    assert score >= 0.0


def test_blur_score_range(blur_detector, sharp_image):
    score = blur_detector.calculate_blur_score(sharp_image)
    assert 0.0 <= score <= 100.0


def test_blur_detector_with_numpy_array(blur_detector):
    # Test with numpy array directly (not converted to PIL Image)
    img_array = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    score = blur_detector.calculate_blur_score(img_array)
    assert 0.0 <= score <= 100.0


def test_blur_detector_with_none_image(blur_detector):
    # Test that None image raises ValueError
    with pytest.raises(ValueError, match="Image cannot be None"):
        blur_detector.calculate_blur_score(None)


def test_blur_detector_with_grayscale_image(blur_detector):
    # Test with grayscale image (2D array)
    img_array = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    score = blur_detector.calculate_blur_score(img_array)
    assert 0.0 <= score <= 100.0


def test_blur_detector_with_empty_image(blur_detector):
    # Test that empty image raises ValueError
    empty_image = np.array([])
    with pytest.raises(ValueError, match="Image cannot be empty"):
        blur_detector.calculate_blur_score(empty_image)


def test_blur_detector_with_invalid_shape(blur_detector):
    # Test that 1D array raises ValueError
    invalid_image = np.array([1, 2, 3, 4])
    with pytest.raises(ValueError, match="Image must be 2D .* or 3D"):
        blur_detector.calculate_blur_score(invalid_image)


def test_blur_detector_with_invalid_channels(blur_detector):
    # Test that image with invalid number of channels raises ValueError
    invalid_image = np.random.randint(0, 255, (100, 100, 2), dtype=np.uint8)
    with pytest.raises(ValueError, match="Color images must have 3 or 4 channels"):
        blur_detector.calculate_blur_score(invalid_image)

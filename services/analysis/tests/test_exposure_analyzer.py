import pytest
import numpy as np
from PIL import Image
from src.quality.exposure_analyzer import ExposureAnalyzer


@pytest.fixture
def exposure_analyzer():
    return ExposureAnalyzer()


@pytest.fixture
def well_exposed_image():
    # Create image with good histogram distribution (centered around 128)
    img = np.random.normal(128, 30, (100, 100, 3)).clip(0, 255).astype(np.uint8)
    return Image.fromarray(img)


@pytest.fixture
def dark_image():
    # Create very dark image
    img = np.random.normal(30, 20, (100, 100, 3)).clip(0, 255).astype(np.uint8)
    return Image.fromarray(img)


@pytest.fixture
def bright_image():
    # Create very bright/overexposed image
    img = np.random.normal(220, 20, (100, 100, 3)).clip(0, 255).astype(np.uint8)
    return Image.fromarray(img)


def test_exposure_analyzer_initialization(exposure_analyzer):
    assert exposure_analyzer is not None


def test_well_exposed_image_scores_high(exposure_analyzer, well_exposed_image):
    score = exposure_analyzer.calculate_exposure_score(well_exposed_image)
    assert score > 70.0
    assert score <= 100.0


def test_dark_image_scores_low(exposure_analyzer, dark_image):
    score = exposure_analyzer.calculate_exposure_score(dark_image)
    assert score < 50.0


def test_bright_image_scores_low(exposure_analyzer, bright_image):
    score = exposure_analyzer.calculate_exposure_score(bright_image)
    assert score < 50.0


def test_exposure_score_range(exposure_analyzer, well_exposed_image):
    score = exposure_analyzer.calculate_exposure_score(well_exposed_image)
    assert 0.0 <= score <= 100.0


def test_exposure_analyzer_with_numpy_array(exposure_analyzer):
    # Test with numpy array directly (not converted to PIL Image)
    img_array = np.random.normal(128, 30, (100, 100, 3)).clip(0, 255).astype(np.uint8)
    score = exposure_analyzer.calculate_exposure_score(img_array)
    assert 0.0 <= score <= 100.0


def test_exposure_analyzer_with_none_image(exposure_analyzer):
    # Test that None image raises ValueError
    with pytest.raises(ValueError, match="Image cannot be None"):
        exposure_analyzer.calculate_exposure_score(None)


def test_exposure_analyzer_with_grayscale_image(exposure_analyzer):
    # Test with grayscale image (2D array)
    img_array = np.random.normal(128, 30, (100, 100)).clip(0, 255).astype(np.uint8)
    score = exposure_analyzer.calculate_exposure_score(img_array)
    assert 0.0 <= score <= 100.0


def test_exposure_analyzer_with_empty_image(exposure_analyzer):
    # Test that empty image raises ValueError
    empty_image = np.array([])
    with pytest.raises(ValueError, match="Image cannot be empty"):
        exposure_analyzer.calculate_exposure_score(empty_image)


def test_exposure_analyzer_with_invalid_shape(exposure_analyzer):
    # Test that 1D array raises ValueError
    invalid_image = np.array([1, 2, 3, 4])
    with pytest.raises(ValueError, match="Image must be 2D .* or 3D"):
        exposure_analyzer.calculate_exposure_score(invalid_image)


def test_exposure_analyzer_with_invalid_channels(exposure_analyzer):
    # Test that image with invalid number of channels raises ValueError
    invalid_image = np.random.normal(128, 30, (100, 100, 2)).clip(0, 255).astype(np.uint8)
    with pytest.raises(ValueError, match="Color images must have 3 or 4 channels"):
        exposure_analyzer.calculate_exposure_score(invalid_image)

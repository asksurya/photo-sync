import pytest
from PIL import Image
import io
import tempfile
import os
from src.quality.corruption_detector import CorruptionDetector


@pytest.fixture
def corruption_detector():
    return CorruptionDetector()


@pytest.fixture
def valid_image_bytes():
    img = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return buffer.getvalue()


@pytest.fixture
def corrupted_image_bytes():
    # Truncated JPEG data
    return b'\xff\xd8\xff\xe0\x00\x10JFIF'  # Incomplete JPEG header


def test_corruption_detector_initialization(corruption_detector):
    assert corruption_detector is not None


def test_detect_valid_image(corruption_detector, valid_image_bytes):
    is_corrupted = corruption_detector.is_corrupted(valid_image_bytes)
    assert is_corrupted is False


def test_detect_corrupted_image(corruption_detector, corrupted_image_bytes):
    is_corrupted = corruption_detector.is_corrupted(corrupted_image_bytes)
    assert is_corrupted is True


def test_detect_empty_bytes(corruption_detector):
    is_corrupted = corruption_detector.is_corrupted(b'')
    assert is_corrupted is True


def test_detect_invalid_format(corruption_detector):
    is_corrupted = corruption_detector.is_corrupted(b'not an image')
    assert is_corrupted is True


def test_detect_valid_image_file_path(corruption_detector, valid_image_bytes):
    # Create a temporary file with valid image data
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.jpg', delete=False) as tmp_file:
        tmp_file.write(valid_image_bytes)
        tmp_path = tmp_file.name

    try:
        is_corrupted = corruption_detector.is_corrupted(tmp_path)
        assert is_corrupted is False
    finally:
        os.unlink(tmp_path)


def test_detect_corrupted_image_file_path(corruption_detector):
    # Create a temporary file with invalid image data
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.jpg', delete=False) as tmp_file:
        tmp_file.write(b'not an image')
        tmp_path = tmp_file.name

    try:
        is_corrupted = corruption_detector.is_corrupted(tmp_path)
        assert is_corrupted is True
    finally:
        os.unlink(tmp_path)

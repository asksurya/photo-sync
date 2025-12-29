from PIL import Image
import io
from typing import Dict, Union, Optional
from .blur_detector import BlurDetector
from .exposure_analyzer import ExposureAnalyzer
from .corruption_detector import CorruptionDetector


class QualityScorer:
    """Combines blur, exposure, and corruption detection into overall quality score."""

    def __init__(self):
        self.blur_detector = BlurDetector()
        self.exposure_analyzer = ExposureAnalyzer()
        self.corruption_detector = CorruptionDetector()

    def analyze_image(self, image: Image.Image) -> Dict[str, Optional[float]]:
        """
        Analyze image quality.

        Args:
            image: PIL Image

        Returns:
            Dict with blur_score, exposure_score, overall_quality, is_corrupted
        """
        blur_score = self.blur_detector.calculate_blur_score(image)
        exposure_score = self.exposure_analyzer.calculate_exposure_score(image)

        # Overall quality: weighted average (blur 60%, exposure 40%)
        overall_quality = blur_score * 0.6 + exposure_score * 0.4

        return {
            'blur_score': blur_score,
            'exposure_score': exposure_score,
            'overall_quality': overall_quality,
            'is_corrupted': False
        }

    def analyze_image_bytes(self, image_data: bytes) -> Dict[str, Optional[float]]:
        """
        Analyze image quality from bytes.

        Args:
            image_data: Image file bytes

        Returns:
            Dict with blur_score, exposure_score, overall_quality, is_corrupted
        """
        # Check for corruption first
        if self.corruption_detector.is_corrupted(image_data):
            return {
                'blur_score': None,
                'exposure_score': None,
                'overall_quality': 0.0,
                'is_corrupted': True
            }

        # Load and analyze
        image = Image.open(io.BytesIO(image_data))
        return self.analyze_image(image)

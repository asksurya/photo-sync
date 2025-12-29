import cv2
import numpy as np
from PIL import Image
from typing import Union


class ExposureAnalyzer:
    """Analyzes image exposure using histogram distribution."""

    # Constants for exposure analysis
    IDEAL_BRIGHTNESS = 128  # Ideal mean brightness (mid-tone)
    SPREAD_NORMALIZATION = 50.0  # Normalization factor for histogram spread
    BRIGHTNESS_WEIGHT = 0.6  # Weight for brightness score in final calculation
    SPREAD_WEIGHT = 0.4  # Weight for spread score in final calculation

    def calculate_exposure_score(self, image: Union[Image.Image, np.ndarray]) -> float:
        """
        Calculate exposure quality score (0-100, higher = better exposed).

        Good exposure has histogram centered around mid-tones (128).
        Poor exposure is too dark (histogram left) or too bright (histogram right).

        Args:
            image: PIL Image or numpy array

        Returns:
            Exposure score between 0 (very poor) and 100 (excellent)

        Raises:
            ValueError: If image is None, empty, or has invalid shape
        """
        # Validate input is not None
        if image is None:
            raise ValueError("Image cannot be None")

        # Convert PIL Image to numpy array if needed
        if isinstance(image, Image.Image):
            img_array = np.array(image)
        else:
            img_array = image

        # Validate image is not empty and has valid shape
        if img_array.size == 0:
            raise ValueError("Image cannot be empty")

        if len(img_array.shape) not in [2, 3]:
            raise ValueError(
                f"Image must be 2D (grayscale) or 3D (color), got shape {img_array.shape}"
            )

        if len(img_array.shape) == 3 and img_array.shape[2] not in [3, 4]:
            raise ValueError(
                f"Color images must have 3 or 4 channels, got {img_array.shape[2]}"
            )

        # Convert to grayscale for histogram
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Calculate histogram
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist = hist.flatten() / hist.sum()  # Normalize

        # Calculate mean brightness
        mean_brightness = np.average(np.arange(256), weights=hist)

        # Calculate histogram spread (standard deviation)
        std_dev = np.sqrt(np.average((np.arange(256) - mean_brightness)**2, weights=hist))

        # Score based on mean brightness (penalty for too dark or too bright)
        # Ideal mean is around IDEAL_BRIGHTNESS, with some tolerance
        brightness_penalty = abs(mean_brightness - self.IDEAL_BRIGHTNESS) / self.IDEAL_BRIGHTNESS
        brightness_score = max(0, 1.0 - brightness_penalty)

        # Score based on histogram spread (good images have reasonable spread)
        # Too narrow = flat/dull, too wide = potentially overexposed highlights + dark shadows
        spread_score = min(1.0, std_dev / self.SPREAD_NORMALIZATION)  # Normalize to 0-1

        # Combine scores (weighted average)
        final_score = (brightness_score * self.BRIGHTNESS_WEIGHT + spread_score * self.SPREAD_WEIGHT) * 100.0

        return float(max(0.0, min(100.0, final_score)))

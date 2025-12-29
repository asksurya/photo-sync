import cv2
import numpy as np
from PIL import Image
from typing import Union


class BlurDetector:
    """Detects blur in images using Laplacian variance method."""

    def __init__(self, threshold: float = 100.0):
        """
        Args:
            threshold: Laplacian variance threshold for blur detection.
                      Higher values = sharper images required.
                      Default of 100.0 provides good separation between sharp
                      and blurry images (sharp images typically have variance 100-1000+,
                      blurry images have variance 0-100).
        """
        self.threshold = threshold

    def calculate_blur_score(self, image: Union[Image.Image, np.ndarray]) -> float:
        """
        Calculate blur score for an image (0-100, higher = sharper).

        Args:
            image: PIL Image or numpy array

        Returns:
            Blur score between 0 (very blurry) and 100 (very sharp)

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

        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array

        # Calculate Laplacian variance
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        variance = laplacian.var()

        # Normalize to 0-100 scale
        # Using linear normalization with clipping to map variance to score
        # Typical sharp images have variance 100-1000+
        # Blurry images have variance 0-100
        normalized_score = min(100.0, (variance / self.threshold) * 100.0)

        return normalized_score

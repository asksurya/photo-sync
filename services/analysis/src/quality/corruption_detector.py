from PIL import Image
import io
from typing import Union


class CorruptionDetector:
    """Detects corrupted or invalid image files."""

    def is_corrupted(self, image_data: Union[bytes, str]) -> bool:
        """
        Check if image data is corrupted.

        Args:
            image_data: Image bytes or file path

        Returns:
            True if corrupted/invalid, False if valid
        """
        try:
            if isinstance(image_data, bytes):
                if len(image_data) == 0:
                    return True
                img = Image.open(io.BytesIO(image_data))
            else:
                img = Image.open(image_data)

            # Verify by loading the image
            img.verify()

            # Re-open to actually load pixel data (verify() closes the file)
            if isinstance(image_data, bytes):
                img = Image.open(io.BytesIO(image_data))
            else:
                img = Image.open(image_data)

            img.load()

            return False
        except Exception:
            return True

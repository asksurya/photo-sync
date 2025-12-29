from typing import List, Dict, Any
from datetime import datetime, timedelta


class BurstDetector:
    """Detects burst sequences in photo collections."""

    def __init__(self, interval_seconds: float = 2.0, min_burst_size: int = 2):
        """
        Args:
            interval_seconds: Maximum time gap between photos in a burst
            min_burst_size: Minimum number of photos to form a burst
        """
        self.interval_seconds = interval_seconds
        self.min_burst_size = min_burst_size

    def detect_bursts(self, photos: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Detect burst sequences in photos.

        Args:
            photos: List of photo dicts with 'id' and 'timestamp' keys

        Returns:
            List of burst sequences, each sequence is a list of photos
        """
        if not photos:
            return []

        # Sort by timestamp
        sorted_photos = sorted(photos, key=lambda p: p['timestamp'])

        bursts = []
        current_burst = [sorted_photos[0]]

        for i in range(1, len(sorted_photos)):
            current_photo = sorted_photos[i]
            previous_photo = sorted_photos[i-1]

            # Calculate time difference
            time_diff = (current_photo['timestamp'] - previous_photo['timestamp']).total_seconds()

            if time_diff <= self.interval_seconds:
                # Part of current burst
                current_burst.append(current_photo)
            else:
                # End of burst, start new one
                if len(current_burst) >= self.min_burst_size:
                    bursts.append(current_burst)
                current_burst = [current_photo]

        # Check final burst
        if len(current_burst) >= self.min_burst_size:
            bursts.append(current_burst)

        return bursts

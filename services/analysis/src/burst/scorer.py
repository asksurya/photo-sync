from typing import List, Dict, Any, Optional


class BurstScorer:
    """Scores burst sequences and recommends best shot."""

    def recommend_best_shot(self, burst: List[Dict[str, Any]]) -> Optional[str]:
        """
        Recommend the best photo from a burst sequence.

        Uses quality_score to pick the sharpest, best-exposed shot.

        Args:
            burst: List of photo dicts with 'id' and 'quality_score' keys

        Returns:
            ID of recommended photo, or None if burst is empty
        """
        if not burst:
            return None

        # Find photo with highest quality score
        best_photo = max(burst, key=lambda p: p.get('quality_score', 0))

        return best_photo['id']

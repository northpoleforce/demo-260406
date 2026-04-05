from __future__ import annotations

from typing import Optional

def is_urge_intent(text: str, confidence: Optional[float], threshold: float = 0.75) -> bool:
    if confidence is not None and confidence < threshold:
        return False
    lowered = text.lower()
    keywords = ["催", "快点", "还没上", "urge", "hurry", "where is my"]
    return any(k in lowered for k in keywords)

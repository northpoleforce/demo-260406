from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class AsrResult:
    text: str
    confidence: Optional[float]
    provider: str
    latency_ms: int
    success: bool
    error_code: Optional[str] = None


class AsrClient:
    """MVP adapter placeholder for cloud ASR provider."""

    def __init__(self, provider: str) -> None:
        self.provider = provider

    async def transcribe(self, _audio_bytes: bytes) -> AsrResult:
        # Placeholder for real provider integration.
        return AsrResult(
            text="我要催单",
            confidence=0.92,
            provider=self.provider,
            latency_ms=180,
            success=True,
        )

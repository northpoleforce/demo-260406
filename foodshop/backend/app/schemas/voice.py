from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class AsrCallbackRequest(BaseModel):
    request_id: str
    table_id: str
    order_id: str
    text: str
    confidence: Optional[float] = None
    provider: str
    latency_ms: int = 0

from __future__ import annotations

from pydantic import BaseModel


class SnapshotResponse(BaseModel):
    orders: list[dict]
    timestamp: str
    is_full: bool

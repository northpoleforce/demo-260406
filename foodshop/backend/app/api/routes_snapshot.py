from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from api.deps import get_repo
from infra.auth import verify_token
from infra.repositories import OrderRepository
from schemas.snapshot import SnapshotResponse

router = APIRouter(prefix="/api/v1")


@router.get("/snapshot", response_model=SnapshotResponse, dependencies=[Depends(verify_token)])
def get_snapshot(
    since: Optional[str] = Query(default=None),
    repo: OrderRepository = Depends(get_repo),
) -> SnapshotResponse:
    orders = repo.list_orders(since)
    return SnapshotResponse(
        orders=orders,
        timestamp=datetime.now(timezone.utc).isoformat(),
        is_full=since is None,
    )

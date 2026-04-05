from __future__ import annotations

from fastapi import APIRouter, Depends

from api.deps import get_bus, get_repo
from domain.voice_intent import is_urge_intent
from infra.auth import verify_token
from infra.event_bus import EventBus
from infra.repositories import OrderRepository
from schemas.voice import AsrCallbackRequest

from api.routes_orders import _event

router = APIRouter(prefix="/api/v1/voice")


@router.post("/asr/callback", dependencies=[Depends(verify_token)])
async def asr_callback(
    body: AsrCallbackRequest,
    repo: OrderRepository = Depends(get_repo),
    bus: EventBus = Depends(get_bus),
) -> dict:
    repo.conn.execute(
        """INSERT INTO asr_calls(call_id, request_id, table_id, provider, latency_ms, success, error_code, created_at)
           VALUES(?,?,?,?,?,?,?,datetime('now'))""",
        (f"call-{body.request_id}", body.request_id, body.table_id, body.provider, body.latency_ms, 1, None),
    )
    repo.conn.commit()

    if not is_urge_intent(body.text, body.confidence):
        return {"received": True, "accepted": False, "reason": "non-urge-intent"}

    order = repo.mark_urge(body.order_id)
    if not order:
        return {"received": True, "accepted": False, "reason": "order-not-found"}

    urge = repo.insert_urge_event(
        order_id=body.order_id,
        table_id=body.table_id,
        source="voice",
        request_id=body.request_id,
        confidence=body.confidence,
    )
    await bus.publish(_event("urge.created", {"urge": urge, "order": order}))
    return {"received": True, "accepted": True}

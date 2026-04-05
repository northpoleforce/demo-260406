from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from api.deps import get_bus, get_repo
from domain.order_service import VersionConflictError, apply_state_change
from domain.state_machine import InvalidTransitionError
from infra.auth import verify_token
from infra.event_bus import EventBus
from infra.repositories import OrderRepository
from schemas.orders import CreateOrderRequest, ItemStateChangeRequest, StateChangeRequest, UrgeRequest

router = APIRouter(prefix="/api/v1")


def _event(event_type: str, data: dict) -> dict:
    return {
        "type": event_type,
        "event_id": f"evt-{uuid.uuid4().hex[:16]}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }


@router.post("/orders/{order_id}/state", dependencies=[Depends(verify_token)])
async def update_state(
    order_id: str,
    body: StateChangeRequest,
    repo: OrderRepository = Depends(get_repo),
    bus: EventBus = Depends(get_bus),
) -> dict:
    order = repo.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="order not found")

    try:
        apply_state_change(order, body.target_state, body.version)
    except VersionConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    updated = repo.update_order_state(order_id, body.target_state.value, body.version)
    if not updated:
        raise HTTPException(status_code=409, detail="version conflict")

    repo.insert_audit_log(body.operator, "order.state.update", {"order_id": order_id, "target_state": body.target_state.value})
    await bus.publish(_event("order.updated", {"order": updated}))
    return updated


@router.post("/orders", dependencies=[Depends(verify_token)])
async def create_order(
    body: CreateOrderRequest,
    repo: OrderRepository = Depends(get_repo),
    bus: EventBus = Depends(get_bus),
) -> dict:
    created = repo.create_order(body.table_id, [item.model_dump() for item in body.items])
    repo.insert_audit_log("table-ui", "order.create", {"order_id": created["order_id"], "table_id": body.table_id})
    await bus.publish(_event("order.updated", {"order": created}))
    return created


@router.post("/orders/{order_id}/urge", dependencies=[Depends(verify_token)])
async def create_urge(
    order_id: str,
    body: UrgeRequest,
    repo: OrderRepository = Depends(get_repo),
    bus: EventBus = Depends(get_bus),
) -> dict:
    order = repo.mark_urge(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="order not found")

    request_id = body.request_id or f"req-{uuid.uuid4().hex[:16]}"
    urge = repo.insert_urge_event(order_id, order["table_id"], body.source, request_id, body.confidence)
    repo.insert_audit_log("system", "order.urge.create", {"order_id": order_id, "request_id": request_id})
    await bus.publish(_event("urge.created", {"urge": urge, "order": order}))
    return {"accepted": True, "reason": None}


@router.post("/orders/{order_id}/items/{item_id}/state", dependencies=[Depends(verify_token)])
async def update_item_state(
    order_id: str,
    item_id: str,
    body: ItemStateChangeRequest,
    repo: OrderRepository = Depends(get_repo),
    bus: EventBus = Depends(get_bus),
) -> dict:
    try:
        updated = repo.update_order_item_state(order_id, item_id, body.target_state.value)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if not updated:
        raise HTTPException(status_code=404, detail="order or item not found")

    repo.insert_audit_log(
        body.operator,
        "order.item.state.update",
        {"order_id": order_id, "item_id": item_id, "target_state": body.target_state.value},
    )
    await bus.publish(_event("order.updated", {"order": updated}))
    return updated

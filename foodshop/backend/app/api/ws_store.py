from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

router = APIRouter()


@router.websocket("/ws/store/{store_id}")
async def ws_store(
    websocket: WebSocket,
    store_id: str,
    since_event_id: Optional[str] = Query(default=None),
) -> None:
    bus = websocket.app.state.bus
    _ = store_id
    await bus.connect(websocket)
    await bus.replay_since(websocket, since_event_id)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        bus.disconnect(websocket)

from __future__ import annotations

from collections import deque
from typing import Any, Optional

from fastapi import WebSocket


class EventBus:
    def __init__(self, replay_size: int = 2000) -> None:
        self.connections: set[WebSocket] = set()
        self.replay = deque(maxlen=replay_size)

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.connections.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.connections.discard(ws)

    async def publish(self, event: dict[str, Any]) -> None:
        self.replay.append(event)
        dead: list[WebSocket] = []
        for conn in self.connections:
            try:
                await conn.send_json(event)
            except Exception:
                dead.append(conn)
        for conn in dead:
            self.disconnect(conn)

    async def replay_since(self, ws: WebSocket, since_event_id: Optional[str]) -> None:
        if not since_event_id:
            return
        found = False
        for event in self.replay:
            if found:
                await ws.send_json(event)
            elif event.get("event_id") == since_event_id:
                found = True

from __future__ import annotations

import sqlite3

from fastapi import Request

from infra.event_bus import EventBus
from infra.repositories import OrderRepository


def get_repo(request: Request) -> OrderRepository:
    conn: sqlite3.Connection = request.app.state.conn
    return OrderRepository(conn)


def get_bus(request: Request) -> EventBus:
    return request.app.state.bus

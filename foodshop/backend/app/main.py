from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes_health import router as health_router
from api.routes_orders import router as orders_router
from api.routes_snapshot import router as snapshot_router
from api.routes_voice import router as voice_router
from api.ws_store import router as ws_router
from infra.db import get_conn, init_db
from infra.event_bus import EventBus
from infra.logging import configure_logging
from infra.repositories import OrderRepository
from infra.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    conn = get_conn()
    init_db(conn)
    repo = OrderRepository(conn)
    repo.ensure_seed()
    app.state.conn = conn
    app.state.bus = EventBus(replay_size=2000)
    yield
    conn.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # 后厨平板前端（Vite）
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # 电子纸 UI 前端（Next.js）
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        # 电子纸渲染服务（Node / Puppeteer）
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # 保留旧地址兼容
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(health_router)
app.include_router(snapshot_router)
app.include_router(orders_router)
app.include_router(voice_router)
app.include_router(ws_router)

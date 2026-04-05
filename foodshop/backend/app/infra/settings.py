from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("APP_NAME", "foodshop-backend")
    db_path: str = os.getenv("DB_PATH", "backend/data/foodshop.db")
    api_prefix: str = "/api/v1"
    allowed_tokens: tuple[str, ...] = tuple(
        t.strip() for t in os.getenv("DEVICE_TOKENS", "kitchen-tablet-001").split(",") if t.strip()
    )
    asr_provider: str = os.getenv("ASR_PROVIDER", "mock-asr")


settings = Settings()

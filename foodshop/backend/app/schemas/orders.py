from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from domain.state_machine import OrderState


class StateChangeRequest(BaseModel):
    target_state: OrderState
    operator: str = Field(min_length=1)
    version: int = Field(ge=1)


class UrgeRequest(BaseModel):
    source: str = "voice"
    confidence: Optional[float] = None
    request_id: Optional[str] = None
    asr_provider: Optional[str] = None
    asr_latency_ms: Optional[int] = None


class CreateOrderItemRequest(BaseModel):
    dish_name: str = Field(min_length=1)
    qty: int = Field(ge=1)


class CreateOrderRequest(BaseModel):
    table_id: str = Field(min_length=1)
    items: list[CreateOrderItemRequest] = Field(min_length=1)


class ItemStateChangeRequest(BaseModel):
    target_state: OrderState
    operator: str = Field(min_length=1)

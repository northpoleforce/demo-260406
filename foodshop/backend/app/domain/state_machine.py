from __future__ import annotations

from enum import Enum


class OrderState(str, Enum):
    QUEUED = "queued"
    COOKING = "cooking"
    READY = "ready"
    SERVED = "served"


class InvalidTransitionError(ValueError):
    pass


_VALID_NEXT = {
    OrderState.QUEUED: OrderState.COOKING,
    OrderState.COOKING: OrderState.READY,
    OrderState.READY: OrderState.SERVED,
    OrderState.SERVED: None,
}


def validate_transition(current: OrderState, target: OrderState) -> None:
    expected = _VALID_NEXT[current]
    if expected != target:
        raise InvalidTransitionError(f"invalid transition: {current.value} -> {target.value}")

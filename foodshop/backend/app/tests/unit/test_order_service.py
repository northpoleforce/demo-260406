import pytest

from domain.state_machine import OrderState
from domain.order_service import VersionConflictError, apply_state_change


def test_applies_state_change_and_increments_version() -> None:
    order = {
        "order_id": "ord-1",
        "current_state": OrderState.QUEUED.value,
        "version": 2,
    }
    updated = apply_state_change(order, OrderState.COOKING, expected_version=2)
    assert updated["current_state"] == OrderState.COOKING.value
    assert updated["version"] == 3


def test_raises_on_version_conflict() -> None:
    order = {
        "order_id": "ord-1",
        "current_state": OrderState.COOKING.value,
        "version": 3,
    }
    with pytest.raises(VersionConflictError):
        apply_state_change(order, OrderState.READY, expected_version=2)

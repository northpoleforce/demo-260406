from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict

from domain.state_machine import OrderState, validate_transition


class VersionConflictError(ValueError):
    pass


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def apply_state_change(order: Dict[str, Any], target: OrderState, expected_version: int) -> Dict[str, Any]:
    if order["version"] != expected_version:
        raise VersionConflictError("version conflict")

    current = OrderState(order["current_state"])
    validate_transition(current, target)

    updated = deepcopy(order)
    updated["current_state"] = target.value
    updated["version"] = int(updated["version"]) + 1
    updated["updated_at"] = _utc_now()
    return updated

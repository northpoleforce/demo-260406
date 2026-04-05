import pytest

from domain.state_machine import OrderState, InvalidTransitionError, validate_transition


def test_allows_linear_transition_from_queued_to_cooking() -> None:
    validate_transition(OrderState.QUEUED, OrderState.COOKING)


def test_rejects_invalid_transition_from_queued_to_ready() -> None:
    with pytest.raises(InvalidTransitionError):
        validate_transition(OrderState.QUEUED, OrderState.READY)


def test_rejects_transition_from_served_to_any_next_state() -> None:
    with pytest.raises(InvalidTransitionError):
        validate_transition(OrderState.SERVED, OrderState.COOKING)

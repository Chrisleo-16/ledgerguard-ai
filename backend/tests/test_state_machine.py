from datetime import date
import pytest
from app.state_machine import time_state, transition, InvalidTransition

D = date(2026, 11, 10)
@pytest.mark.parametrize("today,expected", [
    (date(2026, 11, 1), "sent"), (date(2026, 11, 7), "due_soon"), (date(2026, 11, 10), "due"),
    (date(2026, 11, 12), "due"), (date(2026, 11, 13), "overdue_3"), (date(2026, 11, 17), "overdue_7")])
def test_time_states(today, expected):
    assert time_state(D, today) == expected

def test_transitions():
    assert transition("draft", "send", D, date(2026, 11, 1)) == "sent"
    assert transition("overdue_7", "pay") == "paid"
    assert transition("paid", "pay") == "paid"
    assert transition("paid", "tick", D, date(2026, 12, 1)) == "paid"
    assert transition("draft", "tick", D, date(2026, 12, 1)) == "draft"
    with pytest.raises(InvalidTransition): transition("sent", "send")
    with pytest.raises(InvalidTransition): transition("draft", "pay")
    with pytest.raises(InvalidTransition): transition("paid", "cancel")

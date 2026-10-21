"""Invoice lifecycle: draft -> sent -> due_soon -> due -> overdue_3 -> overdue_7 ; any open -> paid."""
from datetime import date

STATES = ["draft", "sent", "due_soon", "due", "overdue_3", "overdue_7", "paid", "cancelled"]
OPEN_STATES = {"sent", "due_soon", "due", "overdue_3", "overdue_7"}
TERMINAL = {"paid", "cancelled"}
DUE_SOON_DAYS = 3

class InvalidTransition(Exception):
    pass

def time_state(due: date, today: date) -> str:
    """Date-derived state for a sent, unpaid invoice."""
    delta = (today - due).days
    if delta >= 7: return "overdue_7"
    if delta >= 3: return "overdue_3"
    if delta >= 0: return "due"
    if -delta <= DUE_SOON_DAYS: return "due_soon"
    return "sent"

def evaluate(status: str, due: date, today: date) -> str:
    if status in TERMINAL or status == "draft":
        return status
    return time_state(due, today)

def transition(status: str, event: str, due: date | None = None, today: date | None = None) -> str:
    if event == "send":
        if status != "draft": raise InvalidTransition(f"cannot send from {status}")
        return time_state(due, today) if due and today else "sent"
    if event == "pay":
        if status == "paid": return "paid"  # idempotent
        if status not in OPEN_STATES: raise InvalidTransition(f"cannot pay from {status}")
        return "paid"
    if event == "cancel":
        if status in TERMINAL: raise InvalidTransition(f"cannot cancel from {status}")
        return "cancelled"
    if event == "tick":
        return evaluate(status, due, today)
    raise InvalidTransition(f"unknown event {event}")

def days_overdue(due: date, today: date) -> int:
    return max(0, (today - due).days)

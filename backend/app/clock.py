"""Dev clock: real date + offset stored in settings (time-travel for demos)."""
from datetime import date, timedelta
from .db import Setting

def offset_days(s) -> int:
    row = s.get(Setting, "clock_offset_days")
    return int(row.value) if row else 0

def today(s) -> date:
    return date.today() + timedelta(days=offset_days(s))

def advance(s, days: int) -> date:
    row = s.get(Setting, "clock_offset_days")
    if not row:
        row = Setting(key="clock_offset_days", value="0"); s.add(row)
    row.value = str(int(row.value) + days)
    s.commit()
    return today(s)

def reset(s) -> date:
    row = s.get(Setting, "clock_offset_days")
    if row:
        row.value = "0"; s.commit()
    return today(s)

import pytest
from pydantic import ValidationError
from app.filters import FilterSpec, apply, summarize, fallback_parse

ROWS = [
    {"number": "1", "client": "Acme", "country": "US", "currency": "USD", "status": "overdue_7", "amount": 3200.0, "days_overdue": 9, "issue_date": "2026-01-01", "due_date": "2026-01-10", "paid_at": None},
    {"number": "2", "client": "Harbor", "country": "US", "currency": "USD", "status": "overdue_3", "amount": 800.0, "days_overdue": 4, "issue_date": "2026-01-01", "due_date": "2026-01-10", "paid_at": None},
    {"number": "3", "client": "Kijani", "country": "KE", "currency": "USD", "status": "paid", "amount": 1500.0, "days_overdue": 0, "issue_date": "2026-01-01", "due_date": "2026-01-10", "paid_at": "2026-01-09"},
]

def test_rejects_unknown_field_and_sql():
    with pytest.raises(ValidationError): FilterSpec.model_validate({"conditions": [{"field": "1; DROP TABLE invoices", "op": "eq", "value": 1}]})
    with pytest.raises(ValidationError): FilterSpec.model_validate({"conditions": [{"field": "amount", "op": "like", "value": 1}]})
    with pytest.raises(ValidationError): FilterSpec.model_validate({"conditions": [{"field": "status", "op": "eq", "value": "bogus"}]})
    with pytest.raises(ValidationError): FilterSpec.model_validate({"conditions": [{"field": "due_date", "op": "gt", "value": "yesterday"}]})
    with pytest.raises(ValidationError): FilterSpec.model_validate({"conditions": [], "limit": 100000})

def test_past_due_over_1000():
    spec = FilterSpec.model_validate(fallback_parse("past-due invoices over $1000", ["Acme"]))
    res = apply(ROWS, spec)
    assert [r["number"] for r in res] == ["1"]
    s = summarize(res)
    assert s["totals_by_currency"] == {"USD": 3200.0} and s["past_due_count"] == 1

def test_country_and_paid():
    spec = FilterSpec.model_validate(fallback_parse("paid invoices from Kenya", []))
    assert [r["number"] for r in apply(ROWS, spec)] == ["3"]

def test_amount_k_suffix_not_confused_with_days():
    spec = fallback_parse("overdue more than 5 days", [])
    assert not any(c["field"] == "amount" for c in spec["conditions"])
    assert [r["number"] for r in apply(ROWS, FilterSpec.model_validate(spec))] == ["1"]
    spec = fallback_parse("invoices under 1k", [])
    assert spec["conditions"] == [{"field": "amount", "op": "lt", "value": 1000.0}]

def test_currency_respected():
    rows = ROWS + [{"number": "4", "client": "Bright", "country": "DE", "currency": "EUR", "status": "overdue_7", "amount": 6500.0,
                    "days_overdue": 10, "issue_date": "2026-01-01", "due_date": "2026-01-10", "paid_at": None}]
    from app.filters import enforce_currency
    f = lambda q: [r["number"] for r in apply(rows, enforce_currency(FilterSpec.model_validate(fallback_parse(q, [])), q))]
    assert f("past-due invoices over $1000") == ["1"]
    assert f("overdue invoices over €1000") == ["4"]
    assert f("past-due over 1000 euros") == ["4"]
    assert sorted(f("past-due invoices over 1000")) == ["1", "4"]  # no currency named => all currencies

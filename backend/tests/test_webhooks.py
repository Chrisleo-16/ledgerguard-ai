from datetime import date, timedelta

def _create(client, days=10):
    due = (date.today() + timedelta(days=days)).isoformat()
    r = client.post("/api/invoices", json={"client_id": 1, "description": "Test work", "amount": 1200, "currency": "USD", "due_date": due})
    assert r.status_code == 200, r.text
    return r.json()

def test_full_invoice_flow(client):
    inv = _create(client)
    assert inv["status"] == "sent" and inv["paypal_id"].startswith("INV2-")
    r = client.post("/api/dev/clock/advance", json={"days": 18}).json()
    rows = {i["id"]: i for i in client.get("/api/invoices").json()}
    assert rows[inv["id"]]["status"] == "overdue_7" and rows[inv["id"]]["days_overdue"] == 8
    rem = client.post(f"/api/invoices/{inv['id']}/reminders").json()
    assert rem["status"] == "draft" and rem["tone"] == "firm" and rem["late_fee"] == 18.0
    res = client.post("/api/dev/simulate/payment", json={"invoice_id": inv["id"]}).json()
    assert res["result"]["new_status"] == "paid" and res["result"]["reminders_cancelled"] == 1
    rems = [x for x in client.get("/api/reminders").json() if x["id"] == rem["id"]]
    assert rems[0]["status"] == "cancelled"
    # duplicate delivery is idempotent
    assert client.post("/api/webhooks/paypal", json=res["event"]).json()["status"] == "duplicate"

def test_capture_completed_marks_paid(client):
    inv = _create(client)
    res = client.post("/api/dev/simulate/payment", json={"invoice_id": inv["id"], "event_type": "PAYMENT.CAPTURE.COMPLETED"}).json()
    assert res["result"]["new_status"] == "paid"

def test_dispute_package_and_submit(client):
    invs = client.get("/api/invoices").json()
    b = next(i for i in invs if i["client"] == "Brightwave GmbH" and i["status"] != "paid")
    res = client.post("/api/dev/simulate/dispute", json={"invoice_id": b["id"]}).json()
    assert res["result"]["dispute_status"] == "package_ready"
    d = client.get("/api/disputes").json()[0]
    pkg = d["package"]
    assert len(pkg["timeline"]) >= 4 and pkg["milestone_refs"] and pkg["statement"]
    dates = [t["date"] for t in pkg["timeline"]]
    assert dates == sorted(dates)
    assert d["status"] == "package_ready"  # nothing submitted without approval
    r = client.post(f"/api/disputes/{d['id']}/submit-evidence").json()
    assert r["dispute"]["status"] == "submitted"
    assert client.post(f"/api/disputes/{d['id']}/submit-evidence").status_code == 409

def test_unknown_event_ignored(client):
    r = client.post("/api/webhooks/paypal", json={"id": "WH-X", "event_type": "BILLING.PLAN.CREATED", "resource": {}}).json()
    assert r["status"] == "ignored"

def test_nl_query(client):
    client.post("/api/dev/clock/advance", json={"days": 10})
    r = client.post("/api/ledger/query", json={"question": "past-due invoices over $1000"}).json()
    assert r["rows"] and all(x["amount"] > 1000 and x["days_overdue"] > 0 for x in r["rows"])
    assert r["summary"]["count"] == len(r["rows"])

def test_sync_polls_paypal_status(client):
    from app.paypal import get_paypal
    inv = _create(client)
    client.post("/api/dev/clock/advance", json={"days": 15})
    client.post(f"/api/invoices/{inv['id']}/reminders")
    assert client.post("/api/paypal/sync").json()["paid"] == []
    get_paypal().mark_paid(inv["paypal_id"])
    r = client.post("/api/paypal/sync").json()
    assert r["paid"] == [{"invoice": inv["number"], "paypal_status": "PAID", "reminders_cancelled": 1}]
    assert client.get(f"/api/paypal/invoices/{inv['id']}").json()["status"] == "PAID"

def test_summary_exact(client):
    inv = _create(client, days=-1)  # already due
    client.post("/api/dev/clock/advance", json={"days": 1})
    s = client.get("/api/summary").json()
    rows = client.get("/api/invoices").json()
    open_usd = round(sum(r["amount"] for r in rows if r["currency"] == "USD" and r["status"] not in ("paid", "draft", "cancelled")), 2)
    assert s["outstanding"]["totals"]["USD"] == open_usd
    client.post("/api/dev/simulate/payment", json={"invoice_id": inv["id"]})
    s2 = client.get("/api/summary").json()
    assert s2["outstanding"]["totals"]["USD"] == round(open_usd - 1200, 2)
    assert s2["paid_this_month"]["count"] == s["paid_this_month"]["count"] + 1


def test_evidence_summary_and_activity(client):
    ev = client.get("/api/evidence/summary").json()
    bw = next(r for r in ev if r["client"] == "Brightwave GmbH")
    assert bw["total"] == 6 and bw["contract"] == 1 and bw["milestone"] == 1 and bw["delivery"] == 1 and bw["message"] == 2 and bw["file"] == 1
    inv = _create(client)
    client.post("/api/dev/simulate/payment", json={"invoice_id": inv["id"]})
    act = client.get("/api/activity").json()
    assert act[0]["event_type"] == "INVOICING.INVOICE.PAID" and act[0]["ref"] == inv["number"]

def test_reminder_exposes_applied_fee_pct(client):
    # the UI footer reads reasoning.late_fee_pct; it must match the stored fee exactly
    inv = _create(client)
    client.post("/api/dev/clock/advance", json={"days": 18})
    rem = client.post(f"/api/invoices/{inv['id']}/reminders").json()
    pct = rem["reasoning"]["late_fee_pct"]
    assert rem["late_fee"] == round(1200 * pct / 100, 2) and pct == 1.5

def test_frontend_has_no_hardcoded_fee_pct():
    import pathlib, re
    root = pathlib.Path(__file__).resolve().parents[2] / "frontend"
    for f in list((root / "app").rglob("*.tsx")) + list((root / "components").rglob("*.tsx")):
        assert not re.search(r"\(\s*1\.5\s*%\s*\)", f.read_text()), f"hard-coded fee percent in {f}"

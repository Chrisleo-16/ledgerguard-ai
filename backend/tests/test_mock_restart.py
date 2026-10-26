"""Regression: the mock PayPal keeps state in memory, which a restart/sleep (or a second worker) loses
while the DB still holds the ids. Every demo action must keep working afterwards."""
from app.paypal import get_paypal

def _restart():
    get_paypal().reset()

def test_seed_creates_demo_disputes_with_packages(client):
    ds = client.get("/api/disputes").json()
    seeded = [d for d in ds if d["paypal_dispute_id"].startswith("PP-D-SEED")]
    assert len(seeded) == 2 and all(d["status"] == "package_ready" for d in seeded)
    s = client.get("/api/summary").json()["open_disputes"]
    assert s["count"] == 2 and s["awaiting_approval"] == 2 and s["totals"]

def test_send_seeded_draft_after_restart(client):
    _restart()
    draft = next(i for i in client.get("/api/invoices").json() if i["status"] == "draft")
    r = client.post(f"/api/invoices/{draft['id']}/send")
    assert r.status_code == 200, r.text
    assert r.json()["status"] != "draft"

def test_created_invoice_survives_restart(client):
    from datetime import date, timedelta
    inv = client.post("/api/invoices", json={"client_id": 1, "description": "x", "amount": 10, "currency": "USD",
                                            "due_date": (date.today() + timedelta(days=9)).isoformat(), "send": False}).json()
    _restart()
    assert client.post(f"/api/invoices/{inv['id']}/send").status_code == 200
    _restart()
    got = client.get(f"/api/paypal/invoices/{inv['id']}")
    assert got.status_code == 200 and got.json()["status"] == "SENT"

def test_dispute_fetch_submit_and_sync_after_restart(client):
    _restart()
    assert {d["dispute_id"] for d in client.get("/api/paypal/disputes").json()} >= {"PP-D-SEED0001", "PP-D-SEED0002"}
    assert get_paypal().get_dispute("PP-D-SEED0001")["reason"]
    d = next(x for x in client.get("/api/disputes").json() if x["paypal_dispute_id"] == "PP-D-SEED0001")
    _restart()
    r = client.post(f"/api/disputes/{d['id']}/submit-evidence")
    assert r.status_code == 200, r.text
    _restart()
    sync = client.post("/api/paypal/sync")
    assert sync.status_code == 200 and sync.json()["errors"] == [] and sync.json()["new_disputes"] == []

def test_simulated_dispute_survives_restart(client):
    b = next(i for i in client.get("/api/invoices").json() if i["client"] == "Harbor & Pine LLC" and i["status"] != "paid")
    res = client.post("/api/dev/simulate/dispute", json={"invoice_id": b["id"]}).json()
    _restart()
    d = next(x for x in client.get("/api/disputes").json() if x["paypal_dispute_id"] == res["event"]["resource"]["dispute_id"])
    assert client.post(f"/api/disputes/{d['id']}/submit-evidence").status_code == 200

def test_paypal_error_is_human_readable(client):
    r = client.get("/api/paypal/invoices/999999")
    assert r.status_code == 404
    from app import paypal
    try: get_paypal().get_invoice("INV2-NOPE")
    except paypal.PayPalError as e: assert e.status == 404

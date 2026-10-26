"""The central error mapper: every user-facing error is plain words with a next step, never raw codes/JSON."""
import re, pytest
from app import errors as E

RAW = re.compile(r"PayPal error|\bHTTP\b|\b[45]\d\d\b|[{}\[\]]|RESOURCE_NOT_FOUND|Traceback|Exception")

def _plain(ue):
    for f in (ue.title, ue.message, ue.action):
        assert f and not RAW.search(f), f
    assert ue.action.rstrip().endswith((".", "”")) and ue.code

@pytest.mark.parametrize("st,code", [(0, "paypal_unreachable"), (401, "paypal_auth"), (403, "paypal_auth"), (404, "paypal_not_found"),
    (409, "paypal_conflict"), (422, "paypal_rejected"), (429, "paypal_rate_limited"), (500, "paypal_unavailable"), (503, "paypal_unavailable"), (504, "paypal_unreachable")])
def test_paypal_statuses(st, code):
    ue = E.from_paypal(st, "sync with PayPal"); _plain(ue); assert ue.code == code

def test_paypal_timeout_wording():
    ue = E.from_paypal(0, "sync with PayPal")
    assert ue.title == "Couldn't reach PayPal right now." and "temporary" in ue.message and ue.action == "Try Sync again in a minute."

def test_action_titles():
    assert E.action_for("POST", "/api/invoices/4/send") == "send the invoice"
    assert E.from_paypal(404, E.action_for("POST", "/api/invoices/4/send")).title == "Couldn't send the invoice."

def test_llm_and_unexpected_and_validation():
    for ue in (E.from_llm("draft the reminder"), E.unexpected("load this page"),
               E.validation([{"loc": ["body", "due_date"], "msg": "x"}], "create the invoice")):
        _plain(ue)
    assert "due date" in E.validation([{"loc": ["body", "due_date"]}], "x").message

def test_http_mappings():
    assert E.from_http(400, "webhook signature verification failed", "accept the PayPal notification").code == "webhook_signature"
    assert E.from_http(422, "question could not be parsed", "answer that question").code == "ledger_unanswerable"
    assert E.from_http(409, "cannot send: invoice is paid", "send the invoice").message.startswith("This invoice is already paid")
    for st, d in [(400, "webhook signature verification failed"), (409, "reminder not in draft"), (404, "invoice not found"),
                  (400, "{'x': 1} ValueError"), (500, "boom")]:
        _plain(E.from_http(st, d, "finish that"))

def test_api_returns_structured_errors(client):
    r = client.get("/api/paypal/invoices/999999"); j = r.json()
    assert set(j["error"]) == {"title", "message", "action", "code"} and "PayPal error" not in r.text.split('"debug"')[0]
    r = client.post("/api/webhooks/paypal", json={"event_type": "X"}, headers={"paypal-transmission-sig": "bad"})
    if r.status_code == 400: assert r.json()["error"]["code"] == "webhook_signature"
    r = client.post("/api/invoices", json={"client_id": 1})
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_input"
    r = client.post("/api/ledger/query", json={"question": "   "})
    assert r.json()["error"]["code"] == "ledger_unanswerable"

def test_paypal_failure_via_api(client, monkeypatch):
    from app.paypal import get_paypal, PayPalError
    def boom(*a, **k): raise PayPalError(503, {"name": "INTERNAL"})
    monkeypatch.setattr(get_paypal(), "get_invoice", boom)
    inv = next(i for i in client.get("/api/invoices").json() if i["status"] != "draft")
    r = client.get(f"/api/paypal/invoices/{inv['id']}")
    assert r.status_code == 503 and r.json()["error"]["title"] == "PayPal is having trouble right now."

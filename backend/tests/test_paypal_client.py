import httpx
from app.paypal import SandboxPayPalClient

def test_backoff_and_oauth():
    calls = {"n": 0}
    def handler(req: httpx.Request):
        if req.url.path == "/v1/oauth2/token":
            assert req.headers["authorization"].startswith("Basic ")
            return httpx.Response(200, json={"access_token": "T", "expires_in": 3600})
        calls["n"] += 1
        if calls["n"] < 3:
            return httpx.Response(429 if calls["n"] == 1 else 503)
        assert req.headers["authorization"] == "Bearer T"
        return httpx.Response(201, json={"rel": "self", "href": "https://api-m.sandbox.paypal.com/v2/invoicing/invoices/INV2-ABC"})
    sleeps = []
    c = SandboxPayPalClient("id", "secret", transport=httpx.MockTransport(handler), sleep=sleeps.append)
    assert c.create_invoice({})["id"] == "INV2-ABC"
    # Exponential backoff 0.5 * 2**attempt plus up to 0.25 s jitter. Check the documented ranges rather than a
    # ratio between two jittered values (that ratio check failed whenever jitter on the first delay was large).
    assert len(sleeps) == 2
    assert 0.5 <= sleeps[0] <= 0.75 and 1.0 <= sleeps[1] <= 1.25

def test_backoff_doubles_without_jitter(monkeypatch):
    import app.paypal as pp
    monkeypatch.setattr(pp.random, "uniform", lambda a, b: 0.0)
    n = {"i": 0}
    def handler(req):
        if req.url.path == "/v1/oauth2/token": return httpx.Response(200, json={"access_token": "T", "expires_in": 3600})
        n["i"] += 1
        return httpx.Response(503) if n["i"] < 4 else httpx.Response(201, json={"href": "https://x/v2/invoicing/invoices/INV2-Z"})
    sleeps = []
    SandboxPayPalClient("id", "s", transport=httpx.MockTransport(handler), sleep=sleeps.append).create_invoice({})
    assert sleeps == [0.5, 1.0, 2.0]

def test_retry_after_header_is_honoured():
    n = {"i": 0}
    def handler(req):
        if req.url.path == "/v1/oauth2/token": return httpx.Response(200, json={"access_token": "T", "expires_in": 3600})
        n["i"] += 1
        return httpx.Response(429, headers={"Retry-After": "7"}) if n["i"] == 1 else httpx.Response(201, json={"href": "https://x/v2/invoicing/invoices/INV2-Y"})
    sleeps = []
    SandboxPayPalClient("id", "s", transport=httpx.MockTransport(handler), sleep=sleeps.append).create_invoice({})
    assert sleeps == [7.0]

def test_verify_signature_request():
    def handler(req):
        if req.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "T", "expires_in": 3600})
        import json; b = json.loads(req.content)
        assert b["webhook_id"] == "WH1" and b["transmission_id"] == "t1"
        return httpx.Response(200, json={"verification_status": "SUCCESS"})
    c = SandboxPayPalClient("id", "s", webhook_id="WH1", transport=httpx.MockTransport(handler), sleep=lambda x: None)
    h = {"PAYPAL-AUTH-ALGO": "SHA256withRSA", "PAYPAL-CERT-URL": "https://x", "PAYPAL-TRANSMISSION-ID": "t1",
         "PAYPAL-TRANSMISSION-SIG": "sig", "PAYPAL-TRANSMISSION-TIME": "now"}
    assert c.verify_webhook_signature(h, {"id": "e"}) is True
    assert c.verify_webhook_signature({}, {"id": "e"}) is False

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
    assert len(sleeps) == 2 and sleeps[1] > sleeps[0] * 1.5

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

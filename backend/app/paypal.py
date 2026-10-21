"""PayPal REST client (sandbox) + faithful mock with the same interface."""
from __future__ import annotations
import json, random, time, uuid
from typing import Any, Protocol
import httpx
from . import config

RETRY_STATUSES = {429, 500, 502, 503, 504}

class PayPalError(Exception):
    def __init__(self, status: int, body: Any):
        super().__init__(f"PayPal API error {status}: {body}")
        self.status, self.body = status, body

class PayPalClient(Protocol):
    mode: str
    def create_invoice(self, invoice: dict) -> dict: ...
    def send_invoice(self, invoice_id: str, note: str | None = None) -> dict: ...
    def get_invoice(self, invoice_id: str) -> dict: ...
    def get_dispute(self, dispute_id: str) -> dict: ...
    def list_disputes(self, page_size: int = 20) -> list[dict]: ...
    def provide_evidence(self, dispute_id: str, evidences: list[dict], files: list[tuple[str, bytes]] | None = None) -> dict: ...
    def verify_webhook_signature(self, headers: dict, event: dict) -> bool: ...

def build_invoice_payload(number: str, merchant_email: str, client_name: str, client_email: str,
                          description: str, amount: float, currency: str, issue_date: str, due_date: str) -> dict:
    """Body for POST /v2/invoicing/invoices."""
    return {
        "detail": {"invoice_number": number, "currency_code": currency, "invoice_date": issue_date,
                   "payment_term": {"due_date": due_date}, "note": "Thank you for your business."},
        # invoicer.email_address omitted when blank: PayPal then defaults to the REST app's business account
        "invoicer": {"name": {"given_name": config.MERCHANT_NAME}, **({"email_address": merchant_email} if merchant_email else {})},
        "primary_recipients": [{"billing_info": {"name": {"full_name": client_name}, "email_address": client_email}}],
        "items": [{"name": description[:200] or "Services", "quantity": "1",
                   "unit_amount": {"currency_code": currency, "value": f"{amount:.2f}"}, "unit_of_measure": "AMOUNT"}],
    }

class SandboxPayPalClient:
    mode = "sandbox"

    def __init__(self, client_id: str, secret: str, base_url: str = config.PAYPAL_BASE_URL,
                 webhook_id: str = config.PAYPAL_WEBHOOK_ID, max_retries: int = 5, transport=None, sleep=time.sleep):
        self.client_id, self.secret, self.base_url, self.webhook_id = client_id, secret, base_url.rstrip("/"), webhook_id
        self.max_retries, self._sleep = max_retries, sleep
        self._http = httpx.Client(base_url=self.base_url, timeout=30, transport=transport)
        self._token: str | None = None
        self._token_exp = 0.0

    def _get_token(self) -> str:
        if self._token and time.time() < self._token_exp - 60:
            return self._token
        r = self._request_raw("POST", "/v1/oauth2/token", auth=(self.client_id, self.secret),
                              data={"grant_type": "client_credentials"},
                              headers={"Accept": "application/json"})
        body = r.json()
        self._token, self._token_exp = body["access_token"], time.time() + int(body.get("expires_in", 3000))
        return self._token

    def _request_raw(self, method, path, **kw) -> httpx.Response:
        for attempt in range(self.max_retries + 1):
            r = self._http.request(method, path, **kw)
            if r.status_code in RETRY_STATUSES and attempt < self.max_retries:
                ra = r.headers.get("Retry-After")
                delay = float(ra) if ra and ra.isdigit() else min(30, 0.5 * 2 ** attempt) + random.uniform(0, 0.25)
                self._sleep(delay)
                continue
            if r.status_code >= 400:
                try: body = r.json()
                except Exception: body = r.text
                raise PayPalError(r.status_code, body)
            return r
        raise PayPalError(599, "retries exhausted")

    def _api(self, method, path, json_body=None, **kw) -> dict:
        headers = {"Authorization": f"Bearer {self._get_token()}", "Content-Type": "application/json",
                   "PayPal-Request-Id": str(uuid.uuid4()), **kw.pop("headers", {})}
        if "files" in kw: headers.pop("Content-Type")
        r = self._request_raw(method, path, json=json_body, headers=headers, **kw)
        return r.json() if r.content else {}

    def create_invoice(self, invoice: dict) -> dict:
        res = self._api("POST", "/v2/invoicing/invoices", invoice)
        inv_id = res.get("id") or res.get("href", "").rstrip("/").split("/")[-1]
        return {"id": inv_id, "status": res.get("status", "DRAFT"), "raw": res}

    def send_invoice(self, invoice_id: str, note: str | None = None) -> dict:
        body = {"send_to_invoicer": True, "send_to_recipient": True}
        if note: body["note"] = note
        return self._api("POST", f"/v2/invoicing/invoices/{invoice_id}/send", body)

    def get_invoice(self, invoice_id: str) -> dict:
        return self._api("GET", f"/v2/invoicing/invoices/{invoice_id}")

    def get_dispute(self, dispute_id: str) -> dict:
        return self._api("GET", f"/v1/customer/disputes/{dispute_id}")

    def list_disputes(self, page_size: int = 20) -> list[dict]:
        return self._api("GET", f"/v1/customer/disputes?page_size={page_size}").get("items", [])

    def provide_evidence(self, dispute_id, evidences, files=None) -> dict:
        files_part = [("input", (None, json.dumps({"evidences": evidences}), "application/json"))]
        for name, data in files or []:
            files_part.append(("file1", (name, data, "application/pdf")))
        return self._api("POST", f"/v1/customer/disputes/{dispute_id}/provide-evidence", files=files_part)

    def verify_webhook_signature(self, headers: dict, event: dict) -> bool:
        h = {k.lower(): v for k, v in headers.items()}
        body = {"auth_algo": h.get("paypal-auth-algo"), "cert_url": h.get("paypal-cert-url"),
                "transmission_id": h.get("paypal-transmission-id"), "transmission_sig": h.get("paypal-transmission-sig"),
                "transmission_time": h.get("paypal-transmission-time"), "webhook_id": self.webhook_id,
                "webhook_event": event}
        if not all(body.values()):
            return False
        return self._api("POST", "/v1/notifications/verify-webhook-signature", body).get("verification_status") == "SUCCESS"

class MockPayPalClient:
    """In-memory mock mirroring PayPal response shapes. Used when PAYPAL_MODE=mock."""
    mode = "mock"

    def __init__(self):
        self.invoices: dict[str, dict] = {}
        self.disputes: dict[str, dict] = {}
        self.evidence_submissions: list[dict] = []

    def create_invoice(self, invoice: dict) -> dict:
        inv_id = "INV2-" + uuid.uuid4().hex[:16].upper()
        self.invoices[inv_id] = {"id": inv_id, "status": "DRAFT", **invoice}
        return {"id": inv_id, "status": "DRAFT",
                "raw": {"rel": "self", "method": "GET", "href": f"{config.PAYPAL_BASE_URL}/v2/invoicing/invoices/{inv_id}"}}

    def send_invoice(self, invoice_id, note=None) -> dict:
        if invoice_id not in self.invoices:
            raise PayPalError(404, {"name": "RESOURCE_NOT_FOUND"})
        self.invoices[invoice_id]["status"] = "SENT"
        return {"rel": "payer-view", "method": "GET", "href": f"https://www.sandbox.paypal.com/invoice/p/#{invoice_id}"}

    def get_invoice(self, invoice_id) -> dict:
        if invoice_id not in self.invoices:
            raise PayPalError(404, {"name": "RESOURCE_NOT_FOUND"})
        return self.invoices[invoice_id]

    def register_dispute(self, dispute_id: str, invoice_number: str, amount: float, currency: str,
                         reason: str, buyer_email: str, buyer_name: str, messages: list[str]):
        self.disputes[dispute_id] = {
            "dispute_id": dispute_id, "create_time": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "reason": reason, "status": "WAITING_FOR_SELLER_RESPONSE", "dispute_life_cycle_stage": "INQUIRY",
            "dispute_amount": {"currency_code": currency, "value": f"{amount:.2f}"},
            "disputed_transactions": [{"buyer_transaction_id": uuid.uuid4().hex[:17].upper(),
                                       "seller_transaction_id": uuid.uuid4().hex[:17].upper(),
                                       "invoice_number": invoice_number,
                                       "buyer": {"email": buyer_email, "name": buyer_name}}],
            "messages": [{"posted_by": "BUYER", "content": m} for m in messages],
            "seller_response_due_date": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + 10 * 86400)),
        }

    def get_dispute(self, dispute_id) -> dict:
        if dispute_id not in self.disputes:
            raise PayPalError(404, {"name": "RESOURCE_NOT_FOUND"})
        return self.disputes[dispute_id]

    def list_disputes(self, page_size: int = 20) -> list[dict]:
        return [{"dispute_id": d["dispute_id"], "status": d["status"], "reason": d["reason"]} for d in list(self.disputes.values())[:page_size]]

    def mark_paid(self, invoice_id: str):
        """Mock-only: emulate the buyer paying (status flips like PayPal's GET would show)."""
        self.get_invoice(invoice_id)["status"] = "PAID"

    def provide_evidence(self, dispute_id, evidences, files=None) -> dict:
        d = self.get_dispute(dispute_id)
        d["status"] = "UNDER_REVIEW"
        self.evidence_submissions.append({"dispute_id": dispute_id, "evidences": evidences})
        return {"links": [{"rel": "self", "method": "GET",
                           "href": f"{config.PAYPAL_BASE_URL}/v1/customer/disputes/{dispute_id}"}]}

    def verify_webhook_signature(self, headers, event) -> bool:
        return True  # mock: simulated events are trusted

_client: PayPalClient | None = None

def get_paypal() -> PayPalClient:
    global _client
    if _client is None:
        if config.PAYPAL_MODE == "sandbox":
            _client = SandboxPayPalClient(config.PAYPAL_CLIENT_ID, config.PAYPAL_CLIENT_SECRET)
        else:
            _client = MockPayPalClient()
    return _client

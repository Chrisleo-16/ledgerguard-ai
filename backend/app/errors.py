"""Central user-facing error mapper.

Every error the API returns is turned into plain words a customer can act on:
    {"title": what happened, "message": why, "action": what to do next, "code": stable machine code}
Technical details (status codes, PayPal bodies, stack traces) go to the logs and an optional `debug` field
that the UI keeps behind a "Details" toggle. Nothing raw is ever placed in title/message/action.
"""
from __future__ import annotations
import logging, re
from dataclasses import dataclass, asdict

log = logging.getLogger("ledgerguard.errors")

@dataclass
class UserError:
    title: str
    message: str
    action: str
    code: str
    status: int = 400
    def body(self, debug: str | None = None) -> dict:
        d = asdict(self); d.pop("status")
        out = {"error": d, "detail": f"{self.title} {self.message} {self.action}".strip()}
        if debug: out["debug"] = debug
        return out

# What the user was trying to do, by route. Used to make titles specific ("Couldn't send the invoice").
_ACTIONS: list[tuple[str, str, str]] = [
    ("POST", r"^/api/invoices/\d+/send$", "send the invoice"),
    ("POST", r"^/api/invoices/\d+/reminders$", "draft the reminder"),
    ("POST", r"^/api/invoices/refresh$", "refresh invoice statuses"),
    ("POST", r"^/api/invoices$", "create the invoice"),
    ("POST", r"^/api/reminders/run$", "run the chaser agent"),
    ("POST", r"^/api/reminders/\d+/approve$", "approve the reminder"),
    ("POST", r"^/api/disputes/\d+/submit-evidence$", "submit the evidence"),
    ("POST", r"^/api/paypal/sync$", "sync with PayPal"),
    ("GET", r"^/api/paypal/", "load this from PayPal"),
    ("POST", r"^/api/ledger/", "answer that question"),
    ("POST", r"^/api/webhooks/paypal$", "accept the PayPal notification"),
    ("POST", r"^/api/dev/simulate/payment$", "simulate the payment"),
    ("POST", r"^/api/dev/simulate/dispute$", "simulate the dispute"),
    ("POST", r"^/api/dev/clock/", "change the demo date"),
]

def action_for(method: str, path: str) -> str:
    for m, pat, label in _ACTIONS:
        if m == method.upper() and re.search(pat, path): return label
    return "load this page" if method.upper() == "GET" else "finish that"

def _retry_hint(action: str) -> str:
    return "Try Sync again in a minute." if action == "sync with PayPal" else "Try again in a minute."

def from_paypal(status: int, action: str, name: str | None = None) -> UserError:
    """PayPal API failures (status 0 = timeout / connection failure)."""
    t = f"Couldn't {action}."
    if status in (0, 408, 504) or status is None:
        return UserError(f"Couldn't reach PayPal right now.", "PayPal took too long to answer. This is usually temporary.", _retry_hint(action), "paypal_unreachable", 503)
    if status in (401, 403):
        return UserError(t, "PayPal didn't accept LedgerGuard's connection to your account, so nothing was changed.",
                         "Reconnect your PayPal account in Settings, or ask the account owner to check its permissions.", "paypal_auth", 502)
    if status == 404:
        return UserError(t, "PayPal couldn't find this record. It may have been deleted, or it was created in another PayPal account.",
                         "Press Sync with PayPal to refresh, then try again.", "paypal_not_found", 502)
    if status == 409:
        return UserError(t, "PayPal says this was already done or changed somewhere else.", "Refresh the page to see its latest status.", "paypal_conflict", 409)
    if status in (400, 422):
        why = "PayPal rejected some of the details" + (" (for example the amount, currency or email address)." if "invoice" in action else ".")
        return UserError(t, why, "Check the details and try again.", "paypal_rejected", 422)
    if status == 429:
        return UserError("PayPal is asking us to slow down.", "Too many requests were sent in a short time. Nothing is lost.", "Wait a minute, then try again.", "paypal_rate_limited", 429)
    return UserError("PayPal is having trouble right now.", "Their service returned an error on their side. This is usually temporary.", _retry_hint(action), "paypal_unavailable", 503)

def from_llm(action: str) -> UserError:
    return UserError(f"The AI assistant couldn't {action}.", "Our AI provider didn't respond in time or is busy. Your data is safe and nothing was sent.",
                     "Try again in a minute. If it keeps happening, you can still do this step manually.", "ai_unavailable", 503)

_HTTP_KNOWN = [  # (status, substring of the internal detail, mapper)
    (400, "signature", lambda a: UserError("We couldn't confirm this notification came from PayPal.",
        "Its security signature didn't match, so we ignored it to keep your account safe.",
        "No action is needed. If you expected an update, press Sync with PayPal.", "webhook_signature", 400)),
    (409, "reminder not in draft", lambda a: UserError("This reminder was already handled.", "It has been approved or sent already.", "Refresh the page to see its current status.", "already_done", 409)),
    (404, "not found", lambda a: UserError(f"Couldn't {a}.", "We couldn't find that item. It may have been removed.", "Refresh the page and try again.", "not_found", 404)),
]

def from_http(status: int, detail: str, action: str) -> UserError:
    low = (detail or "").lower()
    for st, needle, fn in _HTTP_KNOWN:
        if st == status and needle in low: return fn(action)
    if action == "answer that question" and status in (400, 422):
        return UserError("I couldn't answer that question.", "It may ask about something the ledger doesn't track, or be worded in a way I couldn't read.",
                         "Try asking about invoices, clients, amounts, due dates or statuses, e.g. \u201cWhich invoices are overdue?\u201d", "ledger_unanswerable", 422)
    if status == 409:
        return UserError(f"Couldn't {action}.", _plain_conflict(low), "Refresh the page to see its current status.", "invalid_state", 409)
    if status in (400, 422):
        return UserError(f"Couldn't {action}.", "Some of the details aren't valid" + (f": {_plain(detail)}" if _plain(detail) else "."),
                         "Check the highlighted details and try again.", "invalid_input", 422)
    if status == 404:
        return UserError(f"Couldn't {action}.", "We couldn't find that item. It may have been removed.", "Refresh the page and try again.", "not_found", 404)
    return unexpected(action)

def _plain_conflict(low: str) -> str:
    if "paid" in low: return "This invoice is already paid, so it can't be changed."
    if "submitted" in low: return "The evidence for this dispute was already submitted."
    if "draft" in low: return "This invoice hasn't been sent yet."
    return "It's not in a state where this can be done right now."

def _plain(detail: str) -> str:
    """Keep a short internal message only if it is already plain words (no codes, JSON or tracebacks)."""
    d = (detail or "").strip()
    if not d or len(d) > 120 or re.search(r"[{}\[\]<>_=]|\b\d{3}\b|error|exception|traceback", d, re.I): return ""
    return d[0].lower() + d[1:].rstrip(".") + "."

def validation(errors: list[dict], action: str) -> UserError:
    fields = sorted({str(e.get("loc", ["", "field"])[-1]).replace("_", " ") for e in errors if e.get("loc")})
    what = ", ".join(fields[:4]) or "some fields"
    return UserError(f"Couldn't {action}.", f"Some details are missing or in the wrong format ({what}).", "Fix those fields and try again.", "invalid_input", 422)

def unexpected(action: str) -> UserError:
    return UserError(f"Couldn't {action}.", "Something went wrong on our side. Your data is safe.", "Try again. If it keeps happening, refresh the page.", "unexpected", 500)

def is_llm_exception(e: BaseException) -> bool:
    mod = type(e).__module__ or ""
    return mod.startswith(("anthropic", "openai")) or type(e).__name__ in ("LLMError",)

def is_network_exception(e: BaseException) -> bool:
    import httpx
    return isinstance(e, (httpx.TimeoutException, httpx.ConnectError, TimeoutError, ConnectionError))

from __future__ import annotations
import uuid
from datetime import datetime, date
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import clock, config
from .db import Invoice, Client, Reminder, Dispute, WebhookEvent
from .paypal import get_paypal, build_invoice_payload, MockPayPalClient
from .state_machine import transition, days_overdue, OPEN_STATES
from .agents import run_reminder_agent, run_dispute_agent

def inv_row(inv: Invoice, today: date) -> dict:
    return {"id": inv.id, "paypal_id": inv.paypal_id, "number": inv.number, "client_id": inv.client_id,
            "client": inv.client.name, "country": inv.client.country, "description": inv.description,
            "amount": inv.amount, "currency": inv.currency, "status": inv.status,
            "issue_date": inv.issue_date.isoformat(), "due_date": inv.due_date.isoformat(),
            "days_overdue": days_overdue(inv.due_date, today) if inv.status in OPEN_STATES else 0,
            "paid_at": inv.paid_at.date().isoformat() if inv.paid_at else None}

def refresh_states(s: Session) -> list[dict]:
    today = clock.today(s); changes = []
    for inv in s.scalars(select(Invoice).where(Invoice.status.in_(OPEN_STATES))):
        new = transition(inv.status, "tick", inv.due_date, today)
        if new != inv.status:
            changes.append({"invoice": inv.number, "from": inv.status, "to": new}); inv.status = new
    s.commit()
    return changes

def create_invoice(s: Session, client_id: int, description: str, amount: float, currency: str, due_date: date, send: bool) -> Invoice:
    c = s.get(Client, client_id)
    if not c: raise ValueError("client not found")
    today = clock.today(s)
    n = (s.query(Invoice).count() or 0) + 1001
    number = f"LG-{today.year}-{n}"
    if get_paypal().mode != "mock":  # PayPal invoice numbers must be unique per account, survive DB reseeds
        number += "-" + uuid.uuid4().hex[:4].upper()
    payload = build_invoice_payload(number, config.MERCHANT_EMAIL, c.name, c.email, description, amount, currency,
                                    today.isoformat(), due_date.isoformat())
    res = get_paypal().create_invoice(payload)
    inv = Invoice(paypal_id=res["id"], number=number, client_id=c.id, description=description, amount=amount,
                  currency=currency, issue_date=today, due_date=due_date, status="draft")
    s.add(inv); s.commit()
    if send: send_invoice(s, inv)
    return inv

def send_invoice(s: Session, inv: Invoice) -> Invoice:
    new = transition(inv.status, "send", inv.due_date, clock.today(s))
    get_paypal().send_invoice(inv.paypal_id)
    inv.status = new; s.commit()
    return inv

def draft_reminder(s: Session, inv: Invoice) -> Reminder:
    if inv.status not in OPEN_STATES: raise ValueError(f"invoice is {inv.status}; reminders only for open invoices")
    for r in s.scalars(select(Reminder).where(Reminder.invoice_id == inv.id, Reminder.status.in_(["draft", "no_action"]))):
        r.status = "superseded"
    out = run_reminder_agent(inv.id, clock.today(s).isoformat())
    rem = Reminder(invoice_id=inv.id, tone=out["tone"], subject=out["draft"]["subject"], body=out["draft"]["body"],
                   late_fee=out["late_fee"], status="no_action" if out["next_action"] == "wait" else "draft",
                   reasoning={"risk": out["risk"], "sentiment": out["sentiment"], "sentiment_source": out.get("sentiment_source"), "draft_source": out.get("draft_source"),
                              "next_action": out["next_action"], "rationale": out.get("rationale", ""), "decision_source": out.get("decision_source"),
                              "proposed": out.get("decision"), "guardrail_notes": out.get("guardrail_notes", []),
                              "late_fee_pct": out.get("late_fee_pct", 0), "installments": out.get("installments", []), "trace": out["trace"],
                              "days_overdue": out["ctx"]["days_overdue"], "country": out["ctx"]["country"],
                              "avg_days_late_history": out["ctx"]["avg_days_late_history"]})
    s.add(rem); s.commit()
    return rem

def mark_paid(s: Session, inv: Invoice) -> int:
    inv.status = transition(inv.status, "pay"); inv.paid_at = inv.paid_at or datetime.combine(clock.today(s), datetime.min.time())
    cancelled = 0
    for r in s.scalars(select(Reminder).where(Reminder.invoice_id == inv.id, Reminder.status == "draft")):
        r.status = "cancelled"; cancelled += 1
    s.commit()
    return cancelled

def _find_invoice(s, paypal_id=None, number=None):
    if paypal_id:
        inv = s.scalar(select(Invoice).where(Invoice.paypal_id == paypal_id))
        if inv: return inv
    if number:
        return s.scalar(select(Invoice).where(Invoice.number == number))
    return None

def handle_webhook(s: Session, event: dict) -> dict:
    eid = event.get("id") or f"WH-{uuid.uuid4().hex}"
    if s.get(WebhookEvent, eid): return {"status": "duplicate", "event_id": eid}
    etype = event.get("event_type", ""); res = event.get("resource", {}) or {}
    s.add(WebhookEvent(id=eid, event_type=etype, payload=event)); s.commit()
    if etype == "INVOICING.INVOICE.PAID":
        invd = res.get("invoice", res)
        inv = _find_invoice(s, invd.get("id"), invd.get("detail", {}).get("invoice_number"))
        if not inv: return {"status": "ignored", "reason": "invoice not found"}
        if inv.status == "paid": return {"status": "ok", "invoice": inv.number, "already_paid": True}
        n = mark_paid(s, inv)
        return {"status": "ok", "invoice": inv.number, "new_status": "paid", "reminders_cancelled": n}
    if etype == "PAYMENT.CAPTURE.COMPLETED":
        inv = _find_invoice(s, (res.get("supplementary_data", {}).get("related_ids", {}) or {}).get("invoice_id"), res.get("invoice_id"))
        if not inv: return {"status": "ignored", "reason": "no matching invoice"}
        if inv.status == "paid": return {"status": "ok", "invoice": inv.number, "already_paid": True}
        n = mark_paid(s, inv)
        return {"status": "ok", "invoice": inv.number, "new_status": "paid", "reminders_cancelled": n}
    if etype == "CUSTOMER.DISPUTE.CREATED":
        return {"status": "ok", **process_dispute(s, res.get("dispute_id") or res.get("id"))}
    return {"status": "ignored", "reason": f"unhandled event {etype}"}

def process_dispute(s: Session, dispute_id: str) -> dict:
    d = get_paypal().get_dispute(dispute_id)
    tx = (d.get("disputed_transactions") or [{}])[0]
    inv = _find_invoice(s, None, tx.get("invoice_number"))
    client_id = inv.client_id if inv else None
    if not client_id:
        email = (tx.get("buyer") or {}).get("email")
        c = s.scalar(select(Client).where(Client.email == email)) if email else None
        client_id = c.id if c else None
    row = s.scalar(select(Dispute).where(Dispute.paypal_dispute_id == dispute_id)) or Dispute(paypal_dispute_id=dispute_id)
    row.invoice_id = inv.id if inv else None; row.client_id = client_id; row.reason = d.get("reason", "")
    row.amount = float(d.get("dispute_amount", {}).get("value", 0)); row.details = d
    s.add(row); s.commit()
    if client_id:
        out = run_dispute_agent(d, client_id, row.invoice_id)
        row.package = {**out["package"], "trace": out["trace"]}; row.status = "package_ready"; s.commit()
    return {"dispute_id": dispute_id, "dispute_status": row.status, "evidence_items": len(row.package.get("timeline", []))}

def submit_evidence(s: Session, d: Dispute) -> dict:
    if d.status != "package_ready": raise ValueError(f"dispute is {d.status}")
    res = get_paypal().provide_evidence(d.paypal_dispute_id, d.package["paypal_evidence_payload"]["evidences"])
    d.status = "submitted"; d.package = {**d.package, "submitted_at": datetime.utcnow().isoformat(), "paypal_response": res}
    s.commit()
    return res

def simulate_dispute(s: Session, inv: Invoice, reason: str, message: str) -> dict:
    pp = get_paypal()
    if not isinstance(pp, MockPayPalClient): raise ValueError("simulation only available in mock mode")
    did = "PP-D-" + uuid.uuid4().hex[:8].upper()
    pp.register_dispute(did, inv.number, inv.amount, inv.currency, reason, inv.client.email, inv.client.name, [message])
    event = {"id": "WH-" + uuid.uuid4().hex[:20].upper(), "event_version": "1.0", "resource_type": "dispute",
             "event_type": "CUSTOMER.DISPUTE.CREATED", "summary": "A new dispute opened",
             "resource": {"dispute_id": did, "reason": reason, "status": "WAITING_FOR_SELLER_RESPONSE"}}
    return {"event": event, "result": handle_webhook(s, event)}

def simulate_payment(s: Session, inv: Invoice, kind: str = "INVOICING.INVOICE.PAID") -> dict:
    if not isinstance(get_paypal(), MockPayPalClient): raise ValueError("simulation only available in mock mode")
    if kind == "PAYMENT.CAPTURE.COMPLETED":
        resource = {"id": uuid.uuid4().hex[:17].upper(), "status": "COMPLETED", "invoice_id": inv.number,
                    "amount": {"currency_code": inv.currency, "value": f"{inv.amount:.2f}"}}
    else:
        resource = {"invoice": {"id": inv.paypal_id, "status": "PAID", "detail": {"invoice_number": inv.number},
                                "amount": {"currency_code": inv.currency, "value": f"{inv.amount:.2f}"}}}
    event = {"id": "WH-" + uuid.uuid4().hex[:20].upper(), "event_version": "1.0", "event_type": kind, "resource": resource}
    return {"event": event, "result": handle_webhook(s, event)}

PAID_STATUSES = {"PAID", "MARKED_AS_PAID"}
CANCELLED_STATUSES = {"CANCELLED"}

def sync_with_paypal(s: Session) -> dict:
    """Polling fallback for local/sandbox testing without a public webhook URL.
    Pulls live status of every open invoice and lists disputes; routes changes through the same handlers."""
    pp = get_paypal(); out = {"checked": 0, "paid": [], "cancelled": [], "new_disputes": [], "errors": []}
    for inv in s.scalars(select(Invoice).where(Invoice.status.in_(OPEN_STATES))).all():
        if not inv.paypal_id or inv.paypal_id.startswith("INV2-SEED"):
            continue
        try:
            st = pp.get_invoice(inv.paypal_id).get("status", "")
        except Exception as e:
            out["errors"].append({"invoice": inv.number, "error": str(e)[:200]}); continue
        out["checked"] += 1
        if st in PAID_STATUSES:
            n = mark_paid(s, inv); out["paid"].append({"invoice": inv.number, "paypal_status": st, "reminders_cancelled": n})
        elif st in CANCELLED_STATUSES:
            inv.status = transition(inv.status, "cancel"); s.commit(); out["cancelled"].append(inv.number)
    try:
        known = {d.paypal_dispute_id for d in s.scalars(select(Dispute))}
        for item in pp.list_disputes():
            if item["dispute_id"] not in known:
                out["new_disputes"].append(process_dispute(s, item["dispute_id"]))
    except Exception as e:
        out["errors"].append({"disputes": str(e)[:200]})
    return out

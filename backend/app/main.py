from __future__ import annotations
import logging
from datetime import date
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import clock, config, llm, services, filters
from .db import SessionLocal, init_db, get_session, Invoice, Client, Reminder, Dispute, Evidence, WebhookEvent
from .paypal import get_paypal, PayPalError

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="LedgerGuard AI", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def _startup():
    init_db()
    if config.SEED_DEMO_IF_EMPTY:  # first boot (or ephemeral disk): load the demo dataset
        with SessionLocal() as s:
            empty = s.query(Client).count() == 0
        if empty:
            from . import seed
            seed.run()

def _inv(s, inv_id) -> Invoice:
    inv = s.get(Invoice, inv_id)
    if not inv: raise HTTPException(404, "invoice not found")
    return inv

@app.exception_handler(PayPalError)
def _pp_err(_, e: PayPalError):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=502, content={"detail": "PayPal error", "paypal_status": e.status, "body": e.body})

@app.get("/api/health")
def health(s: Session = Depends(get_session)):
    return {"ok": True, "paypal_mode": get_paypal().mode, "llm": llm.provider_name(), "llm_provider": llm.provider(), "llm_model": llm.model() if llm.enabled() else None, "today": clock.today(s).isoformat(),
            "clock_offset_days": clock.offset_days(s)}

@app.get("/api/summary")
def summary(s: Session = Depends(get_session)):
    """KPI cards, computed exactly from stored data (per currency; never converted or estimated)."""
    services.refresh_states(s); t = clock.today(s)
    rows = [services.inv_row(i, t) for i in s.scalars(select(Invoice))]
    def tot(rs):
        out: dict[str, float] = {}
        for r in rs: out[r["currency"]] = round(out.get(r["currency"], 0) + r["amount"], 2)
        return dict(sorted(out.items()))
    open_ = [r for r in rows if r["status"] in ("sent", "due_soon", "due", "overdue_3", "overdue_7")]
    overdue = [r for r in open_ if r["days_overdue"] > 0]
    month = t.strftime("%Y-%m")
    paid_m = [r for r in rows if r["status"] == "paid" and (r["paid_at"] or "").startswith(month)]
    disputes = s.scalars(select(Dispute)).all()
    open_d = [d for d in disputes if d.status != "submitted"]
    return {"today": t.isoformat(), "month": month,
            "outstanding": {"count": len(open_), "totals": tot(open_)},
            "overdue": {"count": len(overdue), "totals": tot(overdue)},
            "paid_this_month": {"count": len(paid_m), "totals": tot(paid_m)},
            "open_disputes": {"count": len(open_d), "awaiting_approval": sum(1 for d in open_d if d.status == "package_ready"),
                              "totals": tot([{"currency": (d.package.get("amount") or {}).get("currency_code", "USD"), "amount": d.amount} for d in open_d])},
            "drafts_pending": s.query(Reminder).filter(Reminder.status == "draft").count()}

@app.get("/api/evidence/summary")
def evidence_summary(s: Session = Depends(get_session)):
    """Exact counts of stored evidence per client and kind (what a dispute defense can draw on)."""
    out: dict[int, dict] = {}
    for c in s.scalars(select(Client).order_by(Client.name)):
        out[c.id] = {"client_id": c.id, "client": c.name, "country": c.country, "contract": 0, "milestone": 0, "delivery": 0, "message": 0, "file": 0, "total": 0}
    for e in s.scalars(select(Evidence)):
        row = out[e.client_id]; row[e.kind] = row.get(e.kind, 0) + 1; row["total"] += 1
    return sorted(out.values(), key=lambda r: (-r["total"], r["client"]))

@app.get("/api/activity")
def activity(limit: int = 8, s: Session = Depends(get_session)):
    """Most recent PayPal webhook events received (real or simulated)."""
    rows = s.scalars(select(WebhookEvent).order_by(WebhookEvent.received_at.desc()).limit(min(limit, 50))).all()
    return [{"id": w.id, "event_type": w.event_type, "received_at": w.received_at.isoformat() + "Z",
             "ref": (w.payload.get("resource", {}) or {}).get("dispute_id") or ((w.payload.get("resource", {}) or {}).get("invoice", {}) or {}).get("detail", {}).get("invoice_number")
                    or (w.payload.get("resource", {}) or {}).get("invoice_id")} for w in rows]

@app.get("/api/clients")
def clients(s: Session = Depends(get_session)):
    return [{"id": c.id, "name": c.name, "email": c.email, "country": c.country, "avg_days_to_pay": c.avg_days_to_pay}
            for c in s.scalars(select(Client).order_by(Client.name))]

@app.get("/api/invoices")
def invoices(s: Session = Depends(get_session)):
    services.refresh_states(s); t = clock.today(s)
    return [services.inv_row(i, t) for i in s.scalars(select(Invoice).order_by(Invoice.due_date.desc()))]

class InvoiceIn(BaseModel):
    client_id: int
    description: str = Field(min_length=1, max_length=500)
    amount: float = Field(gt=0, le=1_000_000)
    currency: str = Field(default="USD", pattern="^[A-Z]{3}$")
    due_date: date
    send: bool = True

@app.post("/api/invoices")
def create_invoice(body: InvoiceIn, s: Session = Depends(get_session)):
    try:
        inv = services.create_invoice(s, body.client_id, body.description, body.amount, body.currency, body.due_date, body.send)
    except ValueError as e: raise HTTPException(400, str(e))
    return services.inv_row(inv, clock.today(s))

@app.post("/api/invoices/{inv_id}/send")
def send_invoice(inv_id: int, s: Session = Depends(get_session)):
    from .state_machine import InvalidTransition
    try: inv = services.send_invoice(s, _inv(s, inv_id))
    except InvalidTransition as e: raise HTTPException(409, str(e))
    return services.inv_row(inv, clock.today(s))

@app.post("/api/invoices/refresh")
def refresh(s: Session = Depends(get_session)):
    return {"changes": services.refresh_states(s)}

def _rem(r: Reminder) -> dict:
    return {"id": r.id, "invoice_id": r.invoice_id, "tone": r.tone, "subject": r.subject, "body": r.body,
            "late_fee": r.late_fee, "status": r.status, "reasoning": r.reasoning, "created_at": r.created_at.isoformat()}

@app.post("/api/invoices/{inv_id}/reminders")
def draft_reminder(inv_id: int, s: Session = Depends(get_session)):
    services.refresh_states(s)
    try: return _rem(services.draft_reminder(s, _inv(s, inv_id)))
    except ValueError as e: raise HTTPException(409, str(e))

@app.post("/api/reminders/run")
def run_chaser(s: Session = Depends(get_session)):
    """Agent sweep: draft reminders for every open invoice that is due/overdue and has no pending draft."""
    services.refresh_states(s); out = []
    for inv in s.scalars(select(Invoice).where(Invoice.status.in_(["due_soon", "due", "overdue_3", "overdue_7"]))).all():
        if not s.scalar(select(Reminder).where(Reminder.invoice_id == inv.id, Reminder.status == "draft")):
            out.append(_rem(services.draft_reminder(s, inv)))
    return {"drafted": out}

@app.get("/api/reminders")
def reminders(s: Session = Depends(get_session)):
    return [_rem(r) for r in s.scalars(select(Reminder).order_by(Reminder.created_at.desc()))]

@app.post("/api/reminders/{rid}/approve")
def approve_reminder(rid: int, s: Session = Depends(get_session)):
    """Marks approved only. LedgerGuard never auto-sends; the user copies/sends it themselves."""
    r = s.get(Reminder, rid)
    if not r or r.status != "draft": raise HTTPException(409, "reminder not in draft")
    r.status = "approved"; s.commit(); return _rem(r)

@app.post("/api/webhooks/paypal")
async def paypal_webhook(request: Request, s: Session = Depends(get_session)):
    event = await request.json()
    if not get_paypal().verify_webhook_signature(dict(request.headers), event):
        raise HTTPException(400, "webhook signature verification failed")
    return services.handle_webhook(s, event)

def _disp(d: Dispute) -> dict:
    return {"id": d.id, "paypal_dispute_id": d.paypal_dispute_id, "invoice_id": d.invoice_id, "client_id": d.client_id,
            "reason": d.reason, "amount": d.amount, "status": d.status, "details": d.details, "package": d.package,
            "created_at": d.created_at.isoformat()}

@app.get("/api/disputes")
def disputes(s: Session = Depends(get_session)):
    return [_disp(d) for d in s.scalars(select(Dispute).order_by(Dispute.created_at.desc()))]

@app.post("/api/disputes/{did}/submit-evidence")
def submit_evidence(did: int, s: Session = Depends(get_session)):
    """Human-approved: only called when the user clicks Approve & Submit."""
    d = s.get(Dispute, did)
    if not d: raise HTTPException(404, "dispute not found")
    try: res = services.submit_evidence(s, d)
    except ValueError as e: raise HTTPException(409, str(e))
    return {"dispute": _disp(d), "paypal_response": res}

class QueryIn(BaseModel):
    question: str = Field(min_length=1, max_length=500)

@app.post("/api/ledger/query")
def ledger_query(body: QueryIn, s: Session = Depends(get_session)):
    services.refresh_states(s); t = clock.today(s)
    rows = [services.inv_row(i, t) for i in s.scalars(select(Invoice))]
    names = [c.name for c in s.scalars(select(Client))]
    spec, source = filters.parse_question(body.question, names, t.isoformat())
    res = filters.apply(rows, spec)
    return {"question": body.question, "spec": spec.model_dump(), "parser": source, "rows": res, "summary": filters.summarize(res)}

@app.post("/api/ledger/filter")
def ledger_filter(spec: dict, s: Session = Depends(get_session)):
    try: fs = filters.FilterSpec.model_validate(spec)
    except Exception as e: raise HTTPException(422, str(e))
    t = clock.today(s); rows = [services.inv_row(i, t) for i in s.scalars(select(Invoice))]
    res = filters.apply(rows, fs); return {"rows": res, "summary": filters.summarize(res)}

@app.post("/api/paypal/sync")
def paypal_sync(s: Session = Depends(get_session)):
    """Poll PayPal for invoice payments + new disputes (works in sandbox without public webhooks)."""
    return services.sync_with_paypal(s)

@app.get("/api/paypal/invoices/{inv_id}")
def paypal_invoice(inv_id: int, s: Session = Depends(get_session)):
    """Fetch the invoice as PayPal currently sees it."""
    return get_paypal().get_invoice(_inv(s, inv_id).paypal_id)

@app.get("/api/paypal/disputes")
def paypal_disputes():
    return get_paypal().list_disputes()

# ---------- dev / demo endpoints (mock mode) ----------
class AdvanceIn(BaseModel):
    days: int = Field(ge=-365, le=365)

@app.post("/api/dev/clock/advance")
def advance(body: AdvanceIn, s: Session = Depends(get_session)):
    t = clock.advance(s, body.days); return {"today": t.isoformat(), "changes": services.refresh_states(s)}

@app.post("/api/dev/clock/reset")
def reset(s: Session = Depends(get_session)):
    t = clock.reset(s); return {"today": t.isoformat(), "changes": services.refresh_states(s)}

class SimPay(BaseModel):
    invoice_id: int
    event_type: str = "INVOICING.INVOICE.PAID"

@app.post("/api/dev/simulate/payment")
def sim_pay(body: SimPay, s: Session = Depends(get_session)):
    try: return services.simulate_payment(s, _inv(s, body.invoice_id), body.event_type)
    except ValueError as e: raise HTTPException(400, str(e))

class SimDispute(BaseModel):
    invoice_id: int
    reason: str = "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED"
    message: str = "The delivered work did not match what was agreed."

@app.post("/api/dev/simulate/dispute")
def sim_dispute(body: SimDispute, s: Session = Depends(get_session)):
    try: return services.simulate_dispute(s, _inv(s, body.invoice_id), body.reason, body.message)
    except ValueError as e: raise HTTPException(400, str(e))

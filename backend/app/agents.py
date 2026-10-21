"""LangGraph agents: invoice reminder drafter and dispute defense packager."""
from __future__ import annotations
import json, re
from typing import TypedDict, Any
from langgraph.graph import StateGraph, END
from sqlalchemy import select
from . import llm, config
from .db import SessionLocal, Invoice, Client, Message, Evidence
from .state_machine import days_overdue
from .evidence_search import get_search

NEG = {"delay", "late", "problem", "issue", "unhappy", "disappointed", "refund", "cash flow", "can't", "cannot", "wait", "postpone", "dispute", "not satisfied"}
POS = {"thanks", "thank", "great", "love", "happy", "excellent", "perfect", "appreciate", "awesome", "amazing"}
COUNTRY_NOTES = {"US": "US client: concise, direct, references net terms.", "DE": "German client: formal, precise, cites contract clause and dates.",
                 "GB": "UK client: polite, understated.", "NL": "Dutch client: direct and practical.", "KE": "Kenyan client: warm, may offer M-Pesa/PayPal options."}

def lexicon_sentiment(texts: list[str]) -> float:
    score = 0
    for t in texts:
        tl = t.lower()
        score += sum(1 for w in POS if w in tl) - sum(1 for w in NEG if w in tl)
    return max(-1.0, min(1.0, score / max(3, len(texts) * 2)))

# ---------------- Reminder graph ----------------
# gather_context -> analyze_sentiment -> decide_next_action (LLM or rules) -> apply_guardrails (code) -> draft_message
ACTIONS = ["wait", "remind", "offer_split", "offer_pay_later", "escalate"]
TONES = ["friendly", "neutral", "firm"]
MAX_LATE_FEE_PCT = 1.5          # policy cap, enforced in code
LATE_FEE_MIN_DAYS = 7           # no fee before 7 days overdue
ESCALATE_MIN_DAYS = 14          # no escalation before 14 days overdue

class ReminderState(TypedDict, total=False):
    invoice_id: int
    today: str
    ctx: dict
    sentiment: float
    sentiment_source: str
    decision: dict          # raw proposal (LLM or rules)
    decision_source: str
    guardrail_notes: list
    risk: str
    tone: str
    next_action: str
    late_fee_pct: float
    late_fee: float
    installments: list
    rationale: str
    draft: dict
    draft_source: str
    trace: list

def r_gather(st: ReminderState) -> ReminderState:
    s = SessionLocal()
    try:
        from datetime import date
        from .db import Reminder
        inv = s.get(Invoice, st["invoice_id"]); c = inv.client
        today = date.fromisoformat(st["today"])
        msgs = s.scalars(select(Message).where(Message.client_id == c.id).order_by(Message.sent_at.desc()).limit(6)).all()
        hist = s.scalars(select(Invoice).where(Invoice.client_id == c.id, Invoice.status == "paid")).all()
        late_hist = [(i.paid_at.date() - i.due_date).days for i in hist if i.paid_at]
        prior = s.scalars(select(Reminder).where(Reminder.invoice_id == inv.id, Reminder.status.in_(["approved", "superseded"]))).all()
        ctx = {"number": inv.number, "amount": inv.amount, "currency": inv.currency, "due_date": inv.due_date.isoformat(),
               "status": inv.status, "days_overdue": days_overdue(inv.due_date, today), "days_until_due": (inv.due_date - today).days,
               "description": inv.description, "client": c.name, "email": c.email, "country": c.country, "avg_days_to_pay": c.avg_days_to_pay,
               "client_notes": c.notes, "paid_invoices": len(hist),
               "avg_days_late_history": round(sum(late_hist) / len(late_hist), 1) if late_hist else None,
               "prior_reminders": len(prior), "recent_inbound": [m.body for m in msgs if m.direction == "in"][:4]}
    finally:
        s.close()
    return {"ctx": ctx, "trace": ["gather_context"]}

def r_sentiment(st):
    texts = st["ctx"]["recent_inbound"]
    out = llm.chat_json("Rate the overall sentiment of these client messages toward the freelancer from -1 (hostile) to 1 (warm). JSON {\"sentiment\": float}",
                        json.dumps(texts), schema={"type": "object", "properties": {"sentiment": {"type": "number", "minimum": -1, "maximum": 1}}, "required": ["sentiment"]}) if texts else None
    try: sent = max(-1.0, min(1.0, float(out["sentiment"]))); src = llm.last_model or "llm"
    except Exception: sent = lexicon_sentiment(texts); src = "lexicon"
    return {"sentiment": round(sent, 2), "sentiment_source": src, "trace": st["trace"] + ["analyze_sentiment"]}

def rules_decision(c: dict, sentiment: float) -> dict:
    """Deterministic policy (fallback when no LLM)."""
    d, hist = c["days_overdue"], c["avg_days_late_history"]
    if c["status"] == "sent" and c["days_until_due"] > 3:
        return {"next_action": "wait", "tone": "friendly", "late_fee_pct": 0, "rationale": "Not due soon yet; no reminder needed."}
    if c["status"] in ("sent", "due_soon"):
        return {"next_action": "remind", "tone": "friendly", "late_fee_pct": 0, "rationale": "Due within 3 days: a friendly heads-up."}
    if d >= ESCALATE_MIN_DAYS and c["prior_reminders"] >= 1:
        return {"next_action": "escalate", "tone": "firm", "late_fee_pct": MAX_LATE_FEE_PCT, "rationale": f"{d} days overdue after a prior reminder."}
    if sentiment < -0.2 and d >= 3:
        return {"next_action": "offer_split", "tone": "neutral", "late_fee_pct": 0,
                "rationale": "Client signals cash-flow strain; offering a split improves the odds of being paid."}
    if d >= 7:
        return {"next_action": "remind", "tone": "firm", "late_fee_pct": MAX_LATE_FEE_PCT, "rationale": f"{d} days overdue; firm reminder with the contractual late-fee option."}
    return {"next_action": "remind", "tone": "neutral" if d >= 3 else "friendly", "late_fee_pct": 0,
            "rationale": "Recently overdue; a polite nudge." + (f" Client usually pays ~{hist}d late." if hist else "")}

DECIDE_SYSTEM = f"""You are the collections agent for a freelancer ({config.MERCHANT_NAME}, Nairobi) who bills international clients via PayPal invoices.
Decide the next step for ONE open invoice. Options for next_action: {ACTIONS}.
- wait: no message now (e.g. not due yet, or a reminder was just sent).
- remind: send a reminder (choose tone).
- offer_split: propose paying in 2 installments (amounts are computed by the system).
- offer_pay_later: point the client to PayPal's flexible payment options on the invoice (e.g. PayPal Pay Later where eligible, or a partial payment now).
- escalate: final notice before formal steps (only when clearly warranted).
Tone: {TONES}. late_fee_pct: 0..{MAX_LATE_FEE_PCT} (percent of invoice; the system enforces policy and computes the amount).
Weigh: days overdue, payment history, client's country/business culture, sentiment of their recent messages, relationship value.
Give a 1-2 sentence rationale grounded in the given facts. Never invent facts."""

DECIDE_SCHEMA = {"type": "object", "properties": {
    "next_action": {"type": "string", "enum": ACTIONS}, "tone": {"type": "string", "enum": TONES},
    "late_fee_pct": {"type": "number", "minimum": 0, "maximum": MAX_LATE_FEE_PCT},
    "risk": {"type": "string", "enum": ["low", "medium", "high"]}, "rationale": {"type": "string"}},
    "required": ["next_action", "tone", "late_fee_pct", "rationale"]}

def r_decide(st):
    c = st["ctx"]
    out = llm.chat_json(DECIDE_SYSTEM, json.dumps({"invoice": c, "client_sentiment": st["sentiment"]}), schema=DECIDE_SCHEMA, max_tokens=1024)
    if out and out.get("next_action") in ACTIONS and out.get("tone") in TONES and isinstance(out.get("rationale"), str):
        return {"decision": out, "decision_source": llm.last_model or "llm", "trace": st["trace"] + ["decide_next_action(llm)"]}
    return {"decision": rules_decision(c, st["sentiment"]), "decision_source": "rules", "trace": st["trace"] + ["decide_next_action(rules)"]}

def _risk(c, sentiment):
    d, hist = c["days_overdue"], c["avg_days_late_history"]
    if d >= 7 or (hist and hist > 10): return "high"
    if d >= 3 or (hist and hist > 3) or sentiment < -0.2: return "medium"
    return "low"

def apply_guardrails(c: dict, decision: dict) -> dict:
    """Policy enforced in code regardless of who proposed the decision. Returns final fields + notes on any override."""
    notes = []
    action, tone = decision.get("next_action"), decision.get("tone")
    if action not in ACTIONS: action, _ = "remind", notes.append("unknown action -> remind")
    if tone not in TONES: tone, _ = "neutral", notes.append("unknown tone -> neutral")
    d = c["days_overdue"]; overdue = d > 0
    try: pct = float(decision.get("late_fee_pct") or 0)
    except (TypeError, ValueError): pct = 0.0
    if pct < 0: pct = 0.0
    if pct > MAX_LATE_FEE_PCT: notes.append(f"late fee capped at {MAX_LATE_FEE_PCT}%"); pct = MAX_LATE_FEE_PCT
    if pct and d < LATE_FEE_MIN_DAYS: notes.append(f"late fee removed (only allowed from {LATE_FEE_MIN_DAYS} days overdue)"); pct = 0.0
    if action == "escalate" and d < ESCALATE_MIN_DAYS:
        notes.append(f"escalation blocked before {ESCALATE_MIN_DAYS} days overdue -> remind"); action = "remind"
    if not overdue and tone == "firm": notes.append("firm tone not allowed before due date -> friendly"); tone = "friendly"
    if not overdue and action in ("offer_split", "offer_pay_later", "escalate"): notes.append(f"{action} not allowed before due date -> remind"); action = "remind"
    if action in ("offer_split", "offer_pay_later") and pct: notes.append("late fee dropped when offering flexible payment"); pct = 0.0
    fee = round(c["amount"] * pct / 100, 2)
    inst = []
    if action == "offer_split":
        first = round(c["amount"] / 2, 2); inst = [first, round(c["amount"] - first, 2)]
    return {"next_action": action, "tone": tone, "late_fee_pct": pct, "late_fee": fee, "installments": inst, "guardrail_notes": notes}

def r_guard(st):
    g = apply_guardrails(st["ctx"], st["decision"])
    return {**g, "risk": st["decision"].get("risk") if st["decision"].get("risk") in ("low", "medium", "high") else _risk(st["ctx"], st["sentiment"]),
            "rationale": str(st["decision"].get("rationale", ""))[:600], "trace": st["trace"] + ["apply_guardrails"]}

def _template(c, tone, fee, sentiment, action="remind", inst=None):
    first = c["client"].split()[0]
    amt = f"{c['currency']} {c['amount']:,.2f}"
    country_line = {"DE": "per §4 (payment terms) of our agreement", "US": "per our Net terms"}.get(c["country"], "per our agreement")
    sig = f"\n\nBest regards,\n{config.MERCHANT_NAME}"
    if action == "offer_split" and inst:
        return {"subject": f"Invoice {c['number']}: happy to split it into two payments",
                "body": f"Hi {first},\n\nInvoice {c['number']} ({amt}) was due on {c['due_date']}. If it helps with timing, I'm happy to split it into two payments: "
                        f"{c['currency']} {inst[0]:,.2f} now and {c['currency']} {inst[1]:,.2f} within 14 days. Both can be paid via the PayPal invoice link. "
                        f"Just reply to confirm and I'll adjust the invoice.{sig}"}
    if action == "offer_pay_later":
        return {"subject": f"Invoice {c['number']}: flexible payment options",
                "body": f"Hi {first},\n\nInvoice {c['number']} ({amt}) was due on {c['due_date']}. If paying in full right now is difficult, the PayPal invoice "
                        f"supports flexible options (such as Pay Later where eligible). Could you let me know which works best?{sig}"}
    if action == "escalate":
        return {"subject": f"Final notice: invoice {c['number']} is {c['days_overdue']} days overdue",
                "body": f"Dear {c['client']},\n\nDespite earlier reminders, invoice {c['number']} ({amt}), due {c['due_date']}, remains unpaid {c['days_overdue']} days later, {country_line}. "
                        f"Please settle it within 7 days via the PayPal invoice link."
                        + (f" A late fee of {c['currency']} {fee:,.2f} applies per our terms." if fee else "")
                        + f" If I don't hear back, I'll need to pursue formal next steps, which I'd much rather avoid.{sig}"}
    if tone == "friendly":
        subj = f"Friendly reminder: invoice {c['number']} ({amt}) due {c['due_date']}"
        body = (f"Hi {first},\n\nHope all is well! A quick heads-up that invoice {c['number']} for {c['description']} "
                f"({amt}) is due on {c['due_date']}. You can pay securely via the PayPal link in the original invoice email.\n\n"
                f"Thanks again for the great collaboration!{sig}")
    elif tone == "neutral":
        subj = f"Invoice {c['number']} is {c['days_overdue']} days past due"
        empathy = "I know things get busy. " if sentiment < 0 else ""
        body = (f"Hi {first},\n\n{empathy}Invoice {c['number']} ({amt}) for {c['description']} was due on {c['due_date']} "
                f"and is now {c['days_overdue']} days past due {country_line}. Could you confirm when payment will be made? "
                f"If anything is holding it up, just let me know and we can sort it out.{sig}")
    else:
        subj = f"Action required: invoice {c['number']} is {c['days_overdue']} days overdue"
        body = (f"Dear {c['client']},\n\nInvoice {c['number']} ({amt}) was due on {c['due_date']} and remains unpaid "
                f"{c['days_overdue']} days later, {country_line}. Please settle the balance within 5 business days via the PayPal invoice link."
                + (f"\n\nOptional late fee: per our terms, a late fee of {c['currency']} {fee:,.2f} may be applied after that date. "
                   f"I'd prefer to avoid this, so if a partial payment or short plan helps, reply and we'll agree one." if fee else "") + sig)
    return {"subject": subj, "body": body}

def r_draft(st):
    c = st["ctx"]
    if st["next_action"] == "wait":
        return {"draft": {"subject": f"No reminder needed yet for {c['number']}", "body": st["rationale"]}, "draft_source": "none",
                "trace": st["trace"] + ["draft_message(skipped)"]}
    facts = {"invoice": {k: c[k] for k in ("number", "amount", "currency", "due_date", "days_overdue", "description", "client", "country")},
             "next_action": st["next_action"], "tone": st["tone"],
             "late_fee": {"amount": st["late_fee"], "currency": c["currency"], "percent": st["late_fee_pct"]} if st["late_fee"] else None,
             "installments": [{"amount": x, "currency": c["currency"]} for x in st["installments"]] or None,
             "recent_client_messages": c["recent_inbound"][:2], "country_guidance": COUNTRY_NOTES.get(c["country"], ""), "signature": config.MERCHANT_NAME}
    out = llm.chat_json(
        "You draft one payment-related email for a freelancer, following the decided next_action and tone. Be culturally appropriate, never threatening. "
        "Use EXACTLY the amounts, dates, fee and installment figures given; if late_fee is null, do not mention a fee; never invent numbers. "
        "Address the client by company or first name if given. Return {\"subject\": str, \"body\": str}.", json.dumps(facts),
        schema={"type": "object", "properties": {"subject": {"type": "string"}, "body": {"type": "string"}}, "required": ["subject", "body"]})
    ok = bool(out and isinstance(out.get("subject"), str) and isinstance(out.get("body"), str) and out["body"].strip())
    if ok and not st["late_fee"] and re.search(r"late[- ]fee", out["body"], re.I):
        ok = False  # guardrail: the model mentioned a fee that policy didn't allow
    draft = {"subject": out["subject"], "body": out["body"]} if ok else _template(c, st["tone"], st["late_fee"], st["sentiment"], st["next_action"], st["installments"])
    return {"draft": draft, "draft_source": (llm.last_model or "llm") if ok else "template", "trace": st["trace"] + ["draft_message"]}

_rg = StateGraph(ReminderState)
for n, f in [("gather_context", r_gather), ("analyze_sentiment", r_sentiment), ("decide_next_action", r_decide),
             ("apply_guardrails", r_guard), ("draft_message", r_draft)]:
    _rg.add_node(n, f)
_rg.set_entry_point("gather_context")
_rg.add_edge("gather_context", "analyze_sentiment"); _rg.add_edge("analyze_sentiment", "decide_next_action")
_rg.add_edge("decide_next_action", "apply_guardrails"); _rg.add_edge("apply_guardrails", "draft_message"); _rg.add_edge("draft_message", END)
reminder_graph = _rg.compile()

def run_reminder_agent(invoice_id: int, today: str) -> dict:
    return reminder_graph.invoke({"invoice_id": invoice_id, "today": today})

# ---------------- Dispute graph ----------------
class DisputeState(TypedDict, total=False):
    dispute: dict
    client_id: int
    invoice_id: int | None
    hits: list
    timeline: list
    assessment: dict
    package: dict
    trace: list

REASON_QUERIES = {"MERCHANDISE_OR_SERVICE_NOT_RECEIVED": "delivered delivery handover files milestone accepted received download",
                  "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED": "scope specification contract approved accepted feedback revision milestone signed",
                  "UNAUTHORISED": "contract signed agreement email account authorised"}

def d_search(st):
    d = st["dispute"]
    q = REASON_QUERIES.get(d.get("reason", ""), "contract delivery milestone accepted") + " " + " ".join(m.get("content", "") for m in d.get("messages", []))
    hits = get_search().search(st["client_id"], q, limit=12)
    s = SessionLocal()
    try:  # always include contract + milestone docs tied to the invoice
        if st.get("invoice_id"):
            extra = s.scalars(select(Evidence).where(Evidence.invoice_id == st["invoice_id"])).all()
            ids = {h["id"] for h in hits}
            hits += [{"id": e.id, "kind": e.kind, "title": e.title, "content": e.content, "invoice_id": e.invoice_id,
                      "occurred_at": e.occurred_at.isoformat(), "score": 0.0} for e in extra if e.id not in ids]
    finally:
        s.close()
    return {"hits": hits, "trace": ["fetch_dispute", "search_evidence"]}

def d_timeline(st):
    tl = sorted(({"date": h["occurred_at"][:10], "kind": h["kind"], "title": h["title"], "evidence_id": h["id"],
                  "excerpt": h["content"][:220]} for h in st["hits"]), key=lambda x: x["date"])
    return {"timeline": tl, "trace": st["trace"] + ["build_timeline"]}

KIND_WEIGHT = {"contract": 1.0, "delivery": 0.95, "milestone": 0.85, "message": 0.7, "file": 0.4}
EXPECTED = {"MERCHANDISE_OR_SERVICE_NOT_RECEIVED": ["delivery"], "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED": ["contract", "milestone"],
            "UNAUTHORISED": ["contract", "message"]}
ACCEPT_RE = re.compile(r"approv|accept|looks great|works|thank|love|received", re.I)

def rules_assessment(reason: str, tl: list) -> dict:
    ranked = sorted(({"evidence_id": t["evidence_id"], "relevance": round(KIND_WEIGHT.get(t["kind"], 0.5) * (1.0 if ACCEPT_RE.search(t["excerpt"]) or t["kind"] != "message" else 0.6), 2),
                      "why": f"{t['kind']} dated {t['date']}"} for t in tl), key=lambda r: -r["relevance"])
    kinds = {t["kind"] for t in tl}; gaps = []
    for k in EXPECTED.get(reason, ["contract"]):
        if k not in kinds: gaps.append(f"No {k} evidence on file for this client.")
    if not any(t["kind"] == "message" and ACCEPT_RE.search(t["excerpt"]) for t in tl):
        gaps.append("No written acceptance or approval from the buyer.")
    if reason == "MERCHANDISE_OR_SERVICE_NOT_RECEIVED":
        gaps.append("Digital service: attach delivery proof (handover email, download/access logs) since there is no shipping tracking.")
    return {"ranked": ranked, "gaps": gaps, "summary": "", "source": "rules"}

ASSESS_SCHEMA = {"type": "object", "properties": {
    "ranked": {"type": "array", "items": {"type": "object", "properties": {
        "evidence_id": {"type": "integer"}, "relevance": {"type": "number", "minimum": 0, "maximum": 1}, "why": {"type": "string"}},
        "required": ["evidence_id", "relevance", "why"]}},
    "gaps": {"type": "array", "items": {"type": "string"}, "maxItems": 6},
    "summary": {"type": "string"}}, "required": ["ranked", "gaps"]}

def d_assess(st):
    d, tl = st["dispute"], st["timeline"]
    ids = {t["evidence_id"] for t in tl}
    out = llm.chat_json("You are a PayPal seller-protection analyst. For this dispute, rank each evidence item by how strongly it rebuts the buyer's claim "
                        "(relevance 0..1, one-line why), and list concrete evidence GAPS the seller should fill before submitting (missing documents, weak points). "
                        "Also give a one-sentence case-strength summary. Only reference the evidence_ids given.",
                        json.dumps({"reason": d.get("reason"), "buyer_messages": [m.get("content") for m in d.get("messages", [])],
                                    "evidence": [{k: t[k] for k in ("evidence_id", "date", "kind", "title", "excerpt")} for t in tl]}),
                        schema=ASSESS_SCHEMA, max_tokens=2048)
    if out and isinstance(out.get("ranked"), list):
        ranked = []
        for r in out["ranked"]:  # validate: only known ids, clamp scores, de-dupe
            try: eid = int(r.get("evidence_id")); rel = max(0.0, min(1.0, float(r.get("relevance", 0))))
            except (TypeError, ValueError): continue
            if eid in ids and eid not in {x["evidence_id"] for x in ranked}:
                ranked.append({"evidence_id": eid, "relevance": round(rel, 2), "why": str(r.get("why", ""))[:240]})
        if ranked:
            missing = ids - {r["evidence_id"] for r in ranked}
            ranked += [{"evidence_id": i, "relevance": 0.0, "why": "not ranked by model"} for i in sorted(missing)]
            ranked.sort(key=lambda r: -r["relevance"])
            gaps = [str(g)[:300] for g in out.get("gaps", []) if isinstance(g, str)][:6]
            return {"assessment": {"ranked": ranked, "gaps": gaps, "summary": str(out.get("summary", ""))[:400], "source": llm.last_model or "llm"},
                    "trace": st["trace"] + ["assess_evidence(llm)"]}
    return {"assessment": rules_assessment(d.get("reason", ""), tl), "trace": st["trace"] + ["assess_evidence(rules)"]}

def d_narrative(st):
    d, tl = st["dispute"], st["timeline"]
    milestones = [t for t in tl if t["kind"] in ("milestone", "delivery")]
    amt = d.get("dispute_amount", {})
    out = llm.chat_json("You write PayPal seller dispute responses. Use ONLY the evidence provided; cite evidence_id in brackets. "
                        "Return JSON {\"statement\": str}. Factual, calm, under 250 words.",
                        json.dumps({"dispute": {k: d.get(k) for k in ("dispute_id", "reason", "dispute_amount", "messages")}, "timeline": tl,
                                    "evidence_ranking": st.get("assessment", {}).get("ranked", [])[:5]}),
                        schema={"type": "object", "properties": {"statement": {"type": "string"}}, "required": ["statement"]})
    if out and isinstance(out.get("statement"), str) and out["statement"].strip():
        statement = out["statement"]; gen = llm.last_model
    else:
        contract = next((t for t in tl if t["kind"] == "contract"), None)
        lines = [f"We respectfully contest dispute {d['dispute_id']} ({d.get('reason','').replace('_',' ').lower()}) for "
                 f"{amt.get('currency_code','')} {amt.get('value','')}."]
        if contract: lines.append(f"The engagement was governed by \"{contract['title']}\" agreed on {contract['date']} [{contract['evidence_id']}].")
        for m in milestones:
            lines.append(f"On {m['date']}: {m['title']} [{m['evidence_id']}].")
        acc = [t for t in tl if re.search(r"approv|accept|thank|looks great|love", t["excerpt"], re.I)]
        if acc: lines.append(f"The buyer acknowledged the work on {acc[-1]['date']}: \"{acc[-1]['excerpt'][:140]}\" [{acc[-1]['evidence_id']}].")
        lines.append("All deliverables were provided as agreed; we request the dispute be resolved in the seller's favour.")
        statement = " ".join(lines); gen = "template"
    evidences = [{"evidence_type": "PROOF_OF_FULFILLMENT" if d.get("reason") == "MERCHANDISE_OR_SERVICE_NOT_RECEIVED" else "OTHER",
                  "evidence_info": {"tracking_info": [], "refund_ids": []}, "notes": statement[:2000]}]
    package = {"dispute_id": d["dispute_id"], "reason": d.get("reason"), "amount": amt, "timeline": tl,
               "milestone_refs": [{"evidence_id": m["evidence_id"], "date": m["date"], "title": m["title"]} for m in milestones],
               "statement": statement, "paypal_evidence_payload": {"evidences": evidences},
               "seller_response_due_date": d.get("seller_response_due_date"), "generated_by": gen, "assessment": st.get("assessment", {})}
    return {"package": package, "trace": st["trace"] + ["draft_narrative"]}

_dg = StateGraph(DisputeState)
_dg.add_node("search_evidence", d_search); _dg.add_node("build_timeline", d_timeline); _dg.add_node("draft_narrative", d_narrative)
_dg.add_node("assess_evidence", d_assess)
_dg.set_entry_point("search_evidence"); _dg.add_edge("search_evidence", "build_timeline")
_dg.add_edge("build_timeline", "assess_evidence"); _dg.add_edge("assess_evidence", "draft_narrative"); _dg.add_edge("draft_narrative", END)
dispute_graph = _dg.compile()

def run_dispute_agent(dispute: dict, client_id: int, invoice_id: int | None) -> dict:
    return dispute_graph.invoke({"dispute": dispute, "client_id": client_id, "invoice_id": invoice_id})

from app.agents import apply_guardrails, rules_decision, rules_assessment, MAX_LATE_FEE_PCT

def C(days, amount=1000.0, status=None, until=None, prior=0):
    return {"amount": amount, "days_overdue": days, "status": status or ("overdue_7" if days >= 7 else "due" if days >= 0 else "sent"),
            "days_until_due": until if until is not None else -days, "avg_days_late_history": None, "prior_reminders": prior}

def test_fee_capped_and_exact():
    g = apply_guardrails(C(10, 1234.56), {"next_action": "remind", "tone": "firm", "late_fee_pct": 9})
    assert g["late_fee_pct"] == MAX_LATE_FEE_PCT and g["late_fee"] == 18.52 and g["guardrail_notes"]

def test_no_fee_before_7_days_and_no_escalation_early():
    g = apply_guardrails(C(4), {"next_action": "escalate", "tone": "firm", "late_fee_pct": 1.5})
    assert g["late_fee"] == 0 and g["next_action"] == "remind"

def test_not_overdue_forces_friendly_remind():
    g = apply_guardrails(C(0, status="due_soon", until=2), {"next_action": "offer_split", "tone": "firm", "late_fee_pct": 0})
    assert (g["next_action"], g["tone"]) == ("remind", "friendly")

def test_split_installments_exact_and_no_fee():
    g = apply_guardrails(C(9, 1450.01), {"next_action": "offer_split", "tone": "neutral", "late_fee_pct": 1.5})
    assert g["installments"] == [725.0, 725.01] and sum(g["installments"]) == 1450.01 and g["late_fee"] == 0

def test_garbage_decision_sanitised():
    g = apply_guardrails(C(8), {"next_action": "wire money", "tone": "angry", "late_fee_pct": "abc"})
    assert g["next_action"] == "remind" and g["tone"] == "neutral" and g["late_fee"] == 0

def test_rules_fallback():
    assert rules_decision(C(-10, until=10, status="sent"), 0.5)["next_action"] == "wait"
    assert rules_decision(C(5), -0.6)["next_action"] == "offer_split"
    assert rules_decision(C(20, prior=1), 0.0)["next_action"] == "escalate"

def test_rules_assessment_flags_gaps():
    tl = [{"evidence_id": 1, "kind": "contract", "date": "2026-01-01", "excerpt": "SOW signed"}]
    a = rules_assessment("MERCHANDISE_OR_SERVICE_NOT_RECEIVED", tl)
    assert any("delivery" in g for g in a["gaps"]) and a["ranked"][0]["evidence_id"] == 1

def test_partial_pct_fee_exact():
    # regression: LG-2026-905 case. Claude chose 0.5% on EUR 6,500, so the fee must be 32.50 at 0.5% (not 1.5%)
    g = apply_guardrails(C(10, 6500.0), {"next_action": "remind", "tone": "neutral", "late_fee_pct": 0.5})
    assert g["late_fee_pct"] == 0.5 and g["late_fee"] == 32.5

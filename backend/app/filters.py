"""NL question -> validated JSON filter spec -> applied in Python over ledger rows. The LLM never produces SQL."""
from __future__ import annotations
import json, re
from typing import Any, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from . import llm

FIELDS: dict[str, str] = {  # field -> type
    "number": "str", "client": "str", "country": "str", "currency": "str", "status": "str",
    "amount": "num", "days_overdue": "num", "issue_date": "date", "due_date": "date", "paid_at": "date",
}
STATUSES = ["draft", "sent", "due_soon", "due", "overdue_3", "overdue_7", "paid", "cancelled"]
OPS = {"str": {"eq", "neq", "in", "contains"}, "num": {"eq", "neq", "gt", "gte", "lt", "lte", "between"},
       "date": {"eq", "gt", "gte", "lt", "lte", "between", "is_null", "not_null"}}

class Condition(BaseModel):
    field: str
    op: str
    value: Any = None

    @model_validator(mode="after")
    def check(self):
        if self.field not in FIELDS:
            raise ValueError(f"unknown field '{self.field}'")
        t = FIELDS[self.field]
        if self.op not in OPS[t]:
            raise ValueError(f"op '{self.op}' not allowed for {self.field}")
        v = self.value
        if self.op in ("is_null", "not_null"):
            self.value = None
        elif self.op == "in":
            if not isinstance(v, list) or not v or not all(isinstance(x, str) for x in v):
                raise ValueError("'in' needs a non-empty list of strings")
        elif self.op == "between":
            if not isinstance(v, list) or len(v) != 2:
                raise ValueError("'between' needs [low, high]")
            if t == "num": self.value = [float(v[0]), float(v[1])]
        elif t == "num":
            if isinstance(v, bool) or not isinstance(v, (int, float, str)):
                raise ValueError("numeric value required")
            self.value = float(v)
        elif t == "date":
            if not isinstance(v, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
                raise ValueError("date must be YYYY-MM-DD")
        elif not isinstance(v, str) or len(v) > 200:
            raise ValueError("string value required")
        if self.field == "status":
            vals = self.value if isinstance(self.value, list) else [self.value]
            bad = [x for x in vals if x not in STATUSES]
            if bad: raise ValueError(f"unknown status {bad}")
        return self

class Sort(BaseModel):
    field: str
    dir: Literal["asc", "desc"] = "desc"
    @field_validator("field")
    @classmethod
    def ok(cls, v):
        if v not in FIELDS: raise ValueError(f"unknown sort field '{v}'")
        return v

class FilterSpec(BaseModel):
    conditions: list[Condition] = Field(default_factory=list, max_length=10)
    sort: Sort | None = None
    limit: int | None = Field(default=None, ge=1, le=500)

def _match(row: dict, c: Condition) -> bool:
    v = row.get(c.field)
    if c.op == "is_null": return v is None
    if c.op == "not_null": return v is not None
    if v is None: return False
    if FIELDS[c.field] == "str":
        v = str(v).lower()
        if c.op == "eq": return v == c.value.lower()
        if c.op == "neq": return v != c.value.lower()
        if c.op == "in": return v in [x.lower() for x in c.value]
        if c.op == "contains": return c.value.lower() in v
    a = v
    if c.op == "eq": return a == c.value
    if c.op == "neq": return a != c.value
    if c.op == "gt": return a > c.value
    if c.op == "gte": return a >= c.value
    if c.op == "lt": return a < c.value
    if c.op == "lte": return a <= c.value
    if c.op == "between": return c.value[0] <= a <= c.value[1]
    return False

def apply(rows: list[dict], spec: FilterSpec) -> list[dict]:
    out = [r for r in rows if all(_match(r, c) for c in spec.conditions)]
    if spec.sort:
        f = spec.sort.field
        out.sort(key=lambda r: (r.get(f) is None, r.get(f) if r.get(f) is not None else 0), reverse=spec.sort.dir == "desc")
    return out[: spec.limit] if spec.limit else out

def summarize(rows: list[dict]) -> dict:
    """Exact figures from the filtered rows; no estimation."""
    by_cur: dict[str, float] = {}
    for r in rows:
        by_cur[r["currency"]] = round(by_cur.get(r["currency"], 0) + r["amount"], 2)
    status_counts: dict[str, int] = {}
    for r in rows:
        status_counts[r["status"]] = status_counts.get(r["status"], 0) + 1
    overdue = [r for r in rows if r["days_overdue"] > 0 and r["status"] != "paid"]
    parts = [f"{len(rows)} invoice(s)"]
    if by_cur: parts.append("totalling " + ", ".join(f"{c} {v:,.2f}" for c, v in sorted(by_cur.items())))
    if overdue:
        parts.append(f"{len(overdue)} past due (max {max(r['days_overdue'] for r in overdue)} days)")
    clients = sorted({r["client"] for r in rows})
    if 0 < len(clients) <= 4: parts.append("clients: " + ", ".join(clients))
    return {"count": len(rows), "totals_by_currency": by_cur, "status_counts": status_counts,
            "past_due_count": len(overdue), "text": "; ".join(parts) + "."}

COUNTRIES = {"kenya": "KE", "united states": "US", "usa": "US", "us": "US", "america": "US", "germany": "DE",
             "uk": "GB", "united kingdom": "GB", "britain": "GB", "netherlands": "NL", "france": "FR", "nigeria": "NG"}
OPEN = ["sent", "due_soon", "due", "overdue_3", "overdue_7"]

CURRENCY_WORDS = {"usd": "USD", "dollar": "USD", "dollars": "USD", "eur": "EUR", "euro": "EUR", "euros": "EUR",
                  "gbp": "GBP", "pound": "GBP", "pounds": "GBP", "kes": "KES", "shilling": "KES", "shillings": "KES", "ksh": "KES"}
SYMBOLS = {"$": "USD", "€": "EUR", "£": "GBP"}

def detect_currency(q: str) -> str | None:
    """Currency explicitly named in the question ('$' => USD, '€' => EUR, '£' => GBP, or a word/code)."""
    for w in re.findall(r"[a-z]+", q.lower()):
        if w in CURRENCY_WORDS: return CURRENCY_WORDS[w]
    for sym, code in SYMBOLS.items():
        if sym in q: return code
    return None

def enforce_currency(spec: "FilterSpec", q: str) -> "FilterSpec":
    """If the question names a currency and the spec filters on amount, amounts must be in that currency."""
    cur = detect_currency(q)
    if cur and any(c.field == "amount" for c in spec.conditions) and not any(c.field == "currency" for c in spec.conditions):
        spec.conditions.append(Condition(field="currency", op="eq", value=cur))
    return spec

def fallback_parse(q: str, client_names: list[str]) -> dict:
    """Deterministic rule-based parser used when no LLM key is configured."""
    s = q.lower()
    conds: list[dict] = []
    if re.search(r"past[- ]?due|overdue|late", s):
        conds += [{"field": "status", "op": "in", "value": ["due", "overdue_3", "overdue_7"]},
                  {"field": "days_overdue", "op": "gt", "value": 0}]
        m = re.search(r"(?:more than|over|>)\s*(\d+)\s*days", s)
        if m: conds.append({"field": "days_overdue", "op": "gt", "value": int(m.group(1))})
    elif re.search(r"\bunpaid\b|\bopen\b|outstanding", s):
        conds.append({"field": "status", "op": "in", "value": OPEN})
    elif re.search(r"\bpaid\b", s):
        conds.append({"field": "status", "op": "eq", "value": "paid"})
    elif re.search(r"due soon|due this week", s):
        conds.append({"field": "status", "op": "in", "value": ["due_soon", "due"]})
    elif re.search(r"\bdrafts?\b", s):
        conds.append({"field": "status", "op": "eq", "value": "draft"})
    amt = r"\$?\s*([\d,]+(?:\.\d+)?)\s*(k)?(?!\s*days)"
    def num(m): return float(m.group(1).replace(",", "")) * (1000 if m.group(2) else 1)
    m = re.search(r"between\s+" + amt + r"\s+and\s+" + amt, s)
    if m:
        lo = float(m.group(1).replace(",", "")) * (1000 if m.group(2) else 1)
        hi = float(m.group(3).replace(",", "")) * (1000 if m.group(4) else 1)
        conds.append({"field": "amount", "op": "between", "value": [lo, hi]})
    else:
        m = re.search(r"(?:over|above|more than|greater than|>)\s*" + amt, s)
        if m and not re.match(r"\s*days", s[m.end():]): conds.append({"field": "amount", "op": "gt", "value": num(m)})
        m = re.search(r"(?:under|below|less than|<)\s*" + amt, s)
        if m and not re.match(r"\s*days", s[m.end():]): conds.append({"field": "amount", "op": "lt", "value": num(m)})
    for name, code in COUNTRIES.items():
        if re.search(rf"\b{re.escape(name)}\b", s):
            conds.append({"field": "country", "op": "eq", "value": code}); break
    cur = detect_currency(q)
    if cur: conds.append({"field": "currency", "op": "eq", "value": cur})
    for cn in client_names:
        first = cn.lower().split()[0]
        if len(first) > 3 and re.search(rf"\b{re.escape(first)}\b", s):
            conds.append({"field": "client", "op": "contains", "value": first}); break
    spec: dict = {"conditions": conds}
    if re.search(r"largest|biggest|top|highest", s): spec["sort"] = {"field": "amount", "dir": "desc"}
    elif conds and conds[0]["field"] == "status" and "days_overdue" in str(conds): spec["sort"] = {"field": "days_overdue", "dir": "desc"}
    m = re.search(r"top\s+(\d+)", s)
    if m: spec["limit"] = int(m.group(1))
    return spec

SYSTEM = """Convert the user's question about their invoice ledger into a JSON filter spec. Output ONLY JSON:
{"conditions":[{"field":..., "op":..., "value":...}], "sort": {"field":..., "dir":"asc|desc"} | null, "limit": int | null}
Fields (type): """ + json.dumps(FIELDS) + """
Ops: str: eq,neq,in,contains; num: eq,neq,gt,gte,lt,lte,between; date: eq,gt,gte,lt,lte,between,is_null,not_null.
status values: """ + json.dumps(STATUSES) + """. 'past due'/'overdue' = status in [due,overdue_3,overdue_7] AND days_overdue>0.
'open'/'unpaid' = status in [sent,due_soon,due,overdue_3,overdue_7]. country is ISO-2. Dates YYYY-MM-DD. Amounts are plain numbers.
If the question names a currency ('$'=USD, '€'=EUR, '£'=GBP, or a code/word), add a currency eq condition; amounts are compared only within that currency."""

FILTER_TOOL_SCHEMA = {  # tool input schema for structured output; FilterSpec still re-validates everything
    "type": "object",
    "properties": {
        "conditions": {"type": "array", "maxItems": 10, "items": {"type": "object", "properties": {
            "field": {"type": "string", "enum": list(FIELDS)},
            "op": {"type": "string", "enum": sorted(set().union(*OPS.values()))},
            "value": {}}, "required": ["field", "op"]}},
        "sort": {"type": ["object", "null"], "properties": {"field": {"type": "string", "enum": list(FIELDS)}, "dir": {"type": "string", "enum": ["asc", "desc"]}}},
        "limit": {"type": ["integer", "null"], "minimum": 1, "maximum": 500}},
    "required": ["conditions"]}

def parse_question(q: str, client_names: list[str], today: str) -> tuple[FilterSpec, str]:
    raw = llm.chat_json(SYSTEM, f"Today is {today}. Question: {q}", schema=FILTER_TOOL_SCHEMA)
    source = f"llm:{llm.last_model or llm.model()}"
    if raw is not None:
        try:
            return enforce_currency(FilterSpec.model_validate(raw), q), source
        except Exception:
            source = "fallback(llm-output-rejected)"
    else:
        source = "fallback"
    return enforce_currency(FilterSpec.model_validate(fallback_parse(q, client_names)), q), source

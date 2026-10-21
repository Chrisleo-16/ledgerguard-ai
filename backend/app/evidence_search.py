"""Evidence search behind a small interface so Elastic hybrid search can be swapped in."""
from __future__ import annotations
import re
from typing import Protocol
from sqlalchemy import text
from .db import engine, Evidence, SessionLocal

class EvidenceSearch(Protocol):
    def init(self) -> None: ...
    def index(self, ev: Evidence) -> None: ...
    def search(self, client_id: int, query: str, limit: int = 10) -> list[dict]: ...

def _fts_query(q: str) -> str:
    toks = [t for t in re.findall(r"[A-Za-z0-9]+", q.lower()) if len(t) > 2]
    return " OR ".join(toks) or "a"

class SqliteFTSSearch:
    def init(self):
        with engine.begin() as c:
            c.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS evidence_fts USING fts5(title, content, evidence_id UNINDEXED, client_id UNINDEXED)"))

    def index(self, ev: Evidence):
        with engine.begin() as c:
            c.execute(text("DELETE FROM evidence_fts WHERE evidence_id = :i"), {"i": ev.id})
            c.execute(text("INSERT INTO evidence_fts(title, content, evidence_id, client_id) VALUES (:t,:c,:i,:cl)"),
                      {"t": ev.title, "c": ev.content, "i": ev.id, "cl": ev.client_id})

    def search(self, client_id, query, limit=10):
        with engine.connect() as c:
            rows = c.execute(text("""SELECT evidence_id, bm25(evidence_fts) AS score FROM evidence_fts
                WHERE evidence_fts MATCH :q AND client_id = :cl ORDER BY score LIMIT :n"""),
                {"q": _fts_query(query), "cl": client_id, "n": limit}).all()
        return _hydrate([(int(r[0]), float(-r[1])) for r in rows])

class PostgresFTSSearch:
    def init(self):
        with engine.begin() as c:
            c.execute(text("CREATE INDEX IF NOT EXISTS evidence_fts_idx ON evidence USING GIN (to_tsvector('english', title || ' ' || content))"))

    def index(self, ev): pass  # expression index maintained by Postgres

    def search(self, client_id, query, limit=10):
        with engine.connect() as c:
            rows = c.execute(text("""SELECT id, ts_rank(to_tsvector('english', title || ' ' || content), q) AS score
                FROM evidence, to_tsquery('english', :q) q
                WHERE client_id = :cl AND to_tsvector('english', title || ' ' || content) @@ q
                ORDER BY score DESC LIMIT :n"""),
                {"q": _fts_query(query).replace(" OR ", " | "), "cl": client_id, "n": limit}).all()
        return _hydrate([(int(r[0]), float(r[1])) for r in rows])

def _hydrate(pairs):
    s = SessionLocal()
    try:
        out = []
        for eid, score in pairs:
            ev = s.get(Evidence, eid)
            if ev:
                out.append({"id": ev.id, "kind": ev.kind, "title": ev.title, "content": ev.content,
                            "invoice_id": ev.invoice_id, "occurred_at": ev.occurred_at.isoformat(), "score": round(score, 4)})
        return out
    finally:
        s.close()

_impl = None
def get_search() -> EvidenceSearch:
    global _impl
    if _impl is None:
        _impl = SqliteFTSSearch() if engine.dialect.name == "sqlite" else PostgresFTSSearch()
    return _impl

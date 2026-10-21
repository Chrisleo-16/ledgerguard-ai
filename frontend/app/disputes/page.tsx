"use client";
import { useEffect, useState } from "react";
import { api, post, Invoice, money } from "@/lib/api";
import { Badge, PageHead, DemoPanel } from "@/components/ui";
const REASONS: Record<string, string> = { MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Not as described", MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Not received", UNAUTHORISED: "Unauthorised" };
const KIND_ICON: Record<string, string> = { contract: "📄", milestone: "🏁", delivery: "📦", message: "💬", file: "📎" };

export default function DisputesPage() {
  const [ev, setEv] = useState<any[]>([]); const [activity, setActivity] = useState<any[]>([]);
  const [ds, setDs] = useState<any[]>([]); const [invs, setInvs] = useState<Invoice[]>([]); const [selId, setSelId] = useState<number | null>(null);
  const [simInv, setSimInv] = useState(0); const [reason, setReason] = useState(Object.keys(REASONS)[0]);
  const [note, setNote] = useState<{ t: string; err?: boolean } | null>(null); const [busy, setBusy] = useState(false); const [confirming, setConfirming] = useState(false);
  const load = async () => {
    const [d, i, e, a] = await Promise.all([api("/api/disputes"), api("/api/invoices"), api("/api/evidence/summary"), api("/api/activity")]);
    setDs(d); setInvs(i); setEv(e); setActivity(a);
    setSelId(cur => cur && d.some((x: any) => x.id === cur) ? cur : d[0]?.id ?? null);
    setSimInv(cur => cur || (i.find((x: Invoice) => x.client.startsWith("Brightwave") && x.status !== "paid") || i[0])?.id || 0);
  };
  useEffect(() => { load().catch(e => setNote({ t: String(e), err: true })); }, []);
  const act = async (f: () => Promise<any>, ok: (r: any) => string) => { setBusy(true); try { const r = await f(); setNote({ t: ok(r) }); await load(); } catch (e) { setNote({ t: String(e), err: true }); } finally { setBusy(false); setConfirming(false); } };
  const d = ds.find(x => x.id === selId); const p = d?.package || {}; const inv = invs.find(i => i.id === d?.invoice_id);
  const asmt = p.assessment || {}; const rel: Record<number, any> = Object.fromEntries((asmt.ranked || []).map((r: any) => [r.evidence_id, r]));
  const msIds = new Set((p.milestone_refs || []).map((m: any) => m.evidence_id));

  return (<>
    <PageHead title="Disputes" sub="When a buyer opens a PayPal dispute, LedgerGuard gathers your evidence and drafts a defense package. You review it before anything is submitted."
      right={<button className="btn ghost" disabled={busy} onClick={() => act(() => post("/api/paypal/sync"), r => `Synced with PayPal: ${r.new_disputes.length} new dispute(s).`)}>🔄 Check PayPal for disputes</button>} />
    {note && <div className={`notice ${note.err ? "err" : ""}`}>{note.t}</div>}
    <DemoPanel hint="simulate a CUSTOMER.DISPUTE.CREATED webhook (mock mode)">
      <div className="group"><span>Open a dispute</span>
        <select value={simInv} onChange={e => setSimInv(+e.target.value)}>{invs.map(i => <option key={i.id} value={i.id}>{i.number} · {i.client} · {money(i.amount, i.currency)}</option>)}</select>
        <select value={reason} onChange={e => setReason(e.target.value)}>{Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button className="btn sm" disabled={busy || !simInv} onClick={() => act(() => post("/api/dev/simulate/dispute", { invoice_id: simInv, reason }), r => `Webhook received: dispute ${r.result.dispute_id} opened. ${r.result.evidence_items} evidence items found and a defense package was drafted.`)}>Simulate dispute webhook</button></div>
    </DemoPanel>

    {ds.length === 0 ? <div className="card empty"><div className="empty-icon">🛡️</div><h2>No disputes. You're in good standing.</h2>
      <p>If a buyer opens a dispute, LedgerGuard prepares your defense automatically and waits for your sign-off.</p>
      <div className="steps">
        <div className="step"><b><span className="num">1</span>Detect</b><span className="muted">PayPal sends a dispute webhook, or Sync finds the new dispute.</span></div>
        <div className="step"><b><span className="num">2</span>Gather</b><span className="muted">Searches this client's contracts, milestones, delivery notes and messages.</span></div>
        <div className="step"><b><span className="num">3</span>Draft</b><span className="muted">The AI builds a dated timeline and a statement that cites each piece of evidence.</span></div>
        <div className="step"><b><span className="num">4</span>You approve</b><span className="muted">Evidence goes to PayPal only when you click Approve & submit.</span></div>
      </div><p>Try it: open <b>Demo controls</b> above and simulate a dispute.</p></div>
    : <div className="split" style={{ gridTemplateColumns: "minmax(260px,340px) minmax(0,1fr)" }}>
      <div className="card"><div className="card-head"><h2>Cases</h2><span className="muted">{ds.length}</span></div><div className="list">
        {ds.map(x => <button key={x.id} className={`list-item ${x.id === selId ? "active" : ""}`} onClick={() => { setSelId(x.id); setConfirming(false); }}>
          <div className="row" style={{ justifyContent: "space-between" }}><b>{x.paypal_dispute_id}</b><Badge s={x.status} /></div>
          <div className="muted">{REASONS[x.reason] || x.reason} · {x.package?.amount?.currency_code} {Number(x.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="muted">{invs.find(i => i.id === x.invoice_id)?.client || "Unmatched client"}</div></button>)}
      </div></div>
      {d && <div className="card">
        <div className="card-head"><div><h2>{d.paypal_dispute_id} · {REASONS[d.reason] || d.reason}</h2>
          <div className="muted">{inv ? `${inv.client} · invoice ${inv.number} · ` : ""}{p.amount?.currency_code} {p.amount?.value} · respond by {p.seller_response_due_date?.slice(0, 10) || "—"}</div></div><Badge s={d.status} /></div>
        {d.details?.messages?.length > 0 && <div className="notice" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}><b>Buyer says:</b> “{d.details.messages.map((m: any) => m.content).join(" / ")}”</div>}
        {!d.package?.statement ? <p className="muted">No stored evidence matched this client yet, so no package was generated.</p> : <>
        <div className="split" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
          <div><h3>Evidence timeline</h3><ul className="timeline">{(p.timeline || []).map((t: any) =>
            <li key={t.evidence_id} className={msIds.has(t.evidence_id) ? "ms" : ""}>
              <div className="row" style={{ gap: 6 }}><span className="muted">{t.date}</span><span className="badge">{KIND_ICON[t.kind] || "•"} {t.kind}</span><span className="muted">#{t.evidence_id}</span></div>
              <div><b>{t.title}</b></div><div className="muted">{t.excerpt}</div>
              {rel[t.evidence_id] && <div className="rel"><span className="rel-bar"><span style={{ width: `${Math.round(rel[t.evidence_id].relevance * 100)}%` }} /></span>
                <span className="muted">relevance {Math.round(rel[t.evidence_id].relevance * 100)}% · {rel[t.evidence_id].why}</span></div>}</li>)}</ul></div>
          <div>{asmt.ranked && <div className="ai-box" style={{ marginTop: 0 }}>
              <div className="row" style={{ gap: 6 }}><span className="ai-tag">{asmt.source === "rules" ? "Rules engine" : "✦ AI evidence review"}</span><span className="muted">{asmt.source}</span></div>
              {asmt.summary && <div className="ai-text">{asmt.summary}</div>}
              {asmt.gaps?.length > 0 ? <><div className="guard" style={{ marginTop: 6 }}>⚠ Gaps to fill before submitting:</div>
                <ul className="gaps">{asmt.gaps.map((g: string, i: number) => <li key={i}>{g}</li>)}</ul></> : <div className="muted">No evidence gaps flagged.</div>}
            </div>}
            <h3>Milestones referenced</h3>{(p.milestone_refs || []).length ? <ul style={{ paddingLeft: 18, margin: 0 }}>{p.milestone_refs.map((m: any) => <li key={m.evidence_id}>{m.date}: {m.title} <span className="muted">#{m.evidence_id}</span></li>)}</ul> : <p className="muted">None found.</p>}
            <h3>Statement to PayPal</h3><div className="letter">{p.statement}</div>
            <div className="muted">Drafted by {p.generated_by} · Evidence type: {p.paypal_evidence_payload?.evidences?.[0]?.evidence_type}</div>
            <div style={{ marginTop: 14 }}>
              {d.status === "package_ready" && !confirming && <button className="btn success" onClick={() => setConfirming(true)}>✅ Approve & submit evidence</button>}
              {d.status === "package_ready" && confirming && <div className="notice"><b>Submit to PayPal?</b> This calls the provide-evidence API and can't be undone.
                <div className="row" style={{ marginTop: 8 }}><button className="btn success sm" disabled={busy} onClick={() => act(() => post(`/api/disputes/${d.id}/submit-evidence`), () => "Evidence submitted to PayPal. The case is now under review.")}>Yes, submit</button>
                <button className="btn ghost sm" onClick={() => setConfirming(false)}>Cancel</button></div></div>}
              {d.status === "submitted" && <div className="notice" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>Submitted {p.submitted_at?.slice(0, 16).replace("T", " ")} UTC. PayPal is reviewing.</div>}
            </div></div></div></>}
      </div>}</div>}
    <div className="two-col">
      <div className="card"><div className="card-head"><h2>Evidence library</h2><span className="muted">What a defense can cite, per client</span></div>
        <table className="simple-table"><thead><tr><th>Client</th><th className="num">Contracts</th><th className="num">Milestones</th><th className="num">Deliveries</th><th className="num">Messages</th><th className="num">Files</th></tr></thead>
          <tbody>{ev.map(r => <tr key={r.client_id}><td>{r.client}</td>{["contract", "milestone", "delivery", "message", "file"].map(k => <td key={k} className="num">{r[k] || "—"}</td>)}</tr>)}</tbody></table>
        <p className="muted" style={{ marginBottom: 0 }}>Searched with full-text search (SQLite FTS5 / Postgres) when a dispute arrives.</p></div>
      <div className="card"><div className="card-head"><h2>Recent PayPal activity</h2><span className="muted">Webhook events received</span></div>
        {activity.length === 0 ? <div className="empty-inline"><div className="empty-icon">⚡</div><div>No webhook events yet. Payments and disputes from PayPal show up here as they arrive.</div></div>
        : <ul className="activity">{activity.map(a => <li key={a.id}><span className="when">{new Date(a.received_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span className={`badge ${a.event_type.includes("DISPUTE") ? "b-warn" : "b-ok"}`}>{a.event_type.includes("DISPUTE") ? "Dispute opened" : "Payment received"}</span>
            <span>{a.ref || "—"}</span><span className="muted" style={{ marginLeft: "auto" }}>{a.event_type}</span></li>)}</ul>}</div>
    </div>
  </>);
}

"use client";
import { ReactNode } from "react";
export const STATUS_LABEL: Record<string, string> = { draft: "Draft", sent: "Sent", due_soon: "Due soon", due: "Due", overdue_3: "Overdue 3d+",
  overdue_7: "Overdue 7d+", paid: "Paid", cancelled: "Cancelled", superseded: "Superseded", approved: "Approved",
  received: "Received", package_ready: "Awaiting your approval", submitted: "Evidence submitted", no_action: "No action needed",
  wait: "Wait", remind: "Remind", offer_split: "Offer split payment", offer_pay_later: "Offer Pay Later", escalate: "Escalate" };
const STATUS_KIND: Record<string, string> = { sent: "info", due_soon: "warn", due: "warn", overdue_3: "bad", overdue_7: "bad", paid: "ok",
  approved: "ok", submitted: "ok", package_ready: "warn", received: "info", friendly: "ok", neutral: "info", firm: "bad", remind: "info", offer_split: "ok", offer_pay_later: "ok", escalate: "bad", wait: "neutral" };
export function Badge({ s, label }: { s: string; label?: string }) {
  return <span className={`badge b-${STATUS_KIND[s] || "neutral"}`}>{label ?? STATUS_LABEL[s] ?? s}</span>;
}
export function fmtTotals(t: Record<string, number> | undefined): [string, string][] {
  return Object.entries(t || {}).map(([c, v]) => [c, v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);
}
/** KPI in a tray: exact per-currency totals + a segmented meter showing an exact count ratio (part/whole). */
export function Kpi({ label, totals, foot, kind, part, whole }: { label: string; totals?: Record<string, number>; foot: ReactNode; kind?: string; part?: number; whole?: number }) {
  const lines = fmtTotals(totals); const N = 20;
  const on = whole ? Math.round((Math.min(part || 0, whole) / whole) * N) : 0;
  return <div className={`kpi ${kind || ""}`}><div className="label"><i />{label}</div><div className="inner">
    <div className={lines.length > 1 ? "multi" : ""}>{lines.length ? lines.map(([c, v]) => <div key={c} className="value-line"><span className="cur">{c}</span>{v}</div>)
      : <div className="value-line">—</div>}</div><div className="foot">{foot}</div>
    {whole != null && <div className="meter" title={`${part} of ${whole}`}>{Array.from({ length: N }, (_, i) => <span key={i} className={i < on ? "on" : ""} />)}</div>}
  </div></div>;
}
export const Thinking = () => <span className="thinking"><i /><i /><i /></span>;
export function PageHead({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) {
  return <div className="page-head"><div><h1>{title}</h1><p>{sub}</p></div>{right}</div>;
}
export function DemoPanel({ children, hint }: { children: ReactNode; hint?: string }) {
  return <details className="demo"><summary>🧪 Demo controls <span className="muted">{hint || "time travel and webhook simulation for judges/testing"}</span></summary>
    <div className="body">{children}</div></details>;
}

export function AiRationale({ r }: { r: any }) {
  const src = r.decision_source; const ai = src && src !== "rules";
  return <div className="ai-box">
    <div className="row" style={{ gap: 6 }}><span className="ai-tag">{ai ? "✦ AI decision" : "Rules engine"}</span>
      {r.next_action && <Badge s={r.next_action} />}<span className="muted">{ai ? src : "no LLM / fallback"}</span></div>
    {r.rationale && <div className="ai-text">{r.rationale}</div>}
    {r.guardrail_notes?.length > 0 && <div className="guard">🛡 Guardrails applied: {r.guardrail_notes.join("; ")}</div>}
  </div>;
}

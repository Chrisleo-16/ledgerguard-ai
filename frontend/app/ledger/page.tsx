"use client";
import { useEffect, useMemo, useState } from "react";
import { api, post, Invoice } from "@/lib/api";
import { Badge, PageHead, Thinking } from "@/components/ui";
import { AgGridReact, amountFmt, COUNTRY } from "@/components/grid";
const EXAMPLES = ["past-due invoices over $1000", "unpaid invoices from Germany", "paid invoices", "overdue more than 5 days", "largest open invoices in USD", "invoices under 1k"];
export default function LedgerPage() {
  const [rows, setRows] = useState<Invoice[]>([]); const [q, setQ] = useState(""); const [res, setRes] = useState<any>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/invoices").then(setRows).catch(e => setErr(String(e))); }, []);
  const cols = useMemo(() => [
    { field: "number", headerName: "Invoice", width: 172, minWidth: 172 },
    { field: "client", headerName: "Client", flex: 1, minWidth: 120, wrapText: true, autoHeight: true,
      cellRenderer: (p: any) => <span>{p.value} <span className="cell-sub">{COUNTRY[p.data.country] || p.data.country}</span></span> },
    { field: "description", headerName: "Description", flex: 1.3, minWidth: 140, wrapText: true, autoHeight: true },
    { field: "amount", headerName: "Amount", width: 125, type: "rightAligned", cellRenderer: (p: any) => <span><span className="cell-sub">{p.data.currency}</span> {amountFmt(p)}</span> },
    { field: "status", headerName: "Status", width: 120, cellRenderer: (p: any) => <Badge s={p.value} /> },
    { field: "due_date", headerName: "Due date", width: 168, cellRenderer: (p: any) => <span>{p.value}{p.data.days_overdue > 0 && <span className="cell-sub"> · {p.data.days_overdue}d late</span>}</span> },
    { field: "paid_at", headerName: "Paid at", width: 112, valueFormatter: (p: any) => p.value || "—" },
  ] as any, []);
  const ask = async (question: string) => { if (!question.trim()) return; setErr(""); setBusy(true);
    try { const r = await post("/api/ledger/query", { question }); setRes(r); setRows(r.rows); } catch (e) { setErr(String(e)); } finally { setBusy(false); } };
  const reset = async () => { setRes(null); setQ(""); setRows(await api("/api/invoices")); };
  const fmtCond = (c: any) => `${c.field.replace("_", " ")} ${({ eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", in: "in", contains: "contains", between: "between" } as any)[c.op] || c.op} ${Array.isArray(c.value) ? c.value.join(", ") : c.value ?? ""}`;
  return (<>
    <PageHead title="Ledger" sub="Ask a question in plain English. LedgerGuard turns it into a checked filter, so the AI never writes database queries, and every total is calculated from your data." />
    <div className="card">
      <form className="askbar" onSubmit={e => { e.preventDefault(); ask(q); }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ask your ledger… e.g. past-due invoices over $1000" />
        <button className="btn" type="submit" disabled={busy}>{busy ? <Thinking /> : "Ask ↵"}</button>
        {res && <button type="button" className="btn ghost" onClick={reset}>Clear</button>}</form>
      <div className="chips" style={{ marginTop: 10 }}>{EXAMPLES.map(x => <button key={x} className="chip" onClick={() => { setQ(x); ask(x); }}>{x}</button>)}</div>
      {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
      {res && <div className="answer"><b>{res.summary.text}</b>
        <div className="row" style={{ marginTop: 8, gap: 6 }}><span className="muted">Filter applied:</span>
          {res.spec.conditions.length ? res.spec.conditions.map((c: any, i: number) => <span key={i} className="badge b-info">{fmtCond(c)}</span>) : <span className="muted">none (all rows)</span>}
          {res.spec.sort && <span className="badge">sort {res.spec.sort.field} {res.spec.sort.dir}</span>}
          <span className="muted">· parsed by {res.parser}</span></div></div>}
    </div>
    <div className="card"><div className="card-head"><h2>{res ? "Matching invoices" : "All invoices"}</h2><span className="muted">{rows.length} row{rows.length === 1 ? "" : "s"}</span></div>
      <div className="ag-theme-quartz ledger-grid">
        <AgGridReact rowData={rows} columnDefs={cols} domLayout="autoHeight" pagination={rows.length > 15} paginationPageSize={15} paginationPageSizeSelector={[15, 30, 100]}
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }} rowHeight={44} />
      </div></div>
  </>);
}

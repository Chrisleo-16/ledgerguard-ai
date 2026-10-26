"use client";
import { Flag } from "@/components/flag";
import { useEffect, useMemo, useState } from "react";
import { api, post, Invoice } from "@/lib/api";
import { Badge, PageHead, Thinking } from "@/components/ui";
import { Button, Card, CardBody, Chip, Input, Kbd, Skeleton } from "@heroui/react";
import { Icon } from "@/components/icons";
import { AgGridReact, amountFmt, COUNTRY, useIsMobile } from "@/components/grid";
const EXAMPLES = ["past-due invoices over $1000", "unpaid invoices from Germany", "paid invoices", "overdue more than 5 days", "largest open invoices in USD", "invoices under 1k"];
export default function LedgerPage() {
  const [rows, setRows] = useState<Invoice[]>([]); const [q, setQ] = useState(""); const [res, setRes] = useState<any>(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/invoices").then(setRows).catch(e => setErr(String(e))); }, []);
  const mobile = useIsMobile();
  const cols = useMemo(() => [
    { field: "number", headerName: "Invoice", width: mobile ? 140 : 172, minWidth: mobile ? 140 : 172, pinned: mobile ? "left" : undefined },
    { field: "client", headerName: "Client", flex: 1, minWidth: 120, wrapText: true, autoHeight: true,
      cellRenderer: (p: any) => <span>{p.value} <span className="cell-sub cell-flag"><Flag code={p.data.country || ""} size={14} />{COUNTRY[p.data.country] || p.data.country}</span></span> },
    { field: "description", headerName: "Description", hide: mobile, flex: 1.3, minWidth: 140, wrapText: true, autoHeight: true },
    { field: "amount", headerName: "Amount", width: 125, type: "rightAligned", cellRenderer: (p: any) => <span><span className="cell-sub">{p.data.currency}</span> {amountFmt(p)}</span> },
    { field: "status", headerName: "Status", width: 120, cellRenderer: (p: any) => <Badge s={p.value} /> },
    { field: "due_date", headerName: "Due date", width: 168, cellRenderer: (p: any) => <span>{p.value}{p.data.days_overdue > 0 && <span className="cell-sub"> · {p.data.days_overdue}d late</span>}</span> },
    { field: "paid_at", headerName: "Paid at", hide: mobile, width: 112, valueFormatter: (p: any) => p.value || "—" },
  ] as any, [mobile]);
  const ask = async (question: string) => { if (!question.trim()) return; setErr(""); setBusy(true);
    try { const r = await post("/api/ledger/query", { question }); setRes(r); setRows(r.rows); } catch (e) { setErr(String(e)); } finally { setBusy(false); } };
  const reset = async () => { setRes(null); setQ(""); setRows(await api("/api/invoices")); };
  const fmtCond = (c: any) => `${c.field.replace("_", " ")} ${({ eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", in: "in", contains: "contains", between: "between" } as any)[c.op] || c.op} ${Array.isArray(c.value) ? c.value.join(", ") : c.value ?? ""}`;
  return (<>
    <PageHead icon="ledger" title="Ledger" sub="Ask a question in plain English. LedgerGuard turns it into a checked filter, so the AI never writes database queries, and every total is calculated from your data." />
    <div className="card">
      <form role="search" onSubmit={e => { e.preventDefault(); ask(q); }}>
        <Input aria-label="Ask your ledger" value={q} onValueChange={setQ} radius="full" size="lg" variant="bordered" placeholder="Ask your ledger… e.g. past-due invoices over $1000"
          classNames={{ inputWrapper: "ask-wrap h-[52px] bg-content1 border-default-300 shadow-medium pr-1.5 data-[hover=true]:border-default-400 group-data-[focus=true]:border-foreground group-data-[focus=true]:ring-4 group-data-[focus=true]:ring-secondary-100", input: "text-[16px] placeholder:text-default-600" }}
          startContent={<Icon n="search" size={18} className="text-default-600 shrink-0" />}
          endContent={<div className="flex items-center gap-1.5 shrink-0">
            {!q && <Kbd keys={["enter"]} className="hidden md:inline-flex text-[11px]">Enter</Kbd>}
            {(q || res) && <Button isIconOnly size="sm" radius="full" variant="flat" aria-label="Clear question and results" onPress={reset} className="min-w-7 w-7 h-7"><Icon n="close" size={14} /></Button>}
            <Button isIconOnly type="submit" radius="full" color="primary" aria-label="Ask" isDisabled={busy || !q.trim()} className="w-10 h-10 min-w-10">{busy ? <Thinking /> : <Icon n="arrowUp" size={18} stroke={2} />}</Button></div>} />
      </form>
      <div className="ask-chips" aria-label="Example questions">{EXAMPLES.map(x => <Chip key={x} as="button" variant="flat" radius="full" className="chip-btn cursor-pointer h-8 px-1 text-[13px] text-default-700 bg-default-100 hover:bg-default-200 transition-colors" onClick={() => { setQ(x); ask(x); }}>{x}</Chip>)}</div>
      {busy && !res && <Card shadow="none" radius="lg" className="mt-4 bg-default-50"><CardBody className="gap-3 p-5"><Skeleton className="rounded-md h-7 w-48" /><Skeleton className="rounded-md h-4 w-72" /><Skeleton className="rounded-md h-4 w-60" /></CardBody></Card>}
      {err && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
      {res && <Card shadow="sm" radius="lg" className="answer2" aria-live="polite"><CardBody className="gap-1.5 p-5">
        <div className="a-total">{Object.keys(res.summary.totals_by_currency || {}).length
          ? Object.entries(res.summary.totals_by_currency).sort().map(([c, v]: any) => <span key={c}><small>{c}</small> {Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>)
          : <span>No matching invoices</span>}</div>
        <div className="a-meta">{res.summary.count} invoice{res.summary.count === 1 ? "" : "s"}{res.summary.past_due_count ? ` · ${res.summary.past_due_count} past due` : ""}{(() => { const m = /clients: (.*)\.$/.exec(res.summary.text); return m ? ` · ${m[1]}` : ""; })()}</div>
        <div className="a-filters"><span className="muted">Filter</span>
          {res.spec.conditions.length ? res.spec.conditions.map((c: any, i: number) => <span key={i} className="fchip">{fmtCond(c)}</span>) : <span className="muted">none (all rows)</span>}
          {res.spec.sort && <span className="fchip">sort {res.spec.sort.field} {res.spec.sort.dir}</span>}
          <span className="muted a-parser">parsed by {res.parser}</span></div></CardBody></Card>}
    </div>
    <div className="card"><div className="card-head"><h2><Icon n="db" />{res ? "Matching invoices" : "All invoices"}</h2><span className="muted">{rows.length} row{rows.length === 1 ? "" : "s"}</span></div>
      <div className="ag-theme-quartz ledger-grid">
        <AgGridReact rowData={rows} columnDefs={cols} domLayout="autoHeight" pagination={rows.length > 15} paginationPageSize={15} paginationPageSizeSelector={[15, 30, 100]}
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }} rowHeight={44} />
      </div></div>
  </>);
}

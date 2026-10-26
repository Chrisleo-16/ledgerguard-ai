"use client";
import { AnimatedCheckbox } from "@/components/animated-checkbox";
import { Flag } from "@/components/flag";
import { useEffect, useMemo, useState } from "react";
import { api, post, Invoice, money, feeLabel } from "@/lib/api";
import { Badge, Kpi, KpiSkeleton, PageHead, DemoPanel, STATUS_LABEL, AiRationale, Notice, errNote, type Note } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Button, Card, CardBody, Skeleton } from "@heroui/react";
import { Icon, IconTile } from "@/components/icons";
import { AgGridReact, amountFmt, COUNTRY, useIsMobile } from "@/components/grid";

const OPEN = ["sent", "due_soon", "due", "overdue_3", "overdue_7"];
export default function InvoicesPage() {
  const [invs, setInvs] = useState<Invoice[]>([]); const [rems, setRems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]); const [sum, setSum] = useState<any>(null);
  const [note, setNote] = useState<Note>(null); const toast = useToast(); const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false); const [showAll, setShowAll] = useState(false); const [simId, setSimId] = useState(0);
  const due0 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
  const [form, setForm] = useState({ client_id: 1, description: "Landing page redesign", amount: 1800, currency: "USD", due_date: due0 });
  const load = async () => {
    const [i, r, c, s] = await Promise.all([api("/api/invoices"), api("/api/reminders"), api("/api/clients"), api("/api/summary")]);
    setInvs(i); setRems(r); setClients(c); setSum(s);
  };
  useEffect(() => { load().catch(e => setNote(errNote(e))); }, []);
  const act = async (o: { loading: string; success: string }, f: () => Promise<any>, ok: (r: any) => string) => {
    setBusy(true); try { const r = await toast.run(f, { ...o, message: ok }); if (r !== undefined) await load(); } catch {} finally { setBusy(false); }
  };
  const invById = useMemo(() => Object.fromEntries(invs.map(i => [i.id, i])), [invs]);
  const openInvs = invs.filter(i => OPEN.includes(i.status));
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const visibleRems = rems.filter(r => showAll || ["draft", "approved", "no_action"].includes(r.status));

  const waitNotes = visibleRems.filter(r => r.status === "no_action");
  const letters = visibleRems.filter(r => r.status !== "no_action");
  const mobile = useIsMobile();
  const cols = useMemo(() => [
    { field: "number", headerName: "Invoice", width: mobile ? 150 : 210, minWidth: mobile ? 150 : 210, pinned: mobile ? "left" : undefined, cellRenderer: (p: any) => <span className="cell-lead"><IconTile n="invoices" size={13} />{p.value}</span> },
    { field: "client", headerName: "Client", flex: 1, minWidth: 150, wrapText: true, autoHeight: true,
      cellRenderer: (p: any) => <span>{p.value} <span className="cell-sub cell-flag"><Flag code={p.data.country || ""} size={14} />{COUNTRY[p.data.country] || p.data.country}</span></span> },
    { field: "amount", headerName: "Amount", width: 130, type: "rightAligned", cellRenderer: (p: any) => <span><span className="cell-sub">{p.data.currency}</span> {amountFmt(p)}</span> },
    { field: "due_date", headerName: "Due date", width: 178, cellRenderer: (p: any) => <span>{p.value}{p.data.days_overdue > 0 && <span className="cell-sub"> · {p.data.days_overdue}d late</span>}</span> },
    { field: "status", headerName: "Status", width: 120, cellRenderer: (p: any) => <Badge s={p.value} /> },
    { headerName: "", colId: "actions", width: 168, sortable: false, resizable: false, cellRenderer: (p: any) => {
        const i: Invoice = p.data;
        if (i.status === "draft") return <Button color="primary" size="sm" radius="full" isDisabled={busy} onPress={() => act({ loading: "Sending the invoice…", success: "Invoice sent" }, () => post(`/api/invoices/${i.id}/send`), r => `Sent ${r.number} via PayPal`)}>Send via PayPal</Button>;
        if (OPEN.includes(i.status)) return <Button variant="bordered" className="bg-content1 border-default-200" size="sm" radius="full" isDisabled={busy} onPress={() => act({ loading: "AI is drafting the reminder…", success: "Reminder drafted" }, () => post(`/api/invoices/${i.id}/reminders`), r => `AI drafted a ${r.tone} reminder for ${i.number}. You'll find it under Reminder drafts.`)}><Icon n="ai" size={14} /> Draft reminder</Button>;
        return null; } },
  ] as any, [busy, mobile]);

  return (<>
    <PageHead icon="invoices" title="Invoices" sub="Every PayPal invoice, its status, and AI-drafted payment reminders. You approve every reminder before it goes anywhere."
      right={<div className="row">
        <Button variant="bordered" className="bg-content1 border-default-200" size="md" radius="full" isDisabled={busy} onPress={() => act({ loading: "Syncing with PayPal…", success: "Sync done" }, () => post("/api/paypal/sync"), r => `Synced with PayPal: ${r.checked} checked, ${r.paid.length} newly paid, ${r.new_disputes.length} new disputes.${r.errors.length ? ` ${r.errors.length} item${r.errors.length > 1 ? "s" : ""} couldn't be checked right now. ${r.errors[0].message}` : ""}`)}><Icon n="sync" /> Sync with PayPal</Button>
        <Button color="primary" size="md" radius="full" onPress={() => setShowNew(!showNew)}>{showNew ? <><Icon n="close" /> Close</> : <><Icon n="add" /> New invoice</>}</Button></div>} />

    {!sum && <div className="kpis" aria-busy="true">{[0, 1, 2, 3].map(i => <KpiSkeleton key={i} />)}</div>}
    {sum && <div className="kpis">
      <Kpi label="Outstanding" icon="wallet" totals={sum.outstanding.totals} foot={`${sum.outstanding.count} of ${invs.length} invoices open`} part={sum.outstanding.count} whole={invs.length} />
      <Kpi label="Overdue" icon="clock" kind="bad" totals={sum.overdue.totals} foot={`${sum.overdue.count} past due · ${sum.drafts_pending} reminder draft${sum.drafts_pending === 1 ? "" : "s"} waiting`} part={sum.overdue.count} whole={sum.outstanding.count} />
      <Kpi label="Paid this month" icon="received" kind="ok" totals={sum.paid_this_month.totals} foot={`${sum.paid_this_month.count} invoice${sum.paid_this_month.count === 1 ? "" : "s"} · ${sum.month}`} part={sum.paid_this_month.count} whole={invs.filter(i => i.status === "paid").length} />
      <Kpi label="Open disputes" icon="disputes" kind="warn" totals={sum.open_disputes.totals} foot={`${sum.open_disputes.count} open · ${sum.open_disputes.awaiting_approval} awaiting approval`} part={sum.open_disputes.awaiting_approval} whole={sum.open_disputes.count} />
    </div>}

    <Notice note={note} onClose={() => setNote(null)} />

    {showNew && <div className="card"><div className="card-head"><h2><Icon n="invoices" />New invoice</h2><span className="muted">Created and sent with the PayPal Invoicing API v2</span></div>
      <div className="row" style={{ alignItems: "flex-end" }}>
        <label className="field">Client<select value={form.client_id} onChange={e => setForm({ ...form, client_id: +e.target.value })}>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.country})</option>)}</select></label>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
        <label className="field">Amount<input type="number" style={{ width: 120 }} value={form.amount} onChange={e => setForm({ ...form, amount: +e.target.value })} /></label>
        <label className="field">Currency<select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>{["USD", "EUR", "GBP"].map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="field">Due date<input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></label>
        <Button color="primary" size="md" radius="full" isDisabled={busy} onPress={() => act({ loading: "Creating the invoice…", success: "Invoice created and sent" }, () => post("/api/invoices", { ...form, send: true }), r => { setShowNew(false); return `Invoice ${r.number} created and sent (PayPal ${r.paypal_id}).`; })}>Create & send</Button>
      </div></div>}

    <DemoPanel>
      <div className="group"><span>Time travel</span>
        {[1, 3, 7].map(d => <button key={d} className="btn ghost sm" disabled={busy} onClick={() => act({ loading: "Moving the demo clock…", success: "Clock moved" }, () => post("/api/dev/clock/advance", { days: d }), r => `Clock moved to ${r.today}. ${r.changes.length ? r.changes.map((c: any) => `${c.invoice}: ${STATUS_LABEL[c.from]} → ${STATUS_LABEL[c.to]}`).join(" · ") : "No status changes."}`)}>+{d} day{d > 1 ? "s" : ""}</button>)}
        <Button variant="bordered" className="bg-content1 border-default-200" size="sm" radius="full" isDisabled={busy} onPress={() => act({ loading: "Resetting the demo clock…", success: "Clock reset" }, () => post("/api/dev/clock/reset"), r => `Clock reset to ${r.today}.`)}>Reset to today</Button></div>
      <div className="group"><span>AI agent</span>
        <Button color="primary" size="sm" radius="full" isDisabled={busy} onPress={() => act({ loading: "Chaser agent is reviewing invoices…", success: "Chaser run done" }, () => post("/api/reminders/run"), r => `Chaser agent reviewed open invoices and drafted ${r.drafted.length} reminder(s).`)}><Icon n="ai" size={14} /> Run chaser on all due/overdue invoices</Button></div>
      <div className="group"><span>Payment webhook</span>
        <select value={simId} onChange={e => setSimId(+e.target.value)}><option value={0}>Choose an open invoice…</option>
          {openInvs.map(i => <option key={i.id} value={i.id}>{i.number} · {i.client} · {money(i.amount, i.currency)}</option>)}</select>
        <Button variant="bordered" className="bg-content1 border-default-200" size="sm" radius="full" isDisabled={busy || !simId} onPress={() => act({ loading: "Simulating the payment…", success: "Payment received" }, () => post("/api/dev/simulate/payment", { invoice_id: simId }), r => { setSimId(0); return `INVOICING.INVOICE.PAID received → ${r.result.invoice} marked paid, ${r.result.reminders_cancelled ?? 0} pending reminder(s) cancelled.`; })}>Simulate “invoice paid”</Button>
        <span className="muted" style={{ width: "auto" }}>Mock mode only. In sandbox, pay the invoice and use Sync.</span></div>
    </DemoPanel>

    <div className="card"><div className="card-head"><h2><Icon n="db" />All invoices</h2><span className="muted">{invs.length} total</span></div>
      <div className="ag-theme-quartz">
        {!sum ? <div className="grid gap-2 p-1">{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="rounded-lg h-10 w-full" />)}</div> : <AgGridReact rowData={invs} columnDefs={cols} domLayout="autoHeight" pagination={invs.length > 10} paginationPageSize={10} paginationPageSizeSelector={[10, 25, 50]}
          defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }} rowHeight={44} getRowId={(p: any) => String(p.data.id)} />}
      </div></div>

    <div className="card"><div className="card-head"><h2><Icon n="mail" />Reminder drafts <span className="muted">· {rems.filter(r => r.status === "draft").length} waiting for review</span></h2>
      <AnimatedCheckbox className="muted" checked={showAll} onChange={setShowAll}>Show cancelled</AnimatedCheckbox></div>
      {visibleRems.length === 0 ? <div className="empty-inline"><IconTile n="mail" big />
        <div><b>No drafts waiting.</b> When an invoice is due or overdue, click <b><Icon n="ai" size={14} /> Draft reminder</b>. The agent looks at the client's country, how fast they've paid before and the tone of their recent messages, then writes a reminder for you to review. Nothing is sent automatically.</div></div>
      : <>
        {waitNotes.length > 0 && <div className="wait-list"><div className="muted" style={{ marginBottom: 4 }}>No action needed right now ({waitNotes.length})</div>
          {waitNotes.map(r => { const inv = invById[r.invoice_id]; return <div key={r.id} className="wait-row">
            <b>{inv?.number}</b><span className="muted">{inv?.client}</span><Badge s="wait" label="Wait" />
            <span className="wait-why" title={r.reasoning.rationale}>{r.reasoning.rationale}</span>
            <span className="muted">{r.reasoning.decision_source === "rules" ? "rules" : "AI · " + r.reasoning.decision_source}</span></div>; })}</div>}
        <div className="drafts-masonry">{letters.map(r => { const inv = invById[r.invoice_id]; const long = r.body.length > 420; const open = expanded[r.id];
          return (
        <Card key={r.id} shadow="sm" radius="lg" isHoverable className={`draft ${["draft", "approved"].includes(r.status) ? "" : "dim"}`}><CardBody className="p-4 overflow-visible">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 6 }}><b>{inv?.number}</b><span className="muted">{inv?.client}</span></div>
            <div className="row" style={{ gap: 6 }}><Badge s={r.tone} label={`${r.tone} tone`} /><Badge s={r.status} /></div></div>
          <div className="muted" style={{ marginTop: 4 }}>Risk {r.reasoning.risk} · client sentiment {r.reasoning.sentiment} · {r.reasoning.days_overdue} days overdue{r.reasoning.avg_days_late_history != null ? ` · usually pays ${r.reasoning.avg_days_late_history}d late` : ""}</div>
          <AiRationale r={r.reasoning} />
          <div className={`letter ${long && !open ? "clamped" : ""}`}><b>{r.subject}</b>{"\n\n"}{r.body}</div>
          {long && <Button variant="bordered" className="bg-content1 border-default-200" size="sm" radius="full" onPress={() => setExpanded({ ...expanded, [r.id]: !open })}>{open ? "Show less" : "Show full draft"}</Button>}
          {r.reasoning.draft_source && <div className="muted" style={{ marginTop: 6 }}>Written by {r.reasoning.draft_source === "template" ? "template (fallback)" : r.reasoning.draft_source}</div>}
          {r.late_fee > 0 && <div className="muted">Optional late fee mentioned: {feeLabel(r, inv?.currency)}</div>}
          {r.status === "draft" && <div className="row" style={{ marginTop: 8 }}>
            <Button variant="bordered" className="bg-content1 border-default-200" size="sm" radius="full" onPress={() => { navigator.clipboard?.writeText(`${r.subject}\n\n${r.body}`); toast.show({ variant: "success", title: "Reminder copied", message: "Paste it into your email." }); }}><Icon n="copy" size={14} /> Copy text</Button>
            <Button color="success" size="sm" radius="full" onPress={() => act({ loading: "Approving the reminder…", success: "Reminder approved" }, () => post(`/api/reminders/${r.id}/approve`), () => "Reminder approved. LedgerGuard never sends it for you.")}><Icon n="tick" size={14} /> Approve</Button></div>}
        </CardBody></Card>); })}</div></>}
    </div>
  </>);
}

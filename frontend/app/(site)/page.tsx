import Link from "next/link";
import { Icon, IconTile, IcName } from "@/components/icons";
import { InstallButton } from "@/components/site";
const FLOWS: [IcName, string, string, string[]][] = [
  ["invoices", "Invoice chaser", "Claude decides whether to wait, remind, offer a split or Pay Later, or escalate. Code caps the fee and writes the draft.",
    ["Invoicing v2 create, send, read", "Tone fits the client's country and history", "Drafts only; you approve"]],
  ["disputes", "Dispute defense", "A new dispute triggers an evidence search. Claude ranks evidence and flags gaps; the statement cites evidence ids.",
    ["CUSTOMER.DISPUTE.CREATED webhook or sync", "Ranked evidence and timeline", "provide-evidence only after Approve"]],
  ["ledger", "Ask the ledger", "Ask “past-due invoices over $1000”. The question becomes a validated JSON filter; totals are computed from rows.",
    ["Never SQL, never model-made numbers", "AG Grid shows matching rows", "Totals per currency"]],
];
const PAYPAL: [string, string][] = [
  ["Invoicing v2", "Create, send and read invoices; detect PAID during sync."],
  ["Disputes v1", "List and read disputes; provide-evidence after your approval."],
  ["Webhooks", "INVOICE.PAID, CAPTURE.COMPLETED, DISPUTE.CREATED, signature-verified and de-duplicated."],
  ["OAuth + idempotency", "Cached tokens, backoff on 429/5xx, PayPal-Request-Id on every write."],
];
export default function Landing() {
  return <>
    <section className="site-wrap hero">
      <span className="eyebrow"><Icon n="ai" size={14} /> PayPal AI Hackathon 2026 · sandbox demo</span>
      <h1>Get paid on time, without the awkward emails.</h1>
      <p className="lede">LedgerGuard AI is an agentic PayPal copilot for freelancers and cross-border micro-SMEs. It chases late invoices, builds dispute defenses and answers “who owes me what?”. The model proposes, code bounds it, and you approve every step that leaves the app.</p>
      <div className="row cta"><Link href="/app" className="btn lg">Open the demo <Icon n="arrow" /></Link><InstallButton /><Link href="/how-it-works" className="btn ghost lg">How the AI works</Link></div>
      <figure className="hero-tray"><figcaption className="muted">Illustrative example of one reminder decision</figcaption><div className="hero-card">
        <div className="row" style={{ justifyContent: "space-between" }}><b>LG-2026-905 · Brightwave GmbH</b><span className="badge b-bad">Overdue 7d+</span></div>
        <div className="muted">EUR 6,500.00 · 10 days late · usually pays 6d late</div>
        <div className="mini-steps"><span><Icon n="ai" size={14} /> Claude: remind, formal tone</span><span><Icon n="code" size={14} /> Code: fee 1.5% = EUR 97.50</span><span><Icon n="human" size={14} /> You: approve draft</span></div>
      </div></figure>
    </section>
    <section className="site-wrap sec"><h2>The problem</h2>
      <div className="grid3">
        <div className="card"><IconTile n="clock" big /><h3>Late payments</h3><p>Money in an unpaid invoice is often money a freelancer in Nairobi needs this month. Push too softly and you wait; too hard and you lose a client.</p></div>
        <div className="card"><IconTile n="alert" big /><h3>Disputes freeze cash</h3><p>A buyer says “not as described”. The proof sits across email, chat and repos while the deadline runs.</p></div>
        <div className="card"><IconTile n="db" big /><h3>No clear picture</h3><p>“Which invoices over $1,000 are past due?” should take seconds, and a chatbot that guesses numbers is worse than none.</p></div>
      </div></section>
    <section className="site-wrap sec"><h2>Three agent workflows</h2>
      <div className="grid3">{FLOWS.map(([ic, t, d, pts]) => <div key={t} className="card"><IconTile n={ic} big /><h3>{t}</h3><p>{d}</p>
        <ul className="ticks">{pts.map(p => <li key={p}><Icon n="tick" size={14} />{p}</li>)}</ul></div>)}</div></section>
    <section className="site-wrap sec"><h2>How PayPal is used</h2>
      <div className="grid4">{PAYPAL.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p>{d}</p></div>)}</div>
      <p className="muted">Runs against the PayPal sandbox when credentials are set; otherwise a mock client with the same response shapes.</p></section>
    <section className="site-wrap sec"><div className="card cta-band">
      <div><h2>Try it with demo data</h2><p>No account or password. Time-travel the clock, run the chaser and simulate webhooks.</p></div>
      <div className="row"><Link href="/app" className="btn lg">Open the demo <Icon n="arrow" /></Link><InstallButton /></div></div></section>
  </>;
}

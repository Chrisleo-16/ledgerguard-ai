import Link from "next/link";
import { Icon, IcName } from "@/components/icons";
import { Card, CardBody, Chip } from "@heroui/react";
export const metadata = { title: "How the AI works · LedgerGuard AI" };
const Step = ({ ic, who, t, d }: { ic: IcName; who: "ai" | "code" | "human" | "paypal"; t: string; d: string }) =>
  <li className={`flow-step who-${who}`}><span className="flow-ic"><Icon n={ic} size={16} /></span><div><span className="flow-who">{{ ai: "Claude decides", code: "Code enforces", human: "You decide", paypal: "PayPal" }[who]}</span><b>{t}</b><p>{d}</p></div></li>;
const RULES: [string, string][] = [
  ["Late fee cap", "At most 1.5% of the invoice, and only from 7+ days overdue. The fee amount is computed by code, never written by the model."],
  ["No fee with flexibility", "If the action is a split payment or Pay Later, any fee is dropped."],
  ["Escalation threshold", "Escalation is allowed only from 14+ days overdue; earlier it becomes a plain reminder."],
  ["Before the due date", "No firm tone, no split, Pay Later or escalation; only a friendly reminder."],
  ["Exact split math", "Two installments: first = amount ÷ 2 rounded to cents, second = amount − first, so they always sum to the total."],
  ["Draft check", "A draft that mentions a fee the policy removed is replaced with a safe template."],
  ["Evidence ids", "Ranked evidence must use ids that exist; relevance scores are clamped to 0–1."],
  ["Ledger filters", "Questions become a JSON filter checked against an allow-list of fields and operators. Never SQL. Invalid output falls back to a rule parser."],
  ["Human approval", "Reminders stay drafts. Evidence goes to PayPal only after Approve and confirm, and only once."],
];
export default function HowItWorks() {
  return <article className="site-wrap learn">
    <Chip variant="flat" color="secondary" radius="full" startContent={<Icon n="ai" size={14} />} className="text-secondary-700">Learning page</Chip>
    <h1>How the AI works</h1>
    <p className="lede">LedgerGuard uses Claude for judgement: reading tone, choosing the next step, ranking evidence, turning questions into filters. Anything involving money, thresholds or sending is handled by plain code and by you. The model proposes; code bounds it; you approve.</p>
    <div className="legend" aria-label="Legend"><span className="who-ai"><i />Claude decides</span><span className="who-code"><i />Code enforces</span><span className="who-human"><i />You decide</span><span className="who-paypal"><i />PayPal call</span></div>

    <section className="sec"><h2>1. Invoice chaser</h2>
      <ol className="flow">
        <Step ic="clock" who="code" t="Gather context" d="Amount, due date, days overdue, country, past payment speed, recent client messages." />
        <Step ic="ai" who="ai" t="Choose the next action" d="Wait, remind, offer a split, offer Pay Later, or escalate, plus a tone and a suggested fee %." />
        <Step ic="code" who="code" t="Apply guardrails" d="Cap the fee at 1.5% (7+ days only), drop it for split or Pay Later, block escalation before 14 days, compute exact amounts." />
        <Step ic="mail" who="ai" t="Write the draft" d="Claude writes the email using only the figures code gave it." />
        <Step ic="human" who="human" t="Approve or ignore" d="Approving marks the draft; you copy and send it yourself. Paid invoices cancel pending drafts." />
      </ol>
      <figure className="card fee-fig"><figcaption><b>Late fee by days overdue</b> <span className="muted">(what code allows, whatever the model suggests)</span></figcaption>
        <svg viewBox="0 0 640 150" role="img" aria-labelledby="feeT"><title id="feeT">Fee is 0% before 7 days overdue, up to 1.5% from 7 days; escalation allowed from 14 days.</title>
          <line x1="40" y1="110" x2="620" y2="110" stroke="#e0e0e0" />
          <rect x="40" y="96" width="160" height="14" rx="4" fill="#f2f2f2" /><rect x="200" y="50" width="420" height="60" rx="6" fill="#eefcc9" stroke="#c6f432" />
          <rect x="360" y="50" width="260" height="60" rx="6" fill="none" stroke="#1a1a1a" strokeDasharray="4 4" />
          <text x="120" y="88" textAnchor="middle" fontSize="13" fill="#666">0% fee</text>
          <text x="280" y="84" textAnchor="middle" fontSize="13" fill="#3d5400">≤ 1.5% fee</text>
          <text x="490" y="84" textAnchor="middle" fontSize="13" fill="#1a1a1a">≤ 1.5% · escalation allowed</text>
          {[["0", 40], ["7 days", 200], ["14 days", 360]].map(([l, x]) => <g key={l as string}><line x1={x as number} y1="110" x2={x as number} y2="118" stroke="#666" /><text x={x as number} y="134" textAnchor="middle" fontSize="12" fill="#666">{l}</text></g>)}
          <text x="620" y="134" textAnchor="end" fontSize="12" fill="#666">days overdue →</text>
        </svg>
        <p className="muted">Split example: USD 1,450.00 → USD 725.00 now + USD 725.00 within 14 days, no fee.</p></figure>
    </section>

    <section className="sec"><h2>2. Dispute defense</h2>
      <ol className="flow">
        <Step ic="disputes" who="paypal" t="Dispute arrives" d="CUSTOMER.DISPUTE.CREATED webhook, or Sync reads /v1/customer/disputes." />
        <Step ic="search" who="code" t="Search evidence" d="Full-text search over that client's contracts, milestones, delivery notes and messages." />
        <Step ic="ai" who="ai" t="Rank evidence, flag gaps" d="Claude scores relevance; code keeps only real ids and clamps scores to 0–1." />
        <Step ic="file" who="ai" t="Draft the statement" d="A short factual response that cites evidence ids in brackets." />
        <Step ic="human" who="human" t="Approve & submit" d="Only this click calls provide-evidence, and a second submission is refused." />
      </ol></section>

    <section className="sec"><h2>3. Ask the ledger</h2>
      <div className="ledger-diag">
        <div className="card"><span className="flow-who">You ask</span><p>“past-due invoices over $1000”</p></div><Icon n="arrow" />
        <div className="card who-ai-b"><span className="flow-who">Claude fills a schema</span><pre>{`{"conditions":[
 {"field":"status","op":"in","value":["due","overdue_3","overdue_7"]},
 {"field":"amount","op":"gt","value":1000},
 {"field":"currency","op":"eq","value":"USD"}]}`}</pre></div><Icon n="arrow" />
        <div className="card who-code-b"><span className="flow-who">Code validates & sums</span><p>Allow-listed fields and ops only. Rows filtered, totals computed per currency. No SQL is ever generated.</p></div>
      </div>
      <p className="muted">Allowed fields: number, client, country, currency, status, amount, days_overdue, issue_date, due_date, paid_at. Up to 10 conditions.</p></section>

    <section className="sec"><h2>The guardrails, in plain words</h2>
      <div className="rules-grid">{RULES.map(([t, d]) => <Card key={t} shadow="sm" radius="lg" isHoverable className="rule-card"><CardBody className="p-5"><h3><Icon n="lock" size={15} /> {t}</h3><p>{d}</p></CardBody></Card>)}</div></section>
    <section className="sec row"><Link href="/app" className="btn btn-pill lg">Open the demo <Icon n="arrow" /></Link><Link href="/" className="btn ghost btn-pill lg">Back to overview</Link></section>
  </article>;
}

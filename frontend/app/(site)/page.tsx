"use client";
import Link from "next/link";
import { Icon, IconTile, IcName } from "@/components/icons";
import { Badge } from "@/components/ui";
import { Accordion, AccordionItem, Button, Card, CardBody, Chip } from "@heroui/react";
import { InstallButton, GITHUB } from "@/components/site";
/* All figures below are the seeded demo data the live app shows (backend/app/seed.py), not invented stats. */
const OPEN_ROWS: [string, string, string, string][] = [
  ["LG-2026-905", "Brightwave GmbH", "EUR 6,500.00", "overdue_7"],
  ["LG-2026-903", "Acme Robotics Inc.", "USD 3,200.00", "overdue_3"],
  ["LG-2026-911", "Harbor & Pine LLC", "USD 1,450.00", "overdue_3"],
  ["LG-2026-907", "Lumen Studio Ltd", "GBP 1,250.00", "due_soon"],
];
const LATE: [string, number][] = [["911", 4], ["903", 5], ["905", 10], ["912", 15]];
const FAQ: [string, string][] = [
  ["Does LedgerGuard send emails or money for me?", "No. Reminders stay drafts you copy and send yourself. Dispute evidence goes to PayPal only after you click Approve and confirm."],
  ["What does Claude decide, and what does code decide?", "Claude picks the next step, the tone and a suggested fee, ranks evidence and turns questions into filters. Code caps fees at 1.5%, blocks escalation before 14 days and computes every number."],
  ["Is this connected to real PayPal money?", "No. It uses the PayPal sandbox (Invoicing v2, Disputes, Webhooks) or a mock with the same shapes. The live demo uses seeded data."],
  ["Do I need an account?", "No. The login is a labelled demo screen. Open the demo and start."],
  ["Can I install it?", "Yes. It is a PWA, so it installs from Chrome or Safari and opens in its own window."],
];
const Check = ({ t }: { t: string }) => <li><Icon n="tick" size={15} />{t}</li>;
export default function Landing() {
  return <div className="lp">
    <section className="lp-hero"><div className="site-wrap lp-hero-in">
      <div className="lp-hero-text">
        <Chip variant="flat" color="secondary" radius="full" startContent={<Icon n="ai" size={14} />} className="eyebrow-chip text-secondary-700">Claude + PayPal Sandbox</Chip>
        <h1>Chase invoices.<br />Win disputes.</h1>
        <p className="lp-lede">An AI copilot for freelancers on PayPal. It drafts reminders and dispute defenses. You approve every step.</p>
        <div className="row"><Button as={Link} href="/app" color="primary" radius="full" size="lg" className="font-medium shadow-medium" endContent={<Icon n="arrow" />}>Open demo</Button><Button as={Link} href="/how-it-works" variant="bordered" radius="full" size="lg" className="font-medium bg-content1">How it works</Button></div>
      </div>
      <div className="lp-hero-art" aria-hidden="true">
        <div className="hero-glow" /><div className="phone"><div className="phone-notch" />
          <div className="ph-head"><span className="logo-mark"><Icon n="logo" size={13} /></span><b>Invoices</b></div>
          <div className="ph-kpi"><span className="muted">Outstanding · 7 open</span><b>USD 6,600.00</b><span className="muted">EUR 7,100.00 · GBP 1,250.00</span></div>
          <div className="ph-rows">{OPEN_ROWS.map(([n, c, a, s]) => <div key={n} className="ph-row"><div><b>{n}</b><span className="muted">{c}</span></div><div className="ph-r"><span>{a}</span><Badge s={s} /></div></div>)}</div>
        </div>
        <div className="float f1"><span className="muted"><Icon n="clock" size={13} /> Overdue</span><b>EUR 6,500.00</b><span className="muted">USD 5,450.00 · 4 invoices</span></div>
        <div className="float f2"><span className="muted"><Icon n="received" size={13} /> Paid this month</span><b>USD 4,600.00</b><span className="muted">EUR 1,800.00</span></div>
      </div>
    </div></section>

    <p className="site-wrap lp-strip"><span>Built with</span> PayPal Sandbox · Claude · AG Grid · Render</p>

    <section className="site-wrap lp-split">
      <div className="lp-visual">
        <Card shadow="lg" radius="lg" className="draft-card"><CardBody className="gap-3 p-5"><span className="muted">A draft Claude wrote in the demo</span>
          <div className="row" style={{ justifyContent: "space-between" }}><b>LG-2026-905 · Brightwave GmbH</b><Badge s="overdue_7" /></div>
          <div className="row" style={{ gap: 6 }}><Badge s="remind" label="Remind" /><Badge s="neutral" label="neutral tone" /><span className="muted">10 days overdue</span></div>
          <div className="dc-letter"><b>Zahlungserinnerung / Payment Reminder – Invoice LG-2026-905</b><p>EUR 6,500.00 is 10 days past due. Formal tone for a German client, written by Claude.</p></div>
          <div className="dc-notes"><span><Icon n="code" size={13} /> Fee 0.5% = EUR 32.50 (cap 1.5%)</span></div>
          <div className="row"><span className="btn ghost sm"><Icon n="copy" size={14} /> Copy text</span><span className="btn success sm"><Icon n="tick" size={14} /> Approve</span></div>
        </CardBody></Card>
      </div>
      <div className="lp-copy">
        <h2>Reminders that know when to push.</h2>
        <p>Claude reads the client's country, payment history and tone. Code keeps it fair.</p>
        <ul className="lp-checks"><Check t="Wait, remind, split, Pay Later or escalate" /><Check t="Late fee only from 7 days, max 1.5%" /><Check t="Paid invoices cancel pending drafts" /></ul>
        <Button as={Link} href="/app" color="primary" radius="full" className="font-medium">Try the chaser</Button>
      </div>
    </section>

    <section className="site-wrap lp-split rev">
      <div className="lp-copy">
        <h2>Ask your ledger. Get exact numbers.</h2>
        <p>Questions become validated filters. Totals come from rows, not the model.</p>
        <ul className="lp-checks"><Check t="Never SQL, never guessed numbers" /><Check t="Totals per currency, never mixed" /></ul>
        <Button as={Link} href="/ledger" color="primary" radius="full" className="font-medium">Ask the ledger</Button>
      </div>
      <div className="lp-visual charts">
        <Card shadow="lg" radius="lg" className="ch-card ch-main"><CardBody className="gap-3 p-5"><div className="mock-q"><Icon n="search" size={14} /> past-due invoices over $1000</div>
          <div className="mock-chips"><span>status: due, overdue</span><span>amount &gt; 1000</span><span>USD</span></div>
          <div className="ch-total"><b>USD 4,650.00</b><span className="muted">2 invoices · max 5 days late</span></div></CardBody></Card>
        <Card shadow="lg" radius="lg" className="ch-card ch-bars"><CardBody className="gap-3 p-5"><span className="muted">Days overdue, open invoices</span>
          <div className="bars">{LATE.map(([n, d]) => <div key={n} className="bar-col"><i style={{ height: `${d * 5}px` }} className={d >= 14 ? "hi" : d >= 7 ? "mid" : ""} /><span>{d}d</span><small>{n}</small></div>)}</div></CardBody></Card>
      </div>
    </section>

    <section className="site-wrap lp-sec"><h2 className="center">What it does</h2>
      <div className="feat3">{([["disputes", "Dispute defense", "Ranks evidence, builds a timeline and cites it. Submitted only after you approve.", "/disputes", "t-sky"],
        ["ai", "Claude, with guardrails", "Claude judges. Code enforces fees, thresholds and exact math.", "/how-it-works", "t-lime"],
        ["human", "Human approval", "Nothing leaves the app until you say so. Every time.", "/how-it-works", "t-rose"]] as [IcName, string, string, string, string][]).map(([ic, t, d, h, tint]) =>
        <Card key={t} as={Link} href={h} isPressable isHoverable shadow="none" radius="lg" className={`feat ${tint}`}><CardBody className="p-7 gap-2 overflow-visible"><div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}><IconTile n={ic} big /><Icon n="arrowUpRight" size={18} /></div><h3>{t}</h3><p>{d}</p></CardBody></Card>)}</div>
    </section>

    <section className="site-wrap lp-sec"><h2 className="center">Questions</h2>
      <div className="faq-wrap">
        <Card shadow="sm" radius="lg" className="faq"><CardBody className="px-3 py-1">
          <Accordion defaultExpandedKeys={["0"]} itemClasses={{ title: "text-[16px] font-medium", trigger: "py-5", content: "pb-5 text-default-700", indicator: "text-default-600" }}>
            {FAQ.map(([q, a], i) => <AccordionItem key={String(i)} aria-label={q} title={q}>{a}</AccordionItem>)}</Accordion></CardBody></Card>
        <Card shadow="lg" radius="lg" className="faq-side"><CardBody className="items-center text-center gap-3 p-7"><h3>Still have questions?</h3><p>Read the full write-up and code on GitHub.</p>
          <Button as="a" href={GITHUB} rel="noopener" color="secondary" radius="full" className="font-medium text-secondary-foreground">Open GitHub</Button></CardBody></Card>
      </div>
    </section>

    <section className="site-wrap lp-sec"><div className="cta-dark"><svg className="cta-art" viewBox="0 0 400 400" aria-hidden="true">{[60, 110, 160, 210].map(r => <circle key={r} cx="400" cy="0" r={r} fill="none" stroke="#c6f432" strokeOpacity={0.5 - r / 600} />)}<circle cx="400" cy="0" r="40" fill="#c6f432" fillOpacity=".22" /></svg>
      <h2>Get paid sooner. Stay in control.</h2>
      <p>Seeded demo data. No account needed.</p>
      <div className="row" style={{ justifyContent: "center" }}><Button as={Link} href="/app" radius="full" size="lg" className="bg-white text-foreground font-medium">Open demo</Button><InstallButton dark /></div>
    </div></section>
  </div>;
}

"use client";
import { Flag } from "@/components/flag";
import Link from "next/link";
import { AnimatedCTA } from "@/components/animated-cta";
import { Icon, IcName } from "@/components/icons";
import { Accordion, AccordionItem, Button, Chip } from "@heroui/react";
import { GITHUB } from "@/components/site";
import { InstallAppButton } from "@/components/download-button";
/* Every figure below comes from the seeded demo data the live app shows (backend/app/seed.py). Nothing is invented. */

const Chipi = ({ n }: { n: IcName }) => <span className="ichip" aria-hidden="true"><Icon n={n} size={18} /></span>;
const Eyebrow = ({ t }: { t: string }) => <p className="v-eyebrow">{t}</p>;

function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`vphone ${className}`} aria-hidden="true"><div className="phone-in">
    <div className="ph-status"><span>9:41</span><span className="ph-notch" /><span className="ph-sig"><i /><i /><i /></span></div>
    {children}</div></div>;
}




const PhoneHero = () => <Phone className="ph-hero">
  <div className="ph-top"><span className="ph-back"><Icon n="logo" size={12} /></span><span className="ph-pill lime">Next step ready</span></div>
  <p className="ph-cap">Past due · USD</p><p className="ph-big">5,450.00</p>
  <div className="hero-btn"><span><Icon n="flash" size={30} /></span></div>
  <p className="ph-cap">Tap to draft reminders</p>
</Phone>;
const MARKETS: [string, string][] = [["KE", "Kenya"], ["NG", "Nigeria"], ["GH", "Ghana"], ["UG", "Uganda"], ["ZA", "South Africa"], ["US", "United States"], ["GB", "United Kingdom"], ["DE", "Germany"], ["IN", "India"], ["CA", "Canada"], ["NL", "Netherlands"], ["MU", "Mauritius"]];

/* Section 3 phone: reminder draft */
const PhoneReminder = () => <Phone className="ph-solo">
  <div className="ph-top"><span className="ph-back"><Icon n="arrowLeft" size={12} /></span><span className="ph-pill lime">Draft</span></div>
  <h3 className="ph-h">Your reminder is ready to send</h3>
  <p className="ph-cap left">Brightwave GmbH · LG-2026-905</p>
  <div className="ph-card"><div className="ph-card-row"><span className="ph-av">BG</span><div><b>EUR 6,500.00</b><small>Overdue · firm tone</small></div><Icon n="check" size={16} /></div>
    <div className="ph-card-foot"><span>Suggested late fee</span><b>capped at 1.5%</b></div></div>
  <div className="ph-note"><Icon n="lock" size={12} />Nothing is sent without your approval</div>
</Phone>;

const FEATS: [IcName, string][] = [["mail", "Drafts polite, firm or final reminders for each overdue invoice"], ["key", "Late fees capped at 1.5% and escalation blocked before 14 days"], ["file", "Ranks contracts, milestones and messages into dispute evidence"], ["human", "One-tap approve; nothing is sent or submitted on its own"]];
const TILES: [string, string, string, string][] = [
  ["Invoice chaser", "Drafts the next reminder. It never sends for you.", "Workflow", "/how-it-works#chaser"],
  ["Dispute defense", "Ranks your evidence. You approve before PayPal sees it.", "Workflow", "/how-it-works#disputes"],
  ["Ledger chat", "Plain-English questions become a checked filter.", "Workflow", "/how-it-works#ledger"],
  ["Sandbox invoices", "Create, send and track invoices.", "PayPal Invoicing v2", "/how-it-works#chaser"],
  ["Evidence submission", "Submit the approved package to the case.", "PayPal Disputes", "/how-it-works#disputes"],
  ["Live status sync", "Paid and dispute events update the ledger.", "PayPal Webhooks", "/how-it-works#guardrails"],
  ["Reasoning and drafting", "Picks tone and next step; code checks every number.", "Claude", "/how-it-works#guardrails"],
  ["Fast invoice tables", "Sort and filter the whole ledger.", "AG Grid", "/ledger"],
];
const FAQ: [string, string][] = [
  ["Does LedgerGuard send emails or money for me?", "No. Reminders stay drafts you copy and send yourself. Dispute evidence goes to PayPal only after you click Approve and confirm."],
  ["Is this connected to real PayPal money?", "No. It uses the PayPal sandbox (Invoicing v2, Disputes, Webhooks) or a mock with the same shapes. The live demo uses seeded data."],
  ["What does Claude decide, and what does code decide?", "Claude picks the next step, the tone and a suggested fee, ranks evidence and turns questions into filters. Code caps fees at 1.5%, blocks escalation before 14 days and computes every number."],
  ["Do I need an account?", "No. The login is a labelled demo screen. Open the demo and start."],
  ["Can I install it?", "Yes. It is a PWA, so it installs from Chrome or Safari and opens in its own window."],
];

export default function Landing() {
  return <div className="v10">
    {/* 1 hero */}
    <section className="v-hero v-wrap">
      <Eyebrow t="Free demo · PayPal sandbox" />
      <h1 className="v-h1">Get Paid On Time. <br />Defend Every <span className="hl">Dollar</span>.</h1>
      <p className="v-sub">An AI copilot for freelancers on PayPal. It chases late invoices, builds dispute evidence and answers questions about your ledger, and you approve every step.</p>
      <div className="v-row c"><AnimatedCTA href="/app">Get Started</AnimatedCTA><Button as={Link} href="/app" radius="full" variant="light" className="v-ghost" startContent={<Icon n="arrowUpRight" size={15} />}>View demo</Button></div>
      <div className="v-stage" aria-hidden="true">
        <div className="v-map" />
        <span className="flag f1"><Flag code="US" size={22} /></span><span className="flag f2"><Flag code="DE" size={22} /></span><span className="flag f3"><Flag code="GB" size={22} /></span><span className="flag f4"><Flag code="KE" size={22} /></span>
        <PhoneHero />
        <div className="vfloat fl"><span className="fi-ic ok"><Icon n="received" size={15} /></span><div><b>Invoice paid</b><small>Lumen Studio Ltd · GBP 950.00</small></div></div>
        <div className="vfloat fr"><span className="fi-ic warn"><Icon n="alert" size={15} /></span><div><b>Dispute opened</b><small>Acme Robotics · USD 3,200.00</small></div><span className="ph-pill lime">Package ready</span></div>
      </div>
    </section>

    {/* bento: everything you need */}
    <section className="v-wrap" id="features"><div className="v-box">
      <div className="v-box-head"><h2>We&apos;ve got everything you need</h2><p>Chasing, disputes and answers, in one place.</p></div>
      <div className="bento3">
        <div className="bc"><h3>Approval-First Policy</h3><p>Reminders stay drafts and evidence waits for your click. Nothing goes out on its own.</p>
          <div className="shield-ill" aria-hidden="true"><span className="sh"><Icon n="disputes" size={44} stroke={1.6} /></span><span className="sh-dot"><Icon n="tick" size={12} /></span></div></div>
        <div className="bc globe-c"><div className="globe" aria-hidden="true" /><div className="chip-f" aria-hidden="true"><Flag code="DE" size={20} /><div><b>Brightwave GmbH</b><small>EUR 6,500.00 open</small></div><Icon n="arrow" size={12} /></div>
          <h3>Multi-Currency, Anytime</h3><p>USD, EUR and GBP invoices are tracked and totalled per currency, never mixed.</p></div>
        <div className="bc"><h3>Cash-Flow Health</h3><p>See how much of your open USD is past due at a glance.</p>
          <div className="gauge big"><svg viewBox="0 0 120 70" aria-hidden="true"><path d="M10 64a50 50 0 0 1 100 0" className="g-bg" /><path d="M10 64a50 50 0 0 1 100 0" className="g-fg" pathLength="100" strokeDasharray="83 100" /></svg><div className="g-val"><b>83%</b><small>past due · USD 5,450 of 6,600</small></div></div></div>
      </div></div></section>

    {/* marquee */}
    <section className="v-markets">
      {[MARKETS, [...MARKETS].reverse()].map((row, r) => <div key={r} className={`mq ${r ? "rev" : ""}`} aria-hidden="true"><div className="mq-t">{[...row, ...row].map(([f, c], i) => <span key={i} className="mpill"><Flag code={f} size={18} />{c}</span>)}</div></div>)}
      <div className="v-wrap"><Eyebrow t="Global coverage" />
        <h2 className="v-h2 c">Paid From <Chipi n="coins" /> 200+ Markets</h2>
        <p className="v-p c">PayPal works in more than 200 markets, and LedgerGuard follows your invoices in whatever currency your clients pay.</p>
        <div className="v-row c"><AnimatedCTA href="/ledger">Ask Your Ledger</AnimatedCTA></div></div>
    </section>

    {/* why choose */}
    <section className="v-wrap"><div className="v-box">
      <div className="v-box-head col"><h2>Why choose LedgerGuard?</h2><p>LedgerGuard isn&apos;t just another invoice tool. Claude reads your invoices, messages and delivery records and decides the next step; hard rules in code cap fees, block early escalation and compute every total.</p></div>
      <div className="bento6">
        <div className="bc"><div className="cluster" aria-hidden="true"><span className="cl-main"><Icon n="file" size={26} /></span>{(["contract", "milestone", "message", "delivery"] as IcName[]).map(n => <span key={n} className={`cl-o ${n}`}><Icon n={n} size={14} /></span>)}</div>
          <h3>Evidence From Everything</h3><p>Contracts, milestones, messages and delivery files are ranked into a dispute package.</p></div>
        <div className="bc"><h3>Full Audit Trail</h3><p>Every AI decision shows its rationale. Nothing is sent behind your back.</p><div className="cloud" aria-hidden="true"><span className="lock"><Icon n="lock" size={22} /></span></div></div>
        <div className="bc"><div className="glow-wrap" aria-hidden="true">{(["mail", "clock", "money", "calendar"] as IcName[]).map(n => <span key={n} className={`orb ${n}`}><Icon n={n} size={13} /></span>)}<span className="glow"><Icon n="flash" size={28} /></span></div>
          <h3>One-Tap Auto-Chase</h3><p>Drafts the right reminder for every overdue invoice in a single press.</p></div>
        <div className="bc"><h3>Any Device</h3><p>Use it in the browser or install the PWA on desktop or phone.</p><div className="devs" aria-hidden="true"><span><Icon n="code" size={18} /></span><span className="mid"><Icon n="phone" size={20} /></span><span><Icon n="download" size={18} /></span></div></div>
        <div className="bc"><div className="keypad" aria-hidden="true"><span className="kp-top"><Icon n="key" size={18} /></span><div>{[0, 1, 2, 3].map(i => <i key={i}>*</i>)}</div></div>
          <h3>Hard Limits In Code</h3><p>Late fees are capped at 1.5% and escalation is blocked before 14 days, whatever the AI suggests.</p></div>
        <div className="bc"><h3>Live Ledger Chat</h3><p>Ask in plain English; get a checked filter and exact totals.</p>
          <div className="chatb" aria-hidden="true"><span className="ph-av">AI</span><div><b>USD 4,650.00</b><small>past-due invoices over $1000</small></div><i /></div></div>
      </div></div></section>

    {/* 3 two-column */}
    <section className="v-two v-wrap">
      <div className="v-two-l">
        <Eyebrow t="Simple and safe" />
        <h2 className="v-h2">Simple &amp; Safe Chasing, <Chipi n="human" /> Every Step</h2>
        <p className="v-p">LedgerGuard pairs Claude&apos;s judgement with hard rules in code, so every draft is useful and every number is checked.</p>
        <ul className="v-feats">{FEATS.map(([n, t]) => <li key={t}><span className="v-fi"><Icon n={n} size={15} /></span>{t}</li>)}</ul>
        <div className="v-row"><AnimatedCTA href="/app">Get Started</AnimatedCTA><a href="#faq" className="v-link"><Icon n="book" size={15} />FAQ</a></div>
      </div>
      <div className="v-two-r"><PhoneReminder /></div>
    </section>

    {/* 4 protect */}
    <section className="v-protect v-wrap">
      <div className="v-illu" aria-hidden="true"><span className="coin"><span className="coin-in"><Icon n="disputes" size={34} stroke={1.8} /></span></span><span className="stars">{[0, 1, 2, 3].map(i => <Icon key={i} n="star" size={14} />)}</span></div>
      <Eyebrow t="Revenue protection" />
      <h2 className="v-h2 c">How LedgerGuard Protects Your <Chipi n="money" /> Revenue</h2>
      <p className="v-p c">LedgerGuard reads your PayPal invoices, client messages and delivery records. Claude decides the next step and drafts the words; code caps late fees at 1.5%, blocks escalation before 14 days and calculates every total. When a buyer opens a dispute, it ranks your contracts, milestones and acceptance messages into an evidence package and waits for your approval before anything reaches PayPal.</p>
      <div className="v-row c"><AnimatedCTA href="/app">Open Demo</AnimatedCTA><Button as={Link} href="/how-it-works" radius="full" variant="light" className="v-ghost" startContent={<Icon n="book" size={15} />}>View How It Works</Button></div>
    </section>

    {/* 5 tiles */}
    <section className="v-multi" id="workflows">
      <div className="v-wrap"><h2 className="v-h2 c">Multiple Workflows &amp; APIs</h2><p className="v-p c">Three workflows built on PayPal APIs, so you can chase, defend and ask from one place.</p></div>
      {/* Arrow-corner cards adapted from Uiverse.io by satyamchaudharydev (MIT) */}
      <ul className="v-tiles" aria-label="Workflows and APIs">{TILES.map(([t, c, m, href], i) => <li key={t}>
        <Link href={href} className={`v-acard ${i === 1 ? "on" : ""}`}>
          <span className="v-acard-t">{t}</span><span className="v-acard-c">{c}</span><span className="v-acard-m">{m}</span>
          <span className="v-acard-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M13.2 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4l4.3-4.3H4a1 1 0 1 1 0-2h13.5l-4.3-4.3a1 1 0 0 1 0-1.4z"/></svg></span>
        </Link></li>)}</ul>
    </section>

    {/* 6 FAQ */}
    <section className="v-faq v-wrap" id="faq">
      <Eyebrow t="FAQ" />
      <h2 className="v-h2 c">Frequently Asked <Chipi n="message" /> Questions</h2>
      <p className="v-p c">Everything you need to know about how LedgerGuard works, what it sends and what it never does.</p>
      <Accordion className="faq10" defaultExpandedKeys={["1"]} showDivider={false} itemClasses={{ base: "faq10-item", title: "faq10-t", trigger: "faq10-tr", content: "faq10-c", indicator: "faq10-ind" }}>
        {FAQ.map(([q, a], i) => <AccordionItem key={String(i)} aria-label={q} title={q} disableIndicatorAnimation
          indicator={({ isOpen }) => <span className={`pm ${isOpen ? "on" : ""}`}><Icon n={isOpen ? "minus" : "add"} size={14} /></span>}>{a}</AccordionItem>)}
      </Accordion>
    </section>

    {/* 7 get + footer */}
    <section className="v-wrap"><div className="v-get">
      <div><h2>Get LedgerGuard</h2><p>Chase invoices and defend disputes from any device, as a web app or an installed PWA.</p></div>
      <div className="v-apps">
        <Link href="/app" className="v-app" aria-label="Open web app"><Icon n="arrowUpRight" size={20} /></Link>
        <InstallAppButton />
        <Link href="/ledger" className="v-app dark" aria-label="Ask the ledger"><Icon n="ledger" size={20} /></Link>
      </div>
    </div></section>
    <footer className="v-foot v-wrap">
      <div className="v-foot-top">
        <div className="v-foot-brand"><Link href="/" className="v-logo"><span className="v-logo-m"><Icon n="logo" size={16} /></span>LedgerGuard</Link>
          <p>An AI copilot for freelancers on PayPal. It drafts reminders and dispute defenses on the PayPal sandbox, and you approve every step. Built for the PayPal AI Hackathon 2026.</p>
          <div className="v-soc"><a href={GITHUB} rel="noopener" aria-label="Source code on GitHub"><Icon n="code" size={15} /></a><Link href="/how-it-works" aria-label="How it works"><Icon n="book" size={15} /></Link><Link href="/app" aria-label="Open demo"><Icon n="arrowUpRight" size={15} /></Link></div></div>
        <nav aria-label="Useful links"><h3>Useful Links</h3><Link href="/app">Demo <Icon n="arrow" size={12} /></Link><Link href="/how-it-works">How it works <Icon n="arrow" size={12} /></Link><Link href="/login">Demo login <Icon n="arrow" size={12} /></Link></nav>
        <nav aria-label="Explore"><h3>Explore</h3><Link href="/disputes">Disputes <Icon n="arrow" size={12} /></Link><Link href="/ledger">Ask the ledger <Icon n="arrow" size={12} /></Link><a href={GITHUB} rel="noopener">GitHub <Icon n="arrow" size={12} /></a></nav>
      </div>
      <div className="v-foot-base"><span>© 2026 Chrisben Evans Leo · MIT License</span><span>PayPal sandbox only</span></div>
    </footer>
  </div>;
}

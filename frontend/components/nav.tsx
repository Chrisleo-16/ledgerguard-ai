"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon, IcName } from "@/components/icons";
const LINKS: [string, string, IcName][] = [["/app", "Invoices", "invoices"], ["/disputes", "Disputes", "disputes"], ["/ledger", "Ask the ledger", "ledger"]];
export default function Nav() {
  const path = usePathname();
  const [h, setH] = useState<any>(null); const [down, setDown] = useState(false); const [counts, setCounts] = useState<any>(null);
  useEffect(() => {
    const f = () => Promise.all([api("/api/health"), api("/api/summary")]).then(([x, s]) => { setH(x); setCounts(s); setDown(false); }).catch(() => setDown(true));
    f(); const t = setInterval(f, 5000); return () => clearInterval(t);
  }, []);
  const badge: Record<string, number | undefined> = { "/app": counts?.overdue.count, "/disputes": counts?.open_disputes.count };
  return <aside className="sidebar">
    <Link href="/" className="logo" aria-label="LedgerGuard AI home"><span className="logo-mark"><Icon n="logo" size={15} /></span>LedgerGuard <small>AI</small></Link>
    <div className="nav-label">Workspace</div>
    <nav className="navlinks">{LINKS.map(([href, label, icon]) =>
      <Link key={href} href={href} className={path.startsWith(href) ? "active" : ""}>
        <Icon n={icon} />{label}{badge[href] ? <span className="count">{badge[href]}</span> : null}</Link>)}</nav>
    <div className="env">
      {down ? <span className="pill"><span className="dot bad" />API offline</span> : h ? <>
        <span className="pill" title="PayPal environment"><span className={`dot ${h.paypal_mode === "sandbox" ? "ok" : "warn"}`} />PayPal {h.paypal_mode === "sandbox" ? "Sandbox" : "Demo (mock)"}</span>
        <span className="pill" title={h.llm}><span className={`dot ${h.llm_provider && h.llm_provider !== "none" ? "ok" : "warn"}`} />
          {h.llm_provider && h.llm_provider !== "none" ? `AI: ${h.llm_provider === "anthropic" ? "Claude" : "OpenAI-compatible"} · ${h.llm_model}` : "AI: rules fallback"}</span>
        <span className="pill">Today {h.today}{h.clock_offset_days ? ` (+${h.clock_offset_days}d)` : ""}</span></> : <span className="pill"><span className="dot" />Connecting…</span>}
      <span className="user-row"><span className="avatar">CL</span>Chrisben Evans Leo</span>
    </div></aside>;
}

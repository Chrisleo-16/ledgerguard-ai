"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
const LINKS: [string, string][] = [["/", "Product"], ["/how-it-works", "How the AI works"], ["/app", "Demo"]];
export function SiteHeader() {
  const path = usePathname();
  return <header className="site-head"><div className="site-wrap site-head-in">
    <Link href="/" className="logo" aria-label="LedgerGuard AI home"><span className="logo-mark"><Icon n="logo" size={15} /></span>LedgerGuard <small>AI</small></Link>
    <nav className="site-nav" aria-label="Site">{LINKS.map(([h, l]) => <Link key={h} href={h} className={path === h ? "active" : ""} aria-current={path === h ? "page" : undefined}>{l}</Link>)}</nav>
    <Link href="/login" className="btn ghost sm">Log in</Link></div></header>;
}
export function SiteFooter() {
  return <footer className="site-foot"><div className="site-wrap row" style={{ justifyContent: "space-between" }}>
    <span>LedgerGuard AI · PayPal AI Hackathon 2026 · MIT © Chrisben Evans Leo</span>
    <span>PayPal sandbox only. Nothing is sent without your approval.</span></div></footer>;
}
/** Install button: uses the browser's beforeinstallprompt when offered; otherwise explains how to install. */
export function InstallButton() {
  const [evt, setEvt] = useState<any>(null); const [installed, setInstalled] = useState(false); const [hint, setHint] = useState(false);
  useEffect(() => {
    const on = (e: any) => { e.preventDefault(); setEvt(e); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", on); window.addEventListener("appinstalled", done);
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return <span className="btn ghost lg" aria-live="polite"><Icon n="tick" /> Installed</span>;
  return <span className="install-wrap">
    <button className="btn ghost lg" onClick={async () => { if (evt) { evt.prompt(); const r = await evt.userChoice; if (r.outcome === "accepted") setInstalled(true); setEvt(null); } else setHint(!hint); }}>
      <Icon n="download" /> Install app</button>
    {hint && <span className="install-hint" role="status">Use your browser menu: Chrome “Install LedgerGuard”, Safari “Share → Add to Home Screen”.</span>}</span>;
}

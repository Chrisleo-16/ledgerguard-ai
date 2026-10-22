"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
export const GITHUB = "https://github.com/Chrisleo-16/ledgerguard-ai";
export function SiteHeader() {
  return <header className="site-head"><div className="site-wrap site-head-in">
    <Link href="/" className="logo" aria-label="LedgerGuard AI home"><span className="logo-mark"><Icon n="logo" size={15} /></span>LedgerGuard</Link>
    <nav className="site-nav" aria-label="Site"><Link href="/how-it-works">How it works</Link><a href={GITHUB} rel="noopener">GitHub</a></nav>
    <Link href="/app" className="btn btn-pill">Open demo</Link></div></header>;
}
export function SiteFooter() {
  return <footer className="site-foot"><div className="site-wrap foot-grid">
    <div><Link href="/" className="logo"><span className="logo-mark"><Icon n="logo" size={15} /></span>LedgerGuard</Link>
      <p className="muted">An AI copilot for freelancers on PayPal. Built for the PayPal AI Hackathon 2026.</p><Link href="/app" className="btn btn-pill">Open demo</Link></div>
    <nav aria-label="Product"><h2>Product</h2><Link href="/app">Demo</Link><Link href="/disputes">Disputes</Link><Link href="/ledger">Ask the ledger</Link></nav>
    <nav aria-label="Learn"><h2>Learn</h2><Link href="/how-it-works">How it works</Link><Link href="/login">Demo login</Link></nav>
    <nav aria-label="Project"><h2>Project</h2><a href={GITHUB} rel="noopener">GitHub</a><a href={GITHUB + "/blob/main/LICENSE"} rel="noopener">MIT License</a></nav>
  </div><div className="site-wrap foot-base"><span>© 2026 Chrisben Evans Leo · MIT</span><span>PayPal sandbox only. Nothing is sent without your approval.</span></div></footer>;
}
/** Install button: uses the browser's beforeinstallprompt when offered; otherwise explains how to install. */
export function InstallButton({ className = "btn ghost lg" }: { className?: string }) {
  const [evt, setEvt] = useState<any>(null); const [installed, setInstalled] = useState(false); const [hint, setHint] = useState(false);
  useEffect(() => {
    const on = (e: any) => { e.preventDefault(); setEvt(e); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", on); window.addEventListener("appinstalled", done);
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return <span className={className} aria-live="polite"><Icon n="tick" /> Installed</span>;
  return <span className="install-wrap">
    <button className={className} onClick={async () => { if (evt) { evt.prompt(); const r = await evt.userChoice; if (r.outcome === "accepted") setInstalled(true); setEvt(null); } else setHint(!hint); }}>
      <Icon n="download" /> Install app</button>
    {hint && <span className="install-hint" role="status">Use your browser menu: Chrome “Install LedgerGuard”, Safari “Share → Add to Home Screen”.</span>}</span>;
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Tooltip } from "@heroui/react";
export const GITHUB = "https://github.com/Chrisleo-16/ledgerguard-ai";
const NAV: [string, string][] = [["Home", "/"], ["Features", "/#features"], ["How it works", "/how-it-works"], ["Workflows", "/#workflows"], ["FAQ", "/#faq"]];
export function SiteHeader() {
  const path = usePathname();
  return <header className="v-nav"><div className="v-nav-in">
    <Link href="/" className="v-logo" aria-label="LedgerGuard AI home"><span className="v-logo-m"><Icon n="logo" size={16} /></span>LedgerGuard</Link>
    <nav className="v-pillnav" aria-label="Main">{NAV.map(([t, h]) => <Link key={t} href={h} className={(h === path ? "on" : "")} aria-current={h === path ? "page" : undefined}>{t}</Link>)}</nav>
    <div className="v-nav-r"><Link href="/app" className="v-npill out">Start free demo</Link><Link href="/login" className="v-npill blk">Login</Link></div>
  </div></header>;
}
export function SiteFooter() {
  if (usePathname() === "/") return null; // the landing renders its own footer
  return <footer className="site-foot"><div className="site-wrap foot-grid">
    <div><Link href="/" className="logo"><span className="logo-mark"><Icon n="logo" size={15} /></span>LedgerGuard</Link>
      <p className="muted">An AI copilot for freelancers on PayPal. Built for the PayPal AI Hackathon 2026.</p><Button as={Link} href="/app" color="primary" radius="full" size="sm" className="font-medium">Open demo</Button></div>
    <nav aria-label="Product"><h2>Product</h2><Link href="/app">Demo</Link><Link href="/disputes">Disputes</Link><Link href="/ledger">Ask the ledger</Link></nav>
    <nav aria-label="Learn"><h2>Learn</h2><Link href="/how-it-works">How it works</Link><Link href="/login">Demo login</Link></nav>
    <nav aria-label="Project"><h2>Project</h2><a href={GITHUB} rel="noopener">GitHub</a><a href={GITHUB + "/blob/main/LICENSE"} rel="noopener">MIT License</a></nav>
  </div><div className="site-wrap foot-base"><span>© 2026 Chrisben Evans Leo · MIT</span><span>PayPal sandbox only. Nothing is sent without your approval.</span></div></footer>;
}
/** Install button: uses the browser's beforeinstallprompt when offered; otherwise shows how to install in a tooltip. */
export function InstallButton({ dark }: { dark?: boolean }) {
  const [evt, setEvt] = useState<any>(null); const [installed, setInstalled] = useState(false); const [hint, setHint] = useState(false);
  useEffect(() => {
    const on = (e: any) => { e.preventDefault(); setEvt(e); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", on); window.addEventListener("appinstalled", done);
    if (window.matchMedia?.("(display-mode: standalone)").matches) setInstalled(true);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  const cls = dark ? "bg-transparent text-white border-white/40 font-medium" : "font-medium";
  if (installed) return <Button radius="full" size="lg" variant="bordered" isDisabled className={cls} startContent={<Icon n="tick" />}>Installed</Button>;
  return <Tooltip isOpen={hint} onOpenChange={setHint} content="Use your browser menu: Chrome “Install LedgerGuard”, Safari “Share → Add to Home Screen”." className="max-w-[260px]">
    <Button radius="full" size="lg" variant="bordered" className={cls} startContent={<Icon n="download" />}
      onPress={async () => { if (evt) { evt.prompt(); const r = await evt.userChoice; if (r.outcome === "accepted") setInstalled(true); setEvt(null); } else setHint(!hint); }}>Install app</Button></Tooltip>;
}

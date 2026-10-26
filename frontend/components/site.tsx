"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/icons";
import { MobileMenu } from "@/components/menu";
import { Button, Tooltip } from "@heroui/react";
export const GITHUB = "https://github.com/Chrisleo-16/ledgerguard-ai";
const NAV: [string, string][] = [["Home", "/"], ["Features", "/#features"], ["How it works", "/how-it-works"], ["Workflows", "/#workflows"], ["FAQ", "/#faq"]];
const SPY = NAV.filter(([, h]) => h.startsWith("/#")).map(([, h]) => h.slice(2));
/** Active nav href: on the landing it follows the section in view (IntersectionObserver); elsewhere the current path. */
function useActive(path: string) {
  const [act, setAct] = useState(path);
  useEffect(() => {
    if (path !== "/") { setAct(path); return; }
    const els = SPY.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const vis = new Map<string, boolean>();
    const pick = () => { const hit = SPY.filter(id => vis.get(id)); setAct(hit.length ? "/#" + hit[hit.length - 1] : "/"); };
    // a section counts as "in view" when it crosses a band just below the sticky bar
    const io = new IntersectionObserver(es => { es.forEach(e => vis.set(e.target.id, e.isIntersecting || e.boundingClientRect.top < 0 && e.boundingClientRect.bottom > window.innerHeight * 0.35)); pick(); }, { rootMargin: "-80px 0px -60% 0px" });
    els.forEach(el => io.observe(el));
    const top = () => { if (window.scrollY < 80) setAct("/"); };
    window.addEventListener("scroll", top, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", top); };
  }, [path]);
  return act;
}
export function SiteHeader() {
  const path = usePathname();
  const act = useActive(path);
  const reduce = !!useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const on = () => setScrolled(window.scrollY > 4); on(); window.addEventListener("scroll", on, { passive: true }); return () => window.removeEventListener("scroll", on); }, []);
  /** Same-page links smooth-scroll (instant under reduced motion) and update the hash; other pages navigate normally. */
  const go = (href: string, e: React.MouseEvent, delay = 0) => {
    if (path !== "/" || !(href === "/" || href.startsWith("/#")) || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    setTimeout(() => {
      const el = href === "/" ? null : document.getElementById(href.slice(2));
      if (el) el.scrollIntoView({ behavior, block: "start" }); else window.scrollTo({ top: 0, behavior });
      history.replaceState(null, "", href === "/" ? "/" : href.slice(1));
      (el ?? document.body).setAttribute("tabindex", "-1"); (el ?? document.body).focus({ preventScroll: true });
    }, delay);
  };
  return <header className={"v-nav" + (scrolled ? " scrolled" : "")}><div className="v-nav-in">
    <Link href="/" onClick={e => go("/", e)} className="v-logo" aria-label="LedgerGuard AI home"><span className="v-logo-m"><Icon n="logo" size={16} /></span>LedgerGuard</Link>
    <nav className="v-pillnav" aria-label="Main">{NAV.map(([t, h]) => { const on = h === act; return <Link key={t} href={h} onClick={e => go(h, e)} className={on ? "on" : ""} aria-current={on ? (path === "/" && h !== "/" ? "location" : "page") : undefined}>
      {on && <motion.span layoutId="v-pill-on" className="v-pill-bg" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }} />}<span className="v-pill-t">{t}</span></Link>; })}</nav>
    <div className="v-nav-r"><Link href="/app" className="v-npill out">Start free demo</Link><Link href="/login" className="v-npill blk">Login</Link><MobileMenu active={act} onNavigate={(h, e) => go(h, e, 60)} links={NAV.map(([label, href]) => ({ label, href }))} /></div>
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

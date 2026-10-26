"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type MenuLink = { href: string; label: string; badge?: string | number };
const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

/** Three lines that morph into an X. */
function Burger({ open, reduce }: { open: boolean; reduce: boolean }) {
  const t = reduce ? { duration: 0 } : spring;
  return <span className="burger" aria-hidden="true">
    <motion.i animate={open ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }} transition={t} />
    <motion.i animate={open ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }} transition={t} />
    <motion.i animate={open ? { y: -6, rotate: -45, width: 18 } : { y: 0, rotate: 0, width: 12 }} transition={t} />
  </span>;
}

/** Mobile/tablet menu (<960px): animated burger, blurred backdrop, drop-down panel with staggered links, focus trap. */
export function MobileMenu({ links, title = "Menu", active, onNavigate }: { links: MenuLink[]; title?: string; active?: string; onNavigate?: (href: string, e: React.MouseEvent) => void }) {
  const [open, setOpen] = useState(false);
  const reduce = !!useReducedMotion();
  const path = usePathname();
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback((refocus = true) => { setOpen(false); if (refocus) btn.current?.focus(); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    const first = wrap.current?.querySelector<HTMLElement>(".mm-panel a");
    const id = setTimeout(() => first?.focus(), reduce ? 0 : 120);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab" || !wrap.current) return;
      const f = [...wrap.current.querySelectorAll<HTMLElement>("button.mm-btn, .mm-panel a")];
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(id); document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = ""; };
  }, [open, close, reduce]);
  const d = reduce ? 0 : 1;
  return <div className="mm" ref={wrap}>
    <motion.button ref={btn} type="button" className="mm-btn" aria-expanded={open} aria-controls="mm-panel" aria-label={open ? "Close menu" : "Open menu"}
      onClick={() => (open ? close() : setOpen(true))} whileTap={reduce ? undefined : { scale: 0.92 }}>
      <Burger open={open} reduce={reduce} /><span className="mm-lbl">{open ? "Close" : "Menu"}</span>
    </motion.button>
    <AnimatePresence>
      {open && <>
        <motion.div key="bd" className="mm-backdrop" onClick={() => close()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 * d }} />
        <motion.div key="pn" id="mm-panel" className="mm-panel" role="dialog" aria-modal="true" aria-label={title}
          initial={{ opacity: 0, y: -16 * d, scale: 1 - 0.03 * d }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 * d, scale: 1 - 0.02 * d }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}>
          <motion.nav aria-label={title} initial="h" animate="s" exit="h" variants={{ s: { transition: { staggerChildren: 0.05 * d, delayChildren: 0.06 * d } }, h: {} }}>
            {links.map(l => <motion.div key={l.href} variants={{ h: { opacity: 0, y: 10 * d }, s: { opacity: 1, y: 0 } }} transition={reduce ? { duration: 0 } : spring}>
              <Link href={l.href} onClick={e => { close(false); onNavigate?.(l.href, e); }} className={`mm-link ${(active ?? path) === l.href ? "on" : ""}`} aria-current={(active ?? path) === l.href ? (active ? "location" : "page") : undefined}>
                <span>{l.label}</span>{l.badge != null ? <em>{l.badge}</em> : <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </Link></motion.div>)}
            <motion.div className="mm-cta" variants={{ h: { opacity: 0, y: 10 * d }, s: { opacity: 1, y: 0 } }} transition={reduce ? { duration: 0 } : spring}>
              <Link href="/app" onClick={() => close(false)} className="v-npill out">Start free demo</Link>
              <Link href="/login" onClick={() => close(false)} className="v-npill blk">Login</Link>
            </motion.div>
          </motion.nav>
        </motion.div>
      </>}
    </AnimatePresence>
  </div>;
}

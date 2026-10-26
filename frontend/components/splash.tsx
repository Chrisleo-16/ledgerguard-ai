"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
const MIN = 600, MAX = 2000;
/** Launch splash: brand mark with a circular progress ring. Server-rendered visible so it covers first paint,
 *  fades once hydrated (min 600ms, max 2s). Re-shows briefly on navigation into /app. Hidden for reduced motion via CSS. */
export function Splash() {
  const path = usePathname();
  const [state, setState] = useState<"on" | "out" | "off">("on");
  const t0 = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const prev = useRef(path);
  const hide = (since: number) => {
    const wait = Math.min(MAX, Math.max(0, MIN - (performance.now() - since)));
    const a = setTimeout(() => setState("out"), wait), b = setTimeout(() => setState("off"), wait + 380);
    return () => { clearTimeout(a); clearTimeout(b); };
  };
  useEffect(() => { // hydrated
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setState("off"); return; }
    const done = () => hide(t0.current);
    if (document.readyState === "complete") return done();
    let c: (() => void) | undefined; const on = () => { c = done(); };
    window.addEventListener("load", on, { once: true });
    const cap = setTimeout(() => setState("off"), MAX);
    return () => { window.removeEventListener("load", on); clearTimeout(cap); c?.(); };
  }, []);
  useEffect(() => { // route transition into the app
    const was = prev.current; prev.current = path;
    if (was === path || path !== "/app" || was.startsWith("/app")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("on"); return hide(performance.now());
  }, [path]);
  if (state === "off") return null;
  return <div className={`splash ${state === "out" ? "out" : ""}`} aria-hidden="true">
    <div className="sp-mark">
      <svg className="sp-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" className="sp-track" /><circle cx="60" cy="60" r="54" className="sp-arc" pathLength="100" /></svg>
      <span className="sp-logo"><Icon n="logo" size={30} stroke={1.7} /></span>
    </div>
    <span className="sp-word">LedgerGuard</span>
  </div>;
}

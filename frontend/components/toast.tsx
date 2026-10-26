"use client";
/* Status toast card — design adapted from Uiverse.io by akshat-patel28 (MIT). See THIRD_PARTY_NOTICES.md. */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toUserErr, type UserErr } from "@/lib/api";

export type Variant = "success" | "error" | "warning" | "info" | "loading";
export type ToastData = { variant: Variant; title: string; message?: string; action?: string; debug?: string; code?: string };

const WAVE = "M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L0,320Z";
const ICONS: Record<Exclude<Variant, "loading">, string> = {
  success: "M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-111 111-47-47c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64c9.4 9.4 24.6 9.4 33.9 0L369 209z",
  error: "M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c-9.4 9.4-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0z",
  warning: "M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7.2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8.2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24v112c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0-64 0 32 32 0 1 0 64 0z",
  info: "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24v-64h-24c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24h-80c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z",
};

/** One status card: wavy tinted edge, round tinted icon, bold coloured title, grey subtext, grey X. */
export function StatusToast({ t, onClose, inline }: { t: ToastData; onClose?: () => void; inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const urgent = t.variant === "error" || t.variant === "warning";
  const sub = [t.message, t.action].filter(Boolean).join(" ");
  return <div className={`st st-${t.variant}${inline ? " st-inline" : ""}`} role={urgent ? "alert" : "status"} aria-live={urgent ? "assertive" : "polite"} aria-busy={t.variant === "loading" || undefined}>
    <svg className="st-wave" viewBox="0 0 1440 320" aria-hidden="true" focusable="false"><path d={WAVE} /></svg>
    <span className="st-ic" aria-hidden="true">
      {t.variant === "loading" ? <span className="st-spin" /> : <svg viewBox="0 0 512 512" fill="currentColor"><path d={ICONS[t.variant]} /></svg>}
    </span>
    <div className="st-txt">
      <p className="st-title">{t.title}</p>
      {sub && <p className="st-sub">{t.message}{t.action && <> <strong>{t.action}</strong></>}</p>}
      {t.debug && <>
        <button type="button" className="st-more" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide details" : "Details"}</button>
        {open && <code className="st-debug">{t.code ? `${t.code}: ` : ""}{t.debug}</code>}</>}
    </div>
    {onClose && t.variant !== "loading" && <button type="button" className="st-x" onClick={onClose} aria-label="Dismiss message">
      <svg viewBox="0 0 15 15" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" /></svg>
    </button>}
  </div>;
}

export const fromError = (e: unknown): ToastData => { const i: UserErr = toUserErr(e); return { variant: i.code === "server_waking" ? "warning" : "error", ...i }; };

type Item = ToastData & { id: number };
type Api = {
  show: (t: ToastData, ms?: number) => number; update: (id: number, t: ToastData, ms?: number) => void; dismiss: (id: number) => void;
  /** Run an action with a loading toast, then a success or plain-language error toast. */
  run: <T>(f: () => Promise<T>, o: { loading: string; success: string | ((r: T) => string); message?: (r: T) => string }) => Promise<T | undefined>;
};
const Ctx = createContext<Api | null>(null);
export const useToast = () => { const c = useContext(Ctx); if (!c) throw new Error("useToast outside ToastProvider"); return c; };

const LIFE: Record<Variant, number> = { success: 5000, info: 6000, warning: 9000, error: 0, loading: 0 }; // 0 = until dismissed / updated

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0); const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const reduce = useReducedMotion();
  const dismiss = useCallback((id: number) => { clearTimeout(timers.current.get(id)); timers.current.delete(id); setItems(x => x.filter(i => i.id !== id)); }, []);
  const arm = useCallback((id: number, t: ToastData, ms?: number) => {
    clearTimeout(timers.current.get(id)); const life = ms ?? LIFE[t.variant];
    if (life) timers.current.set(id, setTimeout(() => dismiss(id), life));
  }, [dismiss]);
  const show = useCallback((t: ToastData, ms?: number) => { const id = ++seq.current; setItems(x => [...x.slice(-3), { ...t, id }]); arm(id, t, ms); return id; }, [arm]);
  const update = useCallback((id: number, t: ToastData, ms?: number) => { setItems(x => x.some(i => i.id === id) ? x.map(i => i.id === id ? { ...t, id } : i) : [...x, { ...t, id }]); arm(id, t, ms); }, [arm]);
  const run = useCallback(async <T,>(f: () => Promise<T>, o: { loading: string; success: string | ((r: T) => string); message?: (r: T) => string }) => {
    const id = show({ variant: "loading", title: o.loading, message: "This can take a few seconds." });
    try { const r = await f(); update(id, { variant: "success", title: typeof o.success === "function" ? o.success(r) : o.success, message: o.message?.(r) }); return r; }
    catch (e) { update(id, fromError(e)); return undefined; }
  }, [show, update]);
  // Server wake-up (cold start): lib/api dispatches lg:waking while it retries a sleeping server.
  useEffect(() => {
    let id = 0;
    const on = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (d === "start" && !id) id = show({ variant: "loading", title: "Waking up the server…", message: "The demo server sleeps when idle. This takes about 30 seconds." });
      if (d === "done" && id) { update(id, { variant: "success", title: "Server is awake", message: "Everything is loaded." }); id = 0; }
      if (d === "fail" && id) { dismiss(id); id = 0; }
    };
    window.addEventListener("lg:waking", on); return () => window.removeEventListener("lg:waking", on);
  }, [show, update, dismiss]);
  // Lets the demo walkthrough / screenshot script show a toast: window.lgToast({variant, title, message}).
  useEffect(() => { (window as any).lgToast = show; }, [show]);
  const api = useMemo(() => ({ show, update, dismiss, run }), [show, update, dismiss, run]);
  return <Ctx.Provider value={api}>{children}
    <div className="st-stack">
      <AnimatePresence initial={false}>
        {items.map(t => <motion.div key={t.id} layout={!reduce}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40, scale: .96 }} transition={{ duration: reduce ? .01 : .22, ease: [.2, .8, .2, 1] }}>
          <StatusToast t={t} onClose={() => dismiss(t.id)} />
        </motion.div>)}
      </AnimatePresence>
    </div>
  </Ctx.Provider>;
}

"use client";
/* Cookie / privacy consent card — layout adapted from Uiverse.io by ilkhoeri (MIT). See THIRD_PARTY_NOTICES.md.
   The cookie illustration is original. */
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export const CONSENT_KEY = "lg_privacy_ack";

function CookieArt() {
  return <svg className="cc-art" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <defs><mask id="cc-bite"><rect width="120" height="120" fill="#fff" />
      <circle cx="104" cy="22" r="20" fill="#000" /><circle cx="84" cy="10" r="11" fill="#000" /><circle cx="112" cy="44" r="11" fill="#000" /></mask></defs>
    <g mask="url(#cc-bite)">
      <circle cx="60" cy="62" r="50" fill="#3d5a00" />
      <circle cx="58" cy="59" r="45" fill="#c6f432" />
      <circle cx="40" cy="44" r="6" fill="#2f4600" /><circle cx="66" cy="36" r="4.5" fill="#2f4600" />
      <circle cx="32" cy="72" r="5" fill="#2f4600" /><circle cx="58" cy="64" r="6.5" fill="#2f4600" />
      <circle cx="82" cy="58" r="4.5" fill="#2f4600" /><circle cx="50" cy="90" r="4.5" fill="#2f4600" />
      <circle cx="76" cy="84" r="6" fill="#2f4600" /><circle cx="90" cy="76" r="2.5" fill="#3d5a00" />
      <circle cx="24" cy="56" r="2.5" fill="#3d5a00" /><circle cx="64" cy="48" r="2" fill="#3d5a00" />
    </g>
    <path d="M86 4a11 11 0 0 0 0 0M80 12" fill="none" />
  </svg>;
}

export function CookieConsent() {
  const [show, setShow] = useState(false); const [more, setMore] = useState(false);
  const reduce = useReducedMotion(); const id = useId(); const acceptRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { try { if (!localStorage.getItem(CONSENT_KEY)) setShow(true); } catch {} }, []);
  const accept = () => { try { localStorage.setItem(CONSENT_KEY, new Date().toISOString()); } catch {} setShow(false); };
  return <AnimatePresence>{show &&
    <motion.section className="cc" role="region" aria-label="Privacy notice" aria-labelledby={`${id}-h`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: .96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: reduce ? .01 : .35, ease: [.2, .8, .2, 1], delay: reduce ? 0 : .6 } }}
      exit={reduce ? { opacity: 0, transition: { duration: .01 } } : { opacity: 0, y: 30, transition: { duration: .25 } }}
      onKeyDown={e => { if (e.key === "Escape") acceptRef.current?.focus(); }}>
      <CookieArt />
      <h2 id={`${id}-h`} className="cc-h">Your privacy matters</h2>
      <p className="cc-p">LedgerGuard uses no tracking or advertising cookies. We only store your demo session and preferences on this device, so the app remembers you. Read our <Link href="/privacy">Privacy</Link> page.</p>
      {more && <p className="cc-p cc-more" id={`${id}-more`}>What we keep, in your browser only: whether you opened the demo and this choice. Nothing is sent to advertisers or analytics. Clearing your browser data removes it.</p>}
      <div className="cc-row">
        <button type="button" className="cc-opt" aria-expanded={more} aria-controls={`${id}-more`} onClick={() => setMore(!more)}>{more ? "Fewer options" : "More options"}</button>
        <button type="button" ref={acceptRef} className="cc-ok" onClick={accept}>Accept</button>
      </div>
    </motion.section>}</AnimatePresence>;
}

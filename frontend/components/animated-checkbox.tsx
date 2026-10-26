"use client";
/* Animated checkbox — adapted from Uiverse.io by SelfMadeSystem (MIT). See THIRD_PARTY_NOTICES.md.
   One SVG path morphs from a rounded square into a tick. The real input stays in the DOM (visually hidden). */
import { ReactNode } from "react";

export function AnimatedCheckbox({ checked, onChange, children, dark, className = "" }:
  { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; dark?: boolean; className?: string }) {
  return <label className={`acb${dark ? " acb-dark" : ""} ${className}`}>
    <input type="checkbox" className="acb-in" checked={checked} onChange={e => onChange(e.target.checked)} />
    <svg className="acb-svg" viewBox="0 0 64 64" width="20" height="20" aria-hidden="true" focusable="false">
      <path pathLength="575.0541381835938" className="acb-path"
        d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16" />
    </svg>
    <span>{children}</span>
  </label>;
}

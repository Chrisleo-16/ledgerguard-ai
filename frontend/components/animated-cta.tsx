"use client";
/* Animated arrow CTA — adapted from Uiverse.io by gharsh11032000 (MIT). See THIRD_PARTY_NOTICES.md.
   Rests as a dark #111 pill with white text and a 2px lime ring (AA on light backgrounds); on hover/focus a lime
   circle fills it, text/arrows turn #111, one arrow exits right while the other enters from the left. */
import Link from "next/link";
import { forwardRef, MouseEvent, ReactNode } from "react";

const Arrow = ({ cls }: { cls: string }) => <svg className={cls} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" /></svg>;

type Props = { children: ReactNode; href?: string; onClick?: (e: MouseEvent<HTMLElement>) => void; size?: "sm" | "md" | "lg";
  className?: string; fullWidth?: boolean; autoFocus?: boolean; type?: "button" | "submit"; "aria-label"?: string };

export const AnimatedCTA = forwardRef<HTMLElement, Props>(function AnimatedCTA({ children, href, onClick, size = "md", className = "", fullWidth, autoFocus, type = "button", ...rest }, ref) {
  const cls = `acta acta-${size}${fullWidth ? " acta-full" : ""} ${className}`;
  const inner = <><Arrow cls="acta-arr acta-arr-in" /><span className="acta-txt">{children}</span><span className="acta-circle" aria-hidden="true" /><Arrow cls="acta-arr acta-arr-out" /></>;
  if (href) return <Link ref={ref as any} href={href} className={cls} onClick={onClick} autoFocus={autoFocus} {...rest}>{inner}</Link>;
  return <button ref={ref as any} type={type} className={cls} onClick={onClick} autoFocus={autoFocus} {...rest}>{inner}</button>;
});

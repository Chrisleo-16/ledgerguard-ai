import { KE, NG, GH, UG, ZA, US, GB, DE, IN, CA, NL, MU, FR } from "country-flag-icons/react/1x1";
/** Self-hosted SVG flags (country-flag-icons, MIT); emoji flags don't render on Windows. */
const F: Record<string, any> = { KE, NG, GH, UG, ZA, US, GB, DE, IN, CA, NL, MU, FR };
export function Flag({ code, size = 16, label }: { code: string; size?: number; label?: string }) {
  const C = F[code.toUpperCase()]; if (!C) return null;
  return <C className="flag-i" width={size} height={size} style={{ width: size, height: size }} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })} />;
}

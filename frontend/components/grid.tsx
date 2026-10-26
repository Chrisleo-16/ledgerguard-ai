"use client";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
export { AgGridReact } from "ag-grid-react";
export const amountFmt = (p: any) => p.value == null ? "" : Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const COUNTRY: Record<string, string> = { US: "US", DE: "DE", GB: "GB", NL: "NL", KE: "KE", FR: "FR", NG: "NG" };
import { useEffect, useState } from "react";
/** True at phone widths (<= 768px). Used to pin key grid columns and hide low-priority ones. */
export function useIsMobile(q = "(max-width: 768px)") {
  const [m, setM] = useState(false);
  useEffect(() => { const mq = window.matchMedia(q); const f = () => setM(mq.matches); f(); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]);
  return m;
}

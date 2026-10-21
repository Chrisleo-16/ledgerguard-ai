"use client";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
export { AgGridReact } from "ag-grid-react";
export const amountFmt = (p: any) => p.value == null ? "" : Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const COUNTRY: Record<string, string> = { US: "🇺🇸 US", DE: "🇩🇪 DE", GB: "🇬🇧 GB", NL: "🇳🇱 NL", KE: "🇰🇪 KE", FR: "🇫🇷 FR", NG: "🇳🇬 NG" };

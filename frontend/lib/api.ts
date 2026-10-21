export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(API + path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.detail ? JSON.stringify(body.detail) : `HTTP ${r.status}`);
  return body as T;
}
export const post = <T = any>(path: string, data?: unknown) => api<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined });
export type Invoice = { id: number; paypal_id: string; number: string; client_id: number; client: string; country: string; description: string;
  amount: number; currency: string; status: string; issue_date: string; due_date: string; days_overdue: number; paid_at: string | null };
export const money = (a: number, c: string) => `${c} ${a.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Late-fee label from the guardrailed decision: percent and amount both come from the backend (never hard-coded). */
export function feeLabel(r: { late_fee: number; reasoning?: { late_fee_pct?: number } }, currency?: string) {
  const pct = r.reasoning?.late_fee_pct;
  return `${currency ?? ""} ${r.late_fee.toFixed(2)}${pct != null ? ` (${Number(pct).toLocaleString(undefined, { maximumFractionDigits: 2 })}%)` : ""}`.trim();
}

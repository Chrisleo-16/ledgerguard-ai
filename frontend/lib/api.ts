export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
/** A user-facing error: what happened, why, and what to do next. Technical details stay in `debug`. */
export type UserErr = { title: string; message: string; action: string; code: string; debug?: string };
export class ApiError extends Error {
  constructor(public info: UserErr) { super(`${info.title} ${info.message} ${info.action}`.trim()); this.name = "ApiError"; }
  toString() { return this.message; }
}
const WAKING: UserErr = { title: "Waking up the server.", message: "The demo server sleeps when nobody is using it, and it takes about 30 seconds to start.",
  action: "Wait a moment, then try again. This page will retry by itself.", code: "server_waking" };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
/** Turn anything thrown into a plain-language error (never raw codes or JSON). */
export function toUserErr(e: unknown): UserErr {
  if (e instanceof ApiError) return e.info;
  return { title: "Something went wrong.", message: "We couldn't finish that. Your data is safe.", action: "Try again. If it keeps happening, refresh the page.", code: "unexpected", debug: String(e) };
}
export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const get = !opts.method || opts.method.toUpperCase() === "GET";
  for (let attempt = 0; ; attempt++) {
    let r: Response | null = null;
    try { r = await fetch(API + path, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) }, cache: "no-store" }); }
    catch (e) { r = null; }
    // Asleep / cold-starting host: no response, or the platform's 502/503 page instead of our JSON.
    const body = r ? await r.json().catch(() => null) : null;
    const asleep = !r || (!r.ok && !body?.error && [502, 503, 504].includes(r.status));
    if (asleep) {
      if (get && attempt < 3) { await sleep(10000); continue; }
      throw new ApiError({ ...WAKING, debug: r ? `HTTP ${r.status} from ${path}` : `Network error on ${path}` });
    }
    if (!r!.ok) {
      const info: UserErr = body?.error || toUserErr(null);
      throw new ApiError({ ...info, debug: body?.debug || `HTTP ${r!.status} ${path}` });
    }
    return body as T;
  }
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

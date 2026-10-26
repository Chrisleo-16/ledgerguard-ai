"use client";
import { ReactNode } from "react";
import { Accordion, AccordionItem, Card, CardBody, Chip, Progress, Skeleton } from "@heroui/react";
import { Icon, IcName } from "@/components/icons";
import { Alert } from "@heroui/react";
import { useState } from "react";
import { toUserErr, type UserErr } from "@/lib/api";
export const STATUS_LABEL: Record<string, string> = { draft: "Draft", sent: "Sent", due_soon: "Due soon", due: "Due", overdue_3: "Overdue 3d+",
  overdue_7: "Overdue 7d+", paid: "Paid", cancelled: "Cancelled", superseded: "Superseded", approved: "Approved",
  received: "Received", package_ready: "Awaiting your approval", submitted: "Evidence submitted", no_action: "No action needed",
  wait: "Wait", remind: "Remind", offer_split: "Offer split payment", offer_pay_later: "Offer Pay Later", escalate: "Escalate" };
const STATUS_KIND: Record<string, string> = { sent: "info", due_soon: "warn", due: "warn", overdue_3: "bad", overdue_7: "bad", paid: "ok",
  approved: "ok", submitted: "ok", package_ready: "warn", received: "info", friendly: "ok", neutral: "info", firm: "bad", remind: "info", offer_split: "ok", offer_pay_later: "ok", escalate: "bad", wait: "neutral" };
const CHIP_COLOR: Record<string, "default" | "success" | "warning" | "danger" | "primary"> = { ok: "success", warn: "warning", bad: "danger", info: "primary", neutral: "default" };
/** Status badge as a HeroUI Chip (flat, small). Colors come from the theme; text stays AA on the soft fills. */
export function Badge({ s, label }: { s: string; label?: string }) {
  const k = STATUS_KIND[s] || "neutral";
  return <Chip size="sm" radius="full" variant="flat" color={CHIP_COLOR[k]} className={`lg-chip k-${k}`}>{label ?? STATUS_LABEL[s] ?? s}</Chip>;
}
export function fmtTotals(t: Record<string, number> | undefined): [string, string][] {
  return Object.entries(t || {}).map(([c, v]) => [c, v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]);
}
/** KPI: HeroUI Card in a tray, exact per-currency totals, and a Progress meter for an exact count ratio (part/whole). */
const KPI_COLOR: Record<string, "primary" | "danger" | "success" | "warning"> = { bad: "danger", ok: "success", warn: "warning" };
export function Kpi({ label, icon, totals, foot, kind, part, whole }: { label: string; icon?: IcName; totals?: Record<string, number>; foot: ReactNode; kind?: string; part?: number; whole?: number }) {
  const lines = fmtTotals(totals);
  return <div className={`kpi ${kind || ""}`}><div className="label">{icon ? <Icon n={icon} size={15} /> : <i />}{label}</div>
    <Card shadow="sm" radius="lg" className="kpi-card" isHoverable><CardBody className="inner">
      <div className={lines.length > 1 ? "multi" : ""}>{lines.length ? lines.map(([c, v]) => <div key={c} className="value-line"><span className="cur">{c}</span>{v}</div>)
        : <div className="value-line">—</div>}</div><div className="foot">{foot}</div>
      {whole != null && <Progress aria-label={`${label}: ${part} of ${whole}`} size="sm" radius="full" value={whole ? Math.min(part || 0, whole) : 0} maxValue={whole || 1}
        color={KPI_COLOR[kind || ""] || "primary"} className="kpi-progress" classNames={{ track: "bg-default-200" }} />}
    </CardBody></Card></div>;
}
export function KpiSkeleton() {
  return <div className="kpi"><Skeleton className="rounded-md w-24 h-4 mb-2" /><Card shadow="sm" radius="lg"><CardBody className="gap-3">
    <Skeleton className="rounded-md w-3/4 h-6" /><Skeleton className="rounded-md w-1/2 h-6" /><Skeleton className="rounded-md w-2/3 h-3" /><Skeleton className="rounded-full w-full h-2" /></CardBody></Card></div>;
}
export const Thinking = () => <span className="thinking"><i /><i /><i /></span>;
export function PageHead({ title, sub, right, icon }: { title: string; sub: string; right?: ReactNode; icon?: IcName }) {
  return <div className="page-head"><div><h1>{icon && <Icon n={icon} size={18} />}{title}</h1><p>{sub}</p></div>{right}</div>;
}
export function DemoPanel({ children, hint }: { children: ReactNode; hint?: string }) {
  return <Accordion variant="light" className="demo-acc px-0" itemClasses={{ base: "demo-item", title: "text-[14px] font-medium", subtitle: "text-[12px] text-default-600", content: "pb-4" }}>
    <AccordionItem key="demo" aria-label="Demo controls" startContent={<Icon n="demo" />} title="Demo controls" subtitle={hint || "time travel and webhook simulation for judges/testing"}>
      <div className="demo-body">{children}</div></AccordionItem></Accordion>;
}

export function AiRationale({ r }: { r: any }) {
  const src = r.decision_source; const ai = src && src !== "rules";
  return <div className="ai-box">
    <div className="row" style={{ gap: 6 }}><span className="ai-tag">{ai ? <><Icon n="ai" size={12} /> AI decision</> : "Rules engine"}</span>
      {r.next_action && <Badge s={r.next_action} />}<span className="muted">{ai ? src : "no LLM / fallback"}</span></div>
    {r.rationale && <div className="ai-text">{r.rationale}</div>}
    {r.guardrail_notes?.length > 0 && <div className="guard"><Icon n="disputes" size={13} /> Guardrails applied: {r.guardrail_notes.join("; ")}</div>}
  </div>;
}

/** Status / error banner (HeroUI Alert). Errors read as what happened, why, and what to do next;
 * technical details sit behind an optional "Details" toggle. Always dismissible. */
export type Note = { t: string; err?: boolean; info?: UserErr } | null;
export function Notice({ note, onClose }: { note: Note; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  if (!note) return null;
  const i = note.info;
  return <Alert role={note.err ? "alert" : "status"} hideIcon isClosable onClose={onClose}
    classNames={{ base: `notice notice-x ${note.err ? "err" : ""}`, mainWrapper: "notice-main", title: "notice-title", description: "notice-desc",
      closeButton: "notice-close" }}
    closeButtonProps={{ "aria-label": "Dismiss message" } as any}
    title={i ? i.title : note.t}
    description={i ? <>
      <span>{i.message} <strong>{i.action}</strong></span>
      {i.debug && <><button type="button" className="notice-more" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide details" : "Details"}</button>
        {open && <code className="notice-debug">{i.code}: {i.debug}</code>}</>}
    </> : undefined} />;
}

export const errNote = (e: unknown): Note => { const info = toUserErr(e); return { t: info.title, err: true, info }; };

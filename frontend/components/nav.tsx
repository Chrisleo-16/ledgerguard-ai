"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileMenu } from "@/components/menu";
import { Avatar, Button, Chip, Divider, Listbox, ListboxItem, Tooltip } from "@heroui/react";
import { api } from "@/lib/api";
import { Icon, IcName } from "@/components/icons";
const LINKS: [string, string, IcName][] = [["/app", "Invoices", "invoices"], ["/disputes", "Disputes", "disputes"], ["/ledger", "Ask the ledger", "ledger"]];

function SideContent({ path, h, down, counts }: { path: string; h: any; down: boolean; counts: any }) {
  const badge: Record<string, number | undefined> = { "/app": counts?.overdue.count, "/disputes": counts?.open_disputes.count };
  const ai = h?.llm_provider && h.llm_provider !== "none";
  return <>
    <Link href="/" className="logo" aria-label="LedgerGuard AI home"><span className="logo-mark"><Icon n="logo" size={15} /></span>LedgerGuard <small>AI</small></Link>
    <div className="nav-label">Workspace</div>
    <Listbox aria-label="Workspace" variant="flat" selectionMode="single" hideSelectedIcon disallowEmptySelection
      selectedKeys={new Set(LINKS.filter(([href]) => path.startsWith(href)).map(([href]) => href))} className="p-0 gap-0.5"
      itemClasses={{ base: "nav-item h-8 px-2.5 rounded-lg data-[hover=true]:bg-default-100 data-[selected=true]:bg-content1 data-[selected=true]:shadow-small", title: "text-[13px] font-medium" }}>
      {LINKS.map(([href, label, icon]) => <ListboxItem key={href} href={href} textValue={label} startContent={<Icon n={icon} />}
        endContent={badge[href] ? <Chip size="sm" variant="flat" radius="sm" className="h-5 min-w-5 text-[11px]">{badge[href]}</Chip> : null}>{label}</ListboxItem>)}
    </Listbox>
    <div className="env">
      {down ? <Chip variant="bordered" startContent={<span className="dot bad" />} className="env-chip" title="The demo server sleeps when idle and takes about 30 seconds to wake up.">Server waking up…</Chip> : h ? <>
        <Tooltip content={h.paypal_mode === "sandbox" ? "Live PayPal sandbox API" : "Mock PayPal client with sandbox-shaped responses"} placement="right">
          <Chip variant="bordered" startContent={<span className={`dot ${h.paypal_mode === "sandbox" ? "ok" : "warn"}`} />} className="env-chip">PayPal {h.paypal_mode === "sandbox" ? "Sandbox" : "Demo (mock)"}</Chip></Tooltip>
        <Tooltip content={h.llm} placement="right">
          <Chip variant="bordered" startContent={<span className={`dot ${ai ? "ok" : "warn"}`} />} className="env-chip">{ai ? `AI: ${h.llm_provider === "anthropic" ? "Claude" : "OpenAI-compatible"} · ${h.llm_model}` : "AI: rules fallback"}</Chip></Tooltip>
        <Chip variant="bordered" className="env-chip">Today {h.today}{h.clock_offset_days ? ` (+${h.clock_offset_days}d)` : ""}</Chip></> : <Chip variant="bordered" className="env-chip">Connecting…</Chip>}
      <Divider className="my-1" />
      <span className="user-row"><Avatar name="CL" getInitials={() => "CL"} size="sm" className="w-7 h-7 text-[11px] bg-primary text-primary-foreground" />Chrisben Evans Leo</span>
    </div></>;
}

export default function Nav() {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const [h, setH] = useState<any>(null); const [down, setDown] = useState(false); const [counts, setCounts] = useState<any>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const f = () => Promise.all([api("/api/health"), api("/api/summary")]).then(([x, s]) => { setH(x); setCounts(s); setDown(false); }).catch(() => setDown(true));
    f(); const t = setInterval(f, 5000); return () => clearInterval(t);
  }, []);
  const title = LINKS.find(([href]) => path.startsWith(href))?.[1] || "LedgerGuard";
  return <>
    <div className="mtop"><Link href="/" className="logo-mark" aria-label="LedgerGuard AI home"><Icon n="logo" size={15} /></Link>
      <b>{title}</b><MobileMenu title="Workspace menu" links={[...LINKS.map(([href, label]: any) => ({ href, label, badge: href === "/app" ? counts?.overdue?.count : href === "/disputes" ? counts?.open_disputes?.count : undefined })), { href: "/", label: "Home" }, { href: "/how-it-works", label: "How it works" }]} /></div>
    <aside className="sidebar"><SideContent path={path} h={h} down={down} counts={counts} /></aside>
  </>;
}

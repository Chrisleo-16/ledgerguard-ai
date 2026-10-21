"use client";
/* Icon layer: Hugeicons free (MIT), "stroke rounded" variant at 1.5px stroke, 16px default.
   Chosen to match the thin, round-capped, outline-only product icons of the reference style. */
import { HugeiconsIcon } from "@hugeicons/react";
import * as H from "@hugeicons/core-free-icons";
export const Ic = { invoices: H.Invoice03Icon, disputes: H.Shield01Icon, ledger: H.AiChat02Icon, ai: H.SparklesIcon, sync: H.RefreshIcon,
  add: H.Add01Icon, mail: H.Mail01Icon, check: H.CheckmarkCircle02Icon, copy: H.Copy01Icon, alert: H.Alert02Icon, flash: H.FlashIcon,
  contract: H.Agreement01Icon, milestone: H.Flag02Icon, delivery: H.PackageIcon, message: H.Message01Icon, file: H.Attachment01Icon,
  clock: H.Clock01Icon, demo: H.TestTube01Icon, enter: H.ArrowTurnBackwardIcon, search: H.Search01Icon, wallet: H.Wallet01Icon,
  received: H.MoneyReceive02Icon, money: H.Money03Icon, calendar: H.Calendar03Icon, db: H.DatabaseIcon, chevron: H.ArrowDown01Icon,
  close: H.Cancel01Icon, user: H.UserIcon, tick: H.Tick02Icon, up: H.ArrowUp02Icon, logo: H.ShieldUserIcon, download: H.Download04Icon, arrow: H.ArrowRight01Icon, lock: H.LockIcon, code: H.SourceCodeIcon, human: H.UserCheck01Icon };
export type IcName = keyof typeof Ic;
export function Icon({ n, size = 16, className, stroke = 1.5 }: { n: IcName; size?: number; className?: string; stroke?: number }) {
  return <HugeiconsIcon icon={Ic[n]} size={size} strokeWidth={stroke} className={`ic ${className || ""}`} aria-hidden="true" />;
}
/** Icon inside a small rounded tile (the "icon chip" used for row leads and empty states). */
export const IconTile = ({ n, size = 14, big }: { n: IcName; size?: number; big?: boolean }) =>
  <span className={`ic-tile ${big ? "big" : ""}`}><Icon n={n} size={big ? 18 : size} /></span>;

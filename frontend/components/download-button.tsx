"use client";
/* Download / install pill — adapted from Uiverse.io by sahilxkhadka (MIT). See THIRD_PARTY_NOTICES.md. */
import { ReactNode, useEffect, useId, useState } from "react";
import { useToast } from "@/components/toast";

const DlIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
  <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" /></svg>;

export function DownloadButton({ children, tip, onClick, disabled }: { children: ReactNode; tip: string; onClick?: () => void; disabled?: boolean }) {
  const id = useId();
  return <span className="dlb-wrap">
    <button type="button" className="dlb" onClick={onClick} disabled={disabled} aria-describedby={id}><DlIcon /><span>{children}</span></button>
    <span role="tooltip" id={id} className="dlb-tip">{tip}</span>
  </span>;
}

/** PWA install: real beforeinstallprompt when the browser offers it; otherwise plain-language steps (iOS/Safari). */
export function InstallAppButton() {
  const toast = useToast();
  const [evt, setEvt] = useState<any>(null); const [installed, setInstalled] = useState(false); const [ios, setIos] = useState(false);
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setEvt(e); }; const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", on); window.addEventListener("appinstalled", done);
    if (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone) setInstalled(true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (/safari/i.test(navigator.userAgent) && !/chrome|crios|android/i.test(navigator.userAgent)));
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  if (installed) return <DownloadButton tip="LedgerGuard is already on this device" disabled>Installed</DownloadButton>;
  const tip = ios ? "Add to home screen: tap Share → Add to Home Screen" : "Install as an app";
  const go = async () => {
    if (evt) { evt.prompt(); const r = await evt.userChoice; setEvt(null);
      if (r.outcome === "accepted") { setInstalled(true); toast.show({ variant: "success", title: "App installed", message: "LedgerGuard now opens in its own window." }); }
      return; }
    toast.show({ variant: "info", title: "Install from your browser", message: ios
      ? "Safari doesn't show an install pop-up. Tap the Share button, then choose “Add to Home Screen”."
      : "Your browser isn't offering an install pop-up right now.", action: ios ? "LedgerGuard will then open like an app." : "Open the browser menu and choose “Install LedgerGuard” or “Add to Home Screen”." });
  };
  return <DownloadButton tip={tip} onClick={go}>Install app</DownloadButton>;
}

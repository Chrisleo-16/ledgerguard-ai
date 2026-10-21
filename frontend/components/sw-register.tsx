"use client";
import { useEffect } from "react";
export default function SwRegister() {
  useEffect(() => {
    const ok = location.protocol === "https:" || location.hostname === "localhost";
    if (ok && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

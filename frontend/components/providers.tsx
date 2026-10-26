"use client";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { ToastProvider } from "@/components/toast";
import { CookieConsent } from "@/components/cookie-consent";
export default function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return <HeroUIProvider navigate={router.push}><ToastProvider>{children}<CookieConsent /></ToastProvider></HeroUIProvider>;
}

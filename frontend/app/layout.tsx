import "./tailwind.css";
import "./theme.css";
import "./globals.css";
import { Rubik } from "next/font/google";
import Providers from "@/components/providers";
import SwRegister from "@/components/sw-register";
import { Splash } from "@/components/splash";
const rubik = Rubik({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-rubik", display: "swap" });
export const metadata = {
  title: "LedgerGuard AI: PayPal financial-ops copilot",
  description: "Agentic invoice chasing, dispute defense and a conversational ledger on PayPal.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "LedgerGuard", statusBarStyle: "default" },
};
export const viewport = { themeColor: "#fafafa", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className={rubik.variable}><body className="font-sans text-foreground bg-background"><Splash /><Providers>{children}</Providers><SwRegister /></body></html>);
}

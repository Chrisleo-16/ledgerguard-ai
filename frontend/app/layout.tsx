import "./theme.css";
import "./globals.css";
import SwRegister from "@/components/sw-register";
export const metadata = {
  title: "LedgerGuard AI: PayPal financial-ops copilot",
  description: "Agentic invoice chasing, dispute defense and a conversational ledger on PayPal.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "LedgerGuard", statusBarStyle: "default" },
};
export const viewport = { themeColor: "#1a1a1a", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}<SwRegister /></body></html>);
}

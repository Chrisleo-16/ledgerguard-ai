import "./theme.css";
import "./globals.css";
import Nav from "@/components/nav";
export const metadata = { title: "LedgerGuard AI: PayPal financial-ops copilot", description: "Agentic invoice chasing, dispute defense and a conversational ledger on PayPal." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><div className="shell"><Nav /><div style={{ minWidth: 0 }}>
    <main className="page">{children}</main>
    <footer>LedgerGuard AI · Every reminder and evidence submission needs your approval. Nothing is sent automatically.</footer></div></div></body></html>);
}

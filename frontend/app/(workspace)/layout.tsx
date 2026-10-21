import Nav from "@/components/nav";
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (<div className="shell"><Nav /><div style={{ minWidth: 0 }}>
    <main className="page">{children}</main>
    <footer>LedgerGuard AI · Every reminder and evidence submission needs your approval. Nothing is sent automatically.</footer></div></div>);
}

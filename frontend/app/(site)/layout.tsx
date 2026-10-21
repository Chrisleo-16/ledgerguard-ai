import { SiteHeader, SiteFooter } from "@/components/site";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="site"><a href="#main" className="skip">Skip to content</a><SiteHeader /><main id="main">{children}</main><SiteFooter /></div>;
}

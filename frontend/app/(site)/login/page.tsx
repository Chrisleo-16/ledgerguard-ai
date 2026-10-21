"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
export default function Login() {
  const router = useRouter();
  const go = () => { try { localStorage.setItem("lg_demo_session", "1"); } catch {} router.push("/app"); };
  return <section className="site-wrap login-wrap"><div className="card login">
    <span className="logo-mark big"><Icon n="logo" size={20} /></span>
    <h1>Log in to LedgerGuard</h1>
    <p className="notice" role="note"><b>Demo login.</b> There is no real authentication. No passwords or personal data are collected or stored. Anyone, including judges, can continue.</p>
    <div className="demo-user"><span className="avatar">CL</span><div><b>Chrisben Evans Leo</b><div className="muted">Demo workspace · PayPal sandbox data</div></div></div>
    <button className="btn lg block" onClick={go} autoFocus>Continue to demo <Icon n="arrow" /></button>
    <p className="muted" style={{ textAlign: "center" }}>Or go straight to <Link href="/app">the demo</Link>. Real accounts are planned, not built.</p>
  </div></section>;
}

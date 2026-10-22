"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, CardBody, CardHeader, Chip, Divider } from "@heroui/react";
import { Icon } from "@/components/icons";
export default function Login() {
  const router = useRouter();
  const go = () => { try { localStorage.setItem("lg_demo_session", "1"); } catch {} router.push("/app"); };
  return <section className="site-wrap login-wrap"><Card shadow="lg" radius="lg" className="login w-full max-w-[420px]">
    <CardHeader className="flex-col items-start gap-3 px-7 pt-7">
      <div className="row" style={{ justifyContent: "space-between", width: "100%" }}><span className="logo-mark big"><Icon n="logo" size={20} /></span>
        <Chip size="sm" variant="flat" color="warning" radius="full">Demo login</Chip></div>
      <h1>Log in to LedgerGuard</h1></CardHeader>
    <CardBody className="gap-4 px-7 pb-7">
      <p className="notice" role="note"><b>Demo login.</b> There is no real authentication. No passwords or personal data are collected or stored. Anyone, including judges, can continue.</p>
      <div className="demo-user"><Avatar name="CL" getInitials={() => "CL"} className="bg-primary text-primary-foreground" /><div><b>Chrisben Evans Leo</b><div className="muted">Demo workspace · PayPal sandbox data</div></div></div>
      <Button color="primary" size="lg" radius="full" fullWidth onPress={go} autoFocus className="font-medium shadow-medium" endContent={<Icon n="arrow" />}>Continue to demo</Button>
      <Divider />
      <p className="muted" style={{ textAlign: "center", margin: 0 }}>Or go straight to <Link href="/app">the demo</Link>. Real accounts are planned, not built.</p>
    </CardBody></Card></section>;
}

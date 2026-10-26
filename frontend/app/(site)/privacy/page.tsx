export const metadata = { title: "Privacy · LedgerGuard AI" };
export default function Privacy() {
  return <article className="legal" style={{ maxWidth: 720, margin: "0 auto", padding: "120px 20px 80px", lineHeight: 1.65 }}>
    <h1 style={{ fontSize: 32, margin: "0 0 12px" }}>Privacy, in plain words</h1>
    <p>LedgerGuard AI is a hackathon demo. Here is everything it does with information about you.</p>
    <h2 style={{ fontSize: 20, marginTop: 28 }}>No tracking</h2>
    <p>We don&apos;t use tracking, analytics or advertising cookies, and we don&apos;t sell or share data with advertisers.</p>
    <h2 style={{ fontSize: 20, marginTop: 28 }}>What stays on your device</h2>
    <ul><li>Whether you opened the demo (a demo &ldquo;session&rdquo;, with no password or account).</li>
      <li>That you accepted this privacy notice.</li></ul>
    <p>These live in your browser&apos;s local storage. Clearing your browser data removes them.</p>
    <h2 style={{ fontSize: 20, marginTop: 28 }}>Demo data</h2>
    <p>The clients, invoices and disputes in the app are sample data. Don&apos;t enter real personal or payment details. In demo mode nothing is sent to real PayPal customers.</p>
    <h2 style={{ fontSize: 20, marginTop: 28 }}>AI features</h2>
    <p>When AI is turned on, the text of invoices, reminders and dispute evidence from the demo is sent to our AI provider to draft replies. Nothing is sent to anyone else without your approval.</p>
    <h2 style={{ fontSize: 20, marginTop: 28 }}>Questions</h2>
    <p>Email <a href="mailto:chrisbenevansleo@gmail.com">chrisbenevansleo@gmail.com</a>.</p>
  </article>;
}

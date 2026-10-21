"""Seed realistic demo data. Run: python -m app.seed  (wipes and recreates the DB)."""
from datetime import date, datetime, timedelta
from .db import Base, engine, SessionLocal, Client, Invoice, Message, Evidence, init_db
from .evidence_search import get_search
from sqlalchemy import text

def run():
    if engine.dialect.name == "sqlite":
        with engine.begin() as c: c.execute(text("DROP TABLE IF EXISTS evidence_fts"))
    Base.metadata.drop_all(engine); init_db()
    s = SessionLocal(); T = date.today()
    d = lambda n: T + timedelta(days=n)
    dt = lambda n, h=10: datetime.combine(d(n), datetime.min.time()) + timedelta(hours=h)
    clients = [
        Client(name="Acme Robotics Inc.", email="ap@acmerobotics.example.com", country="US", avg_days_to_pay=12, notes="Pays reliably, Net 15"),
        Client(name="Brightwave GmbH", email="buchhaltung@brightwave.example.de", country="DE", avg_days_to_pay=28, notes="Formal; often pays late"),
        Client(name="Lumen Studio Ltd", email="finance@lumenstudio.example.co.uk", country="GB", avg_days_to_pay=9, notes="Design agency"),
        Client(name="Polder Labs B.V.", email="admin@polderlabs.example.nl", country="NL", avg_days_to_pay=14),
        Client(name="Harbor & Pine LLC", email="owner@harborpine.example.com", country="US", avg_days_to_pay=35, notes="Cash-flow issues"),
        Client(name="Kijani Organics", email="accounts@kijani.example.co.ke", country="KE", avg_days_to_pay=6),
    ]
    s.add_all(clients); s.flush()
    A, B, L, P, H, K = clients
    inv = []
    def I(c, n, desc, amt, cur, issue, due, status, paid=None):
        x = Invoice(paypal_id=f"INV2-SEED-{n:04d}", number=f"LG-{T.year}-{n}", client_id=c.id, description=desc, amount=amt,
                    currency=cur, issue_date=d(issue), due_date=d(due), status=status, paid_at=dt(paid) if paid is not None else None)
        inv.append(x); return x
    I(A, 901, "Fleet dashboard MVP - milestone 1", 2400, "USD", -90, -75, "paid", -72)
    I(A, 902, "Fleet dashboard MVP - milestone 2", 2400, "USD", -60, -45, "paid", -44)
    a3 = I(A, 903, "Fleet dashboard - realtime telemetry module", 3200, "USD", -20, -5, "sent")
    I(B, 904, "Supabase migration & audit", 4800, "EUR", -100, -70, "paid", -48)
    b2 = I(B, 905, "Next.js storefront rebuild - phase 1", 6500, "EUR", -40, -10, "sent")
    I(L, 906, "Brand site animations", 950, "GBP", -50, -36, "paid", -35)
    l2 = I(L, 907, "CMS integration", 1250, "GBP", -12, 2, "sent")
    I(P, 908, "FastAPI data pipeline", 1800, "EUR", -30, -16, "paid", -14)
    p2 = I(P, 909, "Pipeline monitoring add-on", 600, "EUR", -5, 25, "sent")
    I(H, 910, "Shopify to Next.js migration", 3900, "USD", -80, -50, "paid", -12)
    h2 = I(H, 911, "Inventory sync feature", 1450, "USD", -25, -4, "sent")
    h3 = I(H, 912, "Maintenance retainer - Q3", 800, "USD", -45, -15, "sent")
    I(K, 913, "M-Pesa + PayPal checkout integration", 700, "USD", -35, -21, "paid", -20)
    k2 = I(K, 914, "Mobile ordering PWA", 1150, "USD", -3, 27, "sent")
    I(A, 915, "Scoping workshop (draft)", 500, "USD", 0, 14, "draft")
    s.add_all(inv); s.flush()
    msgs = [
        (A, "in", "Thanks Chrisben, milestone 2 looks great. Team loves the map view.", -44),
        (A, "in", "Telemetry module received, will route the invoice to AP.", -6),
        (B, "in", "We have reviewed the storefront. Payment will follow our internal approval cycle.", -12),
        (B, "in", "There is a delay with our finance department this month.", -3),
        (L, "in", "Brilliant work as always, thank you!", -35),
        (H, "in", "Sorry for the late payment last time, cash flow problem. Will try to do better.", -12),
        (H, "in", "Can we postpone the retainer payment? Things are tight.", -8),
        (K, "in", "Asante sana! The checkout works perfectly.", -20),
        (P, "in", "Happy with the pipeline, thanks.", -14),
    ]
    s.add_all([Message(client_id=c.id, direction=dirn, body=b, sent_at=dt(n)) for c, dirn, b, n in msgs])
    ev = [
        Evidence(client_id=B.id, invoice_id=b2.id, kind="contract", title="Statement of Work: Next.js storefront rebuild phase 1 (signed)",
                 content="Scope: rebuild product listing, product detail, cart and checkout pages in Next.js App Router; Lighthouse performance >= 90; "
                         "two revision rounds included. Fee EUR 6,500 payable Net 30 after delivery. Signed by Brightwave GmbH (K. Vogel) and Chrisben Evans Leo.",
                 occurred_at=dt(-55)),
        Evidence(client_id=B.id, invoice_id=b2.id, kind="milestone", title="Milestone 1 delivered: product listing + detail pages on staging",
                 content="Staging URL shared, Lighthouse score 94. Client feedback round 1 received and applied.", occurred_at=dt(-48)),
        Evidence(client_id=B.id, invoice_id=b2.id, kind="message", title="Client approval of milestone 1",
                 content="K. Vogel: 'Approved. Looks great, please proceed with cart and checkout.'", occurred_at=dt(-46)),
        Evidence(client_id=B.id, invoice_id=b2.id, kind="delivery", title="Final delivery: cart + checkout merged to production, repo handover",
                 content="Production deploy completed, GitHub repository access transferred, handover call held. Delivery files: handover.pdf, lighthouse-report.pdf.",
                 occurred_at=dt(-41)),
        Evidence(client_id=B.id, invoice_id=b2.id, kind="message", title="Client acceptance email",
                 content="K. Vogel: 'We have received the final delivery and accept phase 1. Invoice will be processed.'", occurred_at=dt(-40)),
        Evidence(client_id=B.id, invoice_id=None, kind="file", title="Supabase audit report.pdf",
                 content="Audit of row level security policies for the earlier migration project.", occurred_at=dt(-72)),
        Evidence(client_id=H.id, invoice_id=h2.id, kind="contract", title="Change request: inventory sync feature",
                 content="Sync Shopify inventory to Next.js store every 5 minutes; USD 1,450 fixed fee.", occurred_at=dt(-30)),
        Evidence(client_id=H.id, invoice_id=h2.id, kind="delivery", title="Inventory sync deployed",
                 content="Cron job deployed and verified with client; sync logs shared. Owner: 'works, thanks'.", occurred_at=dt(-26)),
        Evidence(client_id=A.id, invoice_id=a3.id, kind="delivery", title="Telemetry module delivered",
                 content="Websocket telemetry module delivered with tests, demo video and documentation.", occurred_at=dt(-21)),
    ]
    s.add_all(ev); s.commit()
    for e in ev: get_search().index(e)
    s.close()
    print(f"Seeded {len(clients)} clients, {len(inv)} invoices, {len(msgs)} messages, {len(ev)} evidence docs.")

if __name__ == "__main__":
    run()

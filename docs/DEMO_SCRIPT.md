# LedgerGuard AI: demo video script (2:45)

**Presenter / author:** Chrisben Evans Leo · **Target length:** 2:45 (165 s) · **Voiceover:** about 400 words, a steady pace of about 145 wpm
**Upload to:** `[YOUTUBE_URL — placeholder]` · **Links on the end card:** `[DEMO_URL — placeholder]`, `[GITHUB_URL — placeholder]`

---

## Before you record (checklist)

1. **Fresh data:** `cd backend && .venv/bin/python -m app.seed`. Then run `./run-backend.sh` and `./run-frontend.sh`, and open `http://localhost:3000`.
2. **Mode:** record the main take in **mock mode** (`PAYPAL_MODE=mock` or no PayPal keys). The simulated payment and dispute webhooks only work in mock mode. The sidebar pill will say **"PayPal Demo (mock)"**. Leave it visible; the voiceover acknowledges it.
3. **AI:** decide whether to record with a model (`OPENAI_API_KEY` + `LLM_MODEL=[AI_MODEL_NAME]`) or with the rules fallback. The sidebar shows "AI: model" or "AI: rules fallback". Tone choices, late fees and ledger totals are computed by rules and code, so they come out the same either way. Only the wording of drafts and statements changes.
4. **Clock:** click **Reset to today** in Demo controls. Browser at 110–125% zoom, 1920×1080, notifications off.
5. The on-screen values below come from a dry run on fresh seed data in fallback mode. Invoice numbers use the current year, and dates are relative to the day you record.
6. *(Optional B-roll, about 4 s, for shot 3)*: a separate take with sandbox credentials, showing **"PayPal Sandbox"** in the sidebar and the new `INV2-…` invoice in the PayPal sandbox dashboard. If you don't record this, keep shot 3 as written.

---

## Shot list

| # | Time | On screen / action | Voiceover |
|---|---|---|---|
| 1 | **0:00 – 0:12** | Title card: **"LedgerGuard AI: an agentic PayPal financial-ops copilot"**, subtitle *"Chrisben Evans Leo · Nairobi, Kenya"*. Cut to the Invoices page (`/`). | "I'm Chrisben, a developer in Nairobi. My clients are in the US and Europe. When one of them pays late or files a chargeback, it isn't an inconvenience. It's this month's rent, frozen." |
| 2 | **0:12 – 0:22** | Slowly pan across the four KPI cards (Outstanding, Overdue, Paid this month, Open disputes), then hover the sidebar pills (*PayPal Demo (mock)*, *AI: …*, *Today …*). | "LedgerGuard AI sits on top of PayPal and handles three jobs: chasing invoices, defending disputes, and answering questions about my money. Every total here is computed per currency from real rows." |
| 3 | **0:22 – 0:37** | Click **+ New invoice**. Client: *Acme Robotics Inc. (US)*, "Landing page redesign", USD 1800, due date **3 days from today**. Click **Create & send**. The notice shows *"Invoice LG-2026-1016 created and sent (PayPal INV2-…)"*, and the row appears with the **Due soon** badge. *(Optional: cut to sandbox B-roll.)* | "Invoices go out through the PayPal Invoicing v2 API: create, then send. Each one then lives in a state machine: sent, due soon, due, overdue three days, overdue seven, paid. Nothing jumps states by accident." |
| 4 | **0:37 – 1:00** | Open **🧪 Demo controls** and click **✨ Run chaser on all due/overdue invoices**. Scroll to **Reminder drafts**. Zoom on **Lumen Studio · friendly tone** (risk low). Then zoom on **Brightwave GmbH · firm tone**: highlight "per §4 (payment terms) of our agreement" and "Optional late fee mentioned: EUR 97.50 (1.5%)". Hover the reasoning line *"Risk high · client sentiment … · 10 days overdue · usually pays … late"*. | "The chaser is a LangGraph agent. It gathers context, reads the client's recent messages for sentiment, applies a tone policy, then drafts. A reliable UK studio gets a friendly nudge. A German client ten days late gets a formal note that cites the contract and offers an optional late fee, calculated in code. Its reasoning is right here. And it never sends anything; I do." |
| 5 | **1:00 – 1:10** | In Demo controls, click **+7 days**. The notice lists transitions: *"LG-2026-903: Overdue 3d+ → Overdue 7d+ · LG-2026-907: Due soon → Overdue 3d+ · …"*. The Status badges in the grid update. | "To show the state machine, I'll jump the clock forward a week. Invoices move from due soon to overdue, exactly as the rules say." |
| 6 | **1:10 – 1:22** | In the **Payment webhook** dropdown pick *LG-2026-912 · Harbor & Pine LLC · USD 800.00* and click **Simulate "invoice paid"**. The notice reads *"INVOICING.INVOICE.PAID received → LG-2026-912 marked paid, 1 pending reminder(s) cancelled."* Tick **Show cancelled** to show the draft dimmed. | "Then the client pays. The INVOICING.INVOICE.PAID webhook is verified, de-duplicated, marks the invoice paid and cancels the pending reminder, so I never chase someone who already paid." |
| 7 | **1:22 – 1:55** | Go to **Disputes**. In Demo controls, choose *LG-2026-905 · Brightwave GmbH · EUR 6,500.00* and reason **Not as described**, then click **Simulate dispute webhook**. The notice reads *"…6 evidence items found and a defense package was drafted."* Show the case card (**Awaiting your approval**) and the yellow *"Buyer says: …"* banner. Scroll the **Evidence timeline** (signed SOW → milestone 1 → client approval → final delivery → acceptance email) and highlight the **[1] [2] [4] [5]** citations in **Statement to PayPal**. Click **✅ Approve & submit evidence**, pause on the *"Submit to PayPal? … can't be undone"* confirmation, then click **Yes, submit**. The badge changes to **Evidence submitted**. | "Now the scary one: a €6,500 dispute. The webhook arrives, LedgerGuard fetches it from the Disputes API and searches this client's contracts, milestones, deliveries and messages. A second agent builds a dated timeline and a statement where every claim cites its evidence. Nothing reaches PayPal until I approve and confirm. Only then does it call provide-evidence, once." |
| 8 | **1:55 – 2:20** | Go to **Ask the ledger**. Click the chip **"past-due invoices over $1000"**. The answer line appears (fresh-seed dry run: *"3 invoice(s); totalling USD 6,450.00; 3 past due (max 12 days); clients: Acme Robotics Inc., Harbor & Pine LLC."*). Zoom on the **Filter applied** badges (*status in …*, *days overdue > 0*, *amount > 1000*, *currency = USD*) and the **"parsed by …"** label. The AG Grid shrinks to the matching rows. Then type **"unpaid invoices from Germany"** and press Enter. | "And when I just want an answer, I ask. The model never writes SQL or does arithmetic. It turns my question into a filter spec the server validates against an allow-list, and the totals are computed from the matching rows. I can see exactly how my question was read." |
| 9 | **2:20 – 2:33** | Quick cuts: the architecture diagram from the README (FastAPI · LangGraph · Next.js + AG Grid · PayPal sandbox client / mock), then the terminal running `./run-tests.sh` → **22 passed**. | "Under the hood: FastAPI, two LangGraph agents, Next.js with AG Grid, and a PayPal client with OAuth, retries and idempotency keys. That same layer could one day become an easy PayPal connector for other African developers." |
| 10 | **2:33 – 2:45** | Back to the Invoices dashboard, then the end card: **LedgerGuard AI** · `[DEMO_URL]` · `[GITHUB_URL]` · "Built by Chrisben Evans Leo, Nairobi". | "For a freelancer selling across borders, late payments and chargebacks lock up capital you can't spare. LedgerGuard drafts the follow-ups, builds the defense and gives you exact answers, and you approve every step, so that money comes back to you sooner." |

---

## Voiceover only (for recording in one pass)

> I'm Chrisben, a developer in Nairobi. My clients are in the US and Europe. When one of them pays late or files a chargeback, it isn't an inconvenience. It's this month's rent, frozen.
>
> LedgerGuard AI sits on top of PayPal and handles three jobs: chasing invoices, defending disputes, and answering questions about my money. Every total here is computed per currency from real rows.
>
> Invoices go out through the PayPal Invoicing v2 API: create, then send. Each one then lives in a state machine: sent, due soon, due, overdue three days, overdue seven, paid. Nothing jumps states by accident.
>
> The chaser is a LangGraph agent. It gathers context, reads the client's recent messages for sentiment, applies a tone policy, then drafts. A reliable UK studio gets a friendly nudge. A German client ten days late gets a formal note that cites the contract and offers an optional late fee, calculated in code. Its reasoning is right here. And it never sends anything; I do.
>
> To show the state machine, I'll jump the clock forward a week. Invoices move from due soon to overdue, exactly as the rules say.
>
> Then the client pays. The INVOICING.INVOICE.PAID webhook is verified, de-duplicated, marks the invoice paid and cancels the pending reminder, so I never chase someone who already paid.
>
> Now the scary one: a €6,500 dispute. The webhook arrives, LedgerGuard fetches it from the Disputes API and searches this client's contracts, milestones, deliveries and messages. A second agent builds a dated timeline and a statement where every claim cites its evidence. Nothing reaches PayPal until I approve and confirm. Only then does it call provide-evidence, once.
>
> And when I just want an answer, I ask. The model never writes SQL or does arithmetic. It turns my question into a filter spec the server validates against an allow-list, and the totals are computed from the matching rows. I can see exactly how my question was read.
>
> Under the hood: FastAPI, two LangGraph agents, Next.js with AG Grid, and a PayPal client with OAuth, retries and idempotency keys. That same layer could one day become an easy PayPal connector for other African developers.
>
> For a freelancer selling across borders, late payments and chargebacks lock up capital you can't spare. LedgerGuard drafts the follow-ups, builds the defense and gives you exact answers, and you approve every step, so that money comes back to you sooner.

---

## Notes on accuracy (keep the video honest)

- The payment and dispute shown are **simulated webhooks in mock mode**, sent through the real webhook handler. The sidebar shows "Demo (mock)". Don't describe them as live sandbox events unless you recorded them against the sandbox.
- Reminder **tone** and the **late fee** come from deterministic rules. The model (if configured) scores sentiment and writes the wording. Don't say "the AI decided to charge a late fee".
- If you record with the rules fallback, the dispute statement comes from the deterministic composer and the ledger shows "parsed by fallback". Leave that visible, or record with `[AI_MODEL_NAME]` enabled.
- Planned items (hybrid search, evidence file uploads, accounts, the connector for African developers) appear only as future ideas. Don't show or describe them as working.
- No user numbers, revenue figures or prize claims are made anywhere in the video.

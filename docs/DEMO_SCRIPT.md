# LedgerGuard AI: demo video script (about 2:40)

**Presenter / author:** Chrisben Evans Leo · **Target length:** about 2:40 (under 3:00) · **Voiceover:** 336 words, about 2:15 spoken at 150 wpm, with the rest of the time for on-screen action
**Upload to:** https://youtu.be/8JtWZxMUFTk · **Links on the end card:** https://ledgerguard-web.onrender.com, https://github.com/Chrisleo-16/ledgerguard-ai

> **Trademark rule:** the video and voiceover name no competitor and no third-party product or brand other than PayPal. Keep it that way when editing, and keep library, model and tool names out of the narration and on-screen text. The positioning compares against "other tools" in general.

---

## Positioning (say it at about 0:15 and echo it in the closing)

**Key line:** *"Other tools either chase invoices or fight disputes. LedgerGuard is the only one that uses your invoice trail to win the dispute, built natively on PayPal."*

1. **All three jobs in one PayPal-native app:** invoice chasing, dispute defense and a conversational ledger.
2. **Dispute evidence from the invoice and reminder history**, not just order data.
3. **Guardrails enforced in code** (fee caps, human approval), made for cross-border freelancers in markets like Kenya.

---

## Before you record (checklist)

1. **Fresh data:** `cd backend && .venv/bin/python -m app.seed`. Then run `./run-backend.sh` and `./run-frontend.sh`, and open `http://localhost:3000/`. The seed now includes two demo disputes (PP-D-SEED0001, Brightwave GmbH, not as described; PP-D-SEED0002, Harbor & Pine LLC, not received), so the Disputes page is populated without simulating a webhook.
2. **Mode:** record in **mock mode** (`PAYPAL_MODE=mock`). The simulated payment webhook only works in mock mode. The sidebar shows **"PayPal Demo (mock)"**; leave it visible.
3. **AI:** recording with a model or with the rules fallback both work. Fee amounts, installments and ledger totals are always computed by code.
4. **Clock:** click **Reset to today** in Demo controls. Use 110–125% browser zoom, 1920×1080, with notifications off. Accept the privacy card before recording so it doesn't cover the toasts.
5. **Error beat (shot 9):** stop the backend for a moment and press **Sync**, or use the recorded clip. While it waits, the app shows a "Server waking up…" loading toast, then a plain-language error toast.
6. **Install beat:** record it in Chrome (it fires the real install prompt). On iPhone or Safari, the button explains *Tap Share → Add to Home Screen* instead.

---

## Shot list (rough timestamps at 150 wpm)

| # | Time | On screen / action | Voiceover |
|---|---|---|---|
| 1 | **0:00 – 0:14** | Title card: **"LedgerGuard AI"**, subtitle *"Chrisben Evans Leo · Nairobi, Kenya"*. Cut to the landing page (`/`). | "I'm Chrisben, a developer in Nairobi. My clients are in the US and Europe. When one of them pays late or files a chargeback, it isn't an inconvenience. It's this month's rent, frozen." |
| 2 | **0:14 – 0:26** | **Positioning beat.** Scroll the landing page. The sticky nav stays pinned and its pill follows the sections. Pause on the **Multiple Workflows & APIs** cards (Invoice chaser · Dispute defense · Ask the ledger). | "Other tools either chase invoices or fight disputes. LedgerGuard is the only one that uses your invoice trail to win the dispute, built natively on PayPal." |
| 3 | **0:26 – 0:38** | Click the **Get Started** button; its arrow animates on hover. On `/app`, pan across the KPI cards (Outstanding, Overdue, Paid this month, Open disputes). | "It does three jobs in one app: chasing invoices, defending disputes, and answering questions about my money. Every total is computed per currency from real rows." |
| 4 | **0:38 – 0:54** | Click **+ New invoice**: *Acme Robotics Inc. (US)*, "Landing page redesign", USD 1800, due **3 days from today**, then **Create & send**. Hold on the green **"Invoice sent"** toast (bottom-right) and the new row with the **Due soon** badge. Then in Demo controls click **+7 days** and show the badges change. | "I create an invoice and it goes out through PayPal Invoicing, then moves through a strict state machine, from sent to due soon, overdue and paid. A toast confirms each step in plain words." |
| 5 | **0:54 – 1:16** | In Demo controls click **Run chaser**. Zoom on **Lumen Studio · friendly**, then **Brightwave GmbH · firm**: highlight the contract citation and *"Optional late fee: EUR 97.50 (1.5%)"*. Click **Approve** and show the **"Reminder approved"** toast. | "The chaser agent reads the client's recent messages, picks a tone, and drafts. A reliable UK studio gets a friendly nudge. A German client ten days late gets a formal note citing the contract, with an optional late fee capped in code. It never sends anything; I approve it." |
| 6 | **1:16 – 1:26** | In **Payment webhook** pick *LG-…-912 · Harbor & Pine LLC* and click **Simulate "invoice paid"**. Show the toast and tick **Show cancelled** (the animated checkbox) to show the dimmed draft. | "When the client pays, the webhook is verified, the invoice is marked paid, and the pending reminder is cancelled." |
| 7 | **1:26 – 1:50** | Go to **Disputes**. The seeded case **Brightwave GmbH · EUR 6,500 · Not as described** is already there, marked **Awaiting your approval**. Scroll the **Evidence timeline** (signed SOW, milestone, approval, delivery, reminders and replies) and highlight the **[1] [2] [4]** citations in the statement. Click **Approve & submit**, pause on the *"can't be undone"* confirmation, click **Yes, submit**, and show the **"Evidence submitted"** toast. | "Now the scary one: a six-thousand-five-hundred-euro dispute, already waiting here. A second agent builds the defense from my own invoice trail: the signed scope, milestones, delivery, every reminder and the client's replies. Each claim in the statement cites its evidence. Nothing reaches PayPal until I approve and confirm." |
| 8 | **1:50 – 2:08** | Go to **Ask the ledger**. Click the chip **"past-due invoices over $1000"**. Zoom on the **Filter applied** badges and the exact total, and show the grid narrowing. | "And when I just want an answer, I ask. The model never writes SQL or does arithmetic. It writes a filter the server checks, and code computes the totals. I can see exactly how my question was read." |
| 9 | **2:08 – 2:22** | Show a plain-language error toast (for example **Sync** while the API is stopped: *"We couldn't reach PayPal… Try again in a minute"*, with the **Details** toggle closed). Cut to the **Get LedgerGuard** card, hover **Install app** (tooltip *"Install as an app"*), and show the browser's install prompt. | "If something goes wrong, the app says what happened and what to do, never an error code. And it installs on my phone like an app." |
| 10 | **2:22 – 2:40** | Back on the Invoices dashboard, then the end card: **LedgerGuard AI** · `ledgerguard-web.onrender.com` · `github.com/Chrisleo-16/ledgerguard-ai` · *"Built by Chrisben Evans Leo, Nairobi"*. | "Other tools chase invoices or fight disputes. LedgerGuard uses your invoice trail to win the dispute, natively on PayPal, with guardrails in code and a human approving every step, made for cross-border freelancers in markets like Kenya." |

**Total:** about 2:40 · voiceover 336 words.

---

## Voiceover only (for recording in one pass)

> I'm Chrisben, a developer in Nairobi. My clients are in the US and Europe. When one of them pays late or files a chargeback, it isn't an inconvenience. It's this month's rent, frozen.
>
> Other tools either chase invoices or fight disputes. LedgerGuard is the only one that uses your invoice trail to win the dispute, built natively on PayPal.
>
> It does three jobs in one app: chasing invoices, defending disputes, and answering questions about my money. Every total is computed per currency from real rows.
>
> I create an invoice and it goes out through PayPal Invoicing, then moves through a strict state machine, from sent to due soon, overdue and paid. A toast confirms each step in plain words.
>
> The chaser agent reads the client's recent messages, picks a tone, and drafts. A reliable UK studio gets a friendly nudge. A German client ten days late gets a formal note citing the contract, with an optional late fee capped in code. It never sends anything; I approve it.
>
> When the client pays, the webhook is verified, the invoice is marked paid, and the pending reminder is cancelled.
>
> Now the scary one: a six-thousand-five-hundred-euro dispute, already waiting here. A second agent builds the defense from my own invoice trail: the signed scope, milestones, delivery, every reminder and the client's replies. Each claim in the statement cites its evidence. Nothing reaches PayPal until I approve and confirm.
>
> And when I just want an answer, I ask. The model never writes SQL or does arithmetic. It writes a filter the server checks, and code computes the totals. I can see exactly how my question was read.
>
> If something goes wrong, the app says what happened and what to do, never an error code. And it installs on my phone like an app.
>
> Other tools chase invoices or fight disputes. LedgerGuard uses your invoice trail to win the dispute, natively on PayPal, with guardrails in code and a human approving every step, made for cross-border freelancers in markets like Kenya.

---

## Notes on accuracy (keep the video honest)

- The payment shown is a **simulated webhook in mock mode**, run through the real webhook handler. The disputes are **seeded demo data**. Don't describe either as live sandbox events.
- The reminder **tone** and the **late fee** come from rules in code. The model, if configured, only scores sentiment and writes the wording.
- "The only one" is a positioning claim. Keep it phrased as a comparison with "other tools" in general, and never name a product.
- Planned items (hybrid search, evidence file uploads, accounts, a PayPal connector for other developers) are future ideas only. Don't show or describe them as working.
- No user numbers, revenue figures or prize claims appear anywhere in the video.

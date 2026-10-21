# LedgerGuard AI: Devpost submission

> **Tagline:** An agentic PayPal financial-ops copilot that chases late invoices, drafts chargeback defenses and answers "who owes me what?". A human approves every step before anything leaves the app.

| | |
|---|---|
| **Author** | Chrisben Evans Leo, second-year Data Science student and full-stack developer, Nairobi, Kenya |
| **Live demo** | `[DEMO_URL — placeholder, add before submitting]` |
| **Source code** | `[GITHUB_URL — placeholder, add before submitting]` |
| **Demo video** | `[YOUTUBE_URL — placeholder, add before submitting]` |
| **AI model** | `[AI_MODEL_NAME — placeholder; set through the LLM_MODEL env var]` |
| **License** | MIT |

---

## Inspiration

I'm a freelance developer in Nairobi, and most of the people who pay me are in the US and Europe. For a freelancer or a two-person agency in Kenya, money tied up in an unpaid invoice is often money you need this month. Three problems keep coming back:

1. **Late payments.** You send the invoice, the due date passes, and you have to decide how hard to push. If you're too soft you don't get paid. If you're too harsh you can lose a good client. Writing the right email for a formal German finance team is different from writing one for a friendly UK design studio.
2. **Chargebacks and disputes.** A buyer says the work "wasn't as described", and you have a deadline to reply. The proof (signed scope, milestone approvals, delivery notes, the client's "looks great!") is spread across email, chat and repos. While the dispute is open, that money is frozen.
3. **No clear picture.** "Which invoices over $1,000 are past due?" should take seconds to answer. A small business usually has no analyst to ask, and a chatbot that guesses the numbers is worse than no answer.

PayPal already offers the right primitives: Invoicing, Webhooks and Disputes. LedgerGuard AI puts an agentic layer over them, sized for one freelancer, with a hard rule that **the AI drafts and the human decides**.

*Side story:* While building the PayPal client, webhook handling and mock layer, I noticed that most of that plumbing (OAuth, retries, idempotency, signature checks, a mock that behaves like the sandbox) is what every developer here has to rebuild. It could be packaged as an easy PayPal connector for African developers. That's an idea for later, not part of this submission. See *What's next*.

## What it does

LedgerGuard AI is a web app with three workflows. All three run against the PayPal sandbox when credentials are configured. Without credentials, a mock client that returns the same response shapes is used instead, so anyone can run the demo.

### 1. Invoice chaser: state machine plus tone-aware AI reminder drafts
- **Create and send invoices** with the PayPal **Invoicing API v2** (`POST /v2/invoicing/invoices`, then `POST /v2/invoicing/invoices/{id}/send`).
- Each invoice moves through an explicit **state machine**: `draft → sent → due_soon → due → overdue_3 → overdue_7 → paid` (plus `cancelled`). Invalid transitions are rejected. Paying is idempotent, and paid or cancelled invoices are terminal.
- A **LangGraph reminder agent** runs four nodes: `gather_context → analyze_sentiment → decide_tone_policy → draft_message`.
  - *Context:* amount, due date, days overdue, the client's country, how late they paid past invoices, and their recent messages.
  - *Sentiment:* the LLM scores the client's recent messages. A lexicon scorer is the fallback.
  - *Tone policy:* deterministic rules pick **friendly**, **neutral** or **firm**. A firm reminder can include an optional 1.5% late fee, which is calculated in code, not by the model.
  - *Draft:* the LLM writes the email with country guidance (US: direct, net terms; DE: formal, cites the contract clause; GB: polite and understated; NL: direct; KE: warm). It is told to use only the amounts and dates it is given. If no model is configured, a template writes the draft.
- The UI shows the agent's reasoning beside each draft: risk, sentiment score, days overdue, and how late the client usually pays.
- **Nothing is ever sent automatically.** "Approve" only marks a draft as approved. You copy the text and send it yourself.
- **Payment detection:** an `INVOICING.INVOICE.PAID` or `PAYMENT.CAPTURE.COMPLETED` webhook marks the invoice paid and **cancels its pending reminder drafts**. Without a public webhook URL, **Sync with PayPal** polls `GET /v2/invoicing/invoices/{id}` for every open invoice and uses the same mark-paid path.

### 2. Dispute defense: evidence search plus an AI defense package, approved by a human
- A `CUSTOMER.DISPUTE.CREATED` webhook (or Sync, which calls `GET /v1/customer/disputes`) starts the flow. The backend fetches the full dispute with `GET /v1/customer/disputes/{id}` and matches it to the invoice and client.
- A **LangGraph dispute agent** runs `search_evidence → build_timeline → draft_narrative`:
  - *Search:* full-text search (SQLite FTS5 with BM25, or Postgres `tsvector`) over that client's stored contracts, milestones, delivery notes, messages and files. Each dispute reason has its own query terms, and the buyer's own message is added to the query. Evidence linked to the disputed invoice is always included.
  - *Timeline:* the evidence in date order, each item with its evidence ID.
  - *Statement:* a calm, factual response of under 250 words that **cites evidence IDs in brackets**. The prompt tells the model to use only the evidence provided. A deterministic composer writes the statement when no model is configured.
- The package also lists the milestones it references and a ready-to-send `provide-evidence` payload (`PROOF_OF_FULFILLMENT` for "not received", otherwise `OTHER`).
- **Nothing is submitted until you click "Approve & submit evidence" and then confirm.** Only that step calls `POST /v1/customer/disputes/{id}/provide-evidence`. The server refuses a second submission of the same package.
- The page also shows an **evidence library** (exact counts of stored evidence per client and type) and a feed of recent PayPal webhook events.

### 3. Conversational ledger: plain English in, a validated filter out, exact numbers
- Ask something like *"past-due invoices over $1000"* or *"unpaid invoices from Germany"*. The LLM turns the question into a **JSON filter spec**, never SQL.
- The spec is validated by **Pydantic against an allow-list** of fields, operators per field type, status values and date formats, with at most 10 conditions and a row limit of 500 or less. If the model's output fails validation, a **deterministic rule-based parser** handles the question instead, and the UI shows which parser was used.
- If the question names a currency (`$`, `€`, `£`, or a word or code), amount conditions are limited to that currency. Currencies are never converted or mixed.
- The **AG Grid** table updates to show the matching rows. The **summary sentence** (count, totals per currency, number past due, maximum days late, clients) is **computed exactly from those rows in code**. The LLM never writes a number in it. The filter that was applied appears as badges, so you can see how your question was read.

### Also built in
- A dashboard with KPI cards: outstanding, overdue, paid this month and open disputes, each totalled per currency from the stored data.
- **Demo controls** for judges: a dev clock (+1, +3 or +7 days) to watch invoices change state, plus simulated payment and dispute webhooks that go through the real webhook handler in mock mode.
- The sidebar shows whether PayPal is running in **Sandbox or Demo (mock)** mode and whether a **model or the rules fallback** is active, so the demo always shows which mode it's in.

## How we built it

**Backend: Python, FastAPI, LangGraph, SQLAlchemy 2, Pydantic v2, httpx**
- `paypal.py` defines a `PayPalClient` protocol with two implementations:
  - `SandboxPayPalClient`: OAuth2 client-credentials with a cached token (refreshed 60 s before it expires); exponential backoff with jitter on 429 and 5xx responses that honours `Retry-After`; a fresh `PayPal-Request-Id` on every call so retries are idempotent; multipart `provide-evidence`; webhook signature verification via `/v1/notifications/verify-webhook-signature`.
  - `MockPayPalClient`: an in-memory client that mirrors PayPal's response shapes (`INV2-…` ids, dispute objects with `disputed_transactions`, `seller_response_due_date`, and so on). The app switches to sandbox automatically when both credentials are set.
- `state_machine.py` holds the invoice lifecycle as pure functions, which makes it easy to test.
- `agents.py` contains the two LangGraph `StateGraph`s. Each node records itself in a trace, and the UI shows that trace.
- `filters.py` contains the FilterSpec schema, the validator, the deterministic parser, currency enforcement, and the exact summarizer.
- `evidence_search.py` defines an `EvidenceSearch` interface with SQLite FTS5 and Postgres full-text implementations. It's built so a hybrid search backend can be swapped in later.
- `llm.py` is a small client for any OpenAI-compatible chat endpoint, using JSON response format. Without a key, or if a call fails, it returns `None`, and every caller has a deterministic fallback. The app works with no model at all.
- Webhooks: `POST /api/webhooks/paypal` verifies the signature, **de-duplicates by event ID**, then routes `INVOICING.INVOICE.PAID`, `PAYMENT.CAPTURE.COMPLETED` and `CUSTOMER.DISPUTE.CREATED`.
- Database: SQLite by default. Setting `DATABASE_URL` switches to Postgres (for example Supabase). The demo runs on SQLite.

**Frontend: Next.js 14 (App Router), TypeScript, React 18, AG Grid Community (Quartz theme)**
- Three pages: Invoices (`/`), Disputes (`/disputes`) and Ask the ledger (`/ledger`), plus a sidebar showing live environment status.
- AG Grid tables with custom cell renderers for status badges, country flags, days late and per-row actions ("Send via PayPal", "✨ Draft reminder").

**Quality and tooling**
- **22 automated pytest tests** cover the state machine, filter validation (including a SQL-injection-shaped field name being rejected), currency handling, OAuth plus backoff (using `httpx.MockTransport`), the webhook signature request, the full invoice flow, webhook de-duplication, the dispute package and the guard against double submission, Sync polling, and exact KPI totals. All 22 pass.
- `docker compose up --build`, or one script each for backend, frontend and tests.

## PayPal APIs used

| Area | Endpoint / event | Used for |
|---|---|---|
| OAuth 2.0 | `POST /v1/oauth2/token` (client credentials) | Access token, cached and refreshed |
| Invoicing v2 | `POST /v2/invoicing/invoices` | Create invoice (invoicer, recipient, line item, due date) |
| Invoicing v2 | `POST /v2/invoicing/invoices/{id}/send` | Send invoice to the client |
| Invoicing v2 | `GET /v2/invoicing/invoices/{id}` | Sync: detect `PAID` / `MARKED_AS_PAID` / `CANCELLED`; live read-through |
| Disputes v1 | `GET /v1/customer/disputes` | Sync: discover new disputes |
| Disputes v1 | `GET /v1/customer/disputes/{id}` | Fetch full dispute details and buyer messages |
| Disputes v1 | `POST /v1/customer/disputes/{id}/provide-evidence` | Submit the defense, **only after the user approves** |
| Webhooks | `POST /v1/notifications/verify-webhook-signature` | Verify every incoming webhook (sandbox mode) |
| Webhook events | `INVOICING.INVOICE.PAID`, `PAYMENT.CAPTURE.COMPLETED`, `CUSTOMER.DISPUTE.CREATED` | Payment detection, dispute intake |
| Headers | `PayPal-Request-Id` | Idempotency on every API call |

## AI tools used and how

**Inside the product**
- **LLM:** `[AI_MODEL_NAME]`, reached through any OpenAI-compatible chat-completions endpoint in JSON mode (configured with `OPENAI_BASE_URL` and `LLM_MODEL`). It is used in four places:
  1. scoring the sentiment of a client's recent messages (reminder agent);
  2. drafting the reminder email for a tone the rules have already chosen (reminder agent);
  3. writing the dispute statement from the retrieved evidence only, with citations (dispute agent);
  4. turning a ledger question into a JSON FilterSpec (conversational ledger).
- **LangGraph** runs the two agents as explicit state graphs (4 nodes and 3 nodes), so every run produces a trace you can inspect.
- **Guardrails, by design:**
  - The model never decides money. Late fees, totals, counts and days overdue are all computed in code.
  - The model never writes SQL. Its output is a spec checked against an allow-list.
  - The model never sends anything. Reminders stay drafts, and dispute evidence needs an explicit approve-and-confirm.
  - Every model call has a deterministic fallback, so a timeout or a missing key never breaks the workflow.

**During development**
- `[Placeholder: list any AI coding or writing assistants used while building, and what they were used for. Leave out if none.]`

## Challenges we ran into

- **Webhooks need a public URL.** Local and sandbox testing often has none. I added **Sync with PayPal**, which polls invoices and disputes and feeds the results through the *same* handlers the webhooks use, so both paths behave the same way.
- **Time-dependent behaviour is hard to demo and test.** Overdue states depend on the date, so I built a persistent **dev clock** (an offset in the settings table) that the state machine, the summaries and the UI all read from.
- **Stopping the AI from making up numbers.** A financial answer that is "probably right" is useless, so the ledger follows one rule: the LLM writes the filter and code computes the answer. The filter is checked against the schema, a deterministic parser takes over if the check fails, and totals come only from the matching rows.
- **Mixed currencies.** "Over $1000" must not match a €6,500 invoice. I added currency detection and enforcement, and totals are always reported per currency, never converted.
- **Parsing edge cases.** "Overdue more than 5 days" must not become "amount > 5", and "under 1k" must mean 1,000. Both cases have regression tests.
- **Sandbox details.** PayPal invoice numbers must be unique per account and survive local database reseeds, so sandbox numbers get a random suffix. Leaving the invoicer email blank lets PayPal use the REST app's business account.
- **Retries without double side effects.** Exponential backoff plus `PayPal-Request-Id` handles retries, webhook de-duplication by event ID handles redelivered events, and a server-side guard stops dispute evidence from being submitted twice.

## Accomplishments that we're proud of

- **Human-in-the-loop is enforced in code, not just promised.** The reminder approve endpoint cannot send email, and `provide-evidence` is reachable only through the explicit approval endpoint.
- A dispute defense that **cites its sources**: every claim in the statement points to an evidence ID shown in the timeline.
- A conversational ledger whose numbers you can **trust**: the applied filter is shown as badges, and the parser used (LLM or fallback) is labelled.
- The whole product runs with **no credentials and no model** (mock PayPal plus deterministic fallbacks), and the same code moves to the real sandbox when you add keys.
- 22 passing tests covering the risky parts: money, state, webhooks and PayPal retries.

## What we learned

- Agentic doesn't have to mean autonomous. The most useful setup was agents that **gather, reason and draft**, with explicit graphs and visible traces, and a person who **decides**.
- Put structure between the LLM and anything that matters: JSON specs, allow-lists, deterministic fallbacks and exact computation.
- How PayPal's Invoicing, Disputes and Webhooks APIs fit together, and the operational details that matter: OAuth token lifetimes, idempotency keys, signature verification, and how disputes link back to invoices through `disputed_transactions`.
- Designing for a solo freelancer means fewer screens and clearer states. Every page says what will happen and what won't happen without your approval.

## What's next (planned, not yet built)

- **Hybrid evidence search** (keyword plus semantic, for example Elastic) behind the existing `EvidenceSearch` interface.
- **Evidence ingestion and file attachments:** uploading contracts and delivery PDFs, and attaching them to `provide-evidence` (the client already accepts files, but the app does not upload any yet).
- **More dispute lifecycle events** (updates, resolution) and response-deadline alerts.
- **Accounts and multi-tenancy:** today the app is single-user with no login.
- **Optional one-click sending** of approved reminders through the user's own email, still behind explicit approval.
- A **hosted deployment** on Postgres/Supabase.
- **Side project:** packaging the PayPal layer (OAuth, retries, idempotency, webhook verification, a mock that behaves like the sandbox) as an easy connector for African developers building on PayPal.

## Built with

`python` · `fastapi` · `langgraph` · `pydantic` · `sqlalchemy` · `sqlite` (FTS5) · `postgresql` (optional) · `httpx` · `uvicorn` · `pytest` · `typescript` · `react` · `next.js` · `ag-grid` · `paypal-invoicing-api-v2` · `paypal-disputes-api` · `paypal-webhooks` · `oauth2` · `openai-compatible-llm-api` · `docker` · `docker-compose`

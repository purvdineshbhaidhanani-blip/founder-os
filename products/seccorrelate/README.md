# SecCorrelate

Unified security log correlation platform — synthesizes firewall, endpoint, identity, and
application logs into correlated alerts with AI-generated incident summaries and MITRE ATT&CK
mapping, for SOC teams who need answers in seconds, not days.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the seccorrelate DB, .env, runs migrations, seeds plans
cd ../../products/seccorrelate
npm install
npm run dev               # http://localhost:3002
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Investigate** — LLM-powered incident summary with root cause and MITRE ATT&CK mapping
- **Correlation Rule Builder** — no-code rule definition (event types, time window, source IP)
- **Batch Correlation Engine** — evaluates rules against ingested log events on demand
- **Alert Triage Workflow** — status progression with a dual-event side-by-side view
- **Log Event Ingestion** — multi-source (firewall, EDR, IAM, app, DNS) structured intake

## Pricing

Free · Starter $49/mo · Pro $199/mo · Business $449/mo · Enterprise (custom). AI Investigate is
available on every plan, including Free, with a small AI credit allotment. Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#2-seccorrelate).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#2-seccorrelate) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#2-seccorrelate) — pricing, limits, AI credits

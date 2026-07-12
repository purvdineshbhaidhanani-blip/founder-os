# IncidentTriage

AI Root Cause Copilot for DevOps/SRE teams — correlates alerts into incidents and explains what
happened, why, and how to fix it in the first 60 seconds, without depending on tribal knowledge.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the incidenttriage DB, .env, runs migrations, seeds plans
cd ../../products/incidenttriage
npm install
npm run dev               # http://localhost:3005
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Root Cause Copilot** — hypothesis with confidence score, culprit service, fix, and recovery estimate
- **Alert Correlation into Incidents** — time-window chaining with automatic severity escalation
- **Service Health Computation** — real-time healthy/degraded/down from a rolling alert lookback
- **Incident Status Workflow** — open → investigating → resolved, with a full alert timeline
- **Alert Ingestion** — multi-source manual/API entry with severity levels

## Pricing

Free · Starter $39/mo · Pro $149/mo · Business $349/mo · Enterprise (custom). AI Root Cause
Copilot is available on every plan, including Free, with a small AI credit allotment. Full
breakdown: [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#5-incidenttriage).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#5-incidenttriage) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#5-incidenttriage) — pricing, limits, AI credits

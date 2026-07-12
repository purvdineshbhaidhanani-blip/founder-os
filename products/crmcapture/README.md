# CRMCapture

Automatic lead capture, enrichment, and deduplication for sales teams — an AI Sales Assistant
drafts follow-ups and flags opportunities so reps stop typing leads into a CRM by hand.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the crmcapture DB, .env, runs migrations, seeds plans
cd ../../products/crmcapture
npm install
npm run dev               # http://localhost:3004
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Sales Assistant** — summary, next step, draft follow-up email, and opportunity detection
- **AI Lead Extraction** — paste raw text (email, form submission) → structured contact fields
- **Deterministic Lead Scoring** — 0–100 score weighted by source, fields, and seniority
- **Rule-Based Duplicate Detection** — email/phone/fuzzy-name+company matching
- **Lead Status Workflow** — new → contacted → qualified → converted → lost

## Pricing

Priced per user seat. Free · Starter $29/user/mo · Pro $79/user/mo · Business $149/user/mo ·
Enterprise (custom). AI Lead Extraction unlocks at Starter, AI Sales Assistant at Pro — both draw
from one shared AI credit pool. Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#4-crmcapture).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#4-crmcapture) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#4-crmcapture) — pricing, limits, AI credits

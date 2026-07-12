# SpendGov

AI-powered SaaS spend intelligence — subscription visibility, duplicate/waste detection, renewal
forecasting, and AI-driven consolidation recommendations for CFOs and procurement teams.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the spendgov DB, .env, runs migrations, seeds plans
cd ../../products/spendgov
npm install
npm run dev               # http://localhost:3001
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI CFO Copilot** — ranked, dollar-quantified savings recommendations from your spend data
- **Duplicate Tool Detection** — flags overlapping SaaS tools by category with a cost rationale
- **Waste Identification** — unused/underutilized/overprovisioned seat detection
- **Renewal Calendar** — 90-day lookahead on upcoming contract renewals
- **AI Contract Term Extraction** — paste a contract, get structured vendor/term/renewal data

## Pricing

Free · Starter $29/mo · Pro $99/mo · Business $249/mo · Enterprise (custom). Full plan/limit/AI
credit breakdown: [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#1-spendgov).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#1-spendgov) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#1-spendgov) — pricing, limits, AI credits

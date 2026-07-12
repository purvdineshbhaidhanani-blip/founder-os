# SchemaLint

AI-powered database schema intelligence for backend developers and database architects — a
deterministic lint engine plus an AI Database Architect that recommends specific fixes for
relationships, indexing, normalization, and migrations.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the schemalint DB, .env, runs migrations, seeds plans
cd ../../products/schemalint
npm install
npm run dev               # http://localhost:3012
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Database Architect** — summary, risk level, and prioritized recommendations per schema
- **Deterministic Lint Engine** — missing PK, missing FK index, naming conventions, duplicate indexes
- **Health Score** — severity-weighted 0–100 per schema
- **Schema Import** — multi-engine paste-JSON import (PostgreSQL, MySQL, SQLite, SQL Server)
- **Schema Detail View** — per-table column/index/FK visualization

Phase 1 accepts a pasted JSON schema snapshot — no live database connection yet (V2 follow-up, not
part of this release).

## Pricing

Free · Starter $19/mo · Pro $59/mo · Business $129/mo · Enterprise (custom). Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#12-schemalint).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#12-schemalint) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#12-schemalint) — pricing, limits, AI credits

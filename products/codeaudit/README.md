# CodeAudit

Developer-friendly code quality and security platform — regex-based SAST scanning with an AI Fix
Engine that explains vulnerabilities and generates concrete patches, for engineering teams who
ship often and need confidence before deploying.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the codeaudit DB, .env, runs migrations, seeds plans
cd ../../products/codeaudit
npm install
npm run dev               # http://localhost:3003
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Fix Engine** — LLM-generated explanation, concrete patch, and risk score per finding
- **Regex SAST Engine** — 8-rule pattern scanner (SQL injection, hardcoded keys, eval, weak hash, XSS, etc.)
- **Code Health Score** — severity-weighted 0–100 score per scan
- **Finding Status Workflow** — open/fixed/false_positive/wont_fix triage
- **Repository Tracking** — multi-repo inventory with visibility and branch metadata

## Pricing

Priced per developer seat. Free · Starter $19/dev/mo · Pro $49/dev/mo · Business $89/dev/mo ·
Enterprise (custom). Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#3-codeaudit).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#3-codeaudit) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#3-codeaudit) — pricing, limits, AI credits

# ERPAudit

Continuous ERP compliance visibility for ERP consultants, internal audit teams, and finance
compliance leaders — deterministic segregation-of-duties and configuration checks, explained in
plain language by an AI ERP Auditor.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the erpaudit DB, .env, runs migrations, seeds plans
cd ../../products/erpaudit
npm install
npm run dev               # http://localhost:3007
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI ERP Auditor** — plain-language explanation, compliance impact, fix, and business impact per finding
- **SoD Violation Detection** — 4-conflict-pair library auto-flags conflicting permissions
- **Configuration Rule Engine** — four-eyes controls, approval thresholds, password policy, audit logging
- **Compliance Score** — severity-weighted 0–100 across all findings
- **Configuration Scan Intake** — paste-based role assignment + config setting import

## Pricing

Free · Starter $49/mo · Pro $149/mo · Business $349/mo · Enterprise (custom). Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#7-erpaudit).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#7-erpaudit) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#7-erpaudit) — pricing, limits, AI credits

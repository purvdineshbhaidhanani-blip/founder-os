# ContactVerify

Complete AI-scored contact health profiling for CRM admins and RevOps teams — validity,
duplicates, completeness, and lead quality in one pass, instead of a narrow email- or phone-only
checker.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the contactverify DB, .env, runs migrations, seeds plans
cd ../../products/contactverify
npm install
npm run dev               # http://localhost:3008
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Contact Health Engine** — LLM-scored lead quality, missing fields, and enrichment suggestions
- **Deterministic Health Score** — 0–100 composite from email/phone validity, completeness, dedup
- **Duplicate Detection** — email/phone/fuzzy-name+company grouping via Levenshtein similarity
- **Email Validation** — syntax + disposable-domain blocklist (offline, no live mailbox check)
- **Phone Validation** — digit-count format check (offline, no live carrier lookup)

## Pricing

Free · Starter $29/mo · Pro $99/mo · Business $229/mo · Enterprise (custom). Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#8-contactverify).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#8-contactverify) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#8-contactverify) — pricing, limits, AI credits

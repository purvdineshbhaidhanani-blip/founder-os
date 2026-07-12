# TranscriptionQA

Trust your transcripts before you publish or file them — an AI Accuracy Copilot flags errors and
domain-specific terminology mistakes and scores confidence, for healthcare, legal, call center,
and media teams who can't scale manual proofreading.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the transcriptionqa DB, .env, runs migrations, seeds plans
cd ../../products/transcriptionqa
npm install
npm run dev               # http://localhost:3011
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Accuracy Copilot** — content summary, risk level, and highlighted risk sections
- **Domain Terminology Validation** — regex-based medical/legal ASR-confusion word-pair checks
- **Speaker Attribution Anomaly Detection** — flags likely diarization glitches
- **Accuracy Score** — severity-weighted 0–100 composite
- **Plain-Text Transcript Export** — full transcript with unresolved findings

Phase 1 accepts pasted transcript text with speaker labels — no audio upload or ASR integration
yet (V2 follow-up, not part of this release).

## Pricing

Free · Starter $29/mo · Pro $99/mo · Business $229/mo · Enterprise (custom). Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#11-transcriptionqa).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#11-transcriptionqa) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#11-transcriptionqa) — pricing, limits, AI credits

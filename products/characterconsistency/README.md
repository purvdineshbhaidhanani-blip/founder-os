# CharacterConsistency

Persistent, reusable AI Character DNA for creators — locks a character's face/hair/outfit/art
style into a structured identity spec that stays consistent across every generation, instead of
drifting between prompts like general-purpose image tools.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the characterconsistency DB, .env, runs migrations, seeds plans
cd ../../products/characterconsistency
npm install
npm run dev               # http://localhost:3009
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · `@founder-os/platform` (shared auth,
billing, AI, notifications) · `@founder-os/ui` (shared design system/dashboard components) ·
Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Character DNA** — structured identity spec (prompt template, negative prompt, locked attributes)
- **Consistency/Drift Scoring** — keyword-based 0–100 score detecting attribute contradictions
- **Prompt Assembly** — deterministic combination of locked character fields with a new pose/scene
- **Character Library** — persistent, reusable character definitions
- **Generation Credit Metering** — plan-based monthly generation limits

Phase 1 produces a locked, reusable **prompt specification** — paste it into your own image
generator. No image-generation provider (Stability/DALL-E/Midjourney) is wired yet; that's a V2
integration, not part of this release.

## Pricing

Free · Starter $19/mo · Pro $59/mo · Business $129/mo · Enterprise (custom). Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#9-characterconsistency).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#9-characterconsistency) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#9-characterconsistency) — pricing, limits, AI credits

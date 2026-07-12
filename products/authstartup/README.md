# AuthStartup

Modern auth-as-a-service at startup-friendly pricing — email/password authentication, sessions,
and multi-project API keys for early-to-growth-stage SaaS startups, plus an AI Security Advisor
that explains and prioritizes hardening recommendations.

## Quick start

```bash
# From the repo root
cd infrastructure/launcher
npm install
npm run bootstrap        # creates the authstartup DB, .env, runs migrations, seeds plans
cd ../../products/authstartup
npm install
npm run dev               # http://localhost:3006
```

Or start the whole portfolio at once from the repo root: `./start-portfolio.sh` (see
[`GETTING_STARTED.md`](../../GETTING_STARTED.md)).

## Tech stack

Next.js 14 (App Router) · TypeScript · Prisma/PostgreSQL · argon2id password hashing ·
`@founder-os/platform` (shared auth, billing, AI, notifications) · `@founder-os/ui` (shared design
system) · Stripe billing · Anthropic/OpenAI (fail-closed if no API key configured).

## Hero features

- **AI Security Advisor** — plain-language explanation and recommended action per security finding
- **Public End-User Auth API** — Bearer-key-authenticated register/login for your own app's users
- **Rule-Based Security Engine** — MFA enforcement, session TTL, and login-velocity checks
- **Multi-Project Model** — isolated end-user pools with per-project configuration
- **API Key Management** — create/list/revoke project-scoped API keys (hash+prefix storage)

### Public end-user auth API

AuthStartup's core product surface is a real, live API — not a UI-only feature. Every project has
its own API key; requests are authenticated via `Authorization: Bearer <api key>`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/auth/register` | `POST` | Register a new end user against a project |
| `/api/v1/auth/login` | `POST` | Log in an end user, returns a session token |

Rate limits and monthly-active-user ceilings are plan-dependent — see the pricing table below.
Not yet wired: OAuth/social login, magic links, and MFA enrollment (the underlying shared-platform
library exists but isn't connected to these routes yet — tracked as a V2 follow-up, not part of
this release).

## Pricing

Free · Starter $25/mo · Pro $79/mo · Business $199/mo · Enterprise (custom). Full breakdown:
[`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#6-authstartup).

## Docs

- [`docs/PRODUCT_IDENTITY.md`](docs/PRODUCT_IDENTITY.md) — positioning, target customer, full spec
- [`PRODUCT_FREEZE.md`](../../PRODUCT_FREEZE.md#6-authstartup) — frozen feature scope
- [`COMMERCIAL_FREEZE.md`](../../COMMERCIAL_FREEZE.md#6-authstartup) — pricing, limits, AI credits

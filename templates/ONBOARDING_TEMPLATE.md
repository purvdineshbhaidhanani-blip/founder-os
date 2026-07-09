# Onboarding — <Product Name>

Get from a fresh clone to a running local instance.

## Prerequisites

- Node.js `<version>` (see `package.json#engines`)
- <Database> running locally (or a connection string to a dev instance)
- `<package manager>` installed

## 1. Install

```bash
cd products/<name>
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in the values you have. Anything left blank keeps that integration
**disabled** rather than broken — see the table below for what each
variable does and what stays off without it.

| Variable | Required for local dev? | What breaks if unset |
|---|---|---|
| `DATABASE_URL` | Yes | Nothing runs |
| `SESSION_SECRET` | Recommended | Sessions reset on every restart |
| `<OAUTH_CLIENT_ID>` | No | Social login button hidden/disabled |
| `<AI_PROVIDER_API_KEY>` | No | AI features show a clear "not configured" state |

## 3. Set up the database

```bash
npm run db:migrate
npm run db:seed   # optional: realistic fake data for local dev
```

## 4. Run

```bash
npm run dev
```

App runs at `http://localhost:<port>`.

## 5. Run tests

```bash
npm test          # unit + integration
npm run test:e2e  # requires the dev server running
```

## What's stubbed in Phase 1

<List every integration that's architecturally complete but disabled
pending real credentials — payments, OAuth providers, transactional
email, AI providers, etc. — and what the UI does instead of crashing.>

## Getting help

<Where to ask questions — link to `TROUBLESHOOTING.md` first.>

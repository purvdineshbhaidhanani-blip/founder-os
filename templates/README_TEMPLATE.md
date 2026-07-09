# <Product Name>

<One or two sentences: what this product is and who it's for.>

## Status

- Phase: `Phase 1` | `Phase 2`
- Live: `not deployed` | `<url>`

## What it does

<3–6 bullets on the core value proposition — not a feature list, the
problem it solves.>

## Quick start

```bash
# from products/<name>/
npm install
cp .env.example .env    # fill in local values; leave integrations blank to keep them disabled
npm run dev
```

See [`ONBOARDING.md`](./ONBOARDING.md) for the full setup guide, including
what's stubbed pending Phase 2 credentials.

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design and key decisions
- [`API.md`](./API.md) — API reference
- [`CHANGELOG.md`](./CHANGELOG.md) — what changed and when
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — known issues
- [`decisions/`](./decisions/) — architecture decision records

## Tech stack

<Frontend / backend / database / hosting — one line each, only where it
deviates from `standards/engineering.md` defaults, otherwise just link the
standard.>

## Standards

This product inherits all GLOBAL standards from
[`/standards`](../../standards/README.md). This doc only covers what's
specific to this product.

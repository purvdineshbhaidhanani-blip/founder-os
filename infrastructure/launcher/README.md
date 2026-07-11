# Portfolio Launcher

A local-only dashboard that lists all 12 Founder OS SaaS products, checks
whether each is currently running, links straight to it, and shows its
`docs/PRODUCT_IDENTITY.md` and latest git commit. Zero framework, zero
runtime dependencies — a single Node `http` server plus one static HTML
page. `concurrently` is a devDependency used only by the optional
`portfolio:dev` one-command-startup script below.

It does not proxy or modify any product — it only checks whether each
product's port is answering and links out to it. Postgres, Redis, and the
products themselves must be started separately (see the root repository's
local dev instructions).

## Run just the launcher

```bash
cd infrastructure/launcher
npm install
npm start
```

Open http://localhost:3000.

## Run the whole portfolio with one command

Requires Postgres and Redis already running (the launcher and products
don't manage those).

```bash
cd infrastructure/launcher
npm install
npm run portfolio:dev
```

This starts the launcher (port 3000) and all 12 products (ports
3001–3012) concurrently in one terminal, each with a labeled, colored
log prefix. `Ctrl+C` stops all of them.

## Routes

- `GET /` — the dashboard.
- `GET /api/products` — static product metadata (name, description, port).
- `GET /api/status` — live check: pings each product's port and reads its
  latest git commit (`git log -1`, scoped to that product's directory).
- `GET /docs/:productId` — renders that product's `docs/PRODUCT_IDENTITY.md`.

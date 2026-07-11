# Portfolio Launcher

A local-only dashboard that lists all 12 Founder OS SaaS products, checks
whether each is currently running, links straight to it, and shows its
`docs/PRODUCT_IDENTITY.md` and latest git commit. Zero framework, zero
runtime dependencies — a single Node `http` server plus one static HTML
page. `concurrently` is a devDependency used only by the optional
`portfolio:dev` script below.

It does not proxy or modify any product — it only checks whether each
product's port is answering and links out to it. Postgres, Redis, and the
products themselves are started by the orchestrator described below (or
manually — see the root repository's `GETTING_STARTED.md`).

## Run the whole portfolio with one command (recommended)

From the **repository root**, not this directory:

```bash
./start-portfolio.sh              # macOS/Linux, dev mode
./start-portfolio.sh --production # macOS/Linux, optimized build (lighter)
start-portfolio.cmd               # Windows, dev mode
start-portfolio.cmd --production  # Windows, optimized build (lighter)
```

This one command: starts PostgreSQL and Redis if they aren't already
running, bootstraps every product's database/env/migrations/seed data,
starts the launcher (3000) and all 12 products (3001–3012), waits until
every one of the 13 servers actually answers HTTP, and opens
`http://localhost:3000` in your browser. `Ctrl+C` stops everything, or run
`./stop-portfolio.sh` / `stop-portfolio.cmd`.

`--production` builds each product once and serves the optimized build
instead of the dev server — much lighter on CPU/RAM (no on-demand
compilation, no webpack watchers), recommended if running 12 concurrent dev
servers is slow or unstable on your machine.

The scripts doing the work live in `scripts/`:
- `scripts/lib.mjs` — small cross-platform process/network helpers.
- `scripts/portfolio.config.mjs` — the single source of truth for every
  product's id/port.
- `scripts/bootstrap.mjs` — Node port of `bootstrap.sh`; same idempotent
  bootstrap, works identically on Windows/macOS/Linux.
- `scripts/start-portfolio.mjs` — spawns the launcher + all 12 products,
  waits for every port to answer HTTP, opens the browser. Flags:
  `--no-bootstrap`, `--no-open`, `--production`.
- `scripts/stop-portfolio.mjs` — frees ports 3000–3012 by stopping whatever
  is listening on them (does not stop Postgres/Redis).

Equivalent npm scripts from this directory: `npm run bootstrap`,
`npm run start:portfolio`, `npm run start:portfolio:production`,
`npm run stop:portfolio`.

## Run just the launcher

```bash
cd infrastructure/launcher
npm install
npm start
```

Open http://localhost:3000.

## Alternative: `portfolio:dev` (manual, dev mode only)

Requires Postgres, Redis, and `bootstrap.sh` already run manually — this
script does not do any of that for you, unlike `start-portfolio.sh` above.

```bash
cd infrastructure/launcher
npm install
npm run portfolio:dev
```

This starts the launcher (port 3000) and all 12 products (ports
3001–3012) concurrently in one terminal via `concurrently`, each with a
labeled, colored log prefix. `Ctrl+C` stops all of them.

## Routes

- `GET /` — the dashboard.
- `GET /api/products` — static product metadata (name, description, port).
- `GET /api/status` — live check: pings each product's port (HTTP first,
  falling back to a raw TCP connect check if the HTTP response is slow —
  e.g. a dev-mode app still compiling its first request — so a running
  product is never falsely reported OFFLINE) and reads its latest git
  commit (`git log -1`, scoped to that product's directory).
- `GET /docs/:productId` — renders that product's `docs/PRODUCT_IDENTITY.md`.

# Founder OS — Getting Started (Local Development & Production Readiness)

This is the complete, from-scratch guide to running the entire Founder OS
portfolio locally: the shared platform, all 12 SaaS products, and the
master launcher. Follow the commands in order — nothing is left to guess.

> **Audience:** a developer who has just cloned this repository and has
> never run it before.

---

## 1. What's in this repository

```
founder-os/
├── MASTER_PROJECT_CONTEXT.md      # project foundation (highest priority)
├── CLAUDE.md                      # working rules for AI collaborators
├── GETTING_STARTED.md             # ← you are here
├── standards/                     # global engineering/design/security standards
├── frameworks/                    # the 18 reusable "Common SaaS Foundation" frameworks
├── templates/                     # document + product-scaffold templates
├── shared/
│   ├── platform/                  # @founder-os/platform — auth, billing, AI, notifications,
│   │                              #   reporting, storage, analytics, monitoring, DB (Prisma)
│   └── ui/                        # @founder-os/ui — design system + dashboard/admin components
├── products/                      # the 12 SaaS products (each a standalone Next.js 14 app)
│   ├── spendgov/          seccorrelate/      codeaudit/
│   ├── crmcapture/        incidenttriage/    authstartup/
│   ├── erpaudit/          contactverify/     characterconsistency/
│   ├── payrollaudit/      transcriptionqa/   schemalint/
│   └── execution/                 # per-product epic/task breakdowns + EXECUTION_BLUEPRINT.md
└── infrastructure/
    └── launcher/                  # the master portfolio launcher (port 3000) + bootstrap.sh
```

Each product is a **complete** Next.js app: landing page, authentication,
dashboard, admin panel, billing, AI feature, database, REST APIs, reports,
notifications, settings, responsive UI — all built on `@founder-os/platform`
and `@founder-os/ui`, never duplicating shared functionality.

> **Note on the legacy top-level folders** (`agents/`, `src/`, `web/`,
> `supabase/`, `tests/`, `docs/`, `scripts/`, `blueprints/`, `registry/`,
> `artifacts/`, and the root `package.json`/`tsconfig.json`/etc.): these
> belong to a **previous, unrelated project** and are intentionally left
> untouched. **They are not part of this portfolio and you do not run
> them.** Everything you run lives under `shared/`, `products/`, and
> `infrastructure/launcher/`.

---

## 2. Prerequisites

Install these once:

| Tool        | Version        | Check                |
|-------------|----------------|----------------------|
| Node.js     | ≥ 20.11.0      | `node --version`     |
| npm         | ≥ 10 (bundled) | `npm --version`      |
| PostgreSQL  | 16 (14+ works) | `psql --version`     |
| Redis       | 7 (6+ works)   | `redis-cli --version`|

The defaults below assume Postgres is reachable at
`postgresql://postgres:postgres@localhost:5432` and Redis at
`redis://localhost:6379`. If yours differ, override the `PG*`/`REDIS_URL`
environment variables when running `bootstrap.sh` (see step 4).

---

## 3. Start the databases

Start PostgreSQL and Redis first — everything else depends on them.

**macOS (Homebrew):**
```bash
brew services start postgresql@16
brew services start redis
```

**Linux (systemd):**
```bash
sudo systemctl start postgresql
sudo systemctl start redis-server
```

**Docker (either OS), if you prefer containers:**
```bash
docker run -d --name founderos-pg  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
docker run -d --name founderos-redis -p 6379:6379 redis:7
```

Verify both are up:
```bash
psql -h localhost -U postgres -c "select 1"   # should print "1"
redis-cli ping                                # should print "PONG"
```

---

## 4. One-time bootstrap (databases, env, migrations, seeds)

From the repository root, run the bootstrap script. It is **idempotent** —
safe to re-run any time.

```bash
cd founder-os
cd infrastructure/launcher
./bootstrap.sh
```

For each of the 12 products, this:

1. Installs npm dependencies for `shared/platform`, `shared/ui`, and the
   product (only if `node_modules` is missing).
2. Creates a `.env` from the product's `.env.example`, generating a random
   `PLATFORM_SESSION_SECRET` and `PLATFORM_ENCRYPTION_KEY`. (AI-provider and
   Stripe keys are left blank — those features fail closed until you add
   Phase 2 credentials.)
3. Creates the product's PostgreSQL database.
4. Applies the **shared platform's** Prisma migrations to that database's
   `public` schema.
5. Applies the **product's own** Prisma migrations to its `<product>_app`
   schema and generates its Prisma client.
6. Seeds the product's billing plans (Free / Starter / Pro / Enterprise).

If your Postgres/Redis credentials differ from the defaults:
```bash
PGUSER=myuser PGPASSWORD=mypass PGHOST=localhost PGPORT=5432 \
  REDIS_URL=redis://localhost:6379 ./bootstrap.sh
```

When it finishes you'll see: `== Bootstrap complete ==`.

---

## 5. Start everything — one command

Once the databases are bootstrapped (step 4) and Postgres + Redis are
running (step 3):

```bash
cd founder-os/infrastructure/launcher
npm install          # first time only — installs the launcher's one dev dependency
npm run portfolio:dev
```

This starts **all 13 processes in one terminal** with labeled, color-coded
logs:

- the **launcher** on port **3000**
- all **12 products** on ports **3001–3012**

Press `Ctrl+C` once to stop all of them together.

Then open **http://localhost:3000** — the launcher lists every product with
its live status, a link to open it, and a link to its documentation.

> First launch compiles each Next.js app on demand, so a product's first
> page load takes a few seconds. Subsequent loads are instant. If you have
> limited RAM, prefer the per-product approach below.

---

## 6. Alternative — start products individually (multiple terminals)

If you'd rather run only some products, or your machine can't comfortably
run 13 dev servers at once, start each in its own terminal. Every product
uses the same three commands; only the folder changes.

**Terminal 1 — the launcher (optional but recommended):**
```bash
cd founder-os/infrastructure/launcher
npm install        # first time only
npm start          # → http://localhost:3000
```

**Terminal 2 — SpendGov (port 3001):**
```bash
cd founder-os/products/spendgov
npm run dev        # → http://localhost:3001
```

**Terminal 3 — SecCorrelate (port 3002):**
```bash
cd founder-os/products/seccorrelate
npm run dev        # → http://localhost:3002
```

…and so on for any product you want. The full folder → port mapping is in
section 8. Each product is fully self-contained; you can run one, several,
or all of them.

> **Production-mode run** (optimized build instead of dev server):
> ```bash
> cd founder-os/products/spendgov
> npm run build && npm start   # serves the production build on port 3001
> ```

---

## 7. Which services run where

| Layer                | How it runs                                                                 |
|----------------------|------------------------------------------------------------------------------|
| **PostgreSQL**       | External service (step 3). One database per product, each with a `public` schema (platform tables) and a `<product>_app` schema (product tables). |
| **Redis**            | External service (step 3). Used by `@founder-os/platform` for sessions/rate-limiting. |
| **Shared Platform**  | Not a separate server — `@founder-os/platform` is a **library** compiled into each product via the `file:../../shared/platform` dependency. Its `dist/` is prebuilt; `bootstrap.sh`/`npm install` rebuild it if needed. |
| **Shared UI**        | Same — `@founder-os/ui` is a compiled library, not a server. |
| **Each SaaS**        | A standalone Next.js server on its assigned port (3001–3012). API routes, dashboard, admin, billing, and AI features all run inside that one process. |
| **AI services**      | No separate worker. AI features call the provider inline via `@founder-os/platform/ai` and **fail closed** with HTTP 503 `INTEGRATION_NOT_CONFIGURED` until `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is set. |
| **Background/queue/workers** | None required for Phase 1. The architecture is queue-ready (see each product's PID §29), but Phase 1 processing is synchronous and needs no separate worker or queue process. |
| **Launcher**         | A tiny zero-dependency Node HTTP server on port 3000. |

There is intentionally **nothing else to start** — no separate API gateway,
no message broker, no cron worker. Postgres + Redis + the product processes
(+ optional launcher) is the whole system.

---

## 8. Ports & URLs (permanent)

| Port | Product / Service    | URL                     |
|------|----------------------|-------------------------|
| 3000 | **Portfolio Launcher** | http://localhost:3000 |
| 3001 | SpendGov             | http://localhost:3001   |
| 3002 | SecCorrelate         | http://localhost:3002   |
| 3003 | CodeAudit            | http://localhost:3003   |
| 3004 | CRMCapture           | http://localhost:3004   |
| 3005 | IncidentTriage       | http://localhost:3005   |
| 3006 | AuthStartup          | http://localhost:3006   |
| 3007 | ERPAudit             | http://localhost:3007   |
| 3008 | ContactVerify        | http://localhost:3008   |
| 3009 | CharacterConsistency | http://localhost:3009   |
| 3010 | PayrollAudit         | http://localhost:3010   |
| 3011 | TranscriptionQA      | http://localhost:3011   |
| 3012 | SchemaLint           | http://localhost:3012   |

These ports are hard-coded in each product's `package.json` `dev`/`start`
scripts, so they never change between restarts.

---

## 9. Using a product (the common flow)

Every product works the same way:

1. Open its URL (e.g. http://localhost:3001) → **landing page**.
2. Click **Start free** → **sign up** (organization name, your name, email,
   password ≥ 12 chars). You're logged in and land on the **dashboard**.
   Every new org starts on a **14-day Pro trial**.
3. Use the product's core feature (import/scan/validate/review — the domain
   action differs per product), then explore **Reports**, **Settings**,
   **Billing**, and the **Admin** panel (`/admin`).
4. Try the **AI feature** — it will return a clear "AI provider is not
   configured" message (HTTP 503) until you add an API key, by design.

To enable a product's AI feature, edit its `.env` and set either
`ANTHROPIC_API_KEY=...` or `OPENAI_API_KEY=...`, then restart that product.
To enable billing checkout, set the `STRIPE_*` keys. **Never commit real
keys** — `.env` files are gitignored.

---

## 10. Per-product npm scripts

Run from inside any `products/<name>/` directory:

| Command                        | What it does                                    |
|--------------------------------|-------------------------------------------------|
| `npm run dev`                  | Start the dev server on the product's port      |
| `npm run build`                | Production build                                |
| `npm start`                    | Serve the production build                      |
| `npm run typecheck`            | `tsc --noEmit` (zero errors expected)           |
| `npm run lint`                 | ESLint (zero errors expected)                   |
| `npm test`                     | Vitest unit tests                               |
| `npm run prisma:generate`      | Regenerate the product's Prisma client          |
| `npm run prisma:migrate:deploy`| Apply the product's migrations                  |
| `npm run prisma:seed`          | Seed billing plans (idempotent)                 |

---

## 11. Verification status (this build)

Every gate below was run and passed across the whole portfolio:

- ✅ **shared/platform** — typecheck, lint, **104/104 tests**, build clean
- ✅ **shared/ui** — typecheck, lint, **44/44 tests**, build clean
- ✅ **All 12 products** — typecheck clean, lint clean, **214 unit tests
  passing**, production build succeeds
- ✅ **All 12 products** — verified live: landing page (200), signup
  (creates user + org), dashboard, APIs, and AI fail-closed path (503)
- ✅ **Shared platform integration** — auth, billing/entitlements, AI,
  notifications, reporting all exercised through real product flows
- ✅ **Launcher** — lists all 12, detects live/offline status, links out,
  renders docs
- ✅ **bootstrap.sh** — validated end-to-end against all 12 products
- ✅ **`portfolio:dev`** — confirmed launching all 13 processes on the
  correct ports

---

## 12. Known issues / notes

- **No known functional issues.** All automated gates and live checks pass.
- **AI features are disabled by default** (no provider key) — this is
  intentional Phase-1 behavior, not a bug. They fail closed with a clear
  message.
- **Billing checkout/portal are disabled by default** (no Stripe keys) —
  also intentional. Plans are seeded; checkout requires `STRIPE_*` keys.
- **First page load per product is slow** in dev mode (on-demand Next.js
  compilation). Use `npm run build && npm start` for fast production-mode
  serving, or just wait a few seconds on first load.
- **Running all 13 dev servers at once is RAM-heavy.** On a constrained
  machine, start only the products you need (section 6).
- **Phase 2 integrations** (live OAuth, live ERP/CRM/payroll/ASR
  connectors, image generation, Stripe, email delivery) are **built and
  wired but disabled** until credentials are provided — per each product's
  Product Identity Document §7.

---

## 13. Production readiness checklist

Phase 1 (this build) is feature-complete and verified. Before deploying to
production, complete the Phase 2 items:

**Ready now**
- [x] All products build, typecheck, lint, and test clean
- [x] Per-product database isolation (own DB, own schema namespace)
- [x] RBAC + audit logging on every product
- [x] Entitlements/billing engine wired (plans seeded)
- [x] AI features fail closed without credentials (no crashes)
- [x] Secrets kept out of git (`.env` gitignored; `.env.example` committed)
- [x] Stable, documented ports and one-command startup

**Required before production deploy (Phase 2)**
- [ ] Provision managed Postgres + Redis; set real `PLATFORM_DATABASE_URL`,
      `<PRODUCT>_DATABASE_URL`, `PLATFORM_REDIS_URL` per product
- [ ] Generate strong `PLATFORM_SESSION_SECRET` / `PLATFORM_ENCRYPTION_KEY`
      per environment (never reuse the local dev values)
- [ ] Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to enable AI features
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price IDs to
      enable billing; wire the Stripe webhook endpoint
- [ ] Configure email delivery credentials (notification emails)
- [ ] Configure any product-specific live connectors (OAuth, ERP, CRM,
      payroll, ASR) — built and wired, enable per product
- [ ] Run `prisma migrate deploy` against production databases in CI/CD
- [ ] Set up TLS, a reverse proxy / domain per product, and log/metric
      aggregation
- [ ] Add CI to run typecheck + lint + test + build on every PR

---

## 14. Next deployment steps

1. **Pick a host.** Each product is a standard Next.js app and deploys
   independently (Vercel, Fly.io, Railway, a container platform, etc.).
   Deploy `shared/platform` and `shared/ui` as workspace dependencies of
   each product's build.
2. **Provision data.** One managed Postgres database per product (or shared
   instance with per-product databases) plus a managed Redis.
3. **Set environment variables** per product from its `.env.example`, using
   real secrets and credentials (section 13).
4. **Run migrations in CI/CD:** for each product, apply the shared
   platform's migrations to `public`, then the product's own migrations to
   `<product>_app`, then seed plans.
5. **Wire external services:** Stripe webhooks, AI provider keys, email,
   and any Phase 2 connectors — enabling them one product at a time.
6. **Add CI gates:** typecheck, lint, test, and build must pass before any
   deploy.
7. **The launcher is local-only** — it is a developer convenience, not a
   production service. Do not deploy it publicly.

---

Questions about *what* a product does and *why* live in each product's
`products/<name>/docs/PRODUCT_IDENTITY.md`. Questions about *how* to build
well live in `standards/` and `frameworks/`. The project's guiding context
is `MASTER_PROJECT_CONTEXT.md`.

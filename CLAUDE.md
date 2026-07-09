# CLAUDE.md

## Read this first

The single highest-priority context for this repository is
[`MASTER_PROJECT_CONTEXT.md`](MASTER_PROJECT_CONTEXT.md). Read it before doing
any work. It defines the project identity, the two-phase development strategy,
the quality bar, and the autonomous-execution rules. It overrides everything
else in this repository unless the user explicitly says otherwise.

## What this project is

A portfolio of multiple world-class, production-quality SaaS products. Each
SaaS is a complete application (frontend, backend, database schema, API,
auth architecture, dashboard, admin panel, settings, profile, responsive,
dark/light mode, docs, deployment-ready structure) — never a landing page.

- **Phase 1** — build complete SaaS applications with full integration
  architecture, but with no external credentials required. Integrations are
  built, wired, and left disabled until credentials arrive.
- **Phase 2** — when credentials are provided, configure auth/OAuth/APIs/
  database/email/payments/deployment, then test everything and make it
  deployable.

## Repository layout

- `MASTER_PROJECT_CONTEXT.md` — project foundation (highest priority).
- `standards/` — GLOBAL standards shared by every SaaS (UI, UX, dashboard,
  admin, auth, security, coding, testing, performance, deployment). Created
  when the Global Standards documents are provided.
- `products/<saas-name>/` — one directory per SaaS product. Each product has
  its own identity, branding, features, and spec, but inherits everything
  else from the global standards.

### Legacy content

The following top-level directories and files belong to a **previous,
unrelated project** (the "Agent Factory") that predates this one:
`agents/`, `artifacts/`, `blueprints/`, `registry/`, `scripts/`, `src/`,
`supabase/`, `tests/`, `web/`, `APP_CREATION_GUIDE.md`, `DEPLOYMENT.md`, and
the root `package.json` toolchain. Per the master context, do **not** reuse
its assumptions, architecture, code, prompts, workflows, or decisions in the
new project. Leave it untouched unless the user asks to remove it.

## Working rules (summary — the master context is authoritative)

- Think like a senior product designer, architect, engineer, and founder;
  choose the highest-quality long-term solution, never speed alone.
- Work autonomously to the requested milestone; ask only when input is
  genuinely required; self-review before calling work complete.
- Never invent API keys, credentials, or secrets, and never configure paid
  external services without explicit approval.
- Every deliverable must be production/commercial quality: beautiful, modern,
  fast, secure, responsive, accessible, maintainable, scalable. No
  placeholder-quality work.

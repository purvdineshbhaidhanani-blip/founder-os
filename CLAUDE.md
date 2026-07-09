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
- `standards/` — GLOBAL standards shared by every SaaS: engineering, design
  system, security, AI, database, API, testing, devops, documentation.
  Defines **how** to build well.
- `frameworks/` — the **Common SaaS Foundation** (the "Global Looping"):
  18 reusable frameworks every product runs through. Defines **what** every
  SaaS contains (dashboard, admin, roles, notifications, reporting,
  integrations, pricing, etc.) plus the business frameworks (product spec,
  customer research, competitor analysis, feature classification, success
  metrics, product evaluation). Overlaps with `standards/` are lenses over
  the standard, which stays authoritative.
- `templates/` — reusable document templates (README, architecture, ADR,
  API docs, changelog, onboarding, troubleshooting), the per-product
  framework fill-ins (product spec, customer research, competitor analysis,
  pricing, evaluation scorecard), and the `product-scaffold/` directory
  tree every new SaaS is instantiated from.
- `products/<saas-name>/` — one directory per SaaS product. Each product has
  its own identity, branding, features, and spec, but inherits everything
  else from the global standards. Each product owns its own `docs/` and
  `scripts/` internally — there is no shared top-level `docs/`/`scripts/`
  for the new project, to avoid colliding with the legacy paths below.
- `shared/` — code shared across multiple SaaS products (design system
  implementation, cross-product utilities) once any exists.
- `packages/` — publishable/internal packages shared across products, if
  the portfolio grows large enough to warrant extraction.
- `infrastructure/` — cross-product infra-as-code (deployment, CI/CD,
  environments) once any exists.
- `PLATFORM_AUDIT.md` — standing audit of the repository: technical debt,
  risks, scalability/maintainability notes, recommended improvements.

### Legacy content

The following top-level directories and files belong to a **previous,
unrelated project** (the "Agent Factory") that predates this one:
`agents/`, `artifacts/`, `blueprints/`, `registry/`, `scripts/`, `src/`,
`supabase/`, `tests/`, `web/`, `docs/`, `APP_CREATION_GUIDE.md`,
`DEPLOYMENT.md`, and the entire root Node toolchain (`package.json`,
`package-lock.json`, `tsconfig.json`, `tsconfig.eslint.json`,
`.eslintrc.cjs`, `.prettierrc`, `playwright.config.ts`, `vitest.config.ts`,
`railway.json`, `.env.example`). The root `README.md` also still describes
the legacy Agent Factory and has intentionally been left as-is pending an
explicit decision from the user on whether to repurpose or replace it — see
`PLATFORM_AUDIT.md`. Per the master context, do **not** reuse any of this
content's assumptions, architecture, code, prompts, workflows, or decisions
in the new project, and do not add new project files into `docs/` or
`scripts/` (those names are reserved by the legacy toolchain). Leave all of
it untouched unless the user asks to remove or repurpose it.

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

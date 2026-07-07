# Universal Platform v1.0 — Release Notes

## What this is

The Universal Platform is seven reusable, provider-agnostic npm workspace
packages extracted from Founder OS: everything a future SaaS, AI
application, mobile backend, web application, or API in this workspace
needs — engines, a product factory, a decision-support layer, multi-tenant
identity, and a UI kit — without a line of Founder OS business logic
(agents, departments, opportunities, brain) anywhere inside them.

```
@platform/core          zero-dependency primitives (logger)
@platform/shared         cross-cutting utilities (retry, timeout, cron, validation, ranking, confidence)
@platform/engines        10 provider-agnostic engines (AI, workflow, automation, search, knowledge,
                          notification, analytics, logging/monitoring, integration, storage)
@platform/factory         configuration-driven SaaS factory (ProductDefinition → scaffolded project)
@platform/intelligence    decision-support layer (recommendations, insights, decisions, diagnostics)
@platform/identity        multi-tenant users/orgs/teams/RBAC/sessions/audit log
@platform/ui              component library + design system tokens
```

See `docs/PACKAGE_OVERVIEW.md` for the per-package detail and
`docs/PLATFORM_ARCHITECTURE.md` for how they fit together.

## Highlights

- **Provider-independent by construction.** Every engine depends on an
  interface (`AIProvider`, `ObjectStorageProvider`, `NotificationChannel`,
  ...), never a vendor SDK. OpenAI, Anthropic, S3, R2, and Resend are all
  implemented as plain-`fetch` adapters over those interfaces — swapping
  providers is a constructor-options change.
- **Zero-config by default.** Every engine ships a working default
  (`MockProvider`, `InMemoryQueue`, `LocalFsStorage`, `ConsoleEmailChannel`,
  `InMemoryIdentityStore`, ...) so nothing requires external services or API
  keys to run locally or in tests.
- **Hardened for production this release**: configurable request timeouts
  (hang protection) and opt-in retry with backoff on the AI, storage, and
  email HTTP adapters; non-billable health checks for every external
  provider category, wired into the existing `HealthCheckRegistry`; a
  `validate:providers` CI/startup gate; typed, retryable-aware errors
  throughout.
- **No circular dependencies.** `core`/`shared` have zero platform
  dependencies; `engines`/`factory`/`intelligence` depend only on `shared`
  (`intelligence` also on `engines`); `identity` depends only on `core`;
  `ui` is standalone (peer deps on react/react-dom only).
- **1,285 tests, 112 files, all green** across every package, plus a clean
  strict `tsc --noEmit` on all 8 TypeScript projects (root + 7 packages) and
  a clean ESLint pass.

## What changed since the pre-v1.0 state

Two structural changes landed on the way to this release:

1. **Workspace packaging.** What was `src/engines`, `src/factory`,
   `src/platform-intelligence`, `src/identity`, and
   `web/src/{ui-kit,design-system}` is now seven independently-versioned
   `@platform/*` npm workspace packages, each with its own `package.json`
   exports map. Public APIs did not change — only import paths did. See
   `docs/PLATFORM_UPGRADE_GUIDE.md`.
2. **Provider hardening.** The AI, object-storage, and email HTTP adapters
   gained timeouts, opt-in retry, typed errors, and health checks — all
   additive, backward-compatible constructor options with defaults matching
   prior behavior (no retry unless you ask for it).

## Who should use this

Any new product built in this workspace. Founder OS's own application code
(`src/agents`, `src/departments`, `src/brain`, `src/opportunities`, the
single-founder auth in `src/server/routes/auth.ts`) is untouched and
continues to run exactly as before — none of it was moved, and nothing in
the platform packages imports it.

## Known limitations in this release

See `docs/PLATFORM_PRODUCTION_CHECKLIST.md` for the full list with
mitigations. In short: AWS SigV4 / vendor request-signing is intentionally
left to the caller (not hand-rolled here); SMTP message *submission* is not
implemented (only a connectivity health check is); `@platform/ui` has no
automated test coverage yet (no jsdom/component-testing infra in this
repo); `PostgrestIdentityStore` is typechecked and structurally proven but
not yet smoke-tested against a live Supabase project.

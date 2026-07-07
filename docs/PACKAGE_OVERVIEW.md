# Universal Platform v1.0 — Package Overview

Release-oriented summary of all seven `@platform/*` packages: what each is,
its dependencies, test coverage, and production-readiness notes. For deep
architecture, see `docs/PLATFORM_ARCHITECTURE.md` and `docs/PACKAGES.md`;
for per-domain detail, see each package's own doc (linked below).

| Package | Version | Depends on | Test files | Status |
|---|---|---|---|---|
| `@platform/core` | 0.1.0 | — | 1 | Production-ready |
| `@platform/shared` | 0.1.0 | — | 1 | Production-ready |
| `@platform/engines` | 0.1.0 | `@platform/shared` | 10 | Production-ready (SMTP send unimplemented — see checklist) |
| `@platform/factory` | 0.1.0 | `@platform/shared`, `zod` | 6 | Production-ready |
| `@platform/intelligence` | 0.1.0 | `@platform/shared`, `@platform/engines` | 10 | Production-ready |
| `@platform/identity` | 0.1.0 | `@platform/core` | 6 | Production-ready in-memory; Postgres backend untested against a live database |
| `@platform/ui` | 0.1.0 | react/react-dom (peer) | 0 | Functional, no automated test coverage |

## `@platform/core`

Zero-dependency foundational package. Today: a structured `Logger`
(`createLogger(scope)`), env-controlled via `PLATFORM_LOG_LEVEL`/
`PLATFORM_LOG_FORMAT`. Exists so other platform packages never need to
reach into a consuming application's own logger.

## `@platform/shared`

Cross-cutting primitives consumed by two or more other packages: cron
parsing/scheduling, retry/backoff (`withRetry`, `NO_RETRY_POLICY` — retry
is always opt-in, never a silent default), `AbortSignal` timeout combining
(`withTimeoutSignal`), a generic HTTP reachability health check
(`createHttpReachabilityCheck`), `{{template}}` interpolation,
dependency-graph validation, a `ValidationResult` vocabulary, confidence
scoring, and priority ranking.

## `@platform/engines`

Ten provider-agnostic engines — AI, Workflow, Automation, Search,
Knowledge, Notification, Analytics, Logging & Monitoring, Integration
Framework, Storage. Full detail: `docs/PLATFORM_ENGINES.md`. This release
adds production hardening to the three externally-facing adapters:

- **AI** (`OpenAIProvider`, `AnthropicProvider`): configurable timeout
  (default 120s), opt-in retry on `complete()`, non-billable health checks.
- **Storage** (`HttpObjectStorage`, covers S3/R2/any S3-compatible
  endpoint): configurable timeout (default 30s), opt-in retry (safe by
  default — every op is a keyed idempotent overwrite/read/delete), a real
  put/get/delete round-trip health check that works against any
  `ObjectStorageProvider`.
- **Notification** (`HttpEmailChannel`, `createResendEmailChannel`):
  configurable timeout, opt-in retry, reachability health check, plus an
  SMTP *connectivity* health check (`createSmtpHealthCheck`) — SMTP message
  submission itself is not implemented in this release.

## `@platform/factory`

Configuration-driven SaaS factory: `ProductDefinition` (Zod-validated) →
`resolveEffectiveModules()` → `ModuleRegistry` (built-in catalog + real
on-disk discovery of `@platform/engines`/`@platform/intelligence` modules)
→ `ProductBootstrapper.plan()` → `FsProjectWriter`. Also: five product
templates, the Configuration Engine (env vars, feature flags, providers,
deployment), the Extension System, and a Documentation Generator that
grounds its output in each module's actual scanned exports. Full detail:
`docs/SAAS_FACTORY.md`.

## `@platform/intelligence`

The decision-support layer: Recommendation Engine (rule-based + AI-powered
sources), Insights Engine (usage/growth/adoption/retention/error
collectors over one generic threshold-series abstraction), Decision Engine
(weighted multi-factor scoring), Intelligence Registry (on-disk discovery +
semver versioning), Feature Intelligence, Product Intelligence, the AI
Recommendation Layer (narrow `AITextGenerator` interface, optional bridge
to a real `AIProvider`), Health & Diagnostics, Optimization Engine, and the
`IntelligenceAPI` facade. Full detail: `docs/PLATFORM_INTELLIGENCE.md`.

## `@platform/identity`

Multi-tenant identity: users, organizations, teams, membership, RBAC
(roles/permissions), profiles, database-backed sessions (opaque tokens,
SHA-256-hashed at rest, individually revocable), and a database-backed
audit log. `InMemoryIdentityStore` (zero-config default) and
`PostgrestIdentityStore` (Supabase-backed, no SDK dependency) behind one
`IdentityStore` interface. Full detail: `docs/IDENTITY.md`, including its
own "Remaining gaps" section (no email delivery, no password reset, no
email-verification enforcement, no rate limiting on login/register).

## `@platform/ui`

Component library (`ui-kit`: Button, Input, Table, Form, Dialog, Card,
Navigation, DashboardLayout, EmptyState, LoadingState, ErrorState) and
design system (typography/spacing/color/shadow tokens as CSS custom
properties, light + dark, documented accessibility rules). No Founder OS
branding or copy anywhere in it. **Zero automated test coverage** — this
repository has no jsdom/component-testing infrastructure configured
(Vitest runs in `environment: "node"`, and there is no
`@testing-library/react` dependency); adding one is real test-infra setup
work, tracked as a known gap rather than attempted under this release's
"don't restructure tooling" constraint.

## How to read "Production-ready"

It means: strictly typed (clean `tsc --noEmit`, `noUncheckedIndexedAccess`
on), lint-clean, covered by passing tests, has a zero-config default
requiring no external services, and — for anything that talks to an
external HTTP/TCP endpoint — is timeout-bounded with typed, retryable-aware
errors as of this release. It does **not** mean every conceivable feature
is implemented; see `docs/PLATFORM_PRODUCTION_CHECKLIST.md` for the
explicit, named list of what's out of scope and why.

# Universal Platform — Changelog

All notable changes to the `@platform/*` workspace packages
(`core`, `shared`, `engines`, `factory`, `intelligence`, `identity`, `ui`).
Founder OS application changes (`src/`, `web/`) are not tracked here.

Format loosely follows [Keep a Changelog](https://keepachangelog.com/); dates
are commit dates, not calendar-release dates (this platform was built and
released as v1.0 in one continuous engineering effort).

## [1.0.0] — 2026-07-07

### Added — Provider hardening & release readiness (this phase)
- `@platform/shared`: `withTimeoutSignal`/`combineSignals` (Node 18.18-safe
  manual `AbortSignal` combining) and `createHttpReachabilityCheck`, a
  generic connectivity-only HTTP health-check primitive.
- `@platform/engines/ai`: `OpenAIProvider`/`AnthropicProvider` now take
  `timeoutMs` (default 120s, request-hang protection) and an opt-in
  `retryPolicy` (defaults to no retry, per this codebase's established
  "retry is a caller choice" rule) applied to `complete()` only — `stream()`
  is never retried, to avoid replaying output a caller may have already
  consumed. Added `createOpenAIHealthCheck`/`createAnthropicHealthCheck`
  (non-billable `GET /models` connectivity + auth check).
- `@platform/engines/storage`: `HttpObjectStorage` gets the same
  `timeoutMs`/opt-in-`retryPolicy` treatment (safe by default here, since
  every operation is a keyed idempotent overwrite/read/delete) plus a typed
  `ObjectStorageError`. Added `createObjectStorageHealthCheck` (a real
  put/get/delete round-trip against any `ObjectStorageProvider`) and
  `createObjectStorageReachabilityCheck` (unauthenticated reachability-only,
  usable from env vars alone).
- `@platform/engines/notification`: `HttpEmailChannel` gets the same
  timeout/retry treatment plus a typed `NotificationChannelError`. Added
  `createResendEmailChannel` (a preset over `HttpEmailChannel` for Resend's
  REST API), `createHttpEmailHealthCheck` (reachability-only, no email
  sent), and `createSmtpHealthCheck` (a real TCP/TLS connectivity probe —
  greeting + `EHLO` + optional `STARTTLS` — no message is sent; SMTP
  message *submission* remains unimplemented, see
  `PLATFORM_PRODUCTION_CHECKLIST.md`).
- `packages/engines/scripts/validate-providers.ts` (`npm run
  validate:providers`): CI/startup gate that runs every configured
  provider's health check from environment variables and exits non-zero if
  any is down.
- `docs/PROVIDER_SETUP.md`: setup + validation guide for all seven external
  providers.
- `packages/core/tests/logger.test.ts`: closed `@platform/core`'s test
  coverage gap (previously zero tests).

### Added — Workspace packaging
- Converted `src/engines`, `src/factory`, `src/platform-intelligence`,
  `src/identity`, and `web/src/{ui-kit,design-system}` into standalone npm
  workspace packages: `@platform/core`, `@platform/shared`,
  `@platform/engines`, `@platform/factory`, `@platform/intelligence`,
  `@platform/identity`, `@platform/ui`.
- Consolidated three previously-separate internal `shared/` folders into
  one `@platform/shared` package.
- Added `@platform/core` (a minimal logger) so `@platform/identity` no
  longer reaches into Founder OS's own `src/utils`.
- `docs/PACKAGES.md`: workspace architecture reference.

### Added — Production Identity Foundation
- Multi-tenant identity: users, organizations, teams, membership, RBAC
  (roles/permissions), profiles, database-backed sessions, database-backed
  audit log. `InMemoryIdentityStore` (default) and `PostgrestIdentityStore`
  (Supabase-backed) behind one `IdentityStore` interface.
- `/api/identity/*` routes, additive alongside the existing founder
  single-user auth — neither replaces the other.

### Added — Universal Platform Intelligence (Loop 4)
- Recommendation Engine (rule-based + AI-powered sources), Insights Engine,
  Decision Engine, Intelligence Registry, Feature Intelligence, Product
  Intelligence, AI Recommendation Layer, Health & Diagnostics, Optimization
  Engine, and the `IntelligenceAPI` facade.

### Added — Universal SaaS Factory (Loop 3)
- `ProductDefinition` schema + `resolveEffectiveModules`, the Module
  Registry (built-in catalog + on-disk discovery), the Bootstrap System
  (`ProjectPlan` + `FsProjectWriter`), five product templates, the
  Configuration Engine, the Extension System, and the Documentation
  Generator.
- UI Component Library (`ui-kit`) and Design System (tokens).

### Added — Universal Platform Engines (Loop 2)
- Ten provider-agnostic engines: AI, Workflow, Automation, Search,
  Knowledge, Notification, Analytics, Logging & Monitoring, Integration
  Framework, Storage. Every engine ships a zero-config default adapter
  (`MockProvider`, `InMemoryQueue`, `LocalFsStorage`, ...).

### Fixed — Hardening pass (pre-packaging)
- Removed a silent retry-by-default gotcha (`withRetry` retrying 3× when a
  caller passed `undefined` for an optional retry policy) — retrying is now
  unambiguously an opt-in everywhere in the platform, including in this
  phase's new AI/storage/email hardening.
- Fixed an SSRF/host-injection vector in `HttpObjectStorage`'s key-to-URL
  resolution (a key containing a scheme or protocol-relative prefix could
  previously escape `baseUrl`).
- Fixed an OAuth2 token-refresh race condition (single-flight refresh).

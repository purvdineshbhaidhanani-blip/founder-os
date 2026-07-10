# Shared Platform — Epics, Features & Tasks

> Part of MEGA LOOPING 2D — Master Execution Planning. This document is the
> authoritative task breakdown for everything that exists **once** in
> `shared/platform/` and is consumed by all 12 products, per Step 3 of the
> execution planning request. Product-specific task documents
> (`01-spendgov-tasks.md` etc.) reference these task IDs as dependencies
> instead of re-planning this work per product.

**Scale key:** Effort — **S** = 1–3 days, **M** = 4–10 days, **L** = 10+ days (single engineer-equivalent, before parallelization across a team).

**Status key:** ✅ Shipped (code exists in `shared/platform/`, verified — see `products/PORTFOLIO_WAVE_1_EXECUTION_PLAN.md` and the prior session's commit `5e0c44f`) · 🔲 Not started.

**ID scheme:** `SH-<AREA>-<N>`. Product docs reference these directly (e.g. a product's login page depends on `SH-AUTH-3`).

---

## Epic SH-AUTH: Authentication — ✅ SHIPPED

**Goal:** One reusable authentication system (email/password, OAuth, magic links, MFA, sessions) used identically by all 12 products.

**Status:** Fully implemented in `shared/platform/src/auth/` (password hashing, session management, OAuth scaffolding with fail-closed Phase 1 behavior, magic links, TOTP MFA, rate limiting, AES-256-GCM encryption at rest). 13 unit tests passing, typechecks clean. No further Phase A work required — listed here for traceability only.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-AUTH-1 | Prisma schema: users, oauth_accounts, sessions, mfa_factors, password_reset_tokens, magic_link_tokens | P0 | M | None | — | ✅ |
| SH-AUTH-2 | Password service (argon2id hash/verify) | P0 | S | SH-AUTH-1 | — | ✅ |
| SH-AUTH-3 | Session service (opaque token, server-revocable, sliding TTL) | P0 | M | SH-AUTH-1 | — | ✅ |
| SH-AUTH-4 | OAuth scaffolding (Google/Microsoft/GitHub, fail-closed until Phase 2 credentials) | P0 | M | SH-AUTH-1, SH-CRYPTO-1 | — | ✅ |
| SH-AUTH-5 | Magic link flow (request/consume, rate-limited) | P1 | S | SH-AUTH-3, SH-RATE-1 | — | ✅ |
| SH-AUTH-6 | Password reset flow (request/reset, rate-limited, session revocation on change) | P0 | S | SH-AUTH-2, SH-AUTH-3, SH-RATE-1 | — | ✅ |
| SH-AUTH-7 | MFA (TOTP): enrollment, verification, login-time challenge | P1 | M | SH-AUTH-1, SH-CRYPTO-1 | — | ✅ |
| SH-AUTH-8 | Rate limiting primitive (Redis sliding window) — login/MFA/email-token abuse prevention | P0 | S | None | — | ✅ (`SH-RATE-1`) |
| SH-AUTH-9 | Auth service unit tests (password, validation schemas) | P0 | S | SH-AUTH-2..7 | — | ✅ (13 tests) |

---

## Epic SH-CRYPTO: Encryption at Rest — ✅ SHIPPED

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-CRYPTO-1 | AES-256-GCM encrypt/decrypt helper (`crypto/index.ts`), keyed from `PLATFORM_ENCRYPTION_KEY` | P0 | S | None | — | ✅ |

---

## Epic SH-USER: User Management — ✅ SHIPPED

**Goal:** Profile, avatar, account settings, and user status — reusable across all products.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-USER-1 | User profile read/update service | P0 | S | SH-AUTH-1 | — | ✅ |
| SH-USER-2 | Avatar set/update service (URL-based; upload itself is product-route concern per `standards/engineering.md`) | P1 | S | SH-USER-1, SH-STORAGE-2 (for actual upload) | — | ✅ (URL persistence only) |
| SH-USER-3 | Account settings (timezone, locale, notification prefs) stored as JSON on `users.settings` | P1 | S | SH-USER-1 | — | ✅ |
| SH-USER-4 | User status transitions (active/invited/suspended/deactivated) with audit trail | P0 | S | SH-USER-1, SH-AUDIT-1 | — | ✅ |
| SH-USER-5 | Soft-delete user (GDPR-adjacent; hard erasure is a documented Phase 2 procedure) | P1 | S | SH-USER-1 | — | ✅ |

---

## Epic SH-ORG: Organizations, Teams & RBAC — ✅ SHIPPED

**Goal:** Multi-tenant organizations, teams, membership, invitations, and a centralized `can()`/`requireCan()` policy function — the single RBAC implementation every product route calls.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-ORG-1 | Prisma schema: organizations, teams, organization_members, team_members, invitations | P0 | M | SH-AUTH-1 | — | ✅ |
| SH-ORG-2 | Organization CRUD service (create always seeds an owner; soft delete) | P0 | M | SH-ORG-1 | — | ✅ |
| SH-ORG-3 | Team CRUD + membership service | P0 | M | SH-ORG-1 | — | ✅ |
| SH-ORG-4 | Centralized RBAC (`can()`/`requireCan()`, owner/admin/member base matrix) | P0 | M | SH-ORG-1 | — | ✅ |
| SH-ORG-5 | Product-role extension point (`productRole` column + documented override pattern) | P1 | S | SH-ORG-4 | — | ✅ |
| SH-ORG-6 | Invitation flow (create/accept/revoke, token-based, email-gated per `SH-EMAIL-1`) | P0 | M | SH-ORG-1, SH-ORG-2 | — | ✅ |
| SH-ORG-7 | Member management (list, update role, remove) | P0 | S | SH-ORG-4 | — | ✅ |
| SH-ORG-8 | Organizations/RBAC unit tests (validation schemas) | P0 | S | SH-ORG-2..7 | — | ✅ |

---

## Epic SH-AUDIT: Audit Logging

**Goal:** Append-only audit trail (write path) plus a queryable admin-facing viewer (not yet built).

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-AUDIT-1 | Audit log write path (`recordAuditLogEntry`, called from every auth/user/org mutation) | P0 | S | SH-ORG-1 | — | ✅ |
| SH-AUDIT-2 | Audit log list/paginate service (`listAuditLogForOrganization`) | P1 | S | SH-AUDIT-1 | — | ✅ |
| SH-AUDIT-3 | Admin-facing audit log viewer UI (filter by actor/action/date, per-product mount point) | P1 | M | SH-AUDIT-2, SH-DASH-2, SH-ADMIN-1 | Yes | 🔲 |
| SH-AUDIT-4 | Audit log export (CSV) | P2 | S | SH-AUDIT-2, SH-REPORT-3 | Yes | 🔲 |
| SH-AUDIT-5 | Configurable retention policy per billing tier (enforced at query + a scheduled purge job) | P2 | S | SH-AUDIT-1, SH-BILL-2 | Yes | 🔲 |

---

## Epic SH-BILL: Billing & Subscriptions

**Goal:** One billing engine (Stripe + entitlement resolver) every product's pricing tiers plug into — `can(org, feature)` / `withinLimit(org, metric)`.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-BILL-1 | Prisma schema: subscriptions, plans, entitlements, usage_counters, invoices | P0 | M | SH-ORG-1 | — | 🔲 |
| SH-BILL-2 | Entitlement resolver (`can(org, feature)`, `withinLimit(org, metric)`) — generic engine, per-product plan config | P0 | L | SH-BILL-1 | — | 🔲 |
| SH-BILL-3 | Stripe integration: customer/subscription sync, webhook handler (built and wired, disabled until Phase 2 API keys) | P0 | L | SH-BILL-1, SH-API-3 | — | 🔲 |
| SH-BILL-4 | Trial lifecycle (start, expiry, auto-downgrade) | P0 | M | SH-BILL-2 | — | 🔲 |
| SH-BILL-5 | Past-due / dunning state machine (grace period, downgrade, reactivation) | P1 | M | SH-BILL-3 | — | 🔲 |
| SH-BILL-6 | Usage metering primitive (increment/reset counters, e.g. monthly scan count) | P0 | M | SH-BILL-1 | Yes | 🔲 |
| SH-BILL-7 | Self-serve upgrade/downgrade UI (plan picker, prorating display) | P0 | M | SH-BILL-2, SH-BILL-3, SH-DASH-1 | Yes | 🔲 |
| SH-BILL-8 | Billing admin panel (invoices, payment method, plan history) | P1 | M | SH-BILL-3, SH-ADMIN-1 | Yes | 🔲 |
| SH-BILL-9 | Limit-approaching / limit-reached UI banners (generic component, per-product copy) | P1 | S | SH-BILL-2, SH-DASH-1 | Yes | 🔲 |
| SH-BILL-10 | Success-based/usage-overage billing hook (for products like SpendGov offering % of savings) | P2 | M | SH-BILL-3 | Yes | 🔲 |

---

## Epic SH-DASH: Dashboard Framework

**Goal:** One React component library and layout shell every product's dashboard inherits, per `frameworks/06-dashboard-framework.md`.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-DASH-1 | Dashboard shell layout (nav, product switcher, responsive breakpoints, dark/light theme) | P0 | M | SH-AUTH-3, SH-ORG-4 | — | 🔲 |
| SH-DASH-2 | Component library: KPI card, line/bar/area chart, data table (sortable/filterable/paginated) | P0 | L | SH-DASH-1 | Yes (per component) | 🔲 |
| SH-DASH-3 | Component library: modal, dropdown, search input, filter sidebar, alert/toast | P0 | M | SH-DASH-1 | Yes | 🔲 |
| SH-DASH-4 | Loading / empty / error state components (standardized across all products) | P0 | S | SH-DASH-1 | Yes | 🔲 |
| SH-DASH-5 | Client-side + server-side caching layer for dashboard data fetching | P1 | M | SH-DASH-2 | Yes | 🔲 |
| SH-DASH-6 | Theme engine (CSS variables, dark/light, per `standards/design-system.md`) | P0 | M | None | Yes | 🔲 |
| SH-DASH-7 | Product-specific chart types (heatmap, timeline, tree map) as an extensible plugin pattern | P1 | M | SH-DASH-2 | Yes | 🔲 |
| SH-DASH-8 | Quick actions / recent activity feed component | P1 | S | SH-DASH-1 | Yes | 🔲 |

---

## Epic SH-ADMIN: Admin Panel Framework

**Goal:** One admin shell every product mounts its 10 standard modules into, per `frameworks/07-admin-panel-framework.md`.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-ADMIN-1 | Admin panel shell (nav, role-gated route guard using `SH-ORG-4`) | P0 | M | SH-ORG-4, SH-DASH-1 | — | 🔲 |
| SH-ADMIN-2 | Users admin module (list, invite, deactivate, role assign — thin UI over `SH-USER`/`SH-ORG`) | P0 | S | SH-ADMIN-1, SH-USER-4, SH-ORG-7 | Yes | 🔲 |
| SH-ADMIN-3 | Organizations/Teams admin module | P0 | S | SH-ADMIN-1, SH-ORG-3 | Yes | 🔲 |
| SH-ADMIN-4 | Roles & Permissions admin module (view matrix, assign product roles) | P0 | S | SH-ADMIN-1, SH-ORG-5 | Yes | 🔲 |
| SH-ADMIN-5 | Billing admin module | P1 | — | SH-BILL-8 | Yes | 🔲 (tracked under SH-BILL-8) |
| SH-ADMIN-6 | Integrations admin module (list configured/disabled integrations, credential status) | P1 | M | SH-ADMIN-1, SH-INTEG-2 | Yes | 🔲 |
| SH-ADMIN-7 | Audit Logs admin module | P1 | — | SH-AUDIT-3 | Yes | 🔲 (tracked under SH-AUDIT-3) |
| SH-ADMIN-8 | Notifications admin module (channel status, delivery stats) | P2 | S | SH-ADMIN-1, SH-NOTIF-2 | Yes | 🔲 |
| SH-ADMIN-9 | Settings admin module | P1 | — | SH-SETTINGS-1 | Yes | 🔲 (tracked under SH-SETTINGS-1) |
| SH-ADMIN-10 | Destructive-action confirmation pattern (shared modal + typed-confirmation component) | P0 | S | SH-DASH-3 | Yes | 🔲 |

---

## Epic SH-NOTIF: Notifications Engine

**Goal:** One notification engine, many channels — in-app fully working Phase 1, others built-disabled, per `frameworks/10-notifications.md`.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-NOTIF-1 | Prisma schema: notifications, notification_preferences, delivery_log | P0 | S | SH-ORG-1 | — | 🔲 |
| SH-NOTIF-2 | Notification queue + dispatcher service (template engine, retry/backoff) | P0 | M | SH-NOTIF-1 | — | 🔲 |
| SH-NOTIF-3 | In-app notification channel (fully functional Phase 1) | P0 | M | SH-NOTIF-2, SH-DASH-3 | — | 🔲 |
| SH-NOTIF-4 | Email channel (built and wired, disabled until Phase 2 SMTP/provider credentials) | P1 | M | SH-NOTIF-2, SH-EMAIL-1 | Yes | 🔲 |
| SH-NOTIF-5 | Slack channel (built and wired, disabled until Phase 2 credentials) | P2 | M | SH-NOTIF-2, SH-INTEG-2 | Yes | 🔲 |
| SH-NOTIF-6 | Microsoft Teams channel (built and wired, disabled until Phase 2 credentials) | P2 | M | SH-NOTIF-2, SH-INTEG-2 | Yes | 🔲 |
| SH-NOTIF-7 | User notification preferences UI (per-channel, do-not-disturb) | P1 | S | SH-NOTIF-1, SH-SETTINGS-1 | Yes | 🔲 |
| SH-NOTIF-8 | Rate limiting for notification delivery (don't spam) | P1 | S | SH-NOTIF-2, SH-RATE-1 | Yes | 🔲 |

---

## Epic SH-EMAIL: Transactional Email

**Goal:** One transactional email sending capability, shared by auth (magic link/reset/invite) and notifications.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-EMAIL-1 | Email provider abstraction (built and wired, disabled — `isEmailConfigured()` gate already exists in `config/index.ts`; provider SDK call + templates not yet built) | P0 | M | None | — | 🔲 (config gate ✅, sending 🔲) |
| SH-EMAIL-2 | Transactional email templates (invite, magic link, password reset, notification digest) | P1 | M | SH-EMAIL-1 | Yes | 🔲 |
| SH-EMAIL-3 | Bounce/complaint webhook handling (Phase 2) | P2 | S | SH-EMAIL-1, SH-API-3 | Yes | 🔲 |

---

## Epic SH-REPORT: Reporting & Export

**Goal:** One report builder every product's reports (PDF/CSV/Excel, scheduled, AI-summarized) use, per `frameworks/11-reporting.md`.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-REPORT-1 | Report template engine (data-binding + layout definition) | P0 | M | SH-DASH-2 | — | 🔲 |
| SH-REPORT-2 | PDF export (headless rendering) | P0 | M | SH-REPORT-1 | Yes | 🔲 |
| SH-REPORT-3 | CSV export | P0 | S | SH-REPORT-1 | Yes | 🔲 |
| SH-REPORT-4 | Excel export | P1 | S | SH-REPORT-1 | Yes | 🔲 |
| SH-REPORT-5 | Scheduled report engine (cron-based generation + delivery via `SH-NOTIF`) | P1 | M | SH-REPORT-1, SH-NOTIF-2 | Yes | 🔲 |
| SH-REPORT-6 | AI report summary hook (calls `SH-AI-1` provider abstraction) | P1 | S | SH-REPORT-1, SH-AI-1 | Yes | 🔲 |
| SH-REPORT-7 | Report access control (permission-scoped per `standards/security.md`) | P0 | S | SH-REPORT-1, SH-ORG-4 | Yes | 🔲 |

---

## Epic SH-ANALYTICS: Analytics & Usage Tracking

**Goal:** One event pipeline every product emits to for usage analytics, funnels, and revenue metrics.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-ANALYTICS-1 | Event tracking SDK (client + server, typed event schema) | P0 | M | None | — | 🔲 |
| SH-ANALYTICS-2 | Event warehouse/sink (batched writes, per-app_id partitioning) | P0 | M | SH-ANALYTICS-1 | — | 🔲 |
| SH-ANALYTICS-3 | Usage/funnel dashboard (free → trial → paid conversion, per product) | P1 | M | SH-ANALYTICS-2, SH-DASH-2 | Yes | 🔲 |
| SH-ANALYTICS-4 | Revenue metrics (MRR, ARR, churn) computed from `SH-BILL` data | P1 | M | SH-BILL-1, SH-ANALYTICS-2 | Yes | 🔲 |
| SH-ANALYTICS-5 | Error/performance event tracking hook (feeds `SH-MONITOR`) | P1 | S | SH-ANALYTICS-1 | Yes | 🔲 |

---

## Epic SH-SEARCH: Search

**Goal:** One search abstraction every product's "find X" feature uses.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-SEARCH-1 | Search index abstraction (PostgreSQL full-text by default; pluggable for Elasticsearch at scale) | P1 | M | None | — | 🔲 |
| SH-SEARCH-2 | Full-text search API (query parsing, allow-listed filterable fields per `standards/api.md`) | P1 | M | SH-SEARCH-1 | — | 🔲 |
| SH-SEARCH-3 | Filter/facet builder UI component | P1 | M | SH-SEARCH-2, SH-DASH-3 | Yes | 🔲 |
| SH-SEARCH-4 | Saved filters (named queries) | P2 | S | SH-SEARCH-2 | Yes | 🔲 |
| SH-SEARCH-5 | Search result caching (popular queries) | P2 | S | SH-SEARCH-2 | Yes | 🔲 |

---

## Epic SH-API: API & Integration Layer

**Goal:** One REST convention, one auth/webhook framework, one rate limiter — every product's API surface follows `standards/api.md` through this layer.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-API-1 | Standard error-shape middleware (`{ error: { code, message, details, requestId } }`) | P0 | S | SH-LOG-1 | — | 🔲 |
| SH-API-2 | Request validation middleware (zod-at-boundary, per `standards/engineering.md`) | P0 | S | None | Yes | 🔲 |
| SH-API-3 | Public API key issuance + verification (scoped, revocable, distinct from session credentials) | P0 | M | SH-ORG-4, SH-CRYPTO-1 | — | 🔲 |
| SH-API-4 | Cursor pagination helper (shared envelope, server-capped limit) | P0 | S | None | Yes | 🔲 |
| SH-API-5 | Idempotency-key handling for non-idempotent POSTs | P1 | M | None | Yes | 🔲 |
| SH-API-6 | OpenAPI/Swagger generation from zod schemas | P1 | M | SH-API-2 | Yes | 🔲 |
| SH-API-7 | API versioning convention (`/api/v1/...` for external-facing routes) | P1 | S | None | Yes | 🔲 |

---

## Epic SH-INTEG: Integrations & Webhook Framework

**Goal:** One integration registry, one credential vault, one webhook dispatcher — every product's OAuth/API-key/webhook integration wires through this, per `frameworks/12-integrations.md`.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-INTEG-1 | Integration registry schema (per-org config, encrypted credential storage) | P0 | M | SH-ORG-1, SH-CRYPTO-1 | — | 🔲 |
| SH-INTEG-2 | Credential vault service (store/retrieve/rotate encrypted secrets) | P0 | M | SH-INTEG-1, SH-CRYPTO-1 | — | 🔲 |
| SH-INTEG-3 | Outbound webhook dispatcher (queue, retry/backoff, delivery log) | P1 | M | SH-INTEG-1 | Yes | 🔲 |
| SH-INTEG-4 | Inbound webhook receiver (HMAC/provider signature verification per `standards/api.md`) | P1 | M | SH-API-1 | Yes | 🔲 |
| SH-INTEG-5 | OAuth "connect an external service" flow generalized for non-login integrations (e.g. Salesforce, GitHub repo access — distinct from `SH-AUTH-4`'s login OAuth) | P0 | L | SH-INTEG-1 | Yes | 🔲 |
| SH-INTEG-6 | Zapier/Make-ready webhook contract (standard trigger/action schema) | P2 | M | SH-INTEG-3 | Yes | 🔲 |
| SH-INTEG-7 | Import/export (CSV/bulk) generic utility | P1 | M | None | Yes | 🔲 |

---

## Epic SH-STORAGE: File Storage

**Goal:** One object-storage abstraction every product's uploads (contracts, repos, audio, images) use.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-STORAGE-1 | Object storage abstraction (S3-compatible interface) | P0 | M | None | — | 🔲 |
| SH-STORAGE-2 | Upload API (multipart, resumable, server-side type/size validation per `standards/security.md`) | P0 | M | SH-STORAGE-1 | — | 🔲 |
| SH-STORAGE-3 | Signed URL generation (time-limited, access-controlled downloads) | P0 | S | SH-STORAGE-1, SH-ORG-4 | Yes | 🔲 |
| SH-STORAGE-4 | File versioning | P2 | S | SH-STORAGE-1 | Yes | 🔲 |
| SH-STORAGE-5 | Virus scanning hook (Phase 2 — built and wired, disabled until credentials) | P2 | S | SH-STORAGE-2 | Yes | 🔲 |
| SH-STORAGE-6 | Retention/cleanup job (auto-delete after configurable period) | P2 | S | SH-STORAGE-1 | Yes | 🔲 |

---

## Epic SH-AI: AI Provider Abstraction

**Goal:** One AI layer — no product calls an LLM SDK directly. This is the highest-priority undone shared system: every product's killer feature depends on it.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-AI-1 | Provider abstraction interface (`complete()`, `stream()`, `embed()` — no product touches a raw SDK) | P0 | M | None | — | 🔲 |
| SH-AI-2 | Model routing (Claude default, fallback provider on failure) | P0 | M | SH-AI-1 | — | 🔲 |
| SH-AI-3 | Structured output validation (zod schema enforced on every AI JSON response) | P0 | M | SH-AI-1 | Yes | 🔲 |
| SH-AI-4 | Prompt versioning/registry (track prompt changes per product/feature) | P1 | M | SH-AI-1 | Yes | 🔲 |
| SH-AI-5 | Token/cost tracking + attribution (per org, per product, per feature) | P0 | M | SH-AI-1, SH-ANALYTICS-2 | Yes | 🔲 |
| SH-AI-6 | Response caching (identical input → cached output) | P1 | S | SH-AI-1 | Yes | 🔲 |
| SH-AI-7 | Retry + fallback logic (provider failure handling) | P0 | S | SH-AI-2 | Yes | 🔲 |
| SH-AI-8 | Streaming support (SSE/token-by-token to UI) | P1 | M | SH-AI-1 | Yes | 🔲 |
| SH-AI-9 | Embeddings service (for semantic similarity — SpendGov duplicate detection, CRMCapture fuzzy matching) | P0 | M | SH-AI-1 | Yes | 🔲 |
| SH-AI-10 | AI usage-limit enforcement hook (ties into `SH-BILL-6` usage metering) | P0 | S | SH-AI-5, SH-BILL-6 | Yes | 🔲 |
| SH-AI-11 | Human-approval matrix middleware (per `frameworks/05-ai-framework.md` — read-only acts freely, drafts require review, irreversible actions require confirmation) | P0 | M | SH-AI-1, SH-ORG-4 | Yes | 🔲 |

---

## Epic SH-MONITOR: Monitoring & Observability

**Goal:** One APM/error-tracking setup, one set of health checks, one performance-budget alerting system.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-MONITOR-1 | Error tracking integration (capture + alert on unhandled exceptions) | P0 | S | SH-LOG-1 | — | 🔲 |
| SH-MONITOR-2 | Health check endpoints (`/health`, `/ready`) per product | P0 | S | None | Yes | 🔲 |
| SH-MONITOR-3 | Performance budget alerting (LCP/INP/CLS thresholds per `standards/devops.md`) | P1 | M | SH-MONITOR-1 | Yes | 🔲 |
| SH-MONITOR-4 | Uptime/synthetic monitoring per product | P1 | S | SH-MONITOR-2 | Yes | 🔲 |
| SH-MONITOR-5 | AI cost/usage anomaly alerting (runaway spend detection) | P1 | S | SH-AI-5, SH-MONITOR-1 | Yes | 🔲 |

---

## Epic SH-LOG: Structured Logging

**Goal:** One logging utility every service uses — foundational, cheap, needed before anything else ships to production.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-LOG-1 | Structured logger (JSON prod / pretty dev, per `standards/engineering.md` log-level and redaction rules) | P0 | S | None | — | 🔲 |
| SH-LOG-2 | Request-ID propagation middleware (ties logs to `standards/api.md`'s `requestId` in error responses) | P0 | S | SH-LOG-1 | — | 🔲 |
| SH-LOG-3 | PII/secret redaction utility (never log passwords, tokens, full payment details) | P0 | S | SH-LOG-1 | Yes | 🔲 |

---

## Epic SH-SETTINGS: Settings Framework

**Goal:** One settings UI shell (profile, org, billing, notifications, security, API, theme, language) every product mounts into.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-SETTINGS-1 | Settings shell (tabbed layout: profile/org/billing/notifications/security/API/theme/language) | P1 | M | SH-DASH-1 | — | 🔲 |
| SH-SETTINGS-2 | Feature flags system (per-org toggles, admin-configurable) | P1 | M | SH-ORG-1 | Yes | 🔲 |
| SH-SETTINGS-3 | Theme/language preference persistence | P2 | S | SH-SETTINGS-1, SH-USER-3 | Yes | 🔲 |

---

## Epic SH-SEC: Security Hardening (cross-cutting)

**Goal:** Web-security middleware every product's HTTP layer inherits automatically, per `standards/security.md`.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-SEC-1 | CSRF protection middleware (double-submit or synchronizer pattern) | P0 | S | None | — | 🔲 |
| SH-SEC-2 | Secure headers middleware (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, default on every response) | P0 | S | None | Yes | 🔲 |
| SH-SEC-3 | Content-Security-Policy configuration (deny-by-default, per-product allow-list) | P0 | M | SH-SEC-2 | Yes | 🔲 |
| SH-SEC-4 | Generalized rate limiter (extend `SH-RATE-1` beyond auth to any public endpoint) | P0 | S | SH-AUTH-8 | Yes | 🔲 |
| SH-SEC-5 | Dependency vulnerability scanning CI job (criticals block merge) | P0 | S | SH-DEVOPS-3 | Yes | 🔲 |

---

## Epic SH-DEVOPS: DevOps / CI/CD Foundation

**Goal:** The monorepo tooling, CI pipeline, and deployment scaffolding every product and every shared module builds through. **This blocks essentially everything** — it's the actual Wave 0.

| Task ID | Task | Priority | Effort | Dependencies | Parallel | Status |
|---|---|---|---|---|---|---|
| SH-DEVOPS-1 | Monorepo workspace setup (npm/pnpm workspaces linking `shared/platform` into each `products/<name>`) | P0 | M | None | — | 🔲 |
| SH-DEVOPS-2 | Shared ESLint/Prettier/tsconfig base config (`shared/config/`) | P0 | S | SH-DEVOPS-1 | Yes | 🔲 |
| SH-DEVOPS-3 | GitHub Actions CI pipeline (typecheck, lint, unit test, build — per `standards/testing.md` gates) | P0 | M | SH-DEVOPS-1 | — | 🔲 |
| SH-DEVOPS-4 | Docker base images (frontend, backend) | P0 | M | SH-DEVOPS-1 | Yes | 🔲 |
| SH-DEVOPS-5 | Environment/secrets management pattern (`.env.example` convention already established by `shared/platform`; extend per-product) | P0 | S | None | Yes | 🔲 |
| SH-DEVOPS-6 | Staging environment provisioning | P0 | M | SH-DEVOPS-4 | — | 🔲 |
| SH-DEVOPS-7 | Production deployment pipeline (zero-downtime, automated migrations per `standards/database.md`) | P0 | L | SH-DEVOPS-6 | — | 🔲 |
| SH-DEVOPS-8 | Database backup/recovery automation | P1 | M | SH-DEVOPS-7 | Yes | 🔲 |
| SH-DEVOPS-9 | E2E test runner setup (Playwright, per `standards/testing.md`) | P1 | M | SH-DEVOPS-3 | Yes | 🔲 |

---

## Shared Platform Summary

| Epic | Status | P0 tasks remaining | Total tasks |
|---|---|---|---|
| SH-AUTH | ✅ Shipped | 0 | 9 |
| SH-CRYPTO | ✅ Shipped | 0 | 1 |
| SH-USER | ✅ Shipped | 0 | 5 |
| SH-ORG | ✅ Shipped | 0 | 8 |
| SH-AUDIT | Partial (write path ✅) | 0 | 5 |
| SH-BILL | 🔲 Not started | 6 | 10 |
| SH-DASH | 🔲 Not started | 5 | 8 |
| SH-ADMIN | 🔲 Not started | 4 | 10 |
| SH-NOTIF | 🔲 Not started | 3 | 8 |
| SH-EMAIL | 🔲 Not started (config gate ✅) | 1 | 3 |
| SH-REPORT | 🔲 Not started | 4 | 7 |
| SH-ANALYTICS | 🔲 Not started | 2 | 5 |
| SH-SEARCH | 🔲 Not started | 0 | 5 |
| SH-API | 🔲 Not started | 4 | 7 |
| SH-INTEG | 🔲 Not started | 3 | 7 |
| SH-STORAGE | 🔲 Not started | 3 | 6 |
| SH-AI | 🔲 Not started | 7 | 11 |
| SH-MONITOR | 🔲 Not started | 2 | 5 |
| SH-LOG | 🔲 Not started | 3 | 3 |
| SH-SETTINGS | 🔲 Not started | 0 | 3 |
| SH-SEC | 🔲 Not started | 4 | 5 |
| SH-DEVOPS | 🔲 Not started | 7 | 9 |

**Total shared platform tasks: 140** (23 shipped, 117 remaining, 33 of them P0).

The highest-priority remaining work is **SH-DEVOPS** (blocks all deployment), **SH-LOG**/**SH-SEC** (cheap, foundational, needed before any product goes live), **SH-AI** (every product's killer feature depends on it), **SH-BILL** (every product's pricing model depends on it), and **SH-DASH**/**SH-ADMIN** (every product's UI depends on them). See `products/EXECUTION_BLUEPRINT.md` for the dependency graph and wave sequencing across shared + all 12 products.

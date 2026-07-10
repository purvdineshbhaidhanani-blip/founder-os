# AuthStartup — Epics, Features & Tasks

> Mined from `products/authstartup/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `AS`.

**Architectural note (read before planning sprints):** AuthStartup is not just another `shared/platform` consumer — it *sells* authentication-as-a-service to external developers, whose end users are not AuthStartup's own team members. This means AuthStartup needs a **project-scoped identity layer** distinct from the single-tenant `app_id` model `shared/platform` uses for the other 11 products (where `app_id` = "spendgov", "codeaudit", etc., one per product). AuthStartup's customers each create one or more "projects" (à la Auth0 tenants), each with its own end-user pool. AS-1.1.1 below is the architecture-decision task that must resolve this before the rest of the epic can proceed — see `shared/platform/ARCHITECTURE.md`'s multi-app isolation section for the pattern being extended.

---

## Epic AS-1: Multi-Tenant Auth-as-a-Service Core

**Goal:** Expose the shared platform's proven auth primitives (password, OAuth, sessions, MFA) as a public, project-scoped API external developers can integrate.

### Feature AS-1.1: Multi-Tenant Data Model

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-1.1.1 | **Architecture decision:** project-scoped tenancy model (extend `app_id` dynamically per project vs. new `project_id` dimension layered onto `SH-AUTH`/`SH-ORG` schema) | P0 | M | SH-AUTH-1, SH-ORG-1 | No |
| AS-1.1.2 | Prisma schema: auth_projects, project_api_keys, project_end_users (or equivalent per AS-1.1.1 decision) | P0 | M | AS-1.1.1 | No |
| AS-1.1.3 | Project CRUD (create/configure/delete a customer's auth project) | P0 | M | AS-1.1.2 | No |

### Feature AS-1.2: Public Auth API

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-1.2.1 | Public REST API wrapping `SH-AUTH` primitives, scoped per project | P0 | L | AS-1.1.2, SH-AUTH-2, SH-AUTH-3, SH-API-1, SH-API-3 | No |
| AS-1.2.2 | Project-scoped OAuth (Google, GitHub; Microsoft built-disabled) | P0 | M | AS-1.2.1, SH-AUTH-4 | No |
| AS-1.2.3 | Project-scoped password reset flow | P0 | S | AS-1.2.1, SH-AUTH-6 | Yes |
| AS-1.2.4 | Project-scoped JWT issuance for customer's frontend/API consumption | P0 | M | AS-1.2.1 | No |

### Feature AS-1.3: Client SDKs & Docs

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-1.3.1 | JavaScript/TypeScript SDK (drop-in login components) | P0 | L | AS-1.2.1 | Yes |
| AS-1.3.2 | API reference documentation (OpenAPI-generated per `SH-API-6`) | P0 | M | AS-1.2.1, SH-API-6 | Yes |
| AS-1.3.3 | Quickstart integration guide | P1 | S | AS-1.3.1 | Yes |

---

## Epic AS-2: Organizations, RBAC & Sessions (for end users)

**Goal:** Every capability AuthStartup's own dashboard needs (per §7 MVP) — organizations, RBAC, session management — exposed per-project for the customer's end users.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-2.1 | Project-scoped organizations (multi-org-per-user support for a customer's end users) | P0 | M | AS-1.1.2, SH-ORG-2 | No |
| AS-2.2 | Project-scoped RBAC (owner/admin/member exposed to the customer's own app) | P0 | M | AS-2.1, SH-ORG-4 | No |
| AS-2.3 | Session management API (list/revoke active sessions, revoke-on-password-change) | P0 | M | AS-1.2.1, SH-AUTH-3 | No |
| AS-2.4 | Team invitations (project-scoped) | P1 | M | AS-2.1, SH-ORG-6 | Yes |

---

## Epic AS-3: Enterprise Readiness (SAML, SCIM, Custom Domains)

**Goal:** Let a customer close their first enterprise deal without re-platforming — the Pro-tier value proposition.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-3.1 | SAML SSO implementation (validated against Okta, Azure AD, Google Workspace per §27 risk mitigation) | P1 | L | AS-1.1.2 | No |
| AS-3.2 | SCIM provisioning | P1 | L | AS-3.1 | No |
| AS-3.3 | Custom domains (Pro tier) | P1 | M | AS-1.2.1 | Yes |
| AS-3.4 | Webhooks (project events: user.created, session.revoked, etc.) | P1 | M | AS-1.2.1, SH-INTEG-3 | Yes |

---

## Epic AS-4: AI Security Advisor (Killer Feature)

**Goal:** Continuously monitor authentication activity and proactively suggest security improvements — before they become incidents.

### Feature AS-4.1: Rule-Based Detection (Phase 1)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-4.1.1 | Auth-activity event pipeline (feeds analyzer from every login/session/MFA event) | P1 | M | AS-1.2.1, SH-ANALYTICS-1 | No |
| AS-4.1.2 | Security posture rule engine (no-MFA-on-admin, weak session TTL, unusual login velocity) | P1 | L | AS-4.1.1, SH-AI-1 | No |
| AS-4.1.3 | AI-generated recommendation copy (explain the finding + fix, per `standards/ai.md` structured output) | P1 | M | AS-4.1.2, SH-AI-1, SH-AI-3 | No |
| AS-4.1.4 | False-positive validation harness (test against real project configurations before general availability per §27) | P0 | M | AS-4.1.2 | No |
| AS-4.1.5 | Security Advisor dashboard widget | P1 | S | AS-4.1.3, SH-DASH-2 | Yes |

### Feature AS-4.2: Advanced Detection (Phase 2)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-4.2.1 | Risk detection (device/geo/velocity scoring on login attempts) | P2 | L | AS-4.1.1, SH-AI-1 | No |
| AS-4.2.2 | Adaptive authentication (dynamic step-up MFA by risk score) | P2 | L | AS-4.2.1 | No |
| AS-4.2.3 | Session analytics & login heatmaps | P2 | M | AS-4.1.1, SH-DASH-7 | Yes |
| AS-4.2.4 | Fraud detection (cross-customer pattern-matching, privacy-bounded) | P2 | L | AS-4.2.1 | No |
| AS-4.2.5 | Passkeys support | P2 | L | AS-1.2.1 | Yes |
| AS-4.2.6 | Device management UI | P2 | M | AS-2.3 | Yes |

---

## Epic AS-5: Developer Dashboard & Admin

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| AS-5.1 | Developer dashboard (project settings, API keys, usage metrics) | P0 | M | AS-1.1.3, SH-DASH-2 | No |
| AS-5.2 | API key management UI | P0 | S | AS-5.1, SH-API-3 | Yes |
| AS-5.3 | MFA (TOTP) enrollment exposed per-project | P1 | M | AS-1.2.1, SH-AUTH-7 | Yes |
| AS-5.4 | Audit logs UI (project-scoped) | P1 | M | AS-1.1.3, SH-AUDIT-3 | Yes |
| AS-5.5 | Wire AuthStartup entitlements into `SH-BILL` (MAU-based Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2, SH-BILL-6 | No |

---

## AuthStartup Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| AS-1 Multi-Tenant Auth-as-a-Service Core | 10 | 8 |
| AS-2 Organizations, RBAC & Sessions | 4 | 3 |
| AS-3 Enterprise Readiness | 4 | 0 |
| AS-4 AI Security Advisor | 11 | 1 |
| AS-5 Developer Dashboard & Admin | 5 | 3 |
| **Total** | **34** | **15** |

**Note:** AuthStartup carries a unique go/no-go gate not present elsewhere in the portfolio — per PRODUCT_IDENTITY §30, an independent third-party security audit/penetration test of AS-1.2 (core auth flows) is required before general availability, not after. This is a scheduling constraint, not a task in this list (it's an external procurement/vendor action), but it blocks AS-5.5 (billing go-live) regardless of engineering completion.

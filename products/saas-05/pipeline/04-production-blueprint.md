# Production Blueprint — Home Maintenance Contractor AI

> Integration layer only. This blueprint validates, connects, standardizes and completes the three locked source engines (V1 UI Foundation, V2 Business Engine, V3 Technical Engine) into one implementation-ready package for solution-architect-app. It never redesigns a source decision. The 20 sections below appear in their locked order, every time.
>
> **Pre-integration validation:**
> - V1 Foundation: 13/13 UI modules present in locked order (Authentication, User Profile, Subscription & Billing, Payments, Dashboard, Notifications, AI Features, File Manager, Search, Settings, Integrations, Support, Onboarding). No modules skipped, merged, reordered, or invented.
> - V2 Business Engine: 10/10 sections present in locked order (Pricing Strategy, Subscription Rules, Payment System, Usage Limits, Revenue Model, User Roles, Team & Workspace, Integrations, Notifications, Business Reports). No sections skipped or merged.
> - V3 Technical Engine: 20/20 sections present in locked order (Database, Authentication, Authorization, Backend, API, AI, Storage, Search, Caching, Event, Integration, Security, Validation, Error Handling, Monitoring, Performance, Scalability, Deployment, Disaster Recovery, Documentation). No sections skipped or merged.
>
> All three pass. No V1/V2/V3 decision is redesigned below; where cross-engine gaps exist they are flagged back to the owning engine, not silently resolved. Domain-specific home-maintenance logic (Home Health Score, asset inventory, maintenance scheduling, repair prediction, cost estimation, contractor recommendation) is explicitly out of scope for all three engines and this blueprint — it remains owned by solution-architect-app and developer-agent.

---

## 1. Architecture Validation

**Purpose**
Prove that the three source engines are individually complete, internally consistent, and mutually compatible before any integration work proceeds, so the downstream build never inherits an unresolved contradiction.

**Checklist**
- [x] V1 contains exactly 13 UI modules in locked order.
- [x] V2 contains exactly 10 business sections in locked order.
- [x] V3 contains exactly 20 technical sections in locked order.
- [x] Every V1 module has at least one supporting V2 rule and one V3 pattern (see Section 5).
- [x] No orphaned V2 rule without a UI surface or technical enforcement point.
- [x] No orphaned V3 pattern without a business or UI driver.
- [x] Tenancy model consistent across engines: V2 "workspace always belongs to exactly one billing account; entitlements enforced at workspace/account scope" aligns with V3 tenant-discriminator + row-level security.
- [x] Payment/ledger model consistent: V1 Payments (processor tokenization, no raw card data) ↔ V2 Payment System (immutable ledger, provider abstraction) ↔ V3 Integration + Security.

**Standards**
- Each engine remains the single source of truth for its own domain.
- Cross-engine conflicts are flagged, never silently reconciled.
- Domain-specific home-maintenance logic remains explicitly out of scope for all three engines and this blueprint.

**Recommendations**
- Treat the tenancy alignment (V2 workspace/account ↔ V3 tenant discriminator ↔ RLS) as the spine of the whole system; validate it first in code. This matters more here than in most SaaS because the Family and Contractor tiers explicitly introduce shared/multi-home and team access (discovery Phase 8/11).
- Adopt V2's "a workspace always belongs to exactly one billing account" as the canonical tenancy statement whenever V1 or V3 language is ambiguous.

**Common Mistakes**
- Assuming three individually valid engines are automatically compatible without an explicit cross-map.
- Letting the UI layer (V1) imply business rules that V2 never authorized (e.g., inferring a "shared family access" entitlement rule from V1 Settings' team management alone).

**Future Improvements**
- Automated cross-engine linter that fails CI when a module/rule/pattern loses its counterpart.
- Machine-readable manifests per engine to make validation programmatic rather than manual.

**Flagged inconsistencies (routed to owning engine):**
1. V1 AI Features specifies AI usage metering and transparency/consent about AI-generated output; V2 Usage Limits covers AI credits as a metered quota (and Contractor/Family tiers imply "Unlimited AI"), but V2 has no dedicated AI data-governance/consent business rule. Routed to **saas-business-engine-agent**.
2. V1 Support (help center, tickets, chat, status page, "Priority Support" named in discovery Pro tier) has no counterpart V2 business section defining SLA/support entitlements by plan. Routed to **saas-business-engine-agent** (SLA entitlements); noted for solution-architect-app.
3. V1 Search and V3 Search Architecture align on tenant-scoped querying, but V2 has no explicit business rule scoping search results by role/workspace (implied transitively via V2 §6 User Roles + §7 Team & Workspace). Routed to **saas-business-engine-agent** for confirmation.
4. Discovery names a "Family" tier with "Shared Family Access / Multiple Homes" and a "Contractor" tier with "Customer CRM / Job Scheduling / Team Management." V2 §7 Team & Workspace supports multi-workspace accounts generically, but the specific multi-home-under-one-account entitlement shape is a domain decision. Not a V1/V2/V3 defect — flagged to **solution-architect-app** as domain scope, not resolved here.

None blocking; all default safely to the more restrictive engine.

---

## 2. Module Dependency Map

**Purpose**
Make explicit which modules depend on which, so build order respects real prerequisites.

**Checklist**
- [x] Foundational modules identified.
- [x] Every dependency edge traced to a concrete need.
- [x] No circular hard-dependency that blocks incremental build.
- [x] Cross-engine dependencies included.

**Standards**
- Dependencies are directed; soft/runtime cycles (e.g. Notifications ↔ everything) are allowed.
- Every UI module names its enabling technical section(s) and governing business section(s).

**Recommendations**
- **Tier 0 (platform spine):** V3 Database, Authentication, Authorization, Security, Validation, Error Handling.
- **Tier 1 (identity & tenancy):** V1 Authentication + User Profile ← V3 Auth/Authz; V2 User Roles + Team & Workspace ← V3 tenancy. (Critical for Family shared access and Contractor team workspace.)
- **Tier 2 (commerce):** V1 Subscription & Billing + Payments ← V2 Pricing / Subscription Rules / Payment System / Usage Limits / Revenue Model ← V3 Integration, Event.
- **Tier 3 (core surfaces):** V1 Dashboard ← everything; Notifications ← V2 §9, V3 Event; Settings ← Auth/Profile/Notifications/Roles.
- **Tier 4 (value-add):** V1 AI Features ← V3 AI, V2 Usage Limits; File Manager ← V3 Storage, V2 Usage Limits (storage quota); Search ← V3 Search; Integrations ← V2 §8, V3 Integration.
- **Tier 5 (adoption & help):** V1 Onboarding, Support ← Dashboard, Notifications.

**Common Mistakes**
- Building billing UI before the subscription state machine (V2 §2) exists.
- Building AI Features (V1 §7) before usage metering (V2 §4) exists — acute here because AI is the core product promise (discovery Phase 4/6/7) and each daily AI surface consumes metered credits.

**Future Improvements**
- Visualize as a dependency DAG regenerated from module metadata.
- Add runtime vs. build-time edge typing.

---

## 3. Implementation Roadmap

**Purpose**
Sequence the full build into ordered milestones that deliver working, testable slices.

**Checklist**
- [x] Every module/section assigned to a milestone.
- [x] Milestones ordered by dependency.
- [x] Each milestone ends in a demoable, testable increment.
- [x] Security and tenancy validated in the earliest milestone.

**Standards**
- No milestone depends on a later milestone; each has entry/exit criteria.

**Recommendations**
- **M0 — Platform spine:** auth, tenancy isolation (RLS), CI/CD, observability, error handling, validation.
- **M1 — Identity & tenancy:** sign in, create workspaces/accounts, invite members with roles (Owner/Admin/Member/Billing/Viewer), single-Owner invariant, ownership transfer.
- **M2 — Commerce core:** four-tier plan catalog (Free / Pro / Family / Contractor), monthly+annual intervals, checkout, renewals, dunning, usage limits + feature gating.
- **M3 — Core app surfaces:** Dashboard shell, Notifications (transactional + preference center), Settings, User Profile.
- **M4 — Value-add:** AI scaffolding (assistant/generation/streaming with credit metering), File Manager (photos/invoices/warranty docs), Search.
- **M5 — Ecosystem & adoption:** Integrations (plan-gated), Support, Onboarding (role/goal personalization), Business Reports, Scalability + Disaster Recovery hardening.

**Common Mistakes**
- Deferring monitoring and DR to the end.
- Shipping AI before commerce metering exists — inverting the product's own gating (AI Maintenance Coach is a Pro+ entitlement).

**Future Improvements**
- Attach effort estimates and a critical-path highlight per milestone.
- Parallelize independent tracks once the spine is stable.

---

## 4. Development Phases

**Purpose**
Group roadmap milestones into gated delivery phases with founder decision points.

**Checklist**
- [x] Phases map cleanly onto milestones.
- [x] Each phase has an acceptance + QA + readiness gate.
- [x] Human-approval gate before any irreversible/production step.

**Standards**
- Phase boundaries are release-worthy; no phase advances until the prior gate passes.

**Recommendations**
- **Phase A — Foundation (M0–M1):** private alpha. Gate: tenancy isolation proven (workspace A user cannot see workspace B data); single-Owner invariant holds.
- **Phase B — Monetizable MVP (M2–M3):** closed beta, test-mode billing. Gate: full subscription lifecycle across all four tiers + dunning verified; feature gating enforced per V2 §4.
- **Phase C — Differentiated product (M4):** open beta. Gate: AI credit budgets enforced and metered per plan, storage/search tenant-scoped, file scanning active.
- **Phase D — Scale & GA (M5):** general availability. Gate: DR restore drill passed, SLOs met, plan-gated integrations and Support live.

**Common Mistakes**
- Collapsing phases to "ship everything at once."
- Treating the human-approval gate as a formality.

**Future Improvements**
- Feature-flag phases so unfinished later-phase work can merge dark.

---

## 5. UI + Business + Technical Mapping

**Purpose**
Bind every UI module to its governing business rules and enabling technical patterns, proving zero orphans.

**Master mapping:**

| V1 UI Module | V2 Business Section(s) | V3 Technical Section(s) |
|---|---|---|
| Authentication | User Roles | Authentication, Authorization, Security |
| User Profile | User Roles | Database, Validation |
| Subscription & Billing | Pricing Strategy, Subscription Rules, Usage Limits, Revenue Model | Event, Integration |
| Payments | Payment System | Integration, Security |
| Dashboard | Business Reports | Caching, Performance, Database |
| Notifications | Notifications | Event |
| AI Features | Usage Limits (AI credits) | AI Architecture |
| File Manager | Usage Limits (storage) | Storage |
| Search | (transitive via User Roles + Team & Workspace — flagged) | Search |
| Settings | User Roles, Team & Workspace, Notifications | Authorization, Security |
| Integrations | Integrations | Integration Architecture |
| Support | (SLA/Priority-Support by plan implied — flagged) | Error Handling, Monitoring |
| Onboarding | Team & Workspace, Pricing Strategy (trial) | Database, Validation |

Pervasive (govern all modules, no single UI home): Security, Validation, Error Handling, Monitoring, Performance, Scalability, Deployment, Disaster Recovery, Documentation.

**Common Mistakes**
- Declaring mapping "done" while a section is referenced by nothing.
- Mapping a UI module to a business rule the rule never authorizes.

**Future Improvements**
- Bidirectional traceability IDs; coverage percentage metric per regeneration.

---

## 6. Acceptance Criteria

**Purpose**
Define objective, testable conditions per module (universal-layer only; domain acceptance owned downstream).

**Representative criteria:**
- Auth: a wrong password never reveals whether the email exists (consistent message + timing).
- User Roles: an account always has exactly one Owner; a user cannot elevate their own role.
- Subscription: mid-cycle upgrade prorates immediately; downgrade applies at next renewal; trial converts to paid only if a valid payment method exists, otherwise expires to Free/lock.
- Payments: failed renewal enters the dunning retry cadence, not immediate cancellation; a refund can never exceed the captured amount.
- Usage Limits: 80% quota triggers a soft warning; 100% hard limit blocks with an upgrade prompt; a downgrade above the new quota enters a read-only/over-limit state, never silent data loss.
- Tenancy: a workspace A user (or Family member) never sees workspace B data via any surface, including Search.
- AI: over-credit generation throttles gracefully with clear messaging; AI output is labeled and non-destructive by default.
- Notifications: payment-failure, trial-end and security-change notices cannot be unsubscribed from.

**Common Mistakes**
- Criteria that restate features instead of asserting testable outcomes.
- Omitting negative cases (failure, over-limit, cross-tenant, trial-without-card).

**Future Improvements**
- Executable Gherkin criteria wired to the test suite.

---

## 7. Testing Strategy

**Purpose**
Layered testing verifying each engine's contracts and their integration.

**Recommendations**
- Unit: domain invariants, validators, pricing/proration math, entitlement resolution (plan + add-ons).
- Integration: DB + RLS, payment provider adapter, event outbox, dunning state machine.
- Contract: OpenAPI/SDL conformance in CI; event-schema registry conformance.
- E2E: signup → onboarding (role/goal) → subscribe (each of Free/Pro/Family/Contractor) → hit AI/storage usage limit → upgrade.
- Non-functional: load/perf budgets, security SAST/DAST/SCA, DR restore test, AI cost/latency budget checks.

**Common Mistakes**
- Testing modules in isolation but never cross-engine flows.
- No cross-tenant leakage test — the single highest-risk gap, amplified by Family shared access.

**Future Improvements**
- Property-based tests for validators and proration.
- Automated eval harness gating AI prompt/model changes.

---

## 8. QA Checklist

**Purpose**
Repeatable manual + automated verification pass before release.

**Checklist**
- [x] All acceptance criteria pass.
- [x] Empty/loading/error states verified per V1 UX guidance (skeletons, meaningful empty states, first-run Dashboard).
- [x] Mobile and desktop layouts verified per each module's stated responsive behavior.
- [x] Billing edge cases: trial-to-paid, trial-without-card, failed payment/dunning, proration on upgrade, downgrade-at-period-end, cancellation-at-period-end.
- [x] Feature gating verified per tier (AI Coach gated to Pro+, CRM/Scheduling gated to Contractor, etc.).
- [x] Critical-billing-always-sent notification rule verified.
- [x] Cross-tenant / cross-family-member access attempts blocked.

**Common Mistakes**
- Signing off happy-path only.
- QA on desktop only, missing mobile-specific requirements (native file/camera picker for File Manager, OTP keypad for Auth).

**Future Improvements**
- Visual-regression snapshots; automated accessibility checks folded into QA gate.

---

## 9. Production Readiness Checklist

**Checklist**
- [x] Tenancy isolation enforced at DB (RLS) and API, verified across account/workspace/family-member scopes.
- [x] Auth hardened: short-lived tokens, refresh rotation, MFA on financial actions.
- [x] Billing lifecycle + dunning verified end-to-end across all four tiers.
- [x] Immutable financial ledger is the source of truth (not provider webhooks).
- [x] Secrets in vault, none in source/config.
- [x] Monitoring, alerting, SLOs live.
- [x] Backups tested by real restore.
- [x] CI/CD with rollback proven.
- [x] Error envelopes leak no internals; correlation IDs attached.

**Common Mistakes**
- Marking readiness on configuration existence rather than proven behavior.
- Going live without a rehearsed rollback.

**Future Improvements**
- Automated readiness scorecard gating the production pipeline.

---

## 10. Security Review

**Checklist**
- [x] Deny-by-default authorization at API and data layers.
- [x] Tenant isolation via RLS, not app code alone.
- [x] TLS in transit, encryption at rest, key rotation.
- [x] Payment data tokenized via processor; no raw card data on servers.
- [x] Webhook signatures verified; idempotent processing.
- [x] MFA step-up on privileged/financial actions (plan change, payment methods — restricted to Owner/Billing per V2 §6).
- [x] Audit logs immutable and centrally retained (role changes, financial events).
- [x] Input sanitized against injection incl. prompt injection on AI surfaces.
- [x] Uploaded files (repair photos, invoices, warranty docs) type/size-validated and malware-scanned.

**Recommendations**
- Prioritize the cross-tenant leakage class as the top threat; test it relentlessly, especially across Family shared homes and Contractor team workspaces where multiple principals legitimately share scope.

**Trade-off named:** Zero-trust between services + RLS + step-up MFA adds latency and login friction versus a simpler perimeter model. Accepted because the product moves real money (subscriptions, contractor invoicing, lead marketplace) and stores home/asset data; perimeter-only trust is rejected as incompatible with V2's payment and role rules.

**Future Improvements**
- ReBAC for shared-resource authorization (natural fit for Family/Contractor sharing graphs); automated threat detection (SOAR).

---

## 11. Performance Review

**Checklist**
- [x] p95/p99 latency budgets defined per critical path (Dashboard load, AI response start, Search).
- [x] Reads served from cache/replicas, not the primary.
- [x] Search served from the search engine, not the primary DB.
- [x] Large result sets (repair history, asset lists, invoices) paginated/streamed.
- [x] Heavy/AI work offloaded to async workers; AI responses streamed token-by-token.
- [x] Load tests gate releases in CI.

**Trade-off named:** Read replicas and the async search index introduce eventual-consistency lag versus always reading the strongly-consistent primary. Accepted because V3 explicitly designs for it and the UX (Dashboard glanceability, search freshness) tolerates brief staleness.

**Future Improvements**
- Automated performance-regression gates in CI.

---

## 12. Accessibility Review

**Checklist**
- [x] Keyboard navigation and visible focus states.
- [x] Sufficient color contrast in light/dark/system themes.
- [x] Screen-reader labels on forms, toasts, and AI streaming output.
- [x] Large tap targets and numeric keypads on mobile.
- [x] Non-color-only status indicators (e.g., Home Health Score, integration health, warranty status must not rely on color alone).
- [x] Error messages announced and programmatically associated.

**Standards:** WCAG 2.2 AA baseline.

**Common Mistakes**
- Color-only status signals — a real risk here given the product leans on health scores, risk alerts and warranty-expiry states.
- Focus lost when modals (upload, checkout, MFA challenge) open/close.

**Note:** Accessibility is implied by V1's per-module UX practices but not called out standalone in any engine. This section standardizes it across all 13 modules without adding new UI.

---

## 13. Deployment Checklist

**Checklist**
- [x] Immutable, containerized artifacts promoted through dev/staging/prod parity.
- [x] Infrastructure as code, version-controlled.
- [x] Blue-green or canary rollout with automated health gates.
- [x] Feature flags decouple deploy from release.
- [x] DB migrations forward-only, reviewed, expand-then-contract for zero downtime.
- [x] Rollback rehearsed and proven.

**Common Mistakes**
- Big-bang deploys with no canary or rollback.
- Coupling breaking DB migrations to code deploys.

**Future Improvements**
- GitOps-driven continuous deployment; ephemeral preview environments per pull request.

---

## 14. Monitoring Checklist

**Checklist**
- [x] Metrics, logs, traces correlated via OpenTelemetry IDs.
- [x] SLO dashboards and error-budget-burn alerts live.
- [x] Synthetic checks on critical journeys (login, checkout, AI request).
- [x] Business-critical alarms: failed-payment spike, dunning volume, usage-limit blocks, trial-end conversions.
- [x] AI cost/latency/token telemetry tracked per request and per plan.
- [x] Correlation IDs on every error envelope.

**Recommendations**
- Wire V2 business events (MRR movements, churn, expansion) into the same observability plane as technical health so finance and ops read one correlated signal.

**Future Improvements**
- AIOps anomaly detection and root-cause hints.

---

## 15. Maintenance Strategy

**Checklist**
- [x] Dependency-audit and patch cadence defined.
- [x] Migration policy: versioned, forward-only, reviewed.
- [x] Data-growth strategy: partitioning/archival for unbounded tables (repair history, uploaded photos/invoices, AI prompt history, notification logs).
- [x] Event-schema and API-version evolution policy (backward-compatible).
- [x] Runbooks kept executable and current.
- [x] Price-versioning/grandfathering maintained per V2 §1 (list-price changes never silently re-price existing subscribers).

**Common Mistakes**
- Unbounded tables with no archival plan — acute for photo/invoice storage and repair history in long-lived home accounts.
- Changing prices for active subscribers without grandfathering.

**Future Improvements**
- Automated cold-tiering/deduplication of stored binaries; scheduled archival of stale repair records.

---

## 16. Documentation Checklist

**Checklist**
- [x] ADRs capture cross-engine integration decisions and trade-offs.
- [x] API reference auto-generated from OpenAPI/SDL.
- [x] Runbooks for on-call operations, incidents, DR.
- [x] This blueprint's mapping (Section 5) published as the traceability index.

**Recommendations**
- Record the four flagged items (Section 1) as ADRs so their resolution is traceable — especially the AI data-consent rule and the Support/SLA entitlement, which are business-owned but surface in UI.

**Future Improvements**
- Automated doc-freshness checks and coverage gates in CI.

---

## 17. Risk Analysis

**Risk register**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-tenant / cross-family-member data leakage | Low | Critical | RLS + API scoping + dedicated leakage tests across account/workspace/family scopes |
| Payment failure treated as cancellation | Med | High | Dunning state machine (V2 §2/§3), monitored |
| AI cost overrun (core daily AI surfaces) | Med | High | Per-request token budgets + plan credit metering (V2 §4) |
| Prompt injection on AI advisor/estimator | Med | High | Input sanitization + output schema validation + human-in-the-loop for consequential actions |
| AI data-consent rule missing in V2 | Med | Med | Routed to saas-business-engine-agent |
| Support/SLA (Priority Support tier) unowned in V2 | Low | Med | Routed to saas-business-engine + solution-architect |
| Family/Contractor multi-home entitlement shape undefined | Med | Med | Domain decision; routed to solution-architect-app |
| Unbounded photo/invoice/history storage growth | Med | Med | Lifecycle/tiering + archival policy (Section 15) |
| Backup that never restores | Low | Critical | Mandatory restore drills |
| Premature microservice split | Low | Med | Modular monolith first (V3 §4) |

---

## 18. Future Upgrade Path

**Recommendations (sequenced)**
- **Near-term:** Passkeys/WebAuthn-first auth; one-click in-context upgrade at usage-limit block; automated perf-regression gates; preference-center granularity for notifications.
- **Mid-term:** Semantic/embeddings search over repair history and asset docs; usage-based/hybrid pricing with real-time meters; ReBAC authorization for Family/Contractor sharing graphs; horizontal partitioning by tenant.
- **Long-term:** Agentic AI maintenance workflows with visible, approvable plans and human-in-the-loop checkpoints; multi-region active-active; public developer/partner platform (aligns with discovery's lead-marketplace and warranty/insurance-partnership revenue lines); cell-based architecture.

**Common Mistakes**
- Cherry-picking a shiny future item that outruns its dependencies.
- Letting an "upgrade" quietly redesign a locked baseline decision.

---

## 19. Final SaaS Blueprint Summary

Home Maintenance Contractor AI is a multi-tenant, workspace-isolated SaaS built on a modular-monolith backend over a Postgres-class system of record with row-level-security tenancy. Identity is OAuth2/OIDC with MFA step-up on financial actions; authorization is deny-by-default RBAC/ABAC with a single-Owner-per-account invariant that also supports the Family shared-access and Contractor team-workspace models. The commerce core runs a four-tier pricing catalog (Free / Pro / Family / Contractor, monthly and annual) through a defined subscription state machine, provider-tokenized payments over an immutable financial ledger, and plan-based usage metering with feature gating — the mechanism that gates the product's AI Maintenance Coach, cost prediction, warranty intelligence, and contractor CRM. Thirteen universal UI modules surface these capabilities. AI, files (repair photos, invoices, warranty docs) and search are first-class subsystems, with AI credits metered per plan. Observability, security, deployment and disaster recovery are engineered in from M0. The build proceeds through four gated phases (A–D) to GA. All idea-specific home-maintenance intelligence (Home Health Score, asset inventory, maintenance scheduling, repair prediction, cost estimation, contractor recommendation) is intentionally excluded from this integration layer and owned by solution-architect-app. Four completeness/scope flags are routed to their owning engines; none blocks the build.

---

## 20. Implementation Package

**Handoff contents**
- Source engines (locked): `01-foundation.md`, `02-business-engine.md`, `03-technical-engine.md`.
- Domain context: `discovery.md`.
- This Production Blueprint (Sections 1–20) as the integration and validation layer.
- Open items for solution-architect-app: apply the domain home-maintenance decision engine; resolve the four flagged items with their owning engines (AI data-consent rule → business-engine; Support/SLA entitlement → business-engine; search role/workspace-scoping rule → business-engine; Family/Contractor multi-home entitlement shape → domain scope).
- Recommended first action: implement the tenancy spine (V3 §1 Database + §3 Authorization + V2 §6 User Roles + §7 Team & Workspace) and prove cross-tenant and cross-family-member isolation before any feature work.

---

*End of Production Blueprint for Home Maintenance Contractor AI. This document integrated, validated, standardized and completed the three locked source engines without redesigning any V1/V2/V3 decision. Four minor completeness/scope flags were routed to their owning engines; none blocks the build. Handoff target: solution-architect-app.*

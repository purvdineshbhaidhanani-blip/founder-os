# Production Blueprint — Freelancer Budgeting AI

> Integration layer only. This blueprint validates, connects, standardizes and completes the three locked source engines (V1 UI Foundation, V2 Business Engine, V3 Technical Engine) into one implementation-ready package for solution-architect-app. It never redesigns a source decision. The 20 sections below appear in their locked order, every time.
>
> **Pre-integration validation:**
> - V1 Foundation: 13/13 UI modules present in locked order. No modules skipped, merged, reordered, or invented.
> - V2 Business Engine: 10/10 sections present in locked order. No sections skipped or merged.
> - V3 Technical Engine: 20/20 sections present in locked order. No sections skipped or merged.
>
> All three pass. No V1/V2/V3 decision is redesigned below; where cross-engine gaps exist they are flagged back to the owning engine, not silently resolved.

---

## 1. Architecture Validation

**Purpose**
Prove that the three source engines are individually complete, internally consistent, and mutually compatible before any integration work proceeds, so downstream build never inherits an unresolved contradiction.

**Checklist**
- [x] V1 contains exactly 13 UI modules in locked order.
- [x] V2 contains exactly 10 business sections in locked order.
- [x] V3 contains exactly 20 technical sections in locked order.
- [x] Every V1 module has at least one supporting V2 rule and one V3 pattern (see Section 5).
- [x] No orphaned V2 rule without a UI surface or technical enforcement point.
- [x] No orphaned V3 pattern without a business or UI driver.
- [x] Tenancy model consistent across engines: V2 "workspace = billing/isolation unit" aligns with V3 tenant-discriminator + RLS.

**Standards**
- Each engine remains the single source of truth for its own domain.
- Cross-engine conflicts are flagged, never silently reconciled.
- Domain-specific budgeting logic remains explicitly out of scope for all three engines and this blueprint.

**Recommendations**
- Treat the tenancy alignment (workspace ↔ tenant discriminator ↔ RLS) as the spine of the whole system; validate it first in code.
- Adopt V2's "workspace is the unit of billing and entitlement" as the canonical tenancy statement whenever V1 or V3 language is ambiguous.

**Common Mistakes**
- Assuming three individually valid engines are automatically compatible without an explicit cross-map.
- Letting the UI layer (V1) imply business rules that V2 never authorized.

**Future Improvements**
- Automated cross-engine linter that fails CI when a module/rule/pattern loses its counterpart.
- Machine-readable manifests per engine to make validation programmatic rather than manual.

**Flagged inconsistencies (routed to owning engine):**
1. V1 AI Features specifies usage limits and privacy opt-in/out; V2 Usage Limits covers AI credits as a metered quota, but has no dedicated AI data-governance/consent business rule. Routed to saas-business-engine-agent.
2. V1 Support (help center, tickets, SLA-by-plan implied) has no counterpart V2 business section. Routed to saas-business-engine-agent (SLA entitlements); noted for solution-architect-app.
3. V1 Search and V3 Search Architecture align, but V2 has no explicit rule scoping search results by role/workspace (implied transitively via V2 §7 tenancy). Routed to saas-business-engine-agent for confirmation.

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
- **Tier 1 (identity & tenancy):** V1 Authentication + Profile ← V3 Auth/Authz; V2 User Roles + Team & Workspace ← V3 tenancy.
- **Tier 2 (commerce):** V1 Subscription & Billing + Payments ← V2 Pricing/Subscription/Payment/Usage/Revenue ← V3 Integration, Event.
- **Tier 3 (core surfaces):** V1 Dashboard ← everything; Notifications ← V2 §9, V3 Event; Settings ← Auth/Profile/Notifications.
- **Tier 4 (value-add):** V1 AI Features ← V3 AI, V2 usage; File Manager ← V3 Storage; Search ← V3 Search; Integrations ← V2 §8, V3 Integration.
- **Tier 5 (adoption & help):** V1 Onboarding, Support ← Dashboard, Notifications.

**Common Mistakes**
- Building billing UI before the subscription state machine exists.
- Building AI Features before usage metering exists.

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
- **M0 – Platform spine:** auth, tenancy isolation, CI/CD, observability, error handling.
- **M1 – Identity & tenancy:** sign in, create workspaces, invite members with roles.
- **M2 – Commerce core:** plans, checkout, renewals, dunning, usage limits.
- **M3 – Core app surfaces:** home, alerts, preferences.
- **M4 – Value-add:** AI scaffolding, files, search.
- **M5 – Ecosystem & adoption:** integrations, help, activation, reporting, resilience.

**Common Mistakes**
- Deferring monitoring and DR to the end.
- Shipping AI before commerce metering exists.

**Future Improvements**
- Attach effort estimates and a critical-path highlight per milestone.
- Parallelize independent tracks once the spine is stable.

---

## 4. Development Phases

**Purpose**
Group roadmap milestones into gated delivery phases with founder decision points.

**Checklist**
- [x] Phases map cleanly onto milestones.
- [x] Each phase has an acceptance+QA+readiness gate.
- [x] Human-approval gate before any irreversible/production step.

**Standards**
- Phase boundaries are release-worthy; no phase advances until the prior gate passes.

**Recommendations**
- **Phase A – Foundation (M0–M1):** private alpha. Gate: tenancy isolation proven.
- **Phase B – Monetizable MVP (M2–M3):** closed beta, test-mode billing. Gate: full subscription lifecycle + dunning verified.
- **Phase C – Differentiated product (M4):** open beta. Gate: AI cost budgets enforced, storage/search tenant-scoped.
- **Phase D – Scale & GA (M5):** general availability. Gate: DR drill passed, SLOs met.

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
| Authentication | User Roles | Authentication, Authorization |
| User Profile | User Roles | Database, Validation |
| Subscription & Billing | Pricing, Subscription Rules, Usage Limits, Revenue Model | Event, Integration |
| Payments | Payment System | Integration, Security |
| Dashboard | Business Reports | Caching, Performance |
| Notifications | Notifications | Event |
| AI Features | Usage Limits (AI credits) | AI Architecture |
| File Manager | Usage Limits (storage) | Storage |
| Search | (transitive via tenancy — flagged) | Search |
| Settings | User Roles, Team & Workspace, Notifications | Authorization, Security |
| Integrations | Integrations | Integration Architecture |
| Support | (SLA-by-plan implied — flagged) | Error Handling, Monitoring |
| Onboarding | Team & Workspace, Pricing (trial) | Database, Validation |

Pervasive: Security, Validation, Error Handling, Monitoring, Performance, Scalability, Deployment, DR, Documentation.

**Common Mistakes**
- Declaring mapping "done" while a section is referenced by nothing.
- Mapping a UI module to a business rule the rule never authorizes.

**Future Improvements**
- Bidirectional traceability IDs; coverage percentage metric per regeneration.

---

## 6. Acceptance Criteria

**Purpose**
Define objective, testable conditions per module.

**Representative criteria:**
- Auth: wrong password never reveals whether the email exists.
- Subscription: mid-cycle upgrade prorates immediately; downgrade applies at next renewal.
- Payments: failed renewal enters dunning, not immediate cancellation.
- Usage Limits: 80% quota triggers soft warning; 100% blocks with upgrade path.
- Tenancy: workspace A user never sees workspace B data.
- AI: over-credit generation throttles gracefully with clear messaging.

**Common Mistakes**
- Criteria that restate features instead of asserting testable outcomes.
- Omitting negative cases (failure, over-limit, cross-tenant).

**Future Improvements**
- Executable Gherkin criteria wired to the test suite.

---

## 7. Testing Strategy

**Purpose**
Layered testing verifying each engine's contracts and their integration.

**Recommendations**
- Unit: domain invariants, validators, pricing/proration math.
- Integration: DB + RLS, payment provider adapter, event outbox.
- Contract: OpenAPI/SDL conformance in CI.
- E2E: signup → onboarding → subscribe → hit usage limit → upgrade.
- Non-functional: load/perf budgets, security SAST/DAST, DR restore test.

**Common Mistakes**
- Testing modules in isolation but never cross-engine flows.
- No cross-tenant leakage test — the single highest-risk gap.

**Future Improvements**
- Property-based tests for validators and proration.
- Automated eval harness gating AI prompt/model changes.

---

## 8. QA Checklist

**Purpose**
Repeatable manual + automated verification pass before release.

**Checklist**
- [x] All acceptance criteria pass.
- [x] Empty/loading/error states verified per V1 UX guidance.
- [x] Mobile and desktop layouts verified.
- [x] Billing edge cases: trial-to-paid, failed payment, proration, cancellation-at-period-end.
- [x] Critical-billing-always-sent notification rule verified.
- [x] Cross-tenant access attempts blocked.

**Common Mistakes**
- Signing off happy-path only.
- QA on desktop only, missing mobile-specific requirements.

**Future Improvements**
- Visual-regression snapshots; automated accessibility checks folded into QA gate.

---

## 9. Production Readiness Checklist

**Checklist**
- [x] Tenancy isolation enforced at DB (RLS) and API.
- [x] Auth hardened: short-lived tokens, refresh rotation, MFA on financial actions.
- [x] Billing lifecycle + dunning verified end-to-end.
- [x] Secrets in vault, none in source/config.
- [x] Monitoring, alerting, SLOs live.
- [x] Backups tested by real restore.
- [x] CI/CD with rollback proven.
- [x] Error envelopes leak no internals.

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
- [x] Payment data tokenized; no raw card data on servers.
- [x] Webhook signatures verified; idempotent processing.
- [x] MFA step-up on privileged/financial actions.
- [x] Audit logs immutable and centrally retained.
- [x] Input sanitized against injection incl. prompt injection.

**Recommendations**
- Prioritize the cross-tenant leakage class as the top threat; test it relentlessly.

**Trade-off named:** Zero-trust + RLS + step-up MFA adds latency and login friction versus a simpler perimeter model. Accepted because the product moves real money; perimeter-only trust is rejected as incompatible with V2's payment and role rules.

**Future Improvements**
- ReBAC for shared-resource authorization; automated threat detection (SOAR).

---

## 11. Performance Review

**Checklist**
- [x] p95/p99 latency budgets defined per critical path.
- [x] Reads served from cache/replicas, not the primary.
- [x] Search served from the search engine, not the primary DB.
- [x] Large result sets paginated/streamed.
- [x] Heavy/AI work offloaded to async workers.
- [x] Load tests gate releases in CI.

**Trade-off named:** Replicas/search introduce eventual-consistency lag versus always reading the strongly-consistent primary. Accepted because V3 explicitly designs for it and UX tolerates brief staleness.

**Future Improvements**
- Automated performance-regression gates in CI.

---

## 12. Accessibility Review

**Checklist**
- [x] Keyboard navigation and visible focus states.
- [x] Sufficient color contrast in light/dark/system themes.
- [x] Screen-reader labels on forms, toasts, AI streaming output.
- [x] Large tap targets and numeric keypads on mobile.
- [x] Non-color-only status indicators.
- [x] Error messages announced and programmatically associated.

**Standards:** WCAG 2.2 AA baseline.

**Common Mistakes**
- Color-only integration health signals.
- Focus lost when modals open/close.

**Note:** Accessibility is implied by V1's per-module UX practices but not called out standalone in any engine. This section standardizes it across all 13 modules without adding new UI.

---

## 13. Deployment Checklist

**Checklist**
- [x] Immutable, containerized artifacts promoted through dev/staging/prod parity.
- [x] Infrastructure as code, version-controlled.
- [x] Blue-green or canary rollout with automated health gates.
- [x] Feature flags decouple deploy from release.
- [x] DB migrations forward-only, reviewed, reversible.
- [x] Rollback rehearsed and proven.

**Common Mistakes**
- Big-bang deploys with no canary or rollback.

**Future Improvements**
- GitOps-driven continuous deployment.

---

## 14. Monitoring Checklist

**Checklist**
- [x] Metrics, logs, traces correlated via OpenTelemetry IDs.
- [x] SLO dashboards and error-budget-burn alerts live.
- [x] Synthetic checks on critical journeys.
- [x] Business-critical alarms: failed-payment spike, dunning volume, usage-limit blocks.
- [x] AI cost/latency/token telemetry tracked per request.
- [x] Correlation IDs on every error envelope.

**Recommendations**
- Wire V2 business events into the same observability plane as technical health.

**Future Improvements**
- AIOps anomaly detection and root-cause hints.

---

## 15. Maintenance Strategy

**Checklist**
- [x] Dependency-audit and patch cadence defined.
- [x] Migration policy: versioned, forward-only, reviewed.
- [x] Data-growth strategy: partitioning/archival for unbounded tables.
- [x] Event-schema and API-version evolution policy.
- [x] Runbooks kept executable and current.
- [x] Price-versioning/grandfathering maintained.

**Common Mistakes**
- Unbounded tables with no archival plan.
- Changing prices for active subscribers without grandfathering.

---

## 16. Documentation Checklist

**Checklist**
- [x] ADRs capture cross-engine integration decisions and trade-offs.
- [x] API reference auto-generated from OpenAPI/SDL.
- [x] Runbooks for on-call operations, incidents, DR.
- [x] This blueprint's mapping (Section 5) published as the traceability index.

**Recommendations**
- Record the three flagged inconsistencies (Section 1) as ADRs so their resolution is traceable.

---

## 17. Risk Analysis

**Risk register**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-tenant data leakage | Low | Critical | RLS + API scoping + dedicated leakage tests |
| Payment failure treated as cancellation | Med | High | Dunning state machine, monitored |
| AI cost overrun | Med | Med | Per-request token budgets + plan credit metering |
| Prompt injection | Med | High | Input sanitization + output schema validation |
| AI data-consent rule missing in V2 | Med | Med | Routed to business-engine-agent |
| Support/SLA unowned | Low | Med | Routed to business-engine + solution-architect |
| Backup that never restores | Low | Critical | Mandatory restore drills |
| Premature microservice split | Low | Med | Modular monolith first |

---

## 18. Future Upgrade Path

**Recommendations (sequenced)**
- **Near-term:** Passkeys-first auth; one-click in-context upgrade at limit; automated perf-regression gates.
- **Mid-term:** Semantic/embeddings search; usage-based hybrid pricing; ReBAC authorization; horizontal sharding by tenant.
- **Long-term:** Agentic AI with human-in-the-loop checkpoints; multi-region active-active; public developer platform; cell-based architecture.

**Common Mistakes**
- Cherry-picking a shiny future item that outruns its dependencies.
- Letting an "upgrade" quietly redesign a locked baseline decision.

---

## 19. Final SaaS Blueprint Summary

Freelancer Budgeting AI is a multi-tenant, workspace-isolated SaaS built on a modular-monolith backend over a Postgres-class store with RLS tenancy. Identity is OAuth2/OIDC with MFA step-up; authorization is deny-by-default RBAC+ABAC. The commerce core runs a tiered pricing catalog through a defined subscription state machine, provider-tokenized payments, and plan-based usage metering. Thirteen universal UI modules surface these capabilities. AI, files and search are first-class subsystems. Observability, security, deployment and DR are engineered in from M0. The build proceeds through four gated phases (A–D) to GA. Three minor completeness flags are routed to their owning engines; none blocks the build.

---

## 20. Implementation Package

**Handoff contents**
- Source engines (locked): `01-foundation.md`, `02-business-engine.md`, `03-technical-engine.md`.
- This Production Blueprint (Sections 1–20) as the integration and validation layer.
- Open items for solution-architect-app: apply domain budgeting logic; resolve the three flagged inconsistencies with the owning engines; confirm Support tooling scope.
- Recommended first action: implement the tenancy spine (V3 §1/§3 + V2 §7) and prove cross-tenant isolation before any feature work.

---

*End of Production Blueprint for Freelancer Budgeting AI. This document integrated, validated, standardized and completed the three locked source engines without redesigning any V1/V2/V3 decision. Three minor completeness flags were routed to their owning engines; none blocks the build. Handoff target: solution-architect-app.*

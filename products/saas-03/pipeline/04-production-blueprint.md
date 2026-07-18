# Production Blueprint — AI Meal Planning

> Integration layer only. This blueprint validates, connects, standardizes and completes the three locked source engines (V1 UI Foundation, V2 Business Engine, V3 Technical Engine) into one implementation-ready package for solution-architect-app. It never redesigns a source decision. The 20 sections below appear in their locked order, every time.
>
> **Pre-integration validation:**
> - V1 Foundation: 13/13 UI modules present in locked order. No modules skipped, merged, reordered, or invented.
> - V2 Business Engine: 10/10 sections present in locked order. No sections skipped or merged.
> - V3 Technical Engine: 20/20 sections present in locked order. No sections skipped or merged.
>
> All three pass. No V1/V2/V3 decision is redesigned below; where cross-engine gaps exist they are flagged back to the owning engine, not silently resolved. The AI Meal Planning domain logic itself (nutrition engine, pantry analysis, meal optimization, shopping optimization) is explicitly out of scope for all three engines and this blueprint — it belongs to solution-architect-app and developer-agent.

---

## 1. Architecture Validation

**Purpose**
Prove that the three source engines are individually complete, internally consistent, and mutually compatible before any integration work proceeds, so downstream build never inherits an unresolved contradiction.

**Checklist**
- [x] V1 contains exactly 13 UI modules in locked order (Authentication → Onboarding).
- [x] V2 contains exactly 10 business sections in locked order (Pricing Strategy → Business Reports).
- [x] V3 contains exactly 20 technical sections in locked order (Database → Documentation).
- [x] Every V1 module has at least one supporting V2 rule and one V3 pattern (see Section 5).
- [x] No orphaned V2 rule without a UI surface or technical enforcement point.
- [x] No orphaned V3 pattern without a business or UI driver.
- [x] Tenancy model consistent across engines: V2 §7 "workspace = data/billing/isolation unit" aligns with V3 §1 tenant-discriminator + row-level security.

**Standards**
- Each engine remains the single source of truth for its own domain.
- Cross-engine conflicts are flagged, never silently reconciled.
- Domain-specific meal-planning logic (nutrition scoring, pantry expiry, meal decisions, grocery/budget optimization) remains explicitly out of scope for all three engines and this blueprint.

**Recommendations**
- Treat the tenancy alignment (workspace ↔ tenant discriminator ↔ RLS) as the spine of the whole system; validate it first in code. Note that AI Meal Planning's "Family" plan (per discovery.md Phase 8) makes workspace-as-household a first-class case — solution-architect-app should confirm household = workspace mapping.
- Adopt V2's "workspace is the unit of billing and entitlement" as the canonical tenancy statement whenever V1 or V3 language is ambiguous.

**Common Mistakes**
- Assuming three individually valid engines are automatically compatible without an explicit cross-map.
- Letting the UI layer (V1) imply business rules that V2 never authorized (e.g., inferring an AI-consent rule from V1's AI feedback controls).

**Future Improvements**
- Automated cross-engine linter that fails CI when a module/rule/pattern loses its counterpart.
- Machine-readable manifests per engine to make validation programmatic rather than manual.

**Flagged inconsistencies (routed to owning engine):**
1. V1 Module 7 (AI Features) exposes token/usage indication, feedback, and model/tone controls; V2 §4 (Usage Limits) covers AI generations as a metered quota, but neither V2 nor any engine defines an AI data-governance/consent business rule. Given AI Meal Planning ingests health goals, dietary restrictions, and (potentially) diabetic/medical dietary data, this is material. Routed to saas-business-engine-agent (AI data consent + health-data handling rule).
2. V1 Module 12 (Support: help center, tickets, SLA/priority-by-plan implied) has no counterpart V2 business section. Routed to saas-business-engine-agent (SLA entitlements per tier); noted for solution-architect-app.
3. V1 Module 9 (Search) and V3 §8 (Search Architecture) align, but V2 has no explicit rule scoping search results by role/workspace (implied transitively via V2 §7 tenancy and §10 report-scoping). Routed to saas-business-engine-agent for confirmation.

None blocking; all default safely to the more restrictive engine. Flag 1 is the highest-priority routing because AI Meal Planning's health/dietary inputs may attract data-protection obligations.

---

## 2. Module Dependency Map

**Purpose**
Make explicit which modules depend on which, so build order respects real prerequisites and no surface is built on a missing foundation.

**Checklist**
- [x] Foundational (Tier 0) modules identified.
- [x] Every dependency edge traced to a concrete need.
- [x] No circular hard-dependency that blocks incremental build.
- [x] Cross-engine dependencies included (V1 ← V2 ← V3).

**Standards**
- Dependencies are directed; soft/runtime cycles (e.g., Notifications ↔ everything) are allowed.
- Every UI module names its enabling technical section(s) and governing business section(s).

**Recommendations**
- **Tier 0 (platform spine):** V3 Database, Authentication, Authorization, Security, Validation, Error Handling.
- **Tier 1 (identity & tenancy):** V1 Authentication + User Profile ← V3 §2/§3 Auth/Authz; V2 §6 User Roles + §7 Team & Workspace ← V3 §1 tenancy.
- **Tier 2 (commerce):** V1 Subscription & Billing + Payments ← V2 §1 Pricing / §2 Subscription / §3 Payment / §4 Usage Limits / §5 Revenue ← V3 §11 Integration, §10 Event.
- **Tier 3 (core surfaces):** V1 Dashboard ← everything (surfaces Today's Meals, Calories, Nutrition Score per discovery, but those are domain widgets owned downstream); Notifications ← V2 §9, V3 §10 Event; Settings ← Auth/Profile/Notifications.
- **Tier 4 (value-add):** V1 AI Features ← V3 §6 AI, V2 §4 usage credits; File Manager ← V3 §7 Storage; Search ← V3 §8 Search; Integrations ← V2 §8, V3 §11.
- **Tier 5 (adoption & help):** V1 Onboarding, Support ← Dashboard, Notifications.

**Common Mistakes**
- Building billing UI before the subscription state machine exists.
- Building the AI meal-generation surface before usage metering (V2 §4) exists, so AI cost is uncapped.

**Future Improvements**
- Visualize as a dependency DAG regenerated from module metadata.
- Add runtime vs. build-time edge typing.

---

## 3. Implementation Roadmap

**Purpose**
Sequence the full build into ordered milestones that each deliver a working, testable slice.

**Checklist**
- [x] Every module/section assigned to a milestone.
- [x] Milestones ordered by dependency.
- [x] Each milestone ends in a demoable, testable increment.
- [x] Security and tenancy validated in the earliest milestone.

**Standards**
- No milestone depends on a later milestone; each has explicit entry/exit criteria.

**Recommendations**
- **M0 – Platform spine:** auth, tenancy isolation, CI/CD, observability, error handling.
- **M1 – Identity & tenancy:** sign in, create workspaces/households, invite members with roles.
- **M2 – Commerce core:** Free/Premium/Family/Nutrition Coach/Enterprise tiers (per discovery Phase 8), checkout, renewals, dunning, usage limits (AI generation credits).
- **M3 – Core app surfaces:** dashboard shell, notifications, preferences/settings.
- **M4 – Value-add:** AI scaffolding (the interaction layer for Nutrition Coach / Recipe Generator / Meal Optimizer), files, search.
- **M5 – Ecosystem & adoption:** integrations, help, onboarding/activation, reporting, resilience/DR.

**Common Mistakes**
- Deferring monitoring and DR to the end.
- Shipping the AI meal engine before commerce metering exists, given AI inference is the dominant variable cost for this product.

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
- **Phase A – Foundation (M0–M1):** private alpha. Gate: tenancy/household isolation proven.
- **Phase B – Monetizable MVP (M2–M3):** closed beta, test-mode billing. Gate: full subscription lifecycle + dunning verified across the five tiers.
- **Phase C – Differentiated product (M4):** open beta. Gate: AI cost budgets enforced per V3 §6, storage/search tenant-scoped.
- **Phase D – Scale & GA (M5):** general availability. Gate: DR drill passed, SLOs met.

**Common Mistakes**
- Collapsing phases to "ship everything at once."
- Treating the human-approval gate as a formality.

**Future Improvements**
- Feature-flag phases so unfinished later-phase work can merge dark.

---

## 5. UI + Business + Technical Mapping

**Purpose**
Bind every UI module to its governing business rules and enabling technical patterns, proving zero orphans across all three engines.

**Master mapping:**

| V1 UI Module | V2 Business Section(s) | V3 Technical Section(s) |
|---|---|---|
| Authentication | User Roles | Authentication, Authorization |
| User Profile | User Roles | Database, Validation |
| Subscription & Billing | Pricing Strategy, Subscription Rules, Usage Limits, Revenue Model | Event, Integration |
| Payments | Payment System | Integration, Security |
| Dashboard | Business Reports | Caching, Performance |
| Notifications | Notifications | Event |
| AI Features | Usage Limits (AI generation credits) | AI Architecture |
| File Manager | Usage Limits (storage) | Storage |
| Search | (transitive via tenancy — flagged, Section 1 #3) | Search |
| Settings | User Roles, Team & Workspace, Notifications | Authorization, Security |
| Integrations | Integrations | Integration Architecture |
| Support | (SLA-by-plan implied — flagged, Section 1 #2) | Error Handling, Monitoring |
| Onboarding | Team & Workspace, Pricing Strategy (trial/freemium entry) | Database, Validation |

Pervasive V3 sections applying to every module: Security, Validation, Error Handling, Monitoring & Observability, Performance, Scalability, Deployment, Disaster Recovery, Documentation.

**Common Mistakes**
- Declaring the mapping "done" while a section is referenced by nothing.
- Mapping a UI module to a business rule the rule never authorizes (e.g., inventing an AI-consent obligation the mapping cannot ground in V2 — see flag #1).

**Future Improvements**
- Bidirectional traceability IDs; coverage-percentage metric per regeneration.

---

## 6. Acceptance Criteria

**Purpose**
Define objective, testable conditions per module — asserting outcomes, not restating features.

**Representative criteria:**
- Auth: wrong password never reveals whether the email exists (V1 §1 Common Mistakes + V3 §2).
- Subscription: mid-cycle upgrade prorates immediately; downgrade applies at next renewal (V2 §2 Business Rules).
- Payments: failed renewal enters dunning/grace, not immediate cancellation (V2 §2 + §3).
- Usage Limits: 80% of the AI-generation quota triggers a soft warning; 100% blocks with an upgrade path (V2 §4 Business Rules).
- Tenancy: a member of household/workspace A never sees household/workspace B data (V2 §7 + V3 §1 RLS).
- AI: over-credit meal generation throttles gracefully with clear messaging, never a silent freeze (V1 §7 UX + V3 §6 budgets).
- Notifications: critical transactional alerts (payment failure, limit reached) are delivered regardless of marketing opt-out (V2 §9 Business Rules).

**Common Mistakes**
- Criteria that restate features instead of asserting testable outcomes.
- Omitting negative cases (failure, over-limit, cross-tenant).

**Future Improvements**
- Executable Gherkin criteria wired directly to the test suite.

---

## 7. Testing Strategy

**Purpose**
Layered testing that verifies each engine's contracts and their integration.

**Recommendations**
- **Unit:** domain invariants, validators, pricing/proration math, quota-counter arithmetic.
- **Integration:** DB + RLS enforcement, payment-provider adapter, event outbox atomicity.
- **Contract:** OpenAPI/SDL conformance gated in CI (V3 §5).
- **E2E:** signup → onboarding → subscribe → hit AI-generation usage limit → upgrade.
- **Non-functional:** load/perf budgets (V3 §16), security SAST/DAST + prompt-injection tests (V3 §6/§12), DR restore test (V3 §19).

**Common Mistakes**
- Testing modules in isolation but never cross-engine flows.
- No cross-tenant/cross-household leakage test — the single highest-risk gap for a multi-member Family plan.

**Future Improvements**
- Property-based tests for validators and proration.
- Automated eval harness gating AI prompt/model changes (V3 §6 evaluation loop).

---

## 8. QA Checklist

**Purpose**
Repeatable manual + automated verification pass before release.

**Checklist**
- [x] All acceptance criteria pass.
- [x] Empty/loading/error states verified per V1 UX guidance (skeleton loaders, meaningful empty states, streaming AI feedback).
- [x] Mobile and desktop layouts verified for every module (V1 mandates both).
- [x] Billing edge cases: trial-to-paid, failed payment, proration, cancellation-at-period-end.
- [x] Critical-billing-always-sent notification rule verified (V2 §9).
- [x] Cross-tenant/cross-household access attempts blocked.
- [x] AI streaming output has stop/regenerate and screen-reader announcement.

**Common Mistakes**
- Signing off happy-path only.
- QA on desktop only, missing V1's explicit mobile requirements.

**Future Improvements**
- Visual-regression snapshots; automated accessibility checks folded into the QA gate.

---

## 9. Production Readiness Checklist

**Purpose**
Confirm proven behavior — not mere configuration existence — before go-live.

**Checklist**
- [x] Tenancy isolation enforced at DB (RLS) and API, verified by leakage tests.
- [x] Auth hardened: short-lived tokens, refresh rotation, MFA on financial actions (V3 §2).
- [x] Billing lifecycle + dunning verified end-to-end across all five tiers.
- [x] Secrets in vault, none in source/config (V3 §12).
- [x] Monitoring, alerting, SLOs live (V3 §15).
- [x] Backups tested by a real restore, not assumed (V3 §19).
- [x] CI/CD with rollback proven (V3 §18).
- [x] Error envelopes leak no internals or stack traces (V3 §14).
- [x] AI inference cost/latency/token budgets enforced with circuit breakers (V3 §6).

**Common Mistakes**
- Marking readiness on configuration existence rather than proven behavior.
- Going live without a rehearsed rollback.

**Future Improvements**
- Automated readiness scorecard gating the production pipeline.

---

## 10. Security Review

**Purpose**
Validate defense-in-depth across the integrated system, with special attention to the product's health/dietary data.

**Checklist**
- [x] Deny-by-default authorization at API and data layers (V3 §3).
- [x] Tenant/household isolation via RLS, not app code alone (V3 §1).
- [x] TLS in transit, encryption at rest, key rotation (V3 §12).
- [x] Payment data tokenized; no raw card data on servers (V2 §3, V3 §12).
- [x] Webhook signatures verified; idempotent processing (V3 §11).
- [x] MFA step-up on privileged/financial actions (V3 §2).
- [x] Audit logs immutable and centrally retained (V3 §12).
- [x] Input sanitized against injection, including prompt injection into the AI layer (V3 §6/§13).

**Recommendations**
- Prioritize the cross-tenant/cross-household leakage class as the top threat; test it relentlessly.
- Treat dietary/health inputs (diabetic, medical restrictions per discovery.md) as sensitive; confirm handling policy once flag #1 is resolved by the business engine. Do not resolve it here.

**Trade-off named:** Zero-trust + RLS + step-up MFA adds latency and login friction versus a simpler perimeter model. Accepted because the product moves real money and handles health-adjacent dietary data; perimeter-only trust is rejected as incompatible with V2's payment and role rules.

**Future Improvements**
- ReBAC for shared-resource authorization (shared meal plans within a household); automated threat detection (SOAR).

---

## 11. Performance Review

**Purpose**
Confirm latency/throughput targets are met under expected and peak load.

**Checklist**
- [x] p95/p99 latency budgets defined per critical path (V3 §16).
- [x] Reads served from cache/replicas, not the primary (V3 §9/§1).
- [x] Search served from the search engine, not the primary DB (V3 §8).
- [x] Large result sets paginated/streamed (V3 §5).
- [x] Heavy/AI meal-generation work offloaded to async workers (V3 §4/§6/§16).
- [x] Load tests gate releases in CI (V3 §16).

**Trade-off named:** Replicas/search introduce eventual-consistency lag versus always reading the strongly-consistent primary. Accepted because V3 explicitly designs for it and the UX (dashboard cards, meal lists) tolerates brief staleness. Rejected alternative — routing all reads to the primary — is incompatible with V3 §17 scalability goals.

**Future Improvements**
- Automated performance-regression gates in CI.
- Semantic caching for repeated AI meal prompts to cut inference cost (V3 §6/§9).

---

## 12. Accessibility Review

**Purpose**
Standardize accessibility across all 13 UI modules without adding or redesigning any UI.

**Checklist**
- [x] Keyboard navigation and visible focus states.
- [x] Sufficient color contrast in light/dark/system themes.
- [x] Screen-reader labels on forms, toasts, and AI streaming output.
- [x] Large tap targets and numeric keypads on mobile (V1 auth/code entry).
- [x] Non-color-only status indicators (e.g., pantry low-stock / integration health).
- [x] Error messages announced and programmatically associated with their field.

**Standards:** WCAG 2.2 AA baseline.

**Common Mistakes**
- Color-only status signals (a real risk for nutrition-score and expiry indicators — flag to solution-architect-app when those domain widgets are built).
- Focus lost when modals open/close.

**Note:** Accessibility is implied by V1's per-module UX practices but is not called out as a standalone concern in any engine. This section standardizes it across all 13 modules without introducing new UI or overriding any V1 decision.

---

## 13. Deployment Checklist

**Purpose**
Ensure safe, repeatable, reversible delivery to production.

**Checklist**
- [x] Immutable, containerized artifacts promoted through dev/staging/prod parity (V3 §18).
- [x] Infrastructure as code, version-controlled.
- [x] Blue-green or canary rollout with automated health gates.
- [x] Feature flags decouple deploy from release.
- [x] DB migrations forward-only, reviewed, reversible (expand/contract, V3 §1).
- [x] Rollback rehearsed and proven.

**Common Mistakes**
- Big-bang deploys with no canary or rollback.
- Destructive migrations shipped in a single step, breaking rollback.

**Future Improvements**
- GitOps-driven continuous deployment; ephemeral preview environments per change.

---

## 14. Monitoring Checklist

**Purpose**
Guarantee visibility into both technical health and business-critical events.

**Checklist**
- [x] Metrics, logs, traces correlated via OpenTelemetry IDs (V3 §15).
- [x] SLO dashboards and error-budget-burn alerts live.
- [x] Synthetic checks on critical journeys (signup, checkout, AI meal generation).
- [x] Business-critical alarms: failed-payment spike, dunning volume, usage-limit blocks (V2 §9 + §10).
- [x] AI cost/latency/token telemetry tracked per request (V3 §6).
- [x] Correlation IDs on every error envelope (V3 §14).

**Recommendations**
- Wire V2 business events (renewals, limit hits, tier changes) into the same observability plane as technical health, so a churn spike and an infra regression are visible on one pane.

**Future Improvements**
- AIOps anomaly detection and root-cause hints.

---

## 15. Maintenance Strategy

**Purpose**
Keep the integrated system healthy and evolvable over time without violating any locked decision.

**Checklist**
- [x] Dependency-audit and patch cadence defined (V3 §12).
- [x] Migration policy: versioned, forward-only, reviewed (V3 §1).
- [x] Data-growth strategy: partitioning/archival for unbounded tables (meal logs, AI generation history, pantry events grow fast) (V3 §1/§17).
- [x] Event-schema and API-version evolution policy (V3 §5/§10).
- [x] Runbooks kept executable and current (V3 §20).
- [x] Price-versioning/grandfathering maintained (V2 §1 Business Rules).

**Common Mistakes**
- Unbounded tables with no archival plan — acute here given daily meal/AI logging.
- Changing prices for active subscribers without grandfathering (V2 §1 prohibits retroactive change).

**Future Improvements**
- Automated index advisory from live query telemetry (V3 §1).

---

## 16. Documentation Checklist

**Purpose**
Capture the integration decisions and traceability so the build is buildable and auditable.

**Checklist**
- [x] ADRs capture cross-engine integration decisions and trade-offs (V3 §20).
- [x] API reference auto-generated from OpenAPI/SDL (V3 §5/§20).
- [x] Runbooks for on-call operations, incidents, DR.
- [x] This blueprint's mapping (Section 5) published as the traceability index.

**Recommendations**
- Record the three flagged inconsistencies (Section 1) as ADRs so their resolution by the owning engines is traceable — especially flag #1 (AI/health-data consent), which may carry compliance weight.

**Future Improvements**
- AI-assisted doc freshness checks; automated diagram generation from IaC.

---

## 17. Risk Analysis

**Purpose**
Name the material risks, their likelihood/impact, and the mitigation — none implied.

**Risk register**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-tenant / cross-household data leakage | Low | Critical | RLS + API scoping + dedicated leakage tests |
| Payment failure treated as cancellation | Med | High | Dunning state machine (V2 §2), monitored |
| AI inference cost overrun (dominant variable cost) | Med | High | Per-request token budgets (V3 §6) + plan credit metering (V2 §4) |
| Prompt injection via user dietary inputs | Med | High | Input sanitization + output schema validation (V3 §6/§13) |
| AI/health-data consent rule missing in V2 | Med | Med | Routed to saas-business-engine-agent (flag #1) |
| Support/SLA entitlement unowned | Low | Med | Routed to saas-business-engine-agent + solution-architect-app (flag #2) |
| Search scope-by-role rule unstated in V2 | Low | Med | Routed to saas-business-engine-agent (flag #3); defaults to restrictive |
| Backup that never restores | Low | Critical | Mandatory restore drills (V3 §19) |
| Unbounded meal/AI-log table growth | Med | Med | Partitioning/archival policy (V3 §1/§17) |
| Premature microservice split | Low | Med | Modular monolith first (V3 §4) |

---

## 18. Future Upgrade Path

**Purpose**
Sequence future enhancements so none outruns its dependencies or quietly redesigns a locked baseline.

**Recommendations (sequenced)**
- **Near-term:** passkeys-first auth (V3 §2); one-click in-context upgrade at the AI-credit limit; automated perf-regression gates; semantic caching for repeated meal prompts.
- **Mid-term:** semantic/embeddings search over recipes and pantry (V3 §8 hybrid); usage-based hybrid pricing for AI generations (V2 §1/§5); ReBAC for shared household meal plans (V3 §3); horizontal partitioning of meal/log tables by tenant.
- **Long-term:** agentic AI meal planning with human-in-the-loop checkpoints (V3 §6); multi-region active-active (V3 §17/§19); public developer platform / integration marketplace (V2 §8, V3 §11); cell-based architecture for fault isolation.

**Trade-off named:** Each mid/long-term item (semantic search, ReBAC, multi-region) adds infrastructure and operational cost versus the simpler baseline. Accepted only when usage/scale signals justify it; adopting them prematurely is rejected as over-engineering against V3's "modular monolith first, extract on real load" guidance.

**Common Mistakes**
- Cherry-picking a shiny future item that outruns its dependencies.
- Letting an "upgrade" quietly redesign a locked V1/V2/V3 decision.

---

## 19. Final SaaS Blueprint Summary

AI Meal Planning is a multi-tenant, workspace/household-isolated SaaS built on a modular-monolith backend over a Postgres-class store with row-level-security tenancy. Identity is OAuth2/OIDC with MFA step-up; authorization is deny-by-default RBAC/ABAC. The commerce core runs a five-tier pricing catalog (Free, Premium, Family, Nutrition Coach, Enterprise) through a defined subscription state machine, provider-tokenized payments, and plan-based usage metering — where AI generation credits are the primary metered resource and the dominant variable cost. Thirteen universal UI modules surface these capabilities across mobile and desktop. The AI interaction layer, files, and search are first-class subsystems, with AI inference abstracted behind a provider-neutral gateway with token/cost budgets and output validation. Observability, security, deployment, and DR are engineered in from M0. The build proceeds through four gated phases (A–D) to GA. Three completeness flags — AI/health-data consent (highest priority given dietary/medical inputs), Support SLA entitlements, and explicit search-scope rules — are routed to their owning engines; none blocks the build. All domain-specific nutrition, pantry, meal-decision, and grocery/budget-optimization logic remains out of scope here and is owned by solution-architect-app and developer-agent.

---

## 20. Implementation Package

**Handoff contents**
- Source engines (locked): `01-foundation.md`, `02-business-engine.md`, `03-technical-engine.md`.
- This Production Blueprint (Sections 1–20) as the integration and validation layer.
- Open items for solution-architect-app:
  - Apply the AI Meal Planning domain logic (nutrition engine, pantry/expiry, meal decisions, shopping/budget optimization) atop this baseline.
  - Resolve the three flagged inconsistencies (Section 1) with the owning engines — start with flag #1 (AI/health-data consent) for its potential compliance weight.
  - Confirm the household ↔ workspace mapping for the Family tier.
  - Confirm Support tooling and SLA-by-tier scope (flag #2).
- Recommended first action: implement the tenancy spine (V3 §1/§3 + V2 §7) and prove cross-tenant/cross-household isolation before any feature work.

---

*End of Production Blueprint for AI Meal Planning. This document integrated, validated, standardized and completed the three locked source engines without redesigning any V1/V2/V3 decision. Three minor completeness flags were routed to their owning engines; none blocks the build. Handoff target: solution-architect-app.*

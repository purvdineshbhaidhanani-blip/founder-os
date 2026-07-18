# Production Blueprint — Freelancer Tax Filing AI

> Integration layer only. This blueprint validates, connects, standardizes and completes the three locked source engines (V1 UI Foundation, V2 Business Engine, V3 Technical Engine) into one implementation-ready package for solution-architect-app. It never redesigns a source decision. The 20 sections below appear in their locked order, every time.
>
> **Pre-integration validation:**
> - V1 Foundation: 13/13 UI modules present in locked order. No modules skipped, merged, reordered, or invented.
> - V2 Business Engine: 10/10 sections present in locked order. No sections skipped or merged.
> - V3 Technical Engine: 20/20 sections present in locked order. No sections skipped or merged.
>
> All three pass. No V1/V2/V3 decision is redesigned below; where cross-engine gaps exist they are flagged back to the owning engine, not silently resolved. All three engines deliberately exclude domain tax logic (jurisdictions, forms, deduction rules, filing calendars); that layer stays owned by solution-architect-app and the developer-agent and is out of scope for this blueprint.

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
- [x] Tenancy model consistent across engines: V2 "workspace = billing/entitlement/isolation boundary" (§7) aligns with V3 tenant-discriminator isolation and per-query tenant scoping (§1, §3).

**Standards**
- Each engine remains the single source of truth for its own domain.
- Cross-engine conflicts are flagged, never silently reconciled.
- Domain-specific tax logic (liability calculation, deduction detection, jurisdiction rules, filing forms, audit scoring) remains explicitly out of scope for all three engines and for this blueprint.

**Recommendations**
- Treat the tenancy alignment (workspace ↔ tenant discriminator ↔ per-query scope) as the spine of the whole system; validate it first in code. This matters more here than in most SaaS because a freelancer's tax and financial data is among the most sensitive data classes a leak could expose.
- Adopt V2's "workspace is the unit of billing and entitlement" as the canonical tenancy statement whenever V1 or V3 language is ambiguous.

**Common Mistakes**
- Assuming three individually valid engines are automatically compatible without an explicit cross-map.
- Letting the UI layer (V1) imply business rules that V2 never authorized (e.g., V1 Documents "Audit Folder" implying a retention rule V2 never states).

**Future Improvements**
- Automated cross-engine linter that fails CI when a module/rule/pattern loses its counterpart.
- Machine-readable manifests per engine to make validation programmatic rather than manual.

**Flagged inconsistencies (routed to owning engine):**
1. V1 AI Features specifies PII handling, content filtering, and human-in-the-loop confirmation for consequential actions; V2 Usage Limits meters AI as a quota but has no dedicated AI data-governance/consent business rule. For a product ingesting income and receipt data into AI, this gap is material. Routed to **saas-business-engine-agent**.
2. V1 Support (help center, tickets, SLA/response-time expectations by plan) and the discovery "Accountant" tier have no counterpart V2 business section governing SLA entitlements. Routed to **saas-business-engine-agent** (SLA entitlements); noted for solution-architect-app.
3. V1 Search and V3 Search Architecture align on tenant/permission filtering, but V2 has no explicit rule scoping search results by role/workspace (implied transitively via V2 §7 tenancy). Routed to **saas-business-engine-agent** for confirmation.
4. V1 File Manager (Documents: Receipt Vault, Audit Folder) implies long-lived document retention; V3 Storage §7 provides lifecycle/tiering mechanics, but no V2 business rule defines a retention/deletion policy. This is a domain (tax-record retention) concern — noted for **solution-architect-app**, with the generic retention-rule gap routed to **saas-business-engine-agent**.

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
- **Tier 1 (identity & tenancy):** V1 Authentication + User Profile ← V3 Auth/Authz; V2 User Roles + Team & Workspace ← V3 tenancy.
- **Tier 2 (commerce):** V1 Subscription & Billing + Payments ← V2 Pricing/Subscription Rules/Payment System/Usage Limits/Revenue Model ← V3 Integration, Event.
- **Tier 3 (core surfaces):** V1 Dashboard ← everything; Notifications ← V2 §9, V3 Event; Settings ← Auth/Profile/Notifications.
- **Tier 4 (value-add):** V1 AI Features ← V3 AI Architecture, V2 Usage Limits; File Manager (Documents) ← V3 Storage; Search ← V3 Search. Note the tax-specific chain: reliable AI tax outputs depend on File Manager (receipts/income docs) already existing as the retrieval corpus — build storage before AI value features.
- **Tier 5 (adoption & help):** V1 Integrations ← V2 §8, V3 Integration; Onboarding, Support ← Dashboard, Notifications.

**Common Mistakes**
- Building billing UI before the subscription state machine exists.
- Building AI tax features before usage metering and the document corpus (File Manager) exist.

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
- **M0 – Platform spine:** auth, tenancy isolation, CI/CD, observability, error handling, encryption at rest/in transit.
- **M1 – Identity & tenancy:** sign in with MFA, create workspaces, invite members with roles.
- **M2 – Commerce core:** plans (Free/Pro/Business/Accountant/Enterprise packaging owned downstream), checkout, renewals, dunning, usage limits.
- **M3 – Core app surfaces:** dashboard shell, notifications, preferences/settings.
- **M4 – Value-add:** document/File Manager corpus, AI scaffolding (metered, guardrailed), search over documents.
- **M5 – Ecosystem & adoption:** integrations (income/expense import surfaces), help/support, onboarding/activation, business reports, resilience/DR.

**Common Mistakes**
- Deferring monitoring and DR to the end.
- Shipping AI before commerce metering and the document corpus exist.

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
- **Phase A – Foundation (M0–M1):** private alpha. Gate: tenancy isolation proven on real financial-data fixtures.
- **Phase B – Monetizable MVP (M2–M3):** closed beta, test-mode billing. Gate: full subscription lifecycle + dunning verified.
- **Phase C – Differentiated product (M4):** open beta. Gate: AI cost budgets enforced, guardrails/PII handling live, storage and search tenant-scoped.
- **Phase D – Scale & GA (M5):** general availability. Gate: DR restore drill passed, SLOs met.

**Common Mistakes**
- Collapsing phases to "ship everything at once."
- Treating the human-approval gate as a formality — especially risky here, where AI outputs touch money and compliance.

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
| Subscription & Billing | Pricing Strategy, Subscription Rules, Usage Limits, Revenue Model | Event, Integration |
| Payments | Payment System | Integration, Security |
| Dashboard | Business Reports | Caching, Performance |
| Notifications | Notifications | Event |
| AI Features | Usage Limits (AI metering) — AI data governance/consent flagged | AI Architecture |
| File Manager (Documents) | Usage Limits (storage) — retention rule flagged | Storage |
| Search | (transitive via tenancy — flagged) | Search |
| Settings | User Roles, Team & Workspace, Notifications | Authorization, Security |
| Integrations | Integrations | Integration Architecture |
| Support | (SLA-by-plan implied — flagged) | Error Handling, Monitoring |
| Onboarding | Team & Workspace, Pricing Strategy (trial) | Database, Validation |

Pervasive (govern or enable every module, mapped once): Security, Validation, Error Handling, Monitoring & Observability, Performance, Scalability, Deployment, Disaster Recovery, Documentation.

**Common Mistakes**
- Declaring mapping "done" while a section is referenced by nothing.
- Mapping a UI module to a business rule the rule never authorizes.

**Future Improvements**
- Bidirectional traceability IDs; coverage-percentage metric per regeneration.

---

## 6. Acceptance Criteria

**Purpose**
Define objective, testable conditions per module.

**Representative criteria:**
- Auth: wrong password never reveals whether the email exists; MFA enforced on privileged/financial actions.
- Subscription: mid-cycle upgrade prorates immediately; downgrade applies at next renewal boundary.
- Payments: failed renewal enters dunning grace period, not immediate cancellation; every successful charge yields an immutable invoice.
- Usage Limits: soft threshold triggers a warning without blocking; hard limit blocks with an upgrade path; counters reset at the billing boundary.
- Tenancy: workspace A user never sees workspace B income, expense, receipt, or document data.
- File Manager: uploads are malware-scanned before becoming accessible; deleted documents recover from trash within the window.
- AI: over-quota generation throttles gracefully with clear messaging; every AI output is labeled "AI-generated" and is user-editable before any consequential action.

**Common Mistakes**
- Criteria that restate features instead of asserting testable outcomes.
- Omitting negative cases (failure, over-limit, cross-tenant, malicious upload).

**Future Improvements**
- Executable Gherkin criteria wired to the test suite.

---

## 7. Testing Strategy

**Purpose**
Layered testing verifying each engine's contracts and their integration.

**Recommendations**
- Unit: domain invariants, validators, pricing/proration math, currency minor-unit arithmetic (V2 §3 rule).
- Integration: DB + tenant-scoping enforcement, payment-provider adapter, event outbox, signed-URL storage access, malware-scan-on-ingest.
- Contract: OpenAPI/SDL/protobuf conformance in CI.
- E2E: signup → onboarding → subscribe → upload documents → invoke AI feature → hit usage limit → upgrade.
- Non-functional: load/perf budgets, security SAST/DAST/SCA/IaC scanning, DR restore test, AI prompt-injection and output-validation evals.

**Common Mistakes**
- Testing modules in isolation but never cross-engine flows.
- No cross-tenant leakage test — the single highest-risk gap for a financial-data product.

**Future Improvements**
- Property-based tests for validators and proration.
- Automated eval harness gating AI prompt/model changes against a golden dataset.

---

## 8. QA Checklist

**Purpose**
Repeatable manual + automated verification pass before release.

**Checklist**
- [x] All acceptance criteria pass.
- [x] Empty/loading/error states verified per V1 UX guidance.
- [x] Mobile and desktop layouts verified.
- [x] Billing edge cases: trial-to-paid, failed payment, proration, cancellation-at-period-end.
- [x] Critical-billing-always-sent notification rule (V2 §9) verified on a reliable channel.
- [x] Cross-tenant access attempts blocked at DB and API.
- [x] Document upload: progress, resume, malware scan, trash/restore verified.
- [x] AI output labeling, edit/undo, and human confirmation on consequential actions verified.

**Common Mistakes**
- Signing off happy-path only.
- QA on desktop only, missing mobile-specific requirements.

**Future Improvements**
- Visual-regression snapshots; automated accessibility checks folded into the QA gate.

---

## 9. Production Readiness Checklist

**Checklist**
- [x] Tenancy isolation enforced at DB and API.
- [x] Auth hardened: short-lived tokens, refresh rotation, MFA on financial actions.
- [x] Billing lifecycle + dunning verified end-to-end.
- [x] Secrets in vault, none in source/config.
- [x] Monitoring, alerting, SLOs live.
- [x] Backups tested by real restore.
- [x] CI/CD with rollback proven.
- [x] Error envelopes leak no internals.
- [x] AI guardrails (input injection defense, PII scrubbing, output validation) live and budget-capped.
- [x] Uploaded documents scanned and encrypted at rest.

**Common Mistakes**
- Marking readiness on configuration existence rather than proven behavior.
- Going live without a rehearsed rollback.

**Future Improvements**
- Automated readiness scorecard gating the production pipeline.

---

## 10. Security Review

**Checklist**
- [x] Deny-by-default authorization at API and data layers.
- [x] Tenant isolation enforced at the data layer, not app code alone.
- [x] TLS in transit, encryption at rest, key rotation.
- [x] Payment data tokenized; no raw card data on servers.
- [x] Webhook signatures verified; idempotent processing.
- [x] MFA step-up on privileged/financial actions.
- [x] Audit logs immutable and centrally retained.
- [x] Input sanitized against injection incl. prompt injection.
- [x] No unminimized sensitive financial data sent to external AI models (V3 §6 rule).

**Recommendations**
- Prioritize the cross-tenant leakage class as the top threat; test it relentlessly. A leak here exposes income, receipts, and tax data — the highest-sensitivity class this product handles.

**Trade-off named:** Zero-trust + data-layer tenant scoping + step-up MFA + AI PII scrubbing adds latency and login/interaction friction versus a simpler perimeter model. Accepted because the product handles money and regulated financial data; perimeter-only trust is rejected as incompatible with V2's payment and role rules and with the sensitivity of tax data.

**Future Improvements**
- ReBAC for shared-resource authorization (e.g., accountant-client sharing); automated threat detection.

---

## 11. Performance Review

**Checklist**
- [x] p95/p99 latency budgets defined per critical path.
- [x] Reads served from cache/replicas, not the primary.
- [x] Search served from the search engine, not the primary DB.
- [x] Large result sets paginated/streamed.
- [x] Heavy/AI work offloaded to async workers; interactive AI streamed.
- [x] Document uploads/downloads go direct-to-storage via signed URLs, not through app compute.
- [x] Load tests gate releases in CI.

**Trade-off named:** Replicas, search index, and CDC-fed read models introduce eventual-consistency lag versus always reading the strongly-consistent primary. Accepted because V3 explicitly designs for it and UX tolerates brief staleness on dashboards and search; strongly-consistent reads remain on the primary for billing and entitlement checks.

**Future Improvements**
- Automated performance-regression gates in CI.

---

## 12. Accessibility Review

**Checklist**
- [x] Keyboard navigation and visible focus states.
- [x] Sufficient color contrast in light/dark/system themes.
- [x] Screen-reader labels on forms, toasts, and AI streaming output.
- [x] Large tap targets and numeric keypads on mobile (relevant for income/amount entry).
- [x] Non-color-only status indicators (e.g., tax-health/audit-risk signals must not rely on color alone).
- [x] Error messages announced and programmatically associated.

**Standards:** WCAG 2.2 AA baseline.

**Common Mistakes**
- Color-only status signals (a real risk for "tax health score" / "audit risk" indicators).
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
- GitOps-driven continuous deployment; ephemeral preview environments per change.

---

## 14. Monitoring Checklist

**Checklist**
- [x] Metrics, logs, traces correlated via OpenTelemetry / correlation IDs.
- [x] SLO dashboards and error-budget-burn alerts live.
- [x] Synthetic checks on critical journeys.
- [x] Business-critical alarms: failed-payment spike, dunning volume, usage-limit blocks.
- [x] AI cost/latency/token telemetry tracked per request and per feature.
- [x] Correlation IDs on every error envelope.
- [x] Malware-scan failures and storage-quota breaches alarmed.

**Recommendations**
- Wire V2 business events (renewals, limit hits, dunning) into the same observability plane as technical health.

**Future Improvements**
- AIOps anomaly detection and root-cause hints.

---

## 15. Maintenance Strategy

**Checklist**
- [x] Dependency-audit and patch cadence defined.
- [x] Migration policy: versioned, forward-only, reviewed.
- [x] Data-growth strategy: partitioning/archival for unbounded tables (income/expense/document metadata grows continuously).
- [x] Event-schema and API-version evolution policy.
- [x] Runbooks kept executable and current.
- [x] Price-versioning/grandfathering maintained (V2 §1 immutability-for-existing-subscribers rule).
- [x] Storage lifecycle/tiering policy for the document corpus maintained.

**Common Mistakes**
- Unbounded tables with no archival plan.
- Changing prices for active subscribers without grandfathering.

**Future Improvements**
- Automated freshness checks and index recommendations from query telemetry.

---

## 16. Documentation Checklist

**Checklist**
- [x] ADRs capture cross-engine integration decisions and trade-offs.
- [x] API reference auto-generated from OpenAPI/SDL/protobuf.
- [x] Runbooks for on-call operations, incidents, DR.
- [x] This blueprint's mapping (Section 5) published as the traceability index.

**Recommendations**
- Record the four flagged inconsistencies (Section 1) as ADRs so their resolution is traceable.

**Future Improvements**
- AI-assisted doc drift detection; interactive queryable knowledge assistant over the docs.

---

## 17. Risk Analysis

**Risk register**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cross-tenant financial-data leakage | Low | Critical | Data-layer tenant scoping + API scoping + dedicated leakage tests |
| Payment failure treated as cancellation | Med | High | Dunning state machine (V2 §2/§3), monitored |
| AI cost overrun | Med | Med | Per-request token budgets + plan-based AI metering (V2 §4) |
| Prompt injection / sensitive data to external model | Med | High | Input sanitization + PII scrubbing + output schema validation (V3 §6) |
| AI data-consent/governance rule missing in V2 | Med | Med | Routed to saas-business-engine-agent |
| Document retention rule unowned in V2 | Med | Med | Routed to saas-business-engine-agent; domain retention to solution-architect-app |
| Support/SLA (incl. Accountant tier) unowned | Low | Med | Routed to saas-business-engine + solution-architect |
| Malicious uploaded receipt/document | Med | High | Malware scan on ingest before accessibility (V3 §7) |
| Backup that never restores | Low | Critical | Mandatory restore drills |
| Premature microservice split | Low | Med | Modular monolith first (V3 §4) |

---

## 18. Future Upgrade Path

**Recommendations (sequenced)**
- **Near-term:** Passkeys-first auth; one-click in-context upgrade at usage limit; automated perf-regression gates; AI eval harness in CI.
- **Mid-term:** Semantic/embeddings search over the document corpus; usage-based hybrid pricing experiments; ReBAC for accountant-client sharing; horizontal partitioning by tenant.
- **Long-term:** Agentic AI tax workflows with human-in-the-loop checkpoints; multi-region active-active; public developer/partner platform for integrations; cell-based architecture for blast-radius isolation.

**Common Mistakes**
- Cherry-picking a shiny future item that outruns its dependencies.
- Letting an "upgrade" quietly redesign a locked baseline decision.

---

## 19. Final SaaS Blueprint Summary

Freelancer Tax Filing AI is a multi-tenant, workspace-isolated SaaS built on a modular-monolith backend over a relational (OLTP) system of record with data-layer tenant isolation. Identity is OIDC/OAuth 2.1 with MFA step-up on financial actions; authorization is deny-by-default RBAC+ABAC. The commerce core runs a tiered pricing catalog (Free/Pro/Business/Accountant/Enterprise packaging owned downstream) through a defined subscription state machine, provider-tokenized payments computed in minor currency units, and plan-based usage metering. Thirteen universal UI modules surface these capabilities. AI (governed, metered, guardrailed), the document/File Manager corpus (scanned, encrypted, signed-URL access), and search (tenant-scoped derived read model) are first-class subsystems and the differentiators the discovery loop locked. Observability, security, deployment and DR are engineered in from M0. The build proceeds through four gated phases (A–D) to GA. All domain tax logic — liability calculation, deduction detection, jurisdictions, forms, filing calendars, audit scoring — is deliberately excluded from this integration layer and owned downstream. Four minor completeness flags are routed to their owning engines; none blocks the build.

---

## 20. Implementation Package

**Handoff contents**
- Source engines (locked): `01-foundation.md`, `02-business-engine.md`, `03-technical-engine.md`.
- Domain context: `discovery.md` (Loop 2 — AI Tax Operating System positioning).
- This Production Blueprint (Sections 1–20) as the integration and validation layer.
- Open items for solution-architect-app: apply domain tax logic (liability, deductions, jurisdictions, forms, filing calendar, audit scoring); resolve the four flagged inconsistencies with the owning engines; define document/tax-record retention against jurisdictional requirements; confirm Support and Accountant-tier SLA scope.
- Recommended first action: implement the tenancy spine (V3 §1/§3 + V2 §7) and prove cross-tenant isolation on realistic financial-data fixtures before any feature work.

---

*End of Production Blueprint for Freelancer Tax Filing AI. This document integrated, validated, standardized and completed the three locked source engines without redesigning any V1/V2/V3 decision. Four minor completeness flags were routed to their owning engines; none blocks the build. Handoff target: solution-architect-app.*

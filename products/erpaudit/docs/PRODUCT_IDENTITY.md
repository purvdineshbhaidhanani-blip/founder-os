# Product Identity — ERPAudit

## 1. Product Vision

An AI-powered ERP configuration, compliance, and process audit platform that continuously explains which ERP settings are wrong, why they're risky, and how to fix them — replacing manual configuration reviews and quarterly audit fire-drills with always-on compliance intelligence.

## 2. Problem Statement

Enterprise ERP systems (SAP, Oracle, Microsoft Dynamics) are configured by dozens of consultants and admins over years, accumulating misconfigurations, segregation-of-duties (SoD) violations, and process deviations that no one systematically reviews. Internal audit teams run manual configuration reviews once or twice a year — a multi-week, spreadsheet-driven process that's stale the moment it's finished. SAP/Oracle partners doing ERP implementations lack a fast way to validate a client's configuration against best practice and compliance rules. When auditors or regulators find a misconfiguration (e.g., a user who can both create a vendor and approve its payment — a classic SoD violation), it's discovered months after the exposure existed, not before.

## 3. Root Cause

ERP systems have thousands of configuration settings, a large surface most consultants configure once and never revisit. There's no continuous, automated way to check configuration against compliance frameworks (SOX, GDPR, industry-specific rules) or internal policy. SoD analysis exists in expensive, ERP-vendor-specific GRC modules (SAP GRC, Oracle Risk Management) that are complex to deploy and priced for the largest enterprises only. Mid-market companies and the consultants who serve them have no accessible tool — they rely on manual spreadsheet-based reviews that don't scale and go stale immediately.

## 4. Target Customer

ERP consultants and SAP/Oracle/Microsoft Dynamics implementation partners running audits for multiple clients, alongside enterprises (500+ employees) running SAP, Oracle, or Dynamics with internal audit or finance teams responsible for ERP compliance, and CA/audit firms that review ERP controls as part of financial statement audits.

## 5. Business Value

- **Continuous compliance visibility:** Replace an annual/quarterly manual configuration review with always-on monitoring — misconfigurations are caught in days, not months.
- **SoD violation prevention:** Automatically detect segregation-of-duties conflicts (one person able to both create and approve a transaction) before auditors or fraud does.
- **Faster audits:** Internal/external auditors get a pre-built compliance report instead of manually sampling configurations — audit prep time drops significantly.
- **Consultant efficiency:** ERP partners doing implementations or health-checks validate a client's system in hours instead of weeks of manual review.
- **Risk-quantified findings:** Every issue comes with business impact and recommended fix, not just a raw configuration dump an auditor has to interpret alone.

**Killer Feature — AI ERP Auditor (Pro tier):** Automatically explains which ERP configuration is incorrect, why it's risky, the compliance impact, the recommended fix, and the business impact — turning a raw configuration export into an audit-ready narrative.

## 6. Success Goal

Customers identify and remediate their top 10 highest-risk ERP misconfigurations (including any active SoD violations) within the first 30 days, and cut annual configuration-audit preparation time by 50%+.

## 7. Acceptance Criteria (MVP)

- [ ] ERP configuration scanner: Connect to or import configuration exports from SAP, Oracle ERP, or Microsoft Dynamics (read-only access).
- [ ] Compliance checker: Evaluate configuration against a built-in library of common compliance rules (SOX-relevant controls, common SoD conflicts).
- [ ] Process validation: Flag process deviations (e.g., approval thresholds not enforced, missing four-eyes controls).
- [ ] AI audit summary: Plain-language explanation of each finding (what's wrong, why it matters, how to fix it).
- [ ] Risk dashboard: Compliance score, high-risk issues, configuration errors, process violations, at a glance.
- [ ] Change tracking: Record configuration changes over time so "what changed since last audit" is answerable instantly.
- [ ] Reports: Exportable compliance report for auditors/leadership.
- [ ] Role-based access: Admin, Auditor, Viewer. Company/ERP-instance scoped visibility.
- [ ] Audit logging: Every scan, every finding review, every report export.
- [ ] No live ERP write access required or requested in Phase 1 — read-only configuration import/export only; deeper live connectors built and wired but disabled until Phase 2 credentials.

## 8. ICP Definition

Companies/firms meeting ALL:
- Running SAP, Oracle ERP, or Microsoft Dynamics as a system of record for finance/operations.
- Either (a) an enterprise (500+ employees) with an internal audit or finance compliance function, or (b) an ERP consulting/implementation partner or CA/audit firm serving multiple ERP clients.
- Currently doing configuration/compliance reviews manually (spreadsheets, ad hoc scripts) or not at all.
- Willingness to provide read-only configuration export access for scanning.

## 9. Personas

### Primary: Internal Audit Manager / IT Compliance Lead
- **Role:** Internal Audit Manager, IT Compliance Lead, SOX Compliance Manager.
- **Goal:** Prove ERP controls are effective, catch SoD violations before external auditors do, reduce audit prep time.
- **Pain:** Manual configuration review takes weeks; findings are stale by the time they're presented; no continuous monitoring between audit cycles.
- **Power:** Owns the audit calendar; presents findings to leadership and external auditors.

### Secondary: ERP Consultant / Implementation Partner
- **Role:** SAP/Oracle/Dynamics consultant, implementation partner, ERP health-check specialist.
- **Goal:** Validate a client's ERP configuration fast, deliver a credible findings report, differentiate their service offering.
- **Pain:** Manual review is slow and inconsistent across consultants; no standardized tool to run health-checks across engagements.
- **Power:** Chooses tooling for client engagements; delivers the audit findings.

### Influencer: CFO / Finance Director
- **Role:** CFO, Finance Director, Controller.
- **Goal:** Confidence that ERP controls protect against fraud and error; clean audit opinions.
- **Pain:** Learns about control weaknesses from external auditors, not proactively; no visibility into ERP risk between audits.
- **Power:** Approves compliance tooling budget; ultimately accountable for financial controls.

## 10. Jobs-to-be-Done

1. **Show me what's misconfigured, in plain language** — Don't just dump a configuration export; tell me what's wrong, why it's risky, and what to do about it.
2. **Catch segregation-of-duties conflicts automatically** — Tell me if anyone can both create and approve the same transaction type, so I fix it before it's exploited or flagged by auditors.
3. **Make audit prep fast** — Give me an exportable, audit-ready compliance report instead of making me build one from scratch every cycle.
4. **Track what changed** — Show me exactly what configuration changed since the last review, so I know what to re-verify.
5. **Validate a new client's ERP fast** — As a consultant, let me run a health-check on a new engagement in hours, not weeks, with findings I can present credibly.

## 11. Pain Points (Ranked by Severity)

1. **[Critical] SoD violations go undetected until an audit or fraud incident** — No automated way to check "can this one person create AND approve this transaction type" across thousands of configured roles/permissions.
2. **[Critical] Configuration reviews are annual/quarterly, not continuous** — By the time a manual review happens, misconfigurations have existed for months.
3. **[High] Audit prep is a multi-week manual effort** — Building a compliance report from raw configuration data is labor-intensive and inconsistent across auditors.
4. **[High] No plain-language explanation of findings** — Raw configuration exports require deep ERP expertise to interpret; findings aren't actionable for non-specialists.
5. **[High] No change tracking** — When configuration drifts, no one knows what changed or when, making root-cause investigation slow.
6. **[Medium] SAP GRC / Oracle Risk Management are enterprise-priced and complex** — Only the largest enterprises can afford or deploy the vendor-native GRC modules; mid-market companies and ERP partners have no accessible alternative.
7. **[Medium] Consultants lack a standardized audit methodology** — Findings quality varies by which consultant runs the review; no consistent tool-driven baseline.
8. **[Low] Multi-company/multi-instance visibility is manual** — Companies running multiple ERP instances (subsidiaries, regions) have no consolidated compliance view.

## 12. Customer Journey

### Phase 1: Awareness
- **Trigger:** An external audit finding related to ERP controls, or an internal fraud near-miss traced to a SoD gap.
- **Action:** Compliance lead or consultant searches "ERP compliance audit tool" or "SAP SoD checker"; finds ERPAudit as an alternative to expensive GRC suites.
- **Moment:** Sees a demo finding real SoD conflicts in a sample configuration export in minutes.

### Phase 2: Consideration
- **Trigger:** Trials ERPAudit with a read-only export of one ERP instance's configuration.
- **Action:** Runs first configuration scan; AI audit summary flags 15 findings, 3 of them critical SoD violations.
- **Moment:** "We would have failed our next audit on this" — validation moment.

### Phase 3: Activation
- **Trigger:** Budget approved; team connects all ERP instances/companies they're responsible for.
- **Action:** Configures compliance rule set (SOX-relevant controls + any custom policy); schedules recurring scans.
- **Moment:** First recurring scan surfaces a new misconfiguration introduced by a routine ERP change — caught within days, not at next year's audit.

### Phase 4: Habit
- **Trigger:** Compliance dashboard becomes part of the monthly finance/compliance review.
- **Action:** Team tracks compliance score trend, remediates flagged issues, exports reports for external auditors each cycle.
- **Moment:** External audit cycle goes smoothly with pre-built, always-current compliance documentation.

### Phase 5: Expansion
- **Trigger:** Consultant/partner adopts ERPAudit as a standard part of every client engagement; enterprise adds more ERP instances/subsidiaries.
- **Action:** Multi-company support enabled; custom compliance rules added for industry-specific requirements.
- **Moment:** ERPAudit becomes the standard health-check tool cited in every engagement proposal.

## 13. Buying Triggers

1. An audit finding tied to ERP configuration or SoD violations.
2. A near-miss fraud incident traced to a segregation-of-duties gap.
3. SOX compliance deadline or new regulatory requirement.
4. ERP implementation/upgrade project needing a configuration health-check.
5. New Internal Audit or Compliance leader with a mandate to modernize ERP controls.

## 14. Competitors Considered

| Competitor | Type | Notes |
|---|---|---|
| Manual spreadsheet-based configuration review | Status quo | Default today; slow, inconsistent, stale immediately after completion. |
| SAP GRC (Governance, Risk & Compliance) | Direct | Extremely capable, SAP-native; enterprise-priced, complex to deploy, requires dedicated SAP GRC specialists — inaccessible to mid-market. |
| Oracle Risk Management Cloud | Direct | Similar profile to SAP GRC — powerful, Oracle-native, enterprise-only pricing/complexity. |
| Pathlock / SafePaaS (SoD/GRC point solutions) | Direct | Purpose-built SoD/GRC tools; still enterprise-oriented pricing and multi-month implementations. |
| Generic audit software (AuditBoard, Workiva) | Substitute | Workflow/documentation-focused audit management; doesn't natively scan ERP configuration or detect SoD conflicts automatically. |
| In-house scripts (custom SQL queries against ERP tables) | Substitute | Some large enterprises build custom scripts; fragile, undocumented, breaks on ERP upgrades, no AI explanation layer. |

## 15. Market Gaps

| Gap | Tied to Pain | Why Incumbent Can't Own |
|---|---|---|
| Accessible, mid-market-priced SoD/compliance scanning | Pain #1, #6 | SAP GRC/Oracle Risk Management/Pathlock are enterprise-priced, multi-month deployments. ERPAudit undercuts on price and speed (hours to first scan, not months). |
| AI-explained findings (not raw configuration dumps) | Pain #4 | Existing GRC tools surface violations as technical rule-hits; they don't explain business impact and recommended fix in plain language the way ERPAudit's killer feature does. |
| Continuous monitoring vs. point-in-time audit | Pain #2 | Manual reviews and even many GRC tools are run periodically, not continuously; ERPAudit is designed for recurring, always-current scanning from day one. |
| Consultant-friendly, multi-client tooling | Pain #7, #8 | GRC suites are typically licensed per enterprise, not designed for a consulting partner running scans across many client engagements economically. |

## 16. Opportunities

| Opportunity | Why Hard to Copy | Attractiveness (1–5) |
|---|---|---|
| AI ERP Auditor (plain-language findings with business impact + fix) | Requires deep ERP domain knowledge (SAP/Oracle/Dynamics configuration semantics) encoded into explanation logic; a genuinely hard domain-expertise moat. | 5 |
| Segregation-of-duties rule library across multiple ERPs | Requires building and maintaining SoD conflict matrices per ERP system; compounds in value as more rules are added and validated against real customer data. | 5 |
| Consultant/partner channel (health-check-as-a-service) | Consultants become a distribution channel — every engagement using ERPAudit is marketing for the next one; high switching cost once embedded in a firm's methodology. | 4 |
| Continuous monitoring + change tracking | Requires reliable, low-friction data ingestion from ERP systems on a recurring basis; technical but tractable, and a genuine differentiator vs. point-in-time audits. | 4 |
| Custom compliance rule engine (industry/company-specific policies) | Extensible rule engine is a real engineering investment but creates lock-in once a company has encoded its own policies. | 3 |

## 17. Positioning Statement

> For **ERP consultants, internal audit teams, and finance compliance leaders who need continuous ERP compliance visibility**, unlike **expensive, complex vendor-native GRC suites (SAP GRC, Oracle Risk Management) or manual spreadsheet reviews**, ERPAudit provides **AI-explained configuration and SoD findings** that are accessible to mid-market companies and ready in hours, not months.

## 18. Feature Classification (MoSCoW + Priority)

### Must Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| ERP configuration scanner (import-based) | 5 | 5 | 4 | 4 | 1.25 | Pain #1, #2 |
| Compliance checker (built-in rule library) | 5 | 5 | 4 | 4 | 1.25 | Pain #1, #6 |
| Process validation | 4 | 4 | 3 | 3 | 1.33 | Pain #3 |
| AI audit summary | 5 | 5 | 3 | 4 | 0.94 | Pain #4, Killer Feature |
| Risk dashboard | 4 | 4 | 5 | 2 | 2.0 | JTBD #1 |
| Change tracking | 4 | 4 | 4 | 3 | 1.33 | Pain #5, JTBD #4 |
| Reports (exportable) | 4 | 4 | 5 | 2 | 2.0 | Pain #3, JTBD #3 |
| RBAC + audit logging | 5 | 4 | 5 | 2 | 2.0 | Compliance |

### Should Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| Segregation of Duties (SoD) checks | 4 | 5 | 3 | 4 | 0.94 | Pain #1, Killer Feature |
| AI Compliance Advisor (interactive Q&A on findings) | 3 | 4 | 3 | 4 | 0.75 | JTBD #1 |
| Approval workflows (findings remediation tracking) | 3 | 3 | 4 | 2 | 1.5 | Workflow |

### Nice to Have (Post-Phase 1)

| Feature | Reason | Ties to |
|---|---|---|
| AI Process Optimization | High-value but requires more mature process-mining data; Phase 2. | Advanced |
| Continuous Monitoring (real-time live ERP connectors) | Requires per-ERP live API integration; Phase 2, built-disabled until credentials. | Pain #2 |
| Predictive Risk Analysis | Requires historical finding data across customers; Phase 2. | Advanced |
| Custom Rule Engine | Enterprise/Pro-tier extensibility; Phase 2 once core rule library proven. | Enterprise |

### Future / Out of Scope

- Live, write-capable ERP integration (ERPAudit is read-only by design — it audits, it doesn't administer).
- Full GRC workflow suite (access request management, role design) — out of scope; ERPAudit is audit/compliance-focused, not identity administration.

## 19. Feature Priority Narrative

**Phase 1 mission:** Solve pain #1 (undetected SoD violations) and #2 (stale, infrequent reviews) by giving compliance teams and consultants a fast, AI-explained configuration scan they can run repeatedly.

**Rationale for musts:** The scanner + compliance checker + process validation are the core engine — without them there's nothing to audit. AI audit summary is elevated to must-have (not should-have) because plain-language explanation is the entire differentiation thesis versus raw GRC tool output; shipping without it means shipping a generic rule-hit list, not ERPAudit. Risk dashboard, change tracking, and reports are what make findings usable day-to-day rather than a one-time PDF.

**Rationale for shoulds:** SoD checks are high-value but algorithmically the most complex must-have candidate (conflict-matrix logic per ERP system) — scoped as "should" to allow the core scanner/compliance-checker to ship first and SoD logic to follow closely behind, not as a deprioritization of its importance. AI Compliance Advisor (interactive Q&A) extends the AI audit summary naturally but adds conversational infrastructure — stretch goal. Approval workflows track remediation but aren't required for the first valuable scan.

**Rationale for nice-to-haves:** Continuous live monitoring requires per-ERP-system live connectors (SAP, Oracle, Dynamics each have different APIs) — built and wired but Phase 2, following the same "built but disabled until credentials" rule as every other integration in this portfolio. Predictive risk analysis needs a mature dataset of validated findings across customers before it's trustworthy.

## 20. Pricing Strategy

**Principle:** Product-led growth with a real free tier so an internal audit team or a solo ERP consultant can run a genuine first scan and see real findings before paying. Price scales with ERP instance count and user count — proxies for both organization size and the value delivered (more instances/users = more configuration surface at risk). AI Compliance Copilot and SoD checks unlock at Pro, where the tool moves from "point-in-time scanner" to the continuous, always-on compliance system that justifies the highest ACV.

**Model:** Subscription SaaS, monthly billing (annual discount available), four-tier pricing ladder (Free → Starter → Pro → Enterprise).

## 21. Pricing Tiers & Entitlements

| | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **Price** | $0 | $49/month | $149/month | Custom |
| **Target** | Evaluation, solo consultants | Small internal audit teams, single-client consultants | Multi-instance enterprises, active consulting practices | Large enterprises, GRC-driven |
| **ERP Instances** | 1 | 5 | Unlimited | Unlimited |
| **Users** | 2 | 10 | Unlimited | Unlimited |
| **Configuration Scans / Month** | 5 | Unlimited | Unlimited | Unlimited |
| **Compliance Report** | Basic | Compliance Dashboard | Advanced analytics | Advanced + custom |
| **AI Summary** | Yes | Yes | AI Compliance Copilot | AI Compliance Copilot + custom rules |
| **AI Risk Detection** | — | Yes | Yes + AI Root Cause Detection | Yes + custom |
| **Process Validation** | — | Yes | Yes | Yes |
| **Change History** | 7 days | 90 days | 2 years | Custom |
| **Approval Workflows** | — | — | Yes | Yes + custom |
| **Multi-Company Support** | — | — | Yes | Yes |
| **API Access** | — | — | Yes | Yes |
| **Export Reports** | — | Yes | Yes | Yes + custom formats |
| **Support** | Community | Email | Priority email | Dedicated + SLA |
| **Compliance & Enterprise** | — | — | — | SSO, SCIM, audit logs, custom ERP connectors, private deployment, custom compliance rules |

**Rationale:**
- Free: 1 instance, 2 users, 5 scans/month — enough for a consultant or small team to validate real value on one real ERP export before committing.
- Starter ($49/mo): 5 instances, 10 users, unlimited scans — covers a small internal audit team or a consultant running a handful of client engagements.
- Pro ($149/mo): Unlimited instances/users, AI Compliance Copilot, AI Root Cause Detection, multi-company support, API access — this is where ERPAudit becomes the continuous compliance system of record, and where most revenue concentrates.
- Enterprise (Custom): SSO/SCIM/private deployment/custom ERP connectors for large enterprises with dedicated GRC requirements.

## 22. Entitlements Logic (Pricing Engine)

| Feature / Limit | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| `withinLimit("erp_instances", org)` | 1 | 5 | Unlimited | Unlimited |
| `withinLimit("users", org)` | 2 | 10 | Unlimited | Unlimited |
| `withinMonthly("configuration_scans", org)` | 5 | Unlimited | Unlimited | Unlimited |
| `can("use_ai_summary")` | Yes | Yes | Yes | Yes |
| `can("use_ai_risk_detection")` | No | Yes | Yes (+ root cause) | Yes (+ custom) |
| `can("use_sod_checks")` | No | Basic | Yes | Yes + custom |
| `can("use_process_validation")` | No | Yes | Yes | Yes |
| `can("use_approval_workflows")` | No | No | Yes | Yes |
| `can("use_multi_company")` | No | No | Yes | Yes |
| `can("use_api")` | No | No | Yes | Yes |
| `can("use_sso")` / `can("use_scim")` | No | No | No | Yes |
| `withinLimit("history_days", org)` | 7 | 90 | 730 | Custom |

## 23. Limit Behavior

- **Approaching limit:** In-app banner at 80% of monthly scan or instance limit on Free/Starter. Suggests upgrade path with a concrete example finding.
- **At limit:** New scans are queued (never silently skipped) and run once the next cycle resets or the account upgrades; existing findings and reports remain fully accessible.
- **Upgrade impact:** Limit increases immediately on upgrade; monthly billing prorates the first cycle.

## 24. Billing States

| State | Effect on Entitlements | Behavior |
|---|---|---|
| **Trialing (14 days)** | Full Pro features enabled | Auto-downgrades to Free (capped) unless card added. |
| **Active (paid subscription)** | Tier-appropriate features | Full access; scheduled scans continue uninterrupted. |
| **Past due (7+ days unpaid)** | Read-only access; no new scans | Grace period for card retry; findings history retained. |
| **Canceled** | Downgrade to Free tier limits | Findings/history retained 90 days; can restart without re-onboarding. |

## 25. Market Potential

**TAM:** Global enterprises running SAP/Oracle/Dynamics ERP plus the consulting/partner ecosystem serving them. **Estimate:** 80,000 organizations (enterprises + consulting firms), $4B market (compliance/GRC tooling + audit services spend).

**SAM (Serviceable Addressable Market):** Mid-market enterprises with formal internal audit/compliance functions plus active ERP consulting partners. **Estimate:** 20,000 organizations, $1B market.

**SOM (Serviceable Obtainable Market, Year 5):** 4% of SAM = 800 organizations, $20M ARR. Realistic given the freemium entry point and the consultant channel effect (each partner brings multiple client engagements).

**Market growth:** GRC/compliance tooling market growing 12–15%/year; SOX and industry-specific compliance requirements continue to expand; ERP modernization projects (S/4HANA migrations) create fresh configuration-audit demand.

## 26. Revenue Potential

**PLG funnel assumption:** Free signups (consultants + internal audit teams evaluating) → 10–14% convert to Starter/Pro within 60 days once real SoD/compliance findings are validated → Enterprise sourced from Pro accounts hitting multi-company/compliance needs.

**Year 1:** 4,000 free signups → 450 paying accounts (55% Starter $49, 45% Pro $149; blended ~$94/mo) + 10 Enterprise accounts ($45K avg annual) = ~$507K ARR self-serve + $450K ARR Enterprise = **~$960K ARR**.
**Year 2:** 12,000 signups → 1,500 paying accounts + 35 Enterprise = **$3.5M ARR**.
**Year 3:** 28,000 signups → 3,800 paying accounts + 90 Enterprise = **$9M ARR**.
**Year 5:** 70,000 signups → 9,500 paying accounts + 230 Enterprise = **$24M ARR**.

**Expansion revenue:** Starter → Pro upgrade (30% of Starter accounts within 12 months for SoD checks + AI Compliance Copilot), Enterprise custom compliance rule packs (+$20K–$80K/org/year), consultant channel referral expansion (each partner brings 3–5 client engagements/year).

**Unit economics:**
- CAC (self-serve): ~$150 (compliance/audit community content, consultant word-of-mouth; near-zero paid acquisition).
- CAC (Enterprise, sales-assisted): ~$10K (outbound + 4-month cycle; 28% close rate).
- LTV (self-serve, 3-year retention, $94/mo blended avg): ~$3,384.
- LTV (Enterprise, 4-year retention, $45K/year): ~$180K.
- Blended LTV:CAC ratio: ~14–16× (strong for SaaS).

## 27. Technical Difficulty (Inverted: 5 = Easy/Low-Risk)

**Rating: 2 / 5** (High difficulty)

**Why not 5:**
- Parsing and interpreting ERP configuration exports (SAP, Oracle ERP, Microsoft Dynamics each have wildly different schemas, terminology, and configuration models) is a deep, ERP-specific domain problem — not a generic data-ingestion task.
- Segregation-of-duties conflict detection requires building and validating accurate conflict matrices per ERP system (which role/permission combinations are actually risky) — getting this wrong (false positives or missed conflicts) destroys credibility with a highly technical, skeptical audience.
- AI-generated findings must be accurate and defensible — a wrong "this is a compliance violation" claim in front of an external auditor is a serious credibility failure, not a minor bug.

**Why not 1:**
- Import-based scanning (Phase 1) avoids the hardest problem (live ERP API integration) by starting with configuration exports the customer already has.
- Compliance rule evaluation itself (once configuration is normalized into a common internal schema) is standard rule-engine logic.
- LLM-based explanation generation (the AI audit summary) is a well-understood application of structured-output prompting once the underlying finding is correctly detected.

**Risk mitigation:**
- Start with SAP configuration parsing only in Phase 1 (largest install base), expand to Oracle/Dynamics in Phase 2 rather than attempting all three ERPs simultaneously.
- Validate the SoD conflict matrix against real, anonymized customer configuration data with design-partner input before general availability.
- Every AI finding surfaces its underlying rule/evidence, not just a conclusion, so an auditor can verify the reasoning rather than blindly trust it.

**Scalability:** Configuration exports are batch-processed (not real-time), so ingestion scales via standard queue-based worker architecture. Handles enterprises with tens of thousands of configured roles/permissions per scan without rearchitect.

## 28. AI Differentiation

**AI capabilities (Phase 1 & 2):**

1. **AI ERP Auditor / audit summary (Phase 1, killer feature):** For every finding, explains which configuration is incorrect, why it's risky, the compliance impact, the recommended fix, and the business impact.
2. **AI Risk Detection (Phase 1):** Prioritizes findings by actual business risk, not just rule-hit count, so the highest-impact issues surface first.
3. **AI Root Cause Detection (Phase 1, Pro):** Traces a finding back to the specific configuration change or role assignment that introduced it.
4. **AI Compliance Advisor (Phase 1 stretch / Phase 2):** Interactive Q&A on findings ("why is this flagged?", "what's the fastest fix?").
5. **AI Process Optimization (Phase 2):** Recommends process/workflow improvements beyond pure compliance (e.g., approval routing efficiency).
6. **Predictive Risk Analysis (Phase 2):** Flags configuration changes likely to introduce new compliance risk before they're finalized.

**Why AI matters:**
- Raw ERP configuration data is dense and ERP-specific jargon-heavy; AI translation into plain-language, business-relevant findings is what makes the tool usable by compliance/finance staff who aren't ERP configuration specialists.
- SoD conflict detection at scale (thousands of role/permission combinations) is infeasible manually; AI-assisted analysis makes it tractable.
- Root cause detection turns "here's a problem" into "here's exactly what caused it and when," dramatically speeding remediation.

**How it's differentiated:**
- SAP GRC and Oracle Risk Management surface rule-hits in technical, ERP-native language; ERPAudit's AI layer translates findings into business-relevant explanations non-specialists can act on.
- No competitor in this space has made AI-generated, audit-ready narrative explanation their core product bet — they're rule engines with dashboards, not explanation engines.

## 29. Scalability Plan

- **Configuration volume:** Enterprise ERP systems can have tens of thousands of configured roles/permissions; scanning is batch/queue-based, not real-time, so volume scales horizontally via worker pools.
- **Multi-tenancy:** Every scan, finding, and report scoped by organization_id and erp_instance_id.
- **Consultant multi-client model:** A single consulting-firm account manages many client ERP instances, each isolated but visible under one consultant dashboard — architected from day one, not retrofitted.
- **Growth path:** Shared infrastructure up to hundreds of organizations; then dedicated scanning workers per high-volume enterprise/consulting-firm customer.

## 30. Build Recommendation

**Verdict: BUILD**

**Biggest reason:** ERP compliance and SoD violations are a severe, recurring, high-stakes pain (audit findings, fraud exposure) with no accessible solution between "do it manually in spreadsheets" and "buy an enterprise-only, multi-month-implementation GRC suite." ERPAudit's AI-explained findings and mid-market pricing fill a real, underserved gap, and the consultant/partner channel creates a natural, low-CAC distribution multiplier (each partner brings recurring client engagements). Strong unit economics (14–16× LTV:CAC) and a large market (20K SAM organizations) support a credible path to $20M+ ARR by Year 5.

**Biggest risk:** ERP configuration parsing and SoD conflict detection are genuinely hard, ERP-specific domain problems — a wrong or missed finding in front of a skeptical audit/compliance audience destroys credibility fast, more so than in most other categories in this portfolio. Contingency: Launch with SAP-only configuration parsing (largest install base) and validate the SoD conflict matrix against real, anonymized customer data with 3–5 design-partner consultants/audit teams before general availability; expand to Oracle/Dynamics only after SAP accuracy is proven.

**If Build — the one thing that most needs to go right:** Achieve validated accuracy on the SAP SoD conflict matrix and configuration rule library — confirmed correct against real customer data by design-partner auditors/consultants — before general availability. This single credibility bar determines whether ERPAudit is trusted as a real audit tool or dismissed as a noisy checklist generator; everything else in the roadmap depends on clearing it first.

---

## Validation Checklist

- [x] Vision is crisp and differentiated (AI-explained ERP compliance, not just a GRC rule engine).
- [x] Problem is quantified (undetected SoD violations, multi-week manual audit prep, stale annual reviews).
- [x] Target customer has real pain and budget (internal audit/compliance teams, ERP consultants, CA firms).
- [x] Business value ties to jobs-to-be-done (plain-language findings, SoD detection, fast audit prep, change tracking, consultant health-checks).
- [x] Competitors include status quo (manual review) and honest strengths/weaknesses for SAP GRC, Oracle Risk Management, Pathlock/SafePaaS, AuditBoard/Workiva.
- [x] Market gaps sourced to competitor analysis.
- [x] Positioning differentiates vs. SAP GRC/Oracle Risk Management (price, speed, plain-language AI explanation).
- [x] Feature classification traces musts to pains/JTBD.
- [x] Pricing ties to value (ERP instance + user count scale; AI capability gates at Pro).
- [x] AI differentiation specific (AI ERP Auditor, Risk Detection, Root Cause Detection, Compliance Advisor, Predictive Risk Analysis).
- [x] Technical difficulty justified (2/5 — ERP-specific parsing and SoD accuracy are genuinely hard; import-based scanning avoids the hardest live-integration problem in Phase 1).
- [x] Build recommendation includes biggest reason, risk, and one critical success factor.

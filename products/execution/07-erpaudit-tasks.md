# ERPAudit — Epics, Features & Tasks

> Mined from `products/erpaudit/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `EA`.

---

## Epic EA-1: ERP Configuration Ingestion

**Goal:** Import-based (read-only) configuration scanning — deliberately avoids the hardest problem (live ERP API integration) in Phase 1, per §27.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| EA-1.1 | Prisma schema: erp_instances, configuration_snapshots, findings, sod_conflicts | P0 | M | SH-ORG-1 | No |
| EA-1.2 | SAP configuration export parser (largest install base, per §27 launch priority) | P0 | L | EA-1.1, SH-STORAGE-2 | No |
| EA-1.3 | Oracle ERP configuration export parser (Phase 2) | P2 | L | EA-1.1 | Yes |
| EA-1.4 | Microsoft Dynamics configuration export parser (Phase 2) | P2 | L | EA-1.1 | Yes |
| EA-1.5 | Configuration normalization layer (map vendor-specific schemas to a common internal model) | P0 | L | EA-1.2 | No |

---

## Epic EA-2: Compliance & SoD Engine

**Goal:** The core detection logic — compliance rule checks plus segregation-of-duties conflict analysis.

### Feature EA-2.1: Compliance Checker

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| EA-2.1.1 | Compliance rule library (SOX-relevant controls, common SoD conflicts) | P0 | L | EA-1.5 | No |
| EA-2.1.2 | Rule evaluation engine | P0 | M | EA-2.1.1 | No |
| EA-2.1.3 | Process validation (approval thresholds, four-eyes controls) | P0 | M | EA-2.1.1 | Yes |

### Feature EA-2.2: Segregation of Duties (SoD)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| EA-2.2.1 | SoD conflict matrix (SAP role/permission combinations) | P1 | L | EA-1.5 | No |
| EA-2.2.2 | SoD conflict detection service | P1 | M | EA-2.2.1 | No |
| EA-2.2.3 | SoD accuracy validation harness (validated against real, anonymized customer data with design-partner review per §30 — hard gate) | P0 | L | EA-2.2.2 | No |

### Feature EA-2.3: Change Tracking

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| EA-2.3.1 | Configuration snapshot diffing (what changed since last scan) | P0 | M | EA-1.5 | No |
| EA-2.3.2 | Change history timeline UI | P0 | S | EA-2.3.1, SH-DASH-7 | Yes |

---

## Epic EA-3: AI ERP Auditor (Killer Feature)

**Goal:** Plain-language explanation of every finding — what's wrong, why it's risky, compliance impact, fix, business impact.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| EA-3.1 | AI audit summary generator (structured explanation per finding) | P0 | L | EA-2.1.2, SH-AI-1, SH-AI-3 | No |
| EA-3.2 | AI Risk Detection (prioritize findings by business risk, not just rule-hit count) | P1 | M | EA-3.1, SH-AI-1 | No |
| EA-3.3 | AI Root Cause Detection (trace a finding to the change that introduced it) | P1 | L | EA-3.1, EA-2.3.1 | No |
| EA-3.4 | AI Compliance Advisor (interactive Q&A on findings, Phase 1 stretch) | P2 | L | EA-3.1, SH-AI-8 | No |
| EA-3.5 | Evidence/reasoning surfacing (every finding shows underlying rule so an auditor can verify, per §27 risk mitigation) | P0 | S | EA-3.1 | No |

---

## Epic EA-4: Dashboard, Reports & Approval Workflow

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| EA-4.1 | Risk dashboard (compliance score, high-risk issues, config errors, process violations) | P0 | M | EA-2.1.2, SH-DASH-2 | No |
| EA-4.2 | Exportable compliance reports | P0 | M | EA-4.1, SH-REPORT-2 | Yes |
| EA-4.3 | Approval workflow (findings remediation tracking, Pro tier) | P1 | M | EA-4.1, SH-AI-11 | Yes |
| EA-4.4 | Multi-company support (Pro tier — consultant multi-client model) | P1 | M | SH-ORG-2 | Yes |

---

## Epic EA-5: Roles, Admin & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| EA-5.1 | Admin, Auditor, Viewer role wiring | P0 | S | SH-ORG-5 | No |
| EA-5.2 | ERP Systems / Companies / Compliance Rules admin modules | P1 | M | SH-ADMIN-1 | Yes |
| EA-5.3 | Custom compliance rule engine (Enterprise tier) | P2 | L | EA-2.1.1, SH-ADMIN-1 | Yes |
| EA-5.4 | Wire ERPAudit entitlements into `SH-BILL` (Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2 | No |

---

## ERPAudit Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| EA-1 ERP Configuration Ingestion | 5 | 3 |
| EA-2 Compliance & SoD Engine | 8 | 5 |
| EA-3 AI ERP Auditor | 5 | 2 |
| EA-4 Dashboard, Reports & Approval Workflow | 4 | 2 |
| EA-5 Roles, Admin & Billing | 4 | 2 |
| **Total** | **26** | **14** |

**Note:** EA-2.2.3 (SoD accuracy harness) is the hardest gate in this product — per §30, a wrong or missed finding in front of a skeptical audit/compliance audience destroys credibility fast. SAP-only scope in Phase 1 (EA-1.2) is a deliberate risk-reduction choice, not a shortcut.

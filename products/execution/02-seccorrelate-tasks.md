# SecCorrelate — Epics, Features & Tasks

> Mined from `products/seccorrelate/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `SC`.

---

## Epic SC-1: Log Ingestion & Correlation Infrastructure

**Goal:** The real-time data pipeline everything else depends on — this is the highest-risk epic in the product (per PRODUCT_IDENTITY §27, technical difficulty 2/5).

### Feature SC-1.1: Stream Processing Foundation

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-1.1.1 | Stream processing infrastructure (Kafka/Flink or equivalent, per PRODUCT_IDENTITY §27 scalability plan) | P0 | L | SH-DEVOPS-4 | No |
| SC-1.1.2 | Prisma/ClickHouse schema: log_sources, log_events, alerts, correlations, rules | P0 | M | SH-ORG-1 | No |
| SC-1.1.3 | Log ingestion API (webhook + agent-based intake) | P0 | M | SC-1.1.1, SC-1.1.2, SH-API-1 | No |

### Feature SC-1.2: Data Source Connectors

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-1.2.1 | Firewall log connector | P0 | M | SC-1.1.3, SH-INTEG-5 | Yes |
| SC-1.2.2 | EDR connector (CrowdStrike, Defender) | P0 | M | SC-1.1.3, SH-INTEG-5 | Yes |
| SC-1.2.3 | IAM connector (Okta, Azure AD) | P0 | M | SC-1.1.3, SH-INTEG-5 | Yes |
| SC-1.2.4 | Application log connector (webhook-based) | P0 | S | SC-1.1.3, SH-API-1 | Yes |
| SC-1.2.5 | DNS log connector | P1 | M | SC-1.1.3, SH-INTEG-5 | Yes |
| SC-1.2.6 | Log format normalization layer (per-source parser, isolated so one format change doesn't cascade — per PRODUCT_IDENTITY §27 risk mitigation) | P0 | M | SC-1.2.1..5 | No |

---

## Epic SC-2: Correlation Rule Engine

**Goal:** No-code correlation rules — the core differentiator vs. Splunk/Sentinel.

### Feature SC-2.1: Rule Engine Core

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-2.1.1 | Rule evaluation engine (boolean logic, real-time, <100ms per alert per §27 performance budget) | P0 | L | SC-1.1.1 | No |
| SC-2.1.2 | No-code rule builder UI | P0 | L | SC-2.1.1, SH-DASH-2 | No |
| SC-2.1.3 | Rule versioning/audit trail | P1 | S | SC-2.1.1, SH-AUDIT-1 | Yes |

### Feature SC-2.2: Rule Templates

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-2.2.1 | Brute force detection template | P1 | S | SC-2.1.1 | Yes |
| SC-2.2.2 | Lateral movement detection template | P1 | S | SC-2.1.1 | Yes |
| SC-2.2.3 | Data exfiltration detection template | P1 | S | SC-2.1.1 | Yes |
| SC-2.2.4 | Ransomware pattern detection template | P1 | S | SC-2.1.1 | Yes |
| SC-2.2.5 | Rule template accuracy validation harness (test against historical breach data, target >90% detection accuracy per §30) | P0 | L | SC-2.2.1..4 | No |

### Feature SC-2.3: Alert Aggregation & Deduplication

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-2.3.1 | Alert deduplication service (group related raw alerts into one incident) | P0 | M | SC-2.1.1 | No |
| SC-2.3.2 | Alert severity scoring | P0 | M | SC-2.3.1, SH-AI-1 | No |

---

## Epic SC-3: AI Investigation & Threat Timeline

**Goal:** Automated context retrieval and the AI Incident Graph killer feature.

### Feature SC-3.1: Automated Alert Investigation

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-3.1.1 | Context retrieval service (pull related user/endpoint/network history for a triggered alert) | P0 | M | SC-1.1.3 | No |
| SC-3.1.2 | AI incident summary generation | P0 | M | SC-3.1.1, SH-AI-1, SH-AI-3 | No |

### Feature SC-3.2: Threat Timeline / AI Incident Graph (Killer Feature)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-3.2.1 | Timeline reconstruction engine (correlate related alerts into one attack sequence) | P0 | L | SC-2.3.1 | No |
| SC-3.2.2 | AI Incident Graph visualization (connects related alerts into a single attack timeline) | P0 | L | SC-3.2.1, SH-DASH-7 | No |
| SC-3.2.3 | Recommended-next-action generator | P0 | M | SC-3.2.2, SH-AI-1, SH-AI-11 | No |
| SC-3.2.4 | MITRE ATT&CK mapping | P1 | M | SC-3.2.1 | Yes |
| SC-3.2.5 | Root cause analysis service | P1 | M | SC-3.2.1, SH-AI-1 | Yes |

### Feature SC-3.3: Threat Hunting

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-3.3.1 | Threat hunting dashboard (IOC search, tactical queries) | P1 | M | SH-SEARCH-2, SH-DASH-2 | No |
| SC-3.3.2 | Playbooks (automated response sequences) | P1 | M | SC-3.2.3, SH-AI-11 | Yes |

---

## Epic SC-4: AI Baseline Learning & Anomaly Detection (Phase 2)

**Goal:** Per-customer normal-behavior learning to cut false positives.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-4.1 | Baseline learning model (typical login IPs, file access, data volumes per customer) | P2 | L | SC-1.1.3, SH-AI-1 | No |
| SC-4.2 | Correlated anomaly detection (multi-step chain scoring, e.g. "brute force + login + exfil = APT score 95%") | P2 | L | SC-4.1, SC-2.1.1 | No |
| SC-4.3 | Automated playbook execution on high-confidence APT score | P2 | M | SC-4.2, SC-3.3.2, SH-AI-11 | No |

---

## Epic SC-5: Dashboard, Reporting & Roles

### Feature SC-5.1: Security Dashboard

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-5.1.1 | Alerts-today / active-incidents / high-severity KPI cards | P0 | S | SC-2.3.1, SH-DASH-2 | Yes |
| SC-5.1.2 | False positive rate, MTTD, MTTR metrics | P1 | M | SC-2.3.1 | Yes |
| SC-5.1.3 | AI risk score widget | P1 | S | SC-3.1.2, SH-DASH-2 | Yes |

### Feature SC-5.2: Reports

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-5.2.1 | Basic incident reports | P1 | S | SC-2.3.1, SH-REPORT-1 | Yes |
| SC-5.2.2 | Executive reporting (Phase 2) | P2 | M | SC-5.2.1, SH-REPORT-6 | Yes |

### Feature SC-5.3: Roles & Admin

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-5.3.1 | Register `threat_hunter`, `soc_analyst` product roles | P0 | S | SH-ORG-5 | No |
| SC-5.3.2 | Integrations, Rules, AI Settings, Teams, Roles, Notifications admin modules | P1 | M | SH-ADMIN-1 | Yes |
| SC-5.3.3 | Wire SecCorrelate entitlements into `SH-BILL` (Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2 | No |

---

## Epic SC-6: Managed SOC Service (Phase 2 expansion)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SC-6.1 | Managed SOC request/onboarding workflow | P2 | M | SC-3.3.2 | No |
| SC-6.2 | Analyst-facing internal triage console (for SecCorrelate's own managed-SOC staff) | P2 | L | SC-6.1 | No |

---

## SecCorrelate Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| SC-1 Log Ingestion & Correlation Infrastructure | 9 | 8 |
| SC-2 Correlation Rule Engine | 10 | 5 |
| SC-3 AI Investigation & Threat Timeline | 9 | 6 |
| SC-4 AI Baseline Learning (Phase 2) | 3 | 0 |
| SC-5 Dashboard, Reporting & Roles | 8 | 3 |
| SC-6 Managed SOC (Phase 2) | 2 | 0 |
| **Total** | **41** | **22** |

**Note:** SecCorrelate carries the highest technical risk in the portfolio (PRODUCT_IDENTITY §27: 2/5, and §30 flags 40% probability of missing the >90% detection-accuracy bar). SC-2.2.5 (accuracy validation harness) is a hard gate — per the Wave 1 execution plan, general availability does not proceed without it passing.

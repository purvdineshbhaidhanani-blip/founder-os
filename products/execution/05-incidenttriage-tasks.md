# IncidentTriage — Epics, Features & Tasks

> Mined from `products/incidenttriage/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `IT`.

---

## Epic IT-1: Alert Ingestion & Correlation

**Goal:** Pull incidents from the alerting tools a team already has (PagerDuty, Opsgenie) rather than replacing them.

### Feature IT-1.1: Ingestion

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-1.1.1 | Prisma schema: projects, incidents, alerts, timelines, service_health | P0 | M | SH-ORG-1 | No |
| IT-1.1.2 | PagerDuty webhook connector | P0 | M | IT-1.1.1, SH-INTEG-4 | Yes |
| IT-1.1.3 | Opsgenie webhook connector | P0 | M | IT-1.1.1, SH-INTEG-4 | Yes |
| IT-1.1.4 | Generic direct webhook intake (custom alerting sources) | P1 | S | IT-1.1.1, SH-API-1 | Yes |

### Feature IT-1.2: Alert Correlation

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-1.2.1 | Alert correlation/dedup service (group related alerts into one incident) | P0 | M | IT-1.1.2, IT-1.1.3 | No |
| IT-1.2.2 | Service health status computation (healthy/degraded/down per service) | P0 | M | IT-1.2.1 | No |

---

## Epic IT-2: AI Root Cause Copilot (Killer Feature)

**Goal:** Explain what happened, why, which service failed first, fix, and ETA — in the first 60 seconds.

### Feature IT-2.1: Context Retrieval

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-2.1.1 | Log/metric/deploy context retrieval service (pull related signal for an incident) | P0 | L | IT-1.2.1 | No |
| IT-2.1.2 | Deploy-history integration (correlate incidents to recent changes) | P0 | M | IT-2.1.1, SH-INTEG-5 | Yes |

### Feature IT-2.2: AI Root Cause Analysis

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-2.2.1 | AI root cause hypothesis generator (what/why/which-service/fix/ETA) | P0 | L | IT-2.1.1, SH-AI-1, SH-AI-3 | No |
| IT-2.2.2 | Confidence scoring on generated hypotheses | P0 | M | IT-2.2.1, SH-AI-1 | No |
| IT-2.2.3 | Accuracy validation harness (replay mode against historical incidents, target >70% directionally-correct per §30) | P0 | L | IT-2.2.1 | No |
| IT-2.2.4 | AI recovery suggestions | P1 | M | IT-2.2.1, SH-AI-1 | Yes |

### Feature IT-2.3: Threat Timeline Reconstruction

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-2.3.1 | Timeline reconstruction engine (deploys, alerts, log spikes in sequence) | P0 | L | IT-1.2.1, IT-2.1.1 | No |
| IT-2.3.2 | Timeline visualization UI | P0 | M | IT-2.3.1, SH-DASH-7 | No |

---

## Epic IT-3: AI Incident Copilot & Postmortem (Phase 1 stretch / Phase 2)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-3.1 | Interactive Q&A on active incident ("has this happened before?") | P1 | L | IT-2.2.1, SH-AI-8 | No |
| IT-3.2 | AI Postmortem Generator (auto-draft from timeline + root cause) | P2 | M | IT-2.3.1, IT-2.2.1, SH-AI-1 | No |
| IT-3.3 | Auto ticket creation (Jira, Phase 2 — requires live credentials) | P2 | M | SH-INTEG-5 | Yes |
| IT-3.4 | Incident prediction (risk-score upcoming deploys, Phase 2) | P2 | L | IT-2.1.2, SH-AI-1 | No |
| IT-3.5 | Change risk analysis (flag deploys resembling past incident causes) | P2 | L | IT-3.4 | No |

---

## Epic IT-4: Dashboard, Reports & Integrations

### Feature IT-4.1: Incident Dashboard

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-4.1.1 | Incident dashboard (active incidents, service health, history) | P0 | M | IT-1.2.2, SH-DASH-2 | No |
| IT-4.1.2 | Incident reports (structured summary per incident) | P0 | S | IT-1.2.1, SH-REPORT-1 | Yes |
| IT-4.1.3 | Custom dashboards (Pro tier) | P1 | M | IT-4.1.1, SH-DASH-2 | Yes |

### Feature IT-4.2: Integrations

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-4.2.1 | Slack integration (built and wired, disabled until Phase 2) | P1 | M | SH-NOTIF-5 | Yes |
| IT-4.2.2 | Jira integration (built and wired, disabled until Phase 2) | P1 | M | SH-INTEG-5 | Yes |
| IT-4.2.3 | Status page integration (Pro tier) | P2 | M | SH-INTEG-5 | Yes |

---

## Epic IT-5: Roles, Admin & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| IT-5.1 | Register `on_call_engineer`, `sre_lead` product roles | P0 | S | SH-ORG-5 | No |
| IT-5.2 | Multi-team support (Pro tier) | P1 | M | SH-ORG-3 | Yes |
| IT-5.3 | Wire IncidentTriage entitlements into `SH-BILL` (Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2 | No |

---

## IncidentTriage Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| IT-1 Alert Ingestion & Correlation | 6 | 5 |
| IT-2 AI Root Cause Copilot | 8 | 6 |
| IT-3 AI Incident Copilot & Postmortem (Phase 2) | 5 | 0 |
| IT-4 Dashboard, Reports & Integrations | 6 | 2 |
| IT-5 Roles, Admin & Billing | 3 | 2 |
| **Total** | **28** | **15** |

**Note:** IT-2.2.3 (accuracy validation harness) is a hard gate — per PRODUCT_IDENTITY §30, a wrong hypothesis during a live 3am incident destroys credibility instantly, so replay-mode validation against 5+ design-partner companies' historical incidents precedes any live on-call deployment.

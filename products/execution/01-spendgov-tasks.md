# SpendGov — Epics, Features & Tasks

> Mined from `products/spendgov/docs/PRODUCT_IDENTITY.md` §7 (Acceptance Criteria) and §18 (Feature Classification). Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` task IDs (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `SG`.

---

## Epic SG-1: Billing & AI Spend Ingestion

**Goal:** Connect to the customer's own billing sources and AI provider accounts to build the raw spend dataset everything else in the product analyzes.

### Feature SG-1.1: SaaS Billing Connectors

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-1.1.1 | Prisma schema: spend_sources, spend_transactions, vendors (product-specific data model) | P0 | M | SH-ORG-1 | No |
| SG-1.1.2 | Stripe connector (read-only billing data pull) | P0 | M | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.1.3 | AWS Cost Explorer connector | P0 | M | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.1.4 | Azure Cost Management connector | P1 | M | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.1.5 | GCP Billing connector | P1 | M | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.1.6 | Zuora connector | P2 | M | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.1.7 | Salesforce Finance Cloud connector | P2 | M | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.1.8 | Manual CSV import for spend data (fallback for unsupported sources) | P0 | S | SG-1.1.1, SH-STORAGE-2 | Yes |
| SG-1.1.9 | Spend ingestion sync scheduler (incremental sync, per-source cadence) | P0 | M | SG-1.1.2..7 | No |

### Feature SG-1.2: AI Service Spend Tracking

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-1.2.1 | OpenAI usage/billing API connector | P0 | S | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.2.2 | Anthropic usage/billing API connector | P0 | S | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.2.3 | AWS Bedrock usage connector | P1 | S | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.2.4 | GCP Vertex AI usage connector | P1 | S | SG-1.1.1, SH-INTEG-5 | Yes |
| SG-1.2.5 | AI spend breakdown by model/department/endpoint aggregation service | P0 | M | SG-1.2.1..4 | No |

---

## Epic SG-2: Subscription & Vendor Inventory

**Goal:** Turn raw ingested transactions into a clean, deduplicated inventory of SaaS subscriptions and vendors.

### Feature SG-2.1: Subscription Discovery

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-2.1.1 | Auto-discovery service (cluster raw transactions into subscriptions by vendor+amount+cadence) | P0 | M | SG-1.1.9 | No |
| SG-2.1.2 | Manual subscription entry UI (for legacy/paper contracts) | P0 | S | SH-DASH-2 | Yes |
| SG-2.1.3 | Subscription categorization (project mgmt, comms, analytics, AI, dev tools, etc.) | P0 | S | SG-2.1.1 | Yes |

### Feature SG-2.2: Vendor Master Data & Deduplication

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-2.2.1 | Vendor master record schema + CRUD | P0 | S | SG-1.1.1 | No |
| SG-2.2.2 | Vendor deduplication service (fuzzy match same vendor across sources) | P1 | M | SG-2.2.1, SH-AI-9 | Yes |
| SG-2.2.3 | Vendor consolidation analysis (spend-per-vendor rollup across departments) | P0 | M | SG-2.2.1, SG-2.1.3 | No |

---

## Epic SG-3: AI Spend Intelligence Engine

**Goal:** The core differentiator — semantic duplicate detection, waste identification, and consolidation recommendations.

### Feature SG-3.1: Duplicate Tool Detection

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-3.1.1 | Tool-category embedding index (semantic similarity between subscriptions) | P0 | M | SG-2.1.3, SH-AI-9 | No |
| SG-3.1.2 | Duplicate detection service (flag overlapping-capability tool pairs, e.g. Jira + Azure DevOps) | P0 | M | SG-3.1.1 | No |
| SG-3.1.3 | Duplicate detection accuracy validation harness (test against 10K+ real SaaS product dataset, target >90% precision per PRODUCT_IDENTITY §30) | P0 | M | SG-3.1.2 | No |

### Feature SG-3.2: Waste Identification

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-3.2.1 | Unused-subscription detection (flag <5% usage where usage signal available) | P0 | M | SG-2.1.1 | Yes |
| SG-3.2.2 | Over-provisioned license detection (requires SSO/usage log input) | P1 | M | SG-3.2.1 | Yes |
| SG-3.2.3 | AI waste-recommendation generator ("consolidate 3 BI tools, save $300K") | P0 | M | SG-3.1.2, SG-3.2.1, SH-AI-1, SH-AI-3 | No |

### Feature SG-3.3: License Utilization Analysis

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-3.3.1 | SSO log import (manual entry Phase 1; live SSO connector Phase 2 built-disabled) | P1 | M | SH-STORAGE-2, SH-INTEG-5 | No |
| SG-3.3.2 | License seat utilization correlation (purchased vs. active) | P1 | M | SG-3.3.1 | No |

---

## Epic SG-4: Renewal & Contract Management

**Goal:** Give finance/procurement 90-day early visibility into renewals and the terms buried in contracts.

### Feature SG-4.1: Renewal Calendar

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-4.1.1 | Renewal date schema + manual entry | P0 | S | SG-2.1.1 | No |
| SG-4.1.2 | Renewal alert scheduler (90+ day advance notice) | P0 | S | SG-4.1.1, SH-NOTIF-2 | No |
| SG-4.1.3 | Renewal calendar dashboard view | P0 | S | SG-4.1.1, SH-DASH-2 | Yes |

### Feature SG-4.2: AI Contract Parsing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-4.2.1 | Contract PDF upload | P1 | S | SH-STORAGE-2 | No |
| SG-4.2.2 | AI contract extraction service (renewal date, terms, commitments via structured output) | P1 | M | SG-4.2.1, SH-AI-1, SH-AI-3 | No |
| SG-4.2.3 | Human-review workflow for extracted contract terms (low-confidence extractions flagged) | P1 | S | SG-4.2.2, SH-AI-11 | No |
| SG-4.2.4 | Negotiation playbook templates (email templates, vendor benchmarks) | P1 | S | SG-4.2.2 | Yes |

---

## Epic SG-5: Spend Dashboard, Forecasting & AI CFO Copilot

**Goal:** The product's primary surface — where the CFO/finance lead actually spends their time, culminating in the killer feature.

### Feature SG-5.1: Spend Dashboard

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-5.1.1 | Total/monthly/AI spend KPI cards | P0 | S | SG-1.1.9, SH-DASH-2 | Yes |
| SG-5.1.2 | Spend-by-category and spend-by-department views | P0 | M | SG-2.1.3, SH-DASH-2 | Yes |
| SG-5.1.3 | Upcoming renewals / duplicate apps / unused licenses widgets | P0 | S | SG-4.1.1, SG-3.1.2, SG-3.2.1, SH-DASH-2 | Yes |
| SG-5.1.4 | Budget status tracking (vs. configured budget per department) | P1 | M | SG-5.1.2 | Yes |

### Feature SG-5.2: Forecasting

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-5.2.1 | Spend forecasting service (trend extrapolation, Phase 1 simple model) | P1 | M | SG-1.1.9 | No |
| SG-5.2.2 | AI spend forecasting v2 (usage-trend + hiring-pattern aware, Phase 2) | P2 | M | SG-5.2.1, SH-AI-1 | No |

### Feature SG-5.3: AI CFO Copilot (Killer Feature)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-5.3.1 | AI recommendation synthesis service (combine dedup + waste + forecast + renewal signal into ranked, dollar-quantified actions) | P0 | L | SG-3.2.3, SG-5.2.1, SH-AI-1, SH-AI-3 | No |
| SG-5.3.2 | AI CFO Copilot chat/query interface | P0 | M | SG-5.3.1, SH-AI-8 | No |
| SG-5.3.3 | Financial-impact estimation per recommendation | P0 | M | SG-5.3.1 | No |

### Feature SG-5.4: Reports & Export

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-5.4.1 | Monthly spend report (PDF/CSV) | P0 | S | SG-5.1.1, SH-REPORT-2, SH-REPORT-3 | Yes |
| SG-5.4.2 | Vendor comparison report | P1 | S | SG-2.2.3, SH-REPORT-1 | Yes |

---

## Epic SG-6: Roles, Admin & Compliance

**Goal:** Product-specific RBAC roles, admin panel modules, and audit trail wiring on top of the shared platform.

### Feature SG-6.1: Product Roles

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-6.1.1 | Register `finance_lead`, `procurement_manager` product roles | P0 | S | SH-ORG-5 | No |
| SG-6.1.2 | Approval workflow for policy/budget changes (Pro tier) | P1 | M | SG-6.1.1, SH-AI-11 | No |

### Feature SG-6.2: Admin Panel Modules

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SG-6.2.1 | Vendors admin module | P0 | S | SG-2.2.1, SH-ADMIN-1 | Yes |
| SG-6.2.2 | Departments admin module | P0 | S | SG-5.1.2, SH-ADMIN-1 | Yes |
| SG-6.2.3 | Budgets admin module | P1 | S | SG-5.1.4, SH-ADMIN-1 | Yes |
| SG-6.2.4 | Wire SpendGov entitlements into `SH-BILL` (Free/Starter/Pro/Enterprise from PRODUCT_IDENTITY §21) | P0 | M | SH-BILL-2 | No |

---

## SpendGov Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| SG-1 Billing & AI Spend Ingestion | 14 | 8 |
| SG-2 Subscription & Vendor Inventory | 6 | 4 |
| SG-3 AI Spend Intelligence Engine | 8 | 6 |
| SG-4 Renewal & Contract Management | 7 | 3 |
| SG-5 Dashboard, Forecasting & AI CFO Copilot | 13 | 8 |
| SG-6 Roles, Admin & Compliance | 6 | 3 |
| **Total** | **54** | **32** |

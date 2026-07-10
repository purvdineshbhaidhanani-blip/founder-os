# ContactVerify — Epics, Features & Tasks

> Mined from `products/contactverify/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `CV`.

---

## Epic CV-1: Core Verification Engine

**Goal:** Email and phone validation — the entry-point, table-stakes capability (per §19, one of the more tractable builds in the portfolio, technical difficulty 4/5).

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CV-1.1 | Prisma schema: contacts, verification_results, duplicate_clusters | P0 | M | SH-ORG-1 | No |
| CV-1.2 | Email validation service (syntax, MX record, deliverability heuristics) | P0 | M | CV-1.1 | Yes |
| CV-1.3 | Phone validation service (format/carrier/line-type via libphonenumber-style library) | P0 | M | CV-1.1 | Yes |
| CV-1.4 | Batch/bulk verification pipeline (async, queue-based per §27) | P0 | M | CV-1.2, CV-1.3 | No |

---

## Epic CV-2: Deduplication

**Goal:** Exact + fuzzy matching, validated for false-merge rate before any auto-merge automation ships (per §27 risk mitigation).

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CV-2.1 | Exact-match deduplication (email + phone) | P0 | S | CV-1.1 | No |
| CV-2.2 | Fuzzy-match deduplication (Levenshtein/phonetic on name/company) | P0 | M | CV-2.1, SH-AI-9 | No |
| CV-2.3 | Duplicate-merge confidence scoring | P1 | M | CV-2.2, SH-AI-1 | No |
| CV-2.4 | Merge suggestion UI (survivor-record selection) | P1 | M | CV-2.3, SH-DASH-3 | No |
| CV-2.5 | False-merge rate validation harness (target well under 1% per §30 — hard gate before any auto-merge automation) | P0 | M | CV-2.3 | No |

---

## Epic CV-3: Enrichment & Health Scoring

### Feature CV-3.1: Contact Enrichment

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CV-3.1.1 | Missing-field detection (completeness scoring) | P0 | S | CV-1.1 | No |
| CV-3.1.2 | AI Data Enrichment (confidently fill missing fields, Phase 2 — third-party data partnership required) | P2 | L | CV-3.1.1, SH-INTEG-2 | No |

### Feature CV-3.2: AI Contact Health Engine (Killer Feature)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CV-3.2.1 | Composite health-score model (validity + dedup + completeness + quality + confidence) | P1 | L | CV-1.2, CV-1.3, CV-2.2, CV-3.1.1, SH-AI-1 | No |
| CV-3.2.2 | AI Lead Quality Score (source + engagement-signal aware) | P1 | M | CV-3.2.1, SH-AI-1 | Yes |
| CV-3.2.3 | Health score accuracy/confidence validation against real customer data (design-partner review per §30) | P0 | M | CV-3.2.1 | No |

---

## Epic CV-4: CRM Sync

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CV-4.1 | HubSpot connector | P0 | M | CV-1.1, SH-INTEG-5 | Yes |
| CV-4.2 | Salesforce connector | P0 | L | CV-1.1, SH-INTEG-5 | Yes |
| CV-4.3 | Sync scheduling (continuous, not batch-and-forget per §15 market gap) | P0 | M | CV-4.1, CV-4.2 | No |

---

## Epic CV-5: Dashboard, Workflow & Reports

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CV-5.1 | Dashboard (total/verified/invalid/duplicate contacts, health score, sync status) | P0 | M | CV-1.4, CV-2.2, SH-DASH-2 | No |
| CV-5.2 | Reports (exportable verification/health reports) | P0 | S | CV-5.1, SH-REPORT-3 | Yes |
| CV-5.3 | Workflow automation (auto-merge high-confidence dupes, auto-flag risky pre-send, Phase 2 gated on CV-2.5) | P2 | M | CV-2.5, SH-NOTIF-2 | No |
| CV-5.4 | Webhook support (Phase 2) | P2 | S | SH-INTEG-3 | Yes |

---

## Epic CV-6: Roles, Admin & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CV-6.1 | Admin/Team Member/Viewer role wiring | P0 | S | SH-ORG-5 | No |
| CV-6.2 | Verification Settings / CRM Integrations / API Keys admin modules | P1 | M | SH-ADMIN-1 | Yes |
| CV-6.3 | Wire ContactVerify entitlements into `SH-BILL` (verification-volume-based Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2, SH-BILL-6 | No |

---

## ContactVerify Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| CV-1 Core Verification Engine | 4 | 4 |
| CV-2 Deduplication | 5 | 3 |
| CV-3 Enrichment & Health Scoring | 5 | 1 |
| CV-4 CRM Sync | 3 | 3 |
| CV-5 Dashboard, Workflow & Reports | 4 | 2 |
| CV-6 Roles, Admin & Billing | 3 | 2 |
| **Total** | **24** | **15** |

**Note:** ContactVerify is one of the more tractable builds in the portfolio (§27: 4/5) — its gates (CV-2.5, CV-3.2.3) exist because the *consequence* of a wrong merge or health score is high (destroys customer data / erodes trust), not because the underlying technique is exotic.

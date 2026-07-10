# CRMCapture — Epics, Features & Tasks

> Mined from `products/crmcapture/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `CR`.

---

## Epic CR-1: Lead Capture

**Goal:** Get leads into the system from every source a sales team actually uses.

### Feature CR-1.1: Capture Channels

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-1.1.1 | Prisma schema: leads, contacts, lead_sources, routing_rules | P0 | M | SH-ORG-1 | No |
| CR-1.1.2 | Web form native embed (JS snippet, form-to-lead capture) | P0 | M | CR-1.1.1, SH-API-1 | No |
| CR-1.1.3 | Email-to-lead capture (parse forwarded/CC'd emails) | P0 | M | CR-1.1.1, SH-EMAIL-1 | Yes |
| CR-1.1.4 | CSV/bulk import | P1 | S | CR-1.1.1, SH-STORAGE-2, SH-INTEG-7 | Yes |
| CR-1.1.5 | LinkedIn direct lead sync (Phase 2, requires partnership) | P2 | L | CR-1.1.1, SH-INTEG-5 | Yes |

---

## Epic CR-2: CRM Sync

**Goal:** Leads flow into the CRM the sales team already lives in — without this, cleanup doesn't stick (per PRODUCT_IDENTITY §19).

### Feature CR-2.1: CRM Connectors

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-2.1.1 | Salesforce connector (auth + bulk sync, rate-limit-aware batching) | P0 | L | CR-1.1.1, SH-INTEG-5 | Yes |
| CR-2.1.2 | HubSpot connector | P0 | M | CR-1.1.1, SH-INTEG-5 | Yes |
| CR-2.1.3 | Pipedrive connector | P1 | M | CR-1.1.1, SH-INTEG-5 | Yes |
| CR-2.1.4 | Sync idempotency layer (queue-based, prevents duplicate-on-retry per §27) | P0 | M | CR-2.1.1, CR-2.1.2 | No |
| CR-2.1.5 | Two-way sync (CRM updates flow back to local record, Phase 1 stretch) | P2 | M | CR-2.1.4 | No |

---

## Epic CR-3: Deduplication & Routing

**Goal:** The two hardest, highest-value pieces per PRODUCT_IDENTITY §11 (pain #2 and #4).

### Feature CR-3.1: Deduplication

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-3.1.1 | Exact-match deduplication (email + phone) | P0 | S | CR-1.1.1 | No |
| CR-3.1.2 | Fuzzy-match deduplication (name similarity, phonetic matching) | P0 | M | CR-3.1.1, SH-AI-9 | No |
| CR-3.1.3 | Deduplication accuracy validation harness (target >85% precision, >80% recall against real datasets per §30) | P0 | M | CR-3.1.2 | No |
| CR-3.1.4 | Merge-suggestion UI (survivor-record selection, confidence display) | P1 | M | CR-3.1.2, SH-DASH-3 | No |

### Feature CR-3.2: Lead Routing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-3.2.1 | Round-robin routing engine | P0 | M | CR-1.1.1, SH-ORG-3 | No |
| CR-3.2.2 | Territory-based routing rules | P1 | M | CR-3.2.1 | Yes |
| CR-3.2.3 | Custom routing rule builder | P1 | M | CR-3.2.1, SH-DASH-3 | Yes |

### Feature CR-3.3: Lead Scoring

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-3.3.1 | Basic lead scoring (by source, static rules) | P1 | S | CR-1.1.1 | No |
| CR-3.3.2 | AI lead scoring (engagement-signal aware, Pro tier) | P1 | M | CR-3.3.1, SH-AI-1 | No |
| CR-3.3.3 | Predictive lead scoring (trained on customer conversion history, Phase 2) | P2 | L | CR-3.3.2, SH-AI-1 | No |

---

## Epic CR-4: AI Sales Assistant (Killer Feature)

**Goal:** Reads emails/transcripts, creates CRM records, updates opportunities, drafts follow-ups — automatically.

### Feature CR-4.1: AI Content Ingestion

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-4.1.1 | AI email parsing/summary service | P0 | M | CR-1.1.3, SH-AI-1, SH-AI-3 | No |
| CR-4.1.2 | AI meeting transcript ingestion + summary | P0 | M | SH-AI-1, SH-AI-3, SH-STORAGE-2 | Yes |
| CR-4.1.3 | AI lead extraction (pull structured lead data from unstructured text) | P0 | M | CR-4.1.1, SH-AI-3 | No |

### Feature CR-4.2: AI-Driven CRM Updates

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-4.2.1 | AI opportunity detection (identify deal-relevant signals from email/call content) | P0 | L | CR-4.1.1, CR-4.1.2, SH-AI-1 | No |
| CR-4.2.2 | Auto-create/update CRM record from AI extraction (human-approval gated per §29 AI framework) | P0 | L | CR-4.2.1, SH-AI-11, CR-2.1.4 | No |
| CR-4.2.3 | AI follow-up email generation | P1 | M | CR-4.1.1, SH-AI-1, SH-AI-11 | Yes |
| CR-4.2.4 | Next-follow-up suggestion engine | P1 | M | CR-4.2.1, SH-AI-1 | Yes |

### Feature CR-4.3: Contact Enrichment

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-4.3.1 | Contact enrichment service (built and wired, disabled until Phase 2 third-party API credentials) | P1 | M | SH-INTEG-2 | No |

---

## Epic CR-5: Dashboard, Roles & Admin

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CR-5.1 | Unified lead dashboard (search, filter, per-lead profile) | P0 | M | CR-1.1.1, SH-DASH-2 | No |
| CR-5.2 | Reports (CSV/bulk export) | P1 | S | CR-5.1, SH-REPORT-3 | Yes |
| CR-5.3 | Wire CRMCapture entitlements into `SH-BILL` (per-seat Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2, SH-BILL-6 | No |
| CR-5.4 | Workflow automation admin module (Phase 2: auto-sequences, task creation) | P2 | M | CR-4.2.3, SH-ADMIN-1 | Yes |

---

## CRMCapture Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| CR-1 Lead Capture | 5 | 3 |
| CR-2 CRM Sync | 5 | 4 |
| CR-3 Deduplication & Routing | 9 | 5 |
| CR-4 AI Sales Assistant | 8 | 5 |
| CR-5 Dashboard, Roles & Admin | 4 | 2 |
| **Total** | **31** | **19** |

**Note:** CR-3.1.3 (dedup accuracy harness) is a hard gate per PRODUCT_IDENTITY §30 — a false merge destroys legitimate customer data, so automated merging stays behind this validation regardless of schedule pressure.

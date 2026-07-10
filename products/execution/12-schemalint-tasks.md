# SchemaLint — Epics, Features & Tasks

> Mined from `products/schemalint/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `SL`.

---

## Epic SL-1: Schema Introspection

**Goal:** Read-only schema scanning across the four Phase 1 engines — metadata-only, so it scales easily regardless of data volume (per §27).

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SL-1.1 | Prisma schema: database_connections, schema_snapshots, tables, relationships, findings | P0 | M | SH-ORG-1 | No |
| SL-1.2 | PostgreSQL introspection connector | P0 | M | SL-1.1, SH-INTEG-5 | Yes |
| SL-1.3 | MySQL introspection connector | P0 | M | SL-1.1, SH-INTEG-5 | Yes |
| SL-1.4 | SQLite introspection connector | P0 | S | SL-1.1 | Yes |
| SL-1.5 | SQL Server introspection connector | P1 | M | SL-1.1, SH-INTEG-5 | Yes |
| SL-1.6 | Oracle / Snowflake / MongoDB / BigQuery connectors (Enterprise tier) | P2 | L | SL-1.1 | Yes |

---

## Epic SL-2: Structural Analysis Engine

**Goal:** Deterministic, rule-based schema analysis — the low-risk foundation the AI recommendation layer builds on.

### Feature SL-2.1: Relationship & Index Analysis

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SL-2.1.1 | Relationship extraction (foreign keys, implied relationships) | P0 | M | SL-1.2, SL-1.3, SL-1.4 | No |
| SL-2.1.2 | Relationship diagram visualization | P0 | M | SL-2.1.1, SH-DASH-7 | No |
| SL-2.1.3 | Index analysis (missing FK indexes, redundant/unused indexes) | P0 | M | SL-2.1.1 | No |

### Feature SL-2.2: Naming & Performance

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SL-2.2.1 | Naming convention validation (configurable, `standards/database.md`-style default) | P0 | S | SL-1.2 | Yes |
| SL-2.2.2 | Performance report (missing indexes, inefficient types, oversized columns) | P0 | M | SL-2.1.3 | No |

---

## Epic SL-3: AI Database Architect (Killer Feature)

**Goal:** Recommend specific fixes, not just flag problems — the entire differentiation thesis vs. SQL linters and native DB tools.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SL-3.1 | AI summary generator (plain-language explanation of top findings) | P0 | L | SL-2.1.3, SL-2.2.2, SH-AI-1, SH-AI-3 | No |
| SL-3.2 | AI Optimization Suggestions (specific, prioritized index/structural recommendations) | P1 | L | SL-3.1, SH-AI-1 | No |
| SL-3.3 | Index Recommendations (specific index, not just "missing") | P1 | M | SL-3.2 | Yes |
| SL-3.4 | Relationship Analysis (implied FKs, orphan risk) | P1 | M | SL-2.1.1, SH-AI-1 | Yes |
| SL-3.5 | Recommendation-accuracy validation (against real production schemas with 3–5 design-partner engineering teams — hard gate per §30) | P0 | M | SL-3.2 | No |

---

## Epic SL-4: Advanced AI Capabilities (Phase 2)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SL-4.1 | AI Migration Generator (safe, additive-first, zero-downtime plans — validated against a benchmark set before any customer runs a recommended migration, per §27) | P2 | L | SL-3.1 | No |
| SL-4.2 | AI Performance Advisor (Pro tier) | P1 | M | SL-2.2.2, SH-AI-1 | Yes |
| SL-4.3 | AI Normalization Review (Pro tier) | P1 | M | SL-2.1.1, SH-AI-1 | Yes |
| SL-4.4 | AI Security Audit (unencrypted sensitive columns, overly permissive access) | P2 | L | SL-1.2, SH-AI-1 | No |
| SL-4.5 | AI Query Optimization | P2 | L | SL-4.2 | No |
| SL-4.6 | AI Architecture Review / auto-generated schema documentation | P2 | M | SL-3.1 | Yes |

---

## Epic SL-5: Dashboard, Team Collaboration & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| SL-5.1 | Dashboard (databases, tables, index/performance score, AI recommendations) | P0 | M | SL-2.1.3, SH-DASH-2 | No |
| SL-5.2 | Team collaboration (Pro tier) | P1 | M | SL-5.1, SH-ORG-3 | Yes |
| SL-5.3 | Export (PDF) | P0 | S | SL-5.1, SH-REPORT-2 | Yes |
| SL-5.4 | Wire SchemaLint entitlements into `SH-BILL` (schema/table-count-based Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2 | No |

---

## SchemaLint Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| SL-1 Schema Introspection | 6 | 4 |
| SL-2 Structural Analysis Engine | 5 | 5 |
| SL-3 AI Database Architect | 5 | 2 |
| SL-4 Advanced AI Capabilities (Phase 2) | 6 | 0 |
| SL-5 Dashboard, Team Collaboration & Billing | 4 | 2 |
| **Total** | **26** | **13** |

**Note:** SL-3.5 is the trust gate for this product's technical audience — per §30, developers immediately test AI recommendations against their own judgment, so a technically correct-but-unhelpful (or worse, wrong) first recommendation erodes trust fast with a hard-to-recover cost.

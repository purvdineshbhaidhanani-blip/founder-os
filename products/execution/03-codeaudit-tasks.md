# CodeAudit — Epics, Features & Tasks

> Mined from `products/codeaudit/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `CA`.

---

## Epic CA-1: PR Integration & Scanning Infrastructure

**Goal:** The CI/CD hook that makes CodeAudit "just work" inside a developer's existing workflow — this is the fastest-path-to-value epic (per Wave 1 plan, CodeAudit ships first).

### Feature CA-1.1: Source Control Integration

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-1.1.1 | Prisma schema: repositories, scans, issues, recommendations | P0 | M | SH-ORG-1 | No |
| CA-1.1.2 | GitHub App integration (PR webhook, repo access) | P0 | L | CA-1.1.1, SH-INTEG-5, SH-INTEG-4 | No |
| CA-1.1.3 | GitLab integration | P1 | L | CA-1.1.1, SH-INTEG-5 | Yes |
| CA-1.1.4 | Bitbucket integration | P1 | M | CA-1.1.1, SH-INTEG-5 | Yes |
| CA-1.1.5 | CI/CD status check API (fail-PR-on-high-severity policy) | P0 | M | CA-1.1.2 | No |

### Feature CA-1.2: Scan Orchestration

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-1.2.1 | Distributed scan worker pool (per-language isolation) | P0 | L | SH-DEVOPS-4 | No |
| CA-1.2.2 | Incremental scanning (only changed files, not whole repo — perf budget <1min/PR per §27) | P0 | M | CA-1.2.1 | No |
| CA-1.2.3 | Scan result caching | P1 | S | CA-1.2.1 | Yes |

---

## Epic CA-2: SAST — Vulnerability & Quality Detection

**Goal:** The core scanning engine — OWASP Top 10 + code quality, scoped to 3 languages in Phase 1 per §19.

### Feature CA-2.1: Language Support

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-2.1.1 | JavaScript/TypeScript AST parsing + rule evaluation | P0 | L | CA-1.2.1 | Yes |
| CA-2.1.2 | Python AST parsing + rule evaluation | P0 | L | CA-1.2.1 | Yes |
| CA-2.1.3 | Java/Go AST parsing + rule evaluation | P1 | L | CA-1.2.1 | Yes |
| CA-2.1.4 | Ruby/PHP support (Starter tier expansion) | P2 | L | CA-1.2.1 | Yes |
| CA-2.1.5 | C#/additional languages (Professional tier expansion) | P2 | L | CA-1.2.1 | Yes |

### Feature CA-2.2: Vulnerability Rules

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-2.2.1 | OWASP Top 10 rule set (SQLi, XSS, insecure deserialization, weak crypto, etc.) | P0 | L | CA-2.1.1, CA-2.1.2 | No |
| CA-2.2.2 | CWE 25 rule set expansion (Starter tier) | P1 | M | CA-2.2.1 | Yes |
| CA-2.2.3 | Rule accuracy validation harness (10K+ open-source repos, target >85% precision per §30) | P0 | L | CA-2.2.1 | No |

### Feature CA-2.3: Code Quality Rules

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-2.3.1 | Complexity/duplication/style rule set | P0 | M | CA-2.1.1, CA-2.1.2 | No |
| CA-2.3.2 | Technical debt quantification (effort-to-fix scoring) | P0 | M | CA-2.3.1 | No |

### Feature CA-2.4: Secret & Dependency Scanning (Pro tier)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-2.4.1 | Secret detection scanner | P1 | M | CA-1.2.1 | Yes |
| CA-2.4.2 | Dependency vulnerability scanner (CVE matching) | P1 | M | CA-1.2.1 | Yes |
| CA-2.4.3 | Container scanning | P2 | M | CA-1.2.1 | Yes |

---

## Epic CA-3: AI Fix Engine (Killer Feature)

**Goal:** Turn "SQL Injection Found" into a mergeable, production-ready patch.

### Feature CA-3.1: Educational Feedback

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-3.1.1 | AI explanation generator (why a finding matters, business impact) | P1 | M | CA-2.2.1, SH-AI-1, SH-AI-3 | No |
| CA-3.1.2 | Risk scoring per finding (severity + likelihood + context) | P0 | M | CA-2.2.1, SH-AI-1 | No |

### Feature CA-3.2: AI Fix Suggestions

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-3.2.1 | AI patch generation service (produces a secure, mergeable code diff) | P0 | L | CA-2.2.1, SH-AI-1, SH-AI-3, SH-AI-11 | No |
| CA-3.2.2 | Auto-fix suggestion UI (accept/reject in PR comment or dashboard) | P0 | M | CA-3.2.1 | No |
| CA-3.2.3 | Fix accuracy validation harness (test suggested patches don't break builds) | P0 | M | CA-3.2.1 | No |

### Feature CA-3.3: AI-Assisted Triage (Phase 2)

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-3.3.1 | Smart false-positive detection (learn from developer "dismiss" feedback) | P2 | L | CA-2.2.1, SH-AI-1 | No |
| CA-3.3.2 | Architectural pattern detection (circular dependencies, god objects) | P2 | L | CA-2.1.1 | No |

---

## Epic CA-4: Dashboard, Debt Tracking & Reports

### Feature CA-4.1: Code Health Dashboard

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-4.1.1 | Unified code health dashboard (spend by language, issue severity) | P0 | M | CA-2.2.1, CA-2.3.1, SH-DASH-2 | No |
| CA-4.1.2 | Issue triage UI (filter, dismiss, remediate) | P0 | M | CA-4.1.1 | No |
| CA-4.1.3 | Technical debt reports (team/org-level) | P1 | M | CA-2.3.2, SH-REPORT-1 | Yes |

### Feature CA-4.2: Onboarding & Freemium Flow

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-4.2.1 | Free-signup onboarding flow (no credit card, connect first repo) | P0 | M | CA-1.1.2, SH-BILL-4 | No |
| CA-4.2.2 | Free-to-paid conversion prompts (limit banners, upgrade CTAs) | P0 | S | SH-BILL-9 | Yes |

---

## Epic CA-5: Roles, Admin & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| CA-5.1 | Per-developer seat-based entitlement wiring into `SH-BILL` (Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2, SH-BILL-6 | No |
| CA-5.2 | Team dashboard admin module (org-wide, multi-org) | P1 | M | CA-4.1.1, SH-ADMIN-1 | Yes |
| CA-5.3 | Custom rules admin module (Enterprise tier) | P2 | M | CA-2.2.1, SH-ADMIN-1 | Yes |

---

## CodeAudit Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| CA-1 PR Integration & Scanning Infrastructure | 8 | 6 |
| CA-2 SAST — Vulnerability & Quality Detection | 13 | 6 |
| CA-3 AI Fix Engine | 7 | 4 |
| CA-4 Dashboard, Debt Tracking & Reports | 5 | 4 |
| CA-5 Roles, Admin & Billing | 3 | 1 |
| **Total** | **36** | **21** |

**Note:** Per the Wave 1 execution plan, CodeAudit is Rank 1 (fastest MVP, validates shared platform first). CA-2.2.3 (accuracy validation harness) is a hard gate — general availability does not proceed without >85% SAST precision validated pre-launch.

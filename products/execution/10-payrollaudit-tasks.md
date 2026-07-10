# PayrollAudit — Epics, Features & Tasks

> Mined from `products/payrollaudit/docs/PRODUCT_IDENTITY.md` §7 and §18. Shared-platform dependencies reference `products/execution/00-shared-platform-tasks.md` (`SH-*`).

**Scale key:** S = 1–3 days, M = 4–10 days, L = 10+ days. **ID prefix:** `PA`.

---

## Epic PA-1: Payroll & Attendance Ingestion

**Goal:** Import-based validation (read-only) — deliberately avoids live payroll-system write access in Phase 1, per §27.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| PA-1.1 | Prisma schema: companies, employees, payroll_runs, payroll_line_items, attendance_records, findings | P0 | M | SH-ORG-1 | No |
| PA-1.2 | Payroll import (spreadsheet/payroll-software export parser) | P0 | M | PA-1.1, SH-STORAGE-2 | No |
| PA-1.3 | Attendance import (timesheet reconciliation source) | P0 | M | PA-1.1, SH-STORAGE-2 | Yes |
| PA-1.4 | Multi-jurisdiction data model (start with one primary jurisdiction, per §27 risk mitigation) | P0 | M | PA-1.1 | No |

---

## Epic PA-2: Validation Engine

**Goal:** The core, accuracy-critical calculation and compliance checks — must be precise (per §27, this is the trust-critical domain in the entire portfolio).

### Feature PA-2.1: Payroll & Tax Validation

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| PA-2.1.1 | Salary calculation validation engine (gross-to-net formulas) | P0 | L | PA-1.2 | No |
| PA-2.1.2 | Tax rule library (one primary jurisdiction at launch) | P0 | L | PA-1.4 | No |
| PA-2.1.3 | Tax withholding validation service | P0 | M | PA-2.1.2 | No |
| PA-2.1.4 | Overtime validation | P0 | M | PA-2.1.1 | Yes |
| PA-2.1.5 | Calculation/tax-rule accuracy validation harness (against real, anonymized customer payroll data with design-partner review — hard gate per §30) | P0 | L | PA-2.1.1, PA-2.1.3 | No |

### Feature PA-2.2: Attendance Reconciliation

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| PA-2.2.1 | Attendance-to-pay reconciliation engine (missing/mismatched hours) | P0 | M | PA-1.3, PA-2.1.1 | No |

---

## Epic PA-3: AI Payroll Copilot (Killer Feature)

**Goal:** Pre-disbursement, plain-language findings with recommended fixes.

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| PA-3.1 | AI error detection layer (beyond rule-based validation — subtler patterns, edge-case interactions) | P1 | L | PA-2.1.1, PA-2.2.1, SH-AI-1, SH-AI-3 | No |
| PA-3.2 | AI-explained findings (what's wrong, why, recommended fix) | P1 | M | PA-3.1, SH-AI-1 | No |
| PA-3.3 | AI Fraud Detection (duplicate payments, unauthorized changes, Phase 2) | P2 | L | PA-3.1, SH-AI-1 | No |
| PA-3.4 | AI Salary Forecasting (Pro tier) | P1 | M | PA-1.2, SH-AI-1 | Yes |
| PA-3.5 | AI Compliance Monitoring (continuous drift-checking as regulations change, Phase 2) | P2 | M | PA-2.1.2 | No |

---

## Epic PA-4: Dashboard, Reports & Workflow

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| PA-4.1 | Employee dashboard (per-employee status, flagged issues) | P0 | M | PA-2.1.1, SH-DASH-2 | No |
| PA-4.2 | Payroll dashboard (status, errors, compliance score, cost) | P0 | M | PA-4.1 | Yes |
| PA-4.3 | Compliance reports (exportable) | P0 | S | PA-2.1.3, SH-REPORT-2 | Yes |
| PA-4.4 | Workflow approvals (Pro tier) | P1 | M | PA-4.1, SH-AI-11 | Yes |
| PA-4.5 | Multi-company support (Pro tier) | P1 | M | SH-ORG-2 | Yes |

---

## Epic PA-5: Roles, Admin & Billing

| Task ID | Task | Priority | Effort | Dependencies | Parallel |
|---|---|---|---|---|---|
| PA-5.1 | Admin/Payroll Reviewer/Viewer role wiring | P0 | S | SH-ORG-5 | No |
| PA-5.2 | Companies / Employees / Payroll Rules / Tax Settings admin modules | P1 | M | SH-ADMIN-1 | Yes |
| PA-5.3 | Wire PayrollAudit entitlements into `SH-BILL` (employee-count-based Free/Starter/Pro/Enterprise from §21) | P0 | M | SH-BILL-2 | No |

---

## PayrollAudit Summary

| Epic | Tasks | P0 tasks |
|---|---|---|
| PA-1 Payroll & Attendance Ingestion | 4 | 4 |
| PA-2 Validation Engine | 6 | 6 |
| PA-3 AI Payroll Copilot | 5 | 0 |
| PA-4 Dashboard, Reports & Workflow | 5 | 3 |
| PA-5 Roles, Admin & Billing | 3 | 2 |
| **Total** | **23** | **15** |

**Note:** PA-2.1.5 is the single most consequential gate in this portfolio — per §30, an incorrect payment reaching an employee is categorically worse than a false alarm, so this validation harness is treated as non-negotiable before any customer's real payroll run touches the system.

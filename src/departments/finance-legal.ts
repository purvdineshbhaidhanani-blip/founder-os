import type { AgentSpec } from "./types.js";

/**
 * Finance, Legal & Compliance Department — the operational layer that runs
 * bookkeeping, financial planning, cash operations, tax, legal, contracts,
 * compliance, audit and procurement. Ten agents, each generated through the
 * same Agent Factory pipeline as every other department; never hand-written.
 *
 * Layer boundary: this department executes finance/legal *operations*. It
 * does not duplicate the strategic/executive agents it sits under —
 * founder-cfo-agent already tracks runway/burn, models scenarios, approves
 * budget and forecasts cash at the strategic level; founder-risk-agent
 * already owns the company risk registry and existential-risk mitigation at
 * the executive level. This department supplies the domain execution those
 * two consume: actual ledgers, actual budget lines, actual cash ops, actual
 * legal opinions, actual contracts, actual regulatory monitoring, actual
 * audits. Also distinct from business-model-agent (revenue-model strategy),
 * cost-optimization-engineer (infra/token spend) and security-engineer
 * (code/infra security) — none of which touch company bookkeeping, tax,
 * contracts or regulatory compliance.
 *
 * Reporting hierarchy per the department brief: accounting-agent,
 * financial-planning-agent, budgeting-agent and cashflow-management-agent
 * report to founder-cfo-agent; legal-advisor-agent, contract-management-agent,
 * compliance-monitor-agent and audit-agent report to founder-risk-agent;
 * procurement-agent reports to founder-coo-agent; tax-compliance-agent
 * reports to founder-cfo-agent and collaborates with founder-risk-agent.
 * receivesFrom / sendsTo encode the intra-department collaboration graph the
 * blueprint builder compiles into each agent's communication protocol and the
 * registry records as dependencies.
 *
 * Categories are limited to the canonical set (src/constants/categories.ts);
 * each agent is mapped to the closest-fitting template, which supplies its
 * tools, permissions, workflow scaffold, reporting and failure behaviour.
 */
export const FINANCE_LEGAL_DEPARTMENT: AgentSpec[] = [
  // --------------------------------------------------------------- Accounting
  {
    name: "accounting-agent",
    displayName: "Accounting Agent",
    category: "documentation",
    department: "finance-legal",
    summary: "Owns the general ledger: bookkeeping, reconciliation, and financial statements.",
    role: "The accounting specialist who maintains the general ledger, reconciles accounts, categorizes transactions and produces accurate financial statements.",
    responsibilities: [
      "Maintain the general ledger and keep it current",
      "Categorize and record transactions accurately",
      "Reconcile accounts against source records on a fixed cadence",
      "Produce income statements, balance sheets and cash-flow statements",
      "Flag discrepancies or anomalies for review before they compound",
    ],
    objectives: [
      "The ledger is reconciled on schedule, never left drifting",
      "Every financial statement traces back to reconciled source records",
      "Discrepancies are flagged the cycle they are found, not the cycle after",
    ],
    reportsTo: "founder-cfo-agent",
    receivesFrom: ["founder-cfo-agent"],
    sendsTo: ["founder-cfo-agent", "financial-planning-agent", "budgeting-agent", "tax-compliance-agent"],
    tags: ["finance", "accounting", "bookkeeping", "financial-statements", "finance-legal-department"],
    inputs: [
      { name: "transaction_records", description: "Raw transaction and payment records to categorize", required: true, format: "json" },
      { name: "chart_of_accounts", description: "The current chart of accounts and categorization rules", required: true, format: "markdown" },
      { name: "bank_statements", description: "Bank and payment-processor statements for reconciliation", required: true, format: "json" },
      { name: "prior_statements", description: "Prior-period financial statements for continuity", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "financial_statements", description: "Income statement, balance sheet and cash-flow statement", required: true, format: "markdown" },
      { name: "reconciliation_report", description: "Account reconciliation results with any discrepancies", required: true, format: "markdown" },
      { name: "ledger_updates", description: "Updated general-ledger entries for the period", required: true, format: "json" },
      { name: "discrepancy_flags", description: "Flagged anomalies requiring review", required: false, format: "text" },
    ],
  },

  // --------------------------------------------------------------- Financial Planning
  {
    name: "financial-planning-agent",
    displayName: "Financial Planning Agent",
    category: "planning",
    department: "finance-legal",
    summary: "Builds detailed financial models, forecasts, and scenario plans (FP&A).",
    role: "The FP&A specialist who builds detailed financial models, produces multi-period forecasts and scenario plans, and feeds analysis-ready models up to the CFO's strategic decisions.",
    responsibilities: [
      "Build and maintain detailed financial models by line item",
      "Produce multi-period revenue, expense and headcount forecasts",
      "Model scenario variants (best/base/worst case) for planning decisions",
      "Reconcile model assumptions against actuals from accounting",
      "Package model output for CFO-level strategic scenario review",
    ],
    objectives: [
      "Every forecast states its assumptions explicitly, not implicitly",
      "Models are reconciled against actuals every period, not left stale",
      "Scenario variants are ready before the CFO needs them, not after",
    ],
    reportsTo: "founder-cfo-agent",
    receivesFrom: ["founder-cfo-agent", "accounting-agent", "cashflow-management-agent"],
    sendsTo: ["founder-cfo-agent", "budgeting-agent"],
    tags: ["finance", "fp&a", "forecasting", "modeling", "finance-legal-department"],
    inputs: [
      { name: "actuals", description: "Actual financial results from accounting", required: true, format: "json" },
      { name: "growth_assumptions", description: "Revenue and growth assumptions to model against", required: true, format: "markdown" },
      { name: "cash_position", description: "Current cash position from cashflow management", required: true, format: "json" },
      { name: "planning_requests", description: "Specific scenarios or models requested by the CFO", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "financial_models", description: "Detailed line-item financial models", required: true, format: "markdown" },
      { name: "forecasts", description: "Multi-period revenue, expense and headcount forecasts", required: true, format: "markdown" },
      { name: "scenario_plans", description: "Best/base/worst-case scenario plans", required: true, format: "markdown" },
      { name: "assumption_reconciliation", description: "Reconciliation of prior assumptions against actuals", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Budgeting
  {
    name: "budgeting-agent",
    displayName: "Budgeting Agent",
    category: "planning",
    department: "finance-legal",
    summary: "Maintains the operational budget register and tracks spend against it, line by line.",
    role: "The budgeting specialist who maintains the operational budget register, tracks actual spend against each line, and flags variance before it becomes a problem.",
    responsibilities: [
      "Maintain the operational budget register by department and line item",
      "Track actual spend against budget continuously",
      "Flag budget variance beyond threshold with root-cause context",
      "Process and route budget-line change requests for approval",
      "Reconcile the budget register against financial-planning forecasts",
    ],
    objectives: [
      "Every budget line has a current actual-vs-plan comparison",
      "Variance beyond threshold is flagged the period it occurs",
      "The budget register never drifts from the approved financial plan without a recorded change",
    ],
    reportsTo: "founder-cfo-agent",
    receivesFrom: ["founder-cfo-agent", "accounting-agent", "financial-planning-agent"],
    sendsTo: ["founder-cfo-agent", "procurement-agent", "cashflow-management-agent"],
    tags: ["finance", "budgeting", "variance-tracking", "spend-management", "finance-legal-department"],
    inputs: [
      { name: "approved_budget", description: "The current CFO-approved budget by line item", required: true, format: "json" },
      { name: "actual_spend", description: "Actual spend records from accounting", required: true, format: "json" },
      { name: "forecast_baseline", description: "The financial-planning forecast the budget is reconciled against", required: true, format: "markdown" },
      { name: "change_requests", description: "Requested changes to individual budget lines", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "budget_register", description: "The current budget register with actual-vs-plan per line", required: true, format: "json" },
      { name: "variance_report", description: "Flagged variance with root-cause context", required: true, format: "markdown" },
      { name: "change_decisions", description: "Approved or rejected budget-line change requests", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Cashflow Management
  {
    name: "cashflow-management-agent",
    displayName: "Cashflow Management Agent",
    category: "research",
    department: "finance-legal",
    summary: "Runs day-to-day cash operations: AP/AR timing, payment scheduling, and liquidity checks.",
    role: "The cash operations specialist who manages day-to-day accounts-payable and accounts-receivable timing, schedules payments, and monitors near-term liquidity so the company never gets surprised by a cash gap.",
    responsibilities: [
      "Track accounts-payable and accounts-receivable timing and aging",
      "Schedule outbound payments against available cash",
      "Monitor near-term liquidity and flag gaps before they bind",
      "Chase overdue receivables and reconcile payment timing against forecast",
      "Feed real cash-position data up to financial planning and the CFO",
    ],
    objectives: [
      "Payables and receivables aging is tracked continuously, not at month-end only",
      "Liquidity gaps are flagged with enough lead time to act",
      "Real cash position always reconciles against the financial-planning forecast",
    ],
    reportsTo: "founder-cfo-agent",
    receivesFrom: ["founder-cfo-agent", "accounting-agent", "budgeting-agent"],
    sendsTo: ["founder-cfo-agent", "financial-planning-agent"],
    tags: ["finance", "cashflow", "ap-ar", "liquidity", "finance-legal-department"],
    inputs: [
      { name: "payables_receivables", description: "Current accounts-payable and accounts-receivable ledger", required: true, format: "json" },
      { name: "payment_schedule", description: "Scheduled and pending payment obligations", required: true, format: "json" },
      { name: "cash_balance", description: "Current cash balance across accounts", required: true, format: "json" },
      { name: "budget_spend_plan", description: "Planned spend timing from the budget register", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "liquidity_report", description: "Near-term liquidity position with any flagged gaps", required: true, format: "markdown" },
      { name: "payment_actions", description: "Scheduled or executed payment actions", required: true, format: "markdown" },
      { name: "aging_report", description: "Accounts-payable/receivable aging report", required: true, format: "markdown" },
      { name: "cash_position_feed", description: "Real cash-position data for financial planning", required: false, format: "json" },
    ],
  },

  // --------------------------------------------------------------- Tax Compliance
  {
    name: "tax-compliance-agent",
    displayName: "Tax Compliance Agent",
    category: "qa",
    department: "finance-legal",
    summary: "Owns tax filing readiness, obligation tracking, and regulatory tax-compliance checks.",
    role: "The tax compliance specialist who tracks tax obligations and filing deadlines, prepares filing-ready documentation, and verifies compliance with applicable tax regulations.",
    responsibilities: [
      "Track tax obligations and filing deadlines across applicable jurisdictions",
      "Prepare filing-ready documentation from ledger and payroll data",
      "Verify transactions and structures against applicable tax regulations",
      "Flag tax-risk items to the CFO and Risk Officer before a deadline binds",
      "Maintain a record of filings and their supporting evidence",
    ],
    objectives: [
      "No filing deadline is missed without an escalation well before it",
      "Filing documentation is reconciled against the ledger before submission",
      "Tax-risk items are flagged while there is still time to act",
    ],
    reportsTo: "founder-cfo-agent",
    receivesFrom: ["founder-cfo-agent", "accounting-agent"],
    sendsTo: ["founder-cfo-agent", "founder-risk-agent", "compliance-monitor-agent"],
    tags: ["finance", "tax", "compliance", "regulatory", "finance-legal-department"],
    inputs: [
      { name: "ledger_data", description: "Reconciled ledger data to prepare filings from", required: true, format: "json" },
      { name: "jurisdiction_rules", description: "Applicable tax rules and deadlines by jurisdiction", required: true, format: "markdown" },
      { name: "prior_filings", description: "Prior tax filings for continuity and comparison", required: false, format: "markdown" },
      { name: "payroll_data", description: "Payroll data relevant to employment tax obligations", required: false, format: "json" },
    ],
    outputs: [
      { name: "filing_documentation", description: "Filing-ready tax documentation", required: true, format: "markdown" },
      { name: "obligation_calendar", description: "Tracked tax obligations and deadlines", required: true, format: "json" },
      { name: "tax_risk_flags", description: "Flagged tax-risk items for the CFO and Risk Officer", required: false, format: "markdown" },
      { name: "filing_record", description: "Record of completed filings with supporting evidence", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Legal Advisor
  {
    name: "legal-advisor-agent",
    displayName: "Legal Advisor Agent",
    category: "review",
    department: "finance-legal",
    summary: "Reviews decisions, structures, and documents for legal risk and gives structured legal opinions.",
    role: "The legal advisor who reviews business decisions, structures and documents for legal risk, gives structured legal opinions, and flags matters that need outside counsel.",
    responsibilities: [
      "Review proposed decisions and structures for legal risk before commitment",
      "Give structured legal opinions with explicit risk levels and rationale",
      "Identify matters that exceed internal capability and need outside counsel",
      "Support contract management with legal review of key terms",
      "Track open legal questions to resolution",
    ],
    objectives: [
      "Every reviewed matter gets an explicit opinion, never a shrug",
      "Matters needing outside counsel are flagged before they become urgent",
      "No open legal question is left unresolved without an owner",
    ],
    reportsTo: "founder-risk-agent",
    receivesFrom: ["founder-risk-agent", "contract-management-agent", "compliance-monitor-agent"],
    sendsTo: ["founder-risk-agent", "contract-management-agent"],
    tags: ["legal", "advisory", "risk-review", "finance-legal-department"],
    inputs: [
      { name: "review_requests", description: "Decisions, structures or documents needing legal review", required: true, format: "markdown" },
      { name: "contract_terms", description: "Contract terms from contract management needing legal review", required: false, format: "markdown" },
      { name: "compliance_findings", description: "Compliance findings with a legal dimension", required: false, format: "markdown" },
      { name: "jurisdiction_context", description: "Relevant jurisdiction and regulatory context", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "legal_opinions", description: "Structured legal opinions with risk level and rationale", required: true, format: "markdown" },
      { name: "outside_counsel_flags", description: "Matters flagged for outside counsel", required: false, format: "markdown" },
      { name: "contract_review_notes", description: "Legal review notes on contract terms", required: false, format: "markdown" },
      { name: "open_question_log", description: "Tracked open legal questions and owners", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Contract Management
  {
    name: "contract-management-agent",
    displayName: "Contract Management Agent",
    category: "documentation",
    department: "finance-legal",
    summary: "Owns the contract lifecycle: drafting, tracking, renewals, and the contract repository.",
    role: "The contract manager who drafts and reviews contract terms, tracks the contract lifecycle from draft to signature to renewal, and maintains the contract repository.",
    responsibilities: [
      "Draft contract terms from standard templates and negotiated inputs",
      "Track every contract's lifecycle stage from draft through renewal",
      "Maintain a searchable, current contract repository",
      "Flag upcoming renewals and expirations before they lapse",
      "Route non-standard terms to legal advisory for review",
    ],
    objectives: [
      "Every active contract has a tracked lifecycle stage and owner",
      "No renewal or expiration lapses without an advance flag",
      "Non-standard terms reach legal review before signature, never after",
    ],
    reportsTo: "founder-risk-agent",
    receivesFrom: ["founder-risk-agent", "legal-advisor-agent", "procurement-agent"],
    sendsTo: ["founder-risk-agent", "legal-advisor-agent"],
    tags: ["legal", "contracts", "lifecycle", "repository", "finance-legal-department"],
    inputs: [
      { name: "contract_requests", description: "Requests for new contracts or amendments", required: true, format: "markdown" },
      { name: "standard_templates", description: "Standard contract templates and clause library", required: true, format: "markdown" },
      { name: "negotiated_terms", description: "Negotiated terms to incorporate into a draft", required: false, format: "markdown" },
      { name: "legal_review_notes", description: "Legal review notes to incorporate before signature", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "contract_drafts", description: "Drafted contracts ready for review or signature", required: true, format: "markdown" },
      { name: "contract_repository_index", description: "Current index of the contract repository with lifecycle stage", required: true, format: "json" },
      { name: "renewal_alerts", description: "Upcoming renewal and expiration alerts", required: true, format: "text" },
      { name: "nonstandard_term_flags", description: "Non-standard terms routed to legal review", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Compliance Monitor
  {
    name: "compliance-monitor-agent",
    displayName: "Compliance Monitor Agent",
    category: "qa",
    department: "finance-legal",
    summary: "Monitors regulatory compliance obligations and tracks remediation of gaps.",
    role: "The compliance monitor who tracks applicable regulatory obligations, runs periodic compliance checks, and tracks remediation of any gap found to closure.",
    responsibilities: [
      "Maintain the register of applicable regulatory obligations",
      "Run periodic compliance checks against that register",
      "Log every compliance gap found with severity and owner",
      "Track remediation of open gaps to closure",
      "Report compliance posture to the Risk Officer on a fixed cadence",
    ],
    objectives: [
      "Every applicable obligation is checked on its required cadence, never skipped",
      "Every gap found has an assigned owner and remediation deadline",
      "Compliance posture is reported before it is asked for, not only on request",
    ],
    reportsTo: "founder-risk-agent",
    receivesFrom: ["founder-risk-agent", "tax-compliance-agent", "audit-agent"],
    sendsTo: ["founder-risk-agent", "legal-advisor-agent", "audit-agent"],
    tags: ["legal", "compliance", "regulatory", "monitoring", "finance-legal-department"],
    inputs: [
      { name: "regulatory_obligations", description: "The register of applicable regulatory obligations", required: true, format: "markdown" },
      { name: "tax_compliance_signal", description: "Tax-compliance findings with a regulatory dimension", required: false, format: "markdown" },
      { name: "audit_findings", description: "Findings from internal audits relevant to compliance", required: false, format: "markdown" },
      { name: "policy_documents", description: "Internal policies compliance checks are run against", required: true, format: "markdown" },
    ],
    outputs: [
      { name: "compliance_check_results", description: "Results of periodic compliance checks", required: true, format: "markdown" },
      { name: "gap_log", description: "Logged compliance gaps with severity and owner", required: true, format: "json" },
      { name: "remediation_tracker", description: "Remediation status of open gaps", required: true, format: "json" },
      { name: "compliance_posture_report", description: "Compliance posture report for the Risk Officer", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Audit
  {
    name: "audit-agent",
    displayName: "Audit Agent",
    category: "qa",
    department: "finance-legal",
    summary: "Runs internal audits across financial and operational controls and tracks findings to closure.",
    role: "The internal auditor who plans and runs audits across financial and operational controls, documents findings with evidence, and tracks corrective action to closure.",
    responsibilities: [
      "Plan an internal audit schedule covering financial and operational controls",
      "Execute audits and document findings with supporting evidence",
      "Rate findings by severity and assign a corrective-action owner",
      "Track corrective actions to verified closure",
      "Feed audit findings with a compliance dimension to the compliance monitor",
    ],
    objectives: [
      "Every planned audit area is covered on its scheduled cadence",
      "Every finding carries evidence, not assertion",
      "No corrective action is closed without verification it was actually done",
    ],
    reportsTo: "founder-risk-agent",
    receivesFrom: ["founder-risk-agent", "compliance-monitor-agent", "accounting-agent"],
    sendsTo: ["founder-risk-agent", "compliance-monitor-agent"],
    tags: ["legal", "audit", "internal-controls", "finance-legal-department"],
    inputs: [
      { name: "audit_scope", description: "The area and controls in scope for an audit", required: true, format: "markdown" },
      { name: "financial_records", description: "Financial records and ledger data under audit", required: true, format: "json" },
      { name: "control_documentation", description: "Documented internal controls to test against", required: true, format: "markdown" },
      { name: "prior_findings", description: "Prior audit findings to verify closure of", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "audit_report", description: "Audit findings with evidence and severity ratings", required: true, format: "markdown" },
      { name: "corrective_action_plan", description: "Assigned corrective actions with owners and deadlines", required: true, format: "markdown" },
      { name: "closure_verification", description: "Verification that prior corrective actions were completed", required: false, format: "markdown" },
      { name: "compliance_relevant_findings", description: "Findings with a compliance dimension, routed onward", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Procurement
  {
    name: "procurement-agent",
    displayName: "Procurement Agent",
    category: "planning",
    department: "finance-legal",
    summary: "Owns vendor sourcing, purchase orders, and procurement spend against budget.",
    role: "The procurement specialist who sources and evaluates vendors, manages purchase orders, and keeps procurement spend within approved budget lines.",
    responsibilities: [
      "Source and evaluate vendors against requirements and cost",
      "Issue and track purchase orders through fulfillment",
      "Keep procurement spend within its approved budget line",
      "Negotiate terms and route contract needs to contract management",
      "Maintain a vendor performance record for future sourcing decisions",
    ],
    objectives: [
      "Every purchase order maps to an approved budget line before it issues",
      "Vendor evaluations are comparative, not single-bid by default",
      "Vendor performance is tracked, not forgotten after the first order",
    ],
    reportsTo: "founder-coo-agent",
    receivesFrom: ["founder-coo-agent", "budgeting-agent"],
    sendsTo: ["founder-coo-agent", "contract-management-agent", "budgeting-agent"],
    tags: ["operations", "procurement", "vendor-management", "finance-legal-department"],
    inputs: [
      { name: "procurement_requests", description: "Requests for goods or services needing sourcing", required: true, format: "markdown" },
      { name: "budget_line_availability", description: "Available budget for the relevant procurement line", required: true, format: "json" },
      { name: "vendor_options", description: "Candidate vendors and their pricing/terms", required: false, format: "markdown" },
      { name: "vendor_performance_history", description: "Historical performance data on existing vendors", required: false, format: "json" },
    ],
    outputs: [
      { name: "vendor_evaluations", description: "Comparative vendor evaluations against requirements", required: true, format: "markdown" },
      { name: "purchase_orders", description: "Issued purchase orders tracked through fulfillment", required: true, format: "json" },
      { name: "contract_handoffs", description: "Procurement needs routed to contract management", required: false, format: "markdown" },
      { name: "vendor_performance_record", description: "Updated vendor performance record", required: false, format: "markdown" },
    ],
  },
];

/** The agent names that make up the Finance, Legal & Compliance Department, in roster order. */
export const FINANCE_LEGAL_DEPARTMENT_AGENTS: string[] = FINANCE_LEGAL_DEPARTMENT.map((spec) => spec.name);

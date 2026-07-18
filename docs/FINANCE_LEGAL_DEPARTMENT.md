# Finance, Legal & Compliance Department

Ten operational agents that run bookkeeping, financial planning, cash
operations, tax, legal, contracts, compliance, audit and procurement. All
generated through the Agent Factory pipeline
(`blueprint → validate → save → generate → validate → write → register`) from
`src/departments/finance-legal.ts`; never hand-written. Regenerate with:

```
npm run generate:finance-legal
```

## Roster

| Agent | Category | Reports to | Purpose |
|-------|----------|-----------|---------|
| accounting-agent | documentation | founder-cfo-agent | Ledger, reconciliation, financial statements |
| financial-planning-agent | planning | founder-cfo-agent | Detailed FP&A models, forecasts, scenarios |
| budgeting-agent | planning | founder-cfo-agent | Operational budget register, variance tracking |
| cashflow-management-agent | research | founder-cfo-agent | AP/AR timing, payment scheduling, liquidity |
| tax-compliance-agent | qa | founder-cfo-agent (+ founder-risk-agent) | Tax obligations, filings, regulatory checks |
| legal-advisor-agent | review | founder-risk-agent | Legal opinions, risk review, outside-counsel triage |
| contract-management-agent | documentation | founder-risk-agent | Contract lifecycle, drafting, renewals, repository |
| compliance-monitor-agent | qa | founder-risk-agent | Regulatory obligation tracking, gap remediation |
| audit-agent | qa | founder-risk-agent | Internal audits, findings, corrective-action closure |
| procurement-agent | planning | founder-coo-agent | Vendor sourcing, purchase orders, spend vs. budget |

reportsTo per the department brief: **Accounting / Financial Planning /
Budgeting / Cashflow** → `founder-cfo-agent`; **Legal Advisor / Contract
Management / Compliance Monitor / Audit** → `founder-risk-agent`;
**Procurement** → `founder-coo-agent`; **Tax Compliance** → `founder-cfo-agent`
with `founder-risk-agent` wired as a collaborating peer via `sendsTo`.

## Layer boundary (no duplicate responsibility)

This department executes finance/legal **operations**; it does not duplicate
the strategic/executive agents it sits under, or unrelated adjacent agents:

| Existing agent | New agent(s) | Distinction |
|---|---|---|
| founder-cfo-agent | accounting, financial-planning, budgeting, cashflow-management | CFO tracks runway/approves budget/models scenarios strategically; these agents produce the actual ledger, line-item models, budget register and cash ops underneath it |
| founder-risk-agent | legal-advisor, contract-management, compliance-monitor, audit | Risk Officer owns the company risk registry and existential-risk mitigation; these agents supply the domain-specialist execution (legal opinions, contracts, regulatory monitoring, audits) |
| business-model-agent | (none directly) | revenue-model/pricing strategy, not bookkeeping or compliance |
| cost-optimization-engineer | (none directly) | infra/token spend, not company finance |
| security-engineer / security-reliability-agent | (none directly) | code/infra security, not legal/regulatory compliance |

Within the department: financial-planning **models**, budgeting **tracks
allocated spend**, cashflow-management **runs day-to-day cash ops** — three
distinct disciplines feeding the same CFO. Compliance-monitor **watches
regulatory obligations continuously**; audit **periodically tests controls
with evidence** — detection vs. verification, not duplication.

## Collaboration graph (intra-department)

```
accounting ──► financial-planning ──► budgeting ──► procurement ──► contract-management ──► legal-advisor
     │                  ▲                  │                                                      ▲
     │                  └── cashflow-management ◄──┘                                               │
     └──► tax-compliance ──► founder-risk-agent                                                    │
                                    │                                                               │
                          compliance-monitor ◄──► audit ──────────────────────────────────────────┘
```

Each edge is the existing Runtime contract: work published via the Artifact
Manager + shared memory, announced on the Event Bus, sequenced by the Master
Orchestrator with context from the Context Manager. `sendsTo` compiles into
`collaboratesWith`, recorded as each agent's registry `dependencies`.

## Registry status

148 agents total (was 138); 10 new entries `active`, `version: 1.0.0`,
`owner: finance-legal-department`, no duplicate names. Generated files live
under `.claude/agents/*.md`, blueprints under `blueprints/*.blueprint.json`.

## Integration follow-up (Batch 5)

`reportsTo`/`sendsTo` establish escalation and peer collaboration to CFO, Risk
and COO. To make those executives formally **supervise** these agents
(downward edge in the executive's own `sendsTo`), add them to the relevant
executive's spec in `src/departments/executive.ts` and regenerate — the same
idempotent wiring used for the Sales & Marketing and Customer Success
supervision batches. Deferred here to keep this batch scoped to department
generation.

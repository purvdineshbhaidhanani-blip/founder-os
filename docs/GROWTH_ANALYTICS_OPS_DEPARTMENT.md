# Growth, Analytics & Operations Department

Thirteen agents that run growth experimentation, cross-functional analytics,
day-to-day operations, and the ideation/partnership/expansion motions that
don't belong to any single existing executive. All generated through the
Agent Factory pipeline
(`blueprint → validate → save → generate → validate → write → register`) from
`src/departments/growth-analytics-ops.ts`; never hand-written. Regenerate
with:

```
npm run generate:growth-analytics-ops
```

## Roster

| Agent | Category | Reports to | Purpose |
|-------|----------|-----------|---------|
| growth-strategy-agent | planning | founder-strategy-agent | Growth-loop model, lever prioritization, experiment backlog |
| growth-experiment-agent | research | founder-strategy-agent | Experiment design, execution, rollout/kill decisions |
| analytics-agent | research | founder-strategy-agent | Event tracking, ad hoc analysis, data quality |
| business-intelligence-agent | research | founder-strategy-agent | Cross-functional dashboards, executive reporting |
| kpi-monitor-agent | qa | founder-strategy-agent | Live KPI tracking against target, deviation alerts |
| revenue-analytics-agent | research | founder-strategy-agent | MRR/ARR, cohorts, unit economics |
| operations-manager-agent | planning | founder-coo-agent | Cross-department process coordination |
| process-optimization-agent | planning | founder-coo-agent | Process mapping, redesign, impact verification |
| automation-agent | devops | founder-coo-agent | Operational workflow automation, reliability |
| knowledge-manager-agent | documentation | founder-executive-assistant-agent | SOPs, playbooks, durable decision log |
| innovation-agent | research | founder-ceo-agent | Structured ideation pipeline, bet screening |
| partnership-manager-agent | planning | founder-ceo-agent | Operational partner lifecycle, performance tracking |
| expansion-strategy-agent | planning | founder-ceo-agent | New-market/segment expansion planning |

reportsTo per the department brief: **Growth Strategy / Growth Experiment /
Analytics / Business Intelligence / KPI Monitor / Revenue Analytics** →
`founder-strategy-agent`; **Operations Manager / Process Optimization /
Automation** → `founder-coo-agent`; **Knowledge Manager** →
`founder-executive-assistant-agent`; **Innovation / Partnership Manager /
Expansion Strategy** → `founder-ceo-agent`.

## Layer boundary (no duplicate responsibility)

Every agent here is deliberately distinct from an adjacent existing agent it
could be mistaken for:

| Existing agent | New agent | Distinction |
|---|---|---|
| knowledge-manager | knowledge-manager-agent | engineering typed knowledge graph (projects/decisions/competitors/lessons) vs. the executive team's operational knowledge base (SOPs, playbooks, decision logs) |
| success-metrics-agent | kpi-monitor-agent | defines product success *criteria* (design-time) vs. tracks live KPIs against already-defined targets (operational) |
| cost-optimization-engineer | process-optimization-agent | infra/token spend vs. business/operational process efficiency |
| automation-engineer | automation-agent | CI/test automation (engineering) vs. business/operational workflow automation |
| workflow-manager / workflow-engine | operations-manager-agent | the agent Runtime's own orchestration system vs. coordinating human/business-process execution across departments — a different layer, not a second orchestrator |
| business-model-agent | expansion-strategy-agent | one-time strategic design of the revenue model vs. ongoing operational planning to enter new markets once the business is already running |
| founder-cro-agent (partnership sourcing) | partnership-manager-agent | executive-level evaluation of partnership opportunities vs. operational execution of the partner lifecycle (outreach, management, performance tracking, contract handoff) |
| founder-strategy-agent | growth-strategy-agent, innovation-agent | long-term competitive/scenario modeling vs. the tactical, ongoing growth-loop and a structured new-bet ideation pipeline — both operational, neither duplicating scenario modeling |

Within the department: analytics-agent runs the **underlying data engine**;
business-intelligence-agent **synthesizes** it into strategic reporting;
kpi-monitor-agent **watches live values against target**; revenue-analytics-agent
is a **dedicated revenue vertical** — four distinct disciplines feeding
founder-strategy-agent, not one duplicated four times.

## Collaboration graph (intra- and cross-department)

```
growth-strategy ──► growth-experiment ──► analytics ──┬─► business-intelligence ──► knowledge-manager
       ▲                                               ├─► kpi-monitor ──► operations-manager ──► process-optimization ──► automation
       └───────────────────────────────────────────────┴─► revenue-analytics ──► expansion-strategy

innovation ──► founder-cpo-agent (existing, cross-department)
partnership-manager ──► founder-cro-agent, contract-management-agent (existing, cross-department, Batch 4)
```

Each edge is the existing Runtime contract: work published via the Artifact
Manager + shared memory, announced on the Event Bus, sequenced by the Master
Orchestrator with context from the Context Manager. `sendsTo` compiles into
`collaboratesWith`, recorded as each agent's registry `dependencies`. This
batch is the first to wire new agents directly to agents from a prior batch
(`contract-management-agent`, `founder-cpo-agent`, `founder-cro-agent`),
demonstrating the registry integrates across department boundaries.

## Registry status

161 agents total (was 148); 13 new entries `active`, `version: 1.0.0`,
`owner: growth-analytics-ops-department`, no duplicate names. Generated files
live under `.claude/agents/*.md`, blueprints under
`blueprints/*.blueprint.json`.

## Founder OS Agent Architecture

With this batch, every executive (CEO, COO, CFO, CMO, CPO, CRO, Strategy,
Investor, Risk, EA) has at least one operational department reporting or
escalating to it, and every department from Batches 1–5 is registered,
validated and cross-linked. Formal downward supervision (`sendsTo` on the
executive side) for Batches 2–5 remains available as an idempotent follow-up
wiring pass in `src/departments/executive.ts`, matching the pattern already
proven for the Executive Department's original integration.

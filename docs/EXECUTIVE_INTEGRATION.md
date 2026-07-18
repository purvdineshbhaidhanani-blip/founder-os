# Founder Executive Department — Integration Map

How the 10-agent Founder Executive Department (Batch 1) connects to the
already-registered Founder OS agents. This document is the authoritative
relationship map; the machine-readable source of truth is
`src/departments/executive.ts` (each executive's `sendsTo` array), which the
factory compiles into `communicationProtocol.collaboratesWith` and
`registryManager` records as each executive's registry `dependencies`.

**No existing agent was modified.** Supervision is expressed on the executive
(upstream) side only — no operational agent's spec, responsibilities, or
generated file changed. Integration = wiring, not redefinition.

## 1. Supervision hierarchy

```
founder
└── founder-ceo-agent                         (final authority, arbitration)
    │   supervises: master-cto-orchestrator, company-brain,
    │               workflow-manager*, project-manager*
    │
    ├── founder-coo-agent                      (operations, execution)
    │   supervises: workflow-engine, workflow-manager*, project-manager*,
    │               task-planner, monitoring-engineer
    │
    ├── founder-cfo-agent                      (finance, capital)
    │   supervises: business-model-agent^, pricing-strategy-agent^,
    │               success-metrics-agent
    │
    ├── founder-cmo-agent                      (marketing, GTM)
    │   supervises: market-research-agent, target-audience-agent,
    │               trend-intelligence-agent
    │
    ├── founder-cpo-agent                      (product)
    │   supervises: product-manager, feature-planning-agent,
    │               requirement-analyzer, user-story-generator,
    │               ui-designer, ux-designer
    │
    ├── founder-cro-agent                      (revenue, sales, BD)
    │   supervises: pricing-strategy-agent^, business-model-agent^
    │
    ├── founder-strategy-agent                 (foresight, scenarios)
    │   supervises: competitor-intelligence, market-gap-intelligence,
    │               startup-intelligence, research-intelligence-agent
    │
    ├── founder-investor-agent                 (fundraising, IR)
    │   supervises: business-model-agent^, pricing-strategy-agent^,
    │               report-generator
    │
    ├── founder-risk-agent                     (risk, resilience)
    │   supervises: security-engineer, reality-checker,
    │               qa-engineer, performance-engineer
    │
    └── founder-executive-assistant-agent      (coordination)
        coordinates: all 9 peer executives (department heads reached
                     through their owning executive)
```

`*` shared between CEO and COO. `^` shared across CFO / CRO / Investor.
Shared supervision is a matrix relationship, not a cycle — see §5 ownership.

## 2. Agent-to-agent mapping (executive → existing Founder OS agents)

| Executive | Supervises (existing, registered) | Deferred — not yet created |
|---|---|---|
| founder-ceo-agent | master-cto-orchestrator, company-brain, workflow-manager, project-manager | — |
| founder-coo-agent | workflow-engine, workflow-manager, project-manager, task-planner, monitoring-engineer | — |
| founder-cfo-agent | business-model-agent, pricing-strategy-agent, success-metrics-agent | — |
| founder-cmo-agent | market-research-agent, target-audience-agent, trend-intelligence-agent | seo-agent, content-marketing-agent |
| founder-cro-agent | pricing-strategy-agent, business-model-agent | sales-intelligence-agent, lead-generation-agent |
| founder-cfo-agent | (see above) | — |
| founder-strategy-agent | competitor-intelligence, market-gap-intelligence, startup-intelligence, research-intelligence-agent | — |
| founder-risk-agent | security-engineer, reality-checker, qa-engineer, performance-engineer | — |
| founder-investor-agent | business-model-agent, pricing-strategy-agent, report-generator | — |
| founder-executive-assistant-agent | (coordinates the 9 peers) | — |

Agents marked *deferred* were named "(future)" in the integration brief and do
not exist in the registry. They are intentionally omitted; wire them here when
they are generated (add the name to the owning executive's `sendsTo` in
`src/departments/executive.ts` and regenerate — nothing else).

## 3. Communication contracts

Every edge uses the same Runtime contract already documented in each agent's
generated **Communication Protocol** section — this integration adds no new
transport, only new endpoints on the existing one:

- **Downward (executive → supervised):** the executive's directives, approvals,
  plans and strategy documents are published through the **Artifact Manager**,
  recorded in **shared memory**, and announced on the **Event Bus**; the
  **Master Orchestrator** enqueues the supervised agent's task with context
  loaded by the **Context Manager**. Encoded as the supervised agent in the
  executive's `sendsTo`.
- **Upward (supervised → executive):** results return to the executive as
  normal task completions on the same Event Bus; the executive consumes them
  as its declared `inputs`. No change to the supervised agent is required —
  the orchestrator already routes completions back to the requesting agent.
- **Escalation:** every executive escalates to `founder-ceo-agent`; the CEO
  escalates to `founder`. On failure an agent emits a failure event; the Master
  Orchestrator applies the task-queue retry policy and routes any human-gated
  step through the Approval System.

## 4. Routing rules

1. **Founder intent** enters at `founder-ceo-agent`.
2. CEO arbitrates and routes execution to `master-cto-orchestrator` (build) and
   to the relevant C-suite peer (domain ownership).
3. Each executive fans work out **only** to agents in its supervision set; it
   never reaches into another executive's set directly — cross-domain needs go
   peer-to-peer (executive ↔ executive) or up to the CEO.
4. Shared-service agents (§5) are addressed through their **primary owner**;
   other executives consume their outputs read-only via the primary owner.
5. `founder-executive-assistant-agent` never issues domain directives — it only
   coordinates, synthesizes briefings, and tracks action items across the
   executive team.

## 5. Ownership (shared-service disambiguation)

Four existing agents are supervised by more than one executive. To keep a
single accountable owner, each has a **primary**; the others are **consulting**
(read/consume, do not direct):

| Shared agent | Primary owner | Consulting |
|---|---|---|
| business-model-agent | founder-cfo-agent | founder-cro-agent, founder-investor-agent |
| pricing-strategy-agent | founder-cro-agent | founder-cfo-agent, founder-investor-agent |
| workflow-manager | founder-coo-agent | founder-ceo-agent |
| project-manager | founder-coo-agent | founder-ceo-agent |

Rationale: finance owns the economic model; revenue owns pricing; operations
owns delivery coordination. The CEO's edge to workflow-manager/project-manager
is oversight, exercised through the COO in normal operation.

## 6. Acyclicity proof

- **Supervision graph:** 34 directed edges (executive → supervised). A DFS
  cycle check finds **zero cycles**. No supervised target is itself an
  executive, so no executive supervises another executive (executives relate
  only via `reportsTo: founder-ceo-agent`).
- **Reporting tree:** every executive `reportsTo` `founder-ceo-agent`, which
  reports to `founder`. Single-rooted tree, no cycles.
- **Shared supervision** (business-model, pricing-strategy, workflow-manager,
  project-manager) creates diamonds — multiple parents, one child — which are
  valid in a DAG and are not cycles.

The peer-communication graph (executive ↔ executive) is intentionally
bidirectional and therefore contains 2-cycles by design; that is a
communication channel, not a supervision or build dependency, and does not
affect scheduling (the task queue sequences on per-task `dependsOn`, not on
these documentation edges).

## 7. Verification

Reproduce the whole integration from source:

```
npx tsx src/departments/executive-generate.ts   # regenerate 10 execs + registry
npx tsc -p tsconfig.json --noEmit                # typecheck
npx vitest run --exclude "**/web-e2e/**"         # full suite
```

Registry integrity after integration: 118 agents, no duplicate names, all 10
executives `active`, each executive's `dependencies` = its peer executives +
its supervised existing agents. Existing agents' registry entries are
unchanged.

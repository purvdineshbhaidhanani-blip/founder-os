# Customer Success & Support Department

Ten post-sale execution agents that resolve support issues, drive onboarding
and retention, and turn customer signal into structured insight. All generated
through the Agent Factory pipeline
(`blueprint → validate → save → generate → validate → write → register`) from
`src/departments/customer-success.ts`; never hand-written. Regenerate with:

```
npm run generate:customer-success
```

## Roster

| Agent | Category | Reports to | Purpose |
|-------|----------|-----------|---------|
| customer-support-agent | documentation | founder-coo-agent | Ticket triage, resolution drafting, SLA tracking |
| help-center-agent | documentation | founder-coo-agent | Self-serve knowledge base, coverage gaps, deflection |
| customer-success-agent | planning | founder-cro-agent | Account health, success plans, expansion readiness |
| onboarding-agent | documentation | founder-cro-agent | Activation flow, milestones, time-to-value |
| churn-prediction-agent | research | founder-cro-agent | Churn risk modeling and scoring |
| customer-retention-agent | planning | founder-cro-agent | Save-motion playbooks, renewal management |
| feedback-intelligence-agent | research | founder-cpo-agent (+ founder-cmo-agent) | Mines owned-channel feedback into structured signal |
| survey-analysis-agent | research | founder-cpo-agent (+ founder-cmo-agent) | NPS/CSAT/CES design, distribution, sentiment analysis |
| customer-insights-agent | research | founder-cpo-agent (+ founder-cmo-agent) | Unified customer insight layer for product/marketing |
| community-manager-agent | documentation | founder-cmo-agent (+ founder-cpo-agent) | Owned community moderation, engagement, advocacy |

reportsTo per the department brief: **Support** → `founder-coo-agent`,
**Success** → `founder-cro-agent`, **Community & Feedback** →
`founder-cpo-agent` (feedback-intelligence, survey-analysis, customer-insights)
or `founder-cmo-agent` (community-manager) as primary, with the other
executive wired as a collaborating peer via `sendsTo` — satisfying "collaborate
with CMO and CPO" without splitting escalation ownership.

## Layer boundary (no duplicate responsibility)

This department operates on **existing** customers; it does not duplicate the
pre-sale/market-validation agents it sits adjacent to:

| Existing agent | New agent | Distinction |
|---|---|---|
| customer-pain-intelligence | feedback-intelligence-agent | external review-site mining (market-level) vs. owned-channel feedback (support/success/survey, post-sale) |
| user-research-agent | customer-insights-agent | PMF interviews/validation (pre/early product) vs. ongoing synthesis of existing-customer usage+feedback+sentiment |
| success-metrics-agent | churn-prediction-agent | defines product success criteria/KPIs vs. operational churn-risk forecasting per account |
| social-media-agent | community-manager-agent | external social channels vs. owned community spaces (forum/chat/user groups) |

Within the department: churn-prediction **detects** risk, customer-retention
**acts** on it; onboarding owns **activation** (new), customer-success owns
**ongoing health** (existing); feedback-intelligence mines **unstructured**
signal, survey-analysis runs **structured** instruments.

## Collaboration graph (intra-department)

```
customer-support ──► help-center ──► customer-support   (ticket ↔ article loop)
       │
       └─► feedback-intelligence ◄─► survey-analysis ──► customer-insights
                     │                                        │
                     └────────────────► founder-cmo-agent ◄───┘
                     
onboarding ◄─► customer-success ◄─► churn-prediction ──► customer-retention
                     ▲                    ▲                    │
                     └────────────────────┴────────────────────┘

community-manager ──► feedback-intelligence
```

Each edge is the existing Runtime contract: work published via the Artifact
Manager + shared memory, announced on the Event Bus, sequenced by the Master
Orchestrator with context from the Context Manager. `sendsTo` compiles into
`collaboratesWith`, recorded as each agent's registry `dependencies`.

## Registry status

138 agents total (was 128); 10 new entries `active`, `version: 1.0.0`,
`owner: customer-success-department`, no duplicate names. Generated files live
under `.claude/agents/*.md`, blueprints under `blueprints/*.blueprint.json`.

## Integration follow-up (Batch 4)

`reportsTo`/`sendsTo` establish escalation and peer collaboration to the
owning executives. To make COO/CRO/CMO/CPO formally **supervise** these agents
(downward edge in the executive's own `sendsTo`), add them to the relevant
executive's spec in `src/departments/executive.ts` and regenerate — the same
idempotent wiring used for the Sales & Marketing supervision batch. Deferred
here to keep this batch scoped to department generation.

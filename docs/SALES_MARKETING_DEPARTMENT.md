# Sales & Marketing Department

Ten execution-layer agents that run demand generation, content, channels and
revenue operations. All generated through the Agent Factory pipeline
(`blueprint → validate → save → generate → validate → write → register`) from
`src/departments/sales-marketing.ts`; never hand-written. Regenerate with:

```
npm run generate:sales-marketing
```

## Roster

| Agent | Category | Reports to | Purpose |
|-------|----------|-----------|---------|
| seo-agent | research | founder-cmo-agent | Organic search: keyword research, technical/on-page SEO, SERP tracking |
| content-marketing-agent | documentation | founder-cmo-agent | Content strategy, editorial calendar, long-form briefs, distribution |
| copywriting-agent | documentation | founder-cmo-agent | Conversion copy: headlines, landing pages, ad copy, CTAs |
| social-media-agent | documentation | founder-cmo-agent | Social calendar, scheduling, community engagement |
| email-marketing-agent | documentation | founder-cmo-agent | Campaigns, drip sequences, segmentation, deliverability |
| ads-optimization-agent | research | founder-cmo-agent | Paid acquisition: campaign structure, bid/budget optimization, ROAS |
| sales-intelligence-agent | research | founder-cro-agent | Account research, buying signals, ICP scoring |
| lead-generation-agent | research | founder-cro-agent | Lead sourcing, outbound lists, qualification, pipeline feed |
| crm-manager-agent | planning | founder-cro-agent | CRM data integrity, pipeline stages, sales reporting |
| conversion-optimization-agent | research | founder-cmo-agent | On-site CRO: funnel analysis, A/B tests, landing-page experiments |

Marketing roles escalate to **founder-cmo-agent**, revenue roles to
**founder-cro-agent** — the two executives that own this department per
`docs/EXECUTIVE_INTEGRATION.md`.

## Layer boundary (no duplicate responsibility)

This department **executes**. It sits below the intelligence/research agents it
consumes and does not duplicate them:

| Existing (intelligence layer) | New (execution layer) | Distinction |
|---|---|---|
| market-research-agent | content-marketing-agent, seo-agent | market sizing/analysis vs. producing & ranking content |
| target-audience-agent | email-marketing-agent, social-media-agent | who to target vs. running the channel |
| trend-intelligence-agent | social-media-agent | detecting trends vs. posting to trends |
| pricing-strategy-agent | copywriting-agent, ads-optimization-agent | setting price vs. selling the offer |
| competitor-intelligence | sales-intelligence-agent | market-level competitor intel vs. account-level deal intel |

Within the department, adjacent pairs are kept distinct: content-marketing owns
**strategy/long-form**, copywriting owns **persuasive short-form**;
ads-optimization owns **paid acquisition**, conversion-optimization owns
**on-site conversion**; sales-intelligence owns **account research**,
lead-generation owns **sourcing & qualification**.

## Collaboration graph (intra-department)

```
seo ─► content-marketing ─► copywriting ─► ads-optimization ─► conversion-optimization
                        ├─► social-media                         └─► (feeds back to ads)
                        └─► email-marketing ◄──► crm-manager
sales-intelligence ─► lead-generation ─► crm-manager
```

Each edge is the existing Runtime contract: work published via the Artifact
Manager + shared memory, announced on the Event Bus, sequenced by the Master
Orchestrator with context from the Context Manager. `sendsTo` compiles into
`collaboratesWith`, recorded as each agent's registry `dependencies`.

## Registry status

128 agents total (was 118); 10 new entries `active`, `version: 1.0.0`,
`owner: sales-marketing-department`, no duplicate names. Generated files live
under `.claude/agents/*.md`, blueprints under `blueprints/*.blueprint.json`.

## Integration follow-up (Batch 3)

`reportsTo` establishes each agent's escalation path to its owning executive.
To make the executives formally **supervise** these agents (downward edge), add
them to the relevant executive's `sendsTo` in `src/departments/executive.ts`
and regenerate — the same idempotent wiring used for the first supervision
batch. Deferred here to keep this batch scoped to department generation.

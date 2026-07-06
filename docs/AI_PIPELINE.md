# Founder OS — Intelligence Pipeline

Founder OS turns raw public signal into ranked, explainable founder
opportunities. **Every stage is deterministic: there is no LLM call, no model
inference, and no external AI API anywhere in the pipeline.** Classification,
scoring, clustering, and reasoning are all fixed keyword/substring/statistical
rules, so every output is reproducible and traceable to the field values that
produced it.

## Stages

```
Research → Problem Intelligence → Opportunity Engine → Founder-facing report
```

### 1. Research collection (`src/research/`)
- `ResearchEngine.run(windowDays, onProgress, topic?)` fans out across the
  source adapters in `src/research/sources/**` via `Promise.allSettled`. Each
  adapter implements `fetch(windowDays, topic?)` and **never throws** — every
  failure resolves to `{ ok: false, reason }` using the shared
  `SourceFailureReason` taxonomy (`sources/classify.ts`).
- **Query Intelligence** (`src/research/query-intelligence.ts`) expands the raw
  user topic into structured, per-source search queries before collection.
  Low-confidence intents fall back to the raw topic; unmapped sources
  (stackexchange) also fall back. Wired in `ResearchEngine.run`.
- Results are deduplicated (`dedup.ts`) and relevance-filtered
  (`relevance.ts`) before aggregation.

### 2. Problem Intelligence (`src/problems/`)
- Clusters raw items into problem clusters by category and concept
  (`concept.ts`, `clustering.ts`), with severity, root-cause, and noise
  filtering — again all rule-based.

### 3. Opportunity Engine (`src/opportunities/`)
Attaches, in a fixed order, a series of **additive, read-only** layers to each
`FounderOpportunityReport` (each documented in `types.ts`):

| Layer | Module | Purpose |
|-------|--------|---------|
| Score breakdown | `scoring.ts` | 8-dimension composite (legacy) |
| **FOIS** | `fois.ts` | Founder Opportunity Intelligence Score — the ranking key |
| Decision | `decision.ts` | BUILD/WATCH/IGNORE + confidence + quality gates |
| Semantic cluster | `semantic.ts` | Canonical-alias merge metadata |
| Calibration | `calibration.ts` | Read-only diagnostics; never affects rank |
| Founder Intelligence | `founder-intelligence.ts` | Competitors, market gaps, differentiation, risks |
| AI Decision Validation | `ai-decision-validation.ts` | Adversarial counter-evidence, final recommendation |
| Business/Market/Revenue | `business-intelligence.ts`, `market-intelligence.ts`, `revenue-intelligence.ts` | Model, buyer, budget, saturation, revenue |
| MVP / Technical / GTM | `mvp-generator.ts`, `technical-blueprint.ts`, `go-to-market.ts` | Advisory build/launch guidance |
| Knowledge Links | `knowledge-links.ts` | Typed node/edge references across sections |
| Opportunity Selection | `opportunity-selection.ts` | Elimination gates + High Conviction survivors |

**Ranking key:** opportunities are sorted by `fois.overall` descending.
`scoreBreakdown.weightedTotal` is retained only as a diagnostic composite.

### 4. Founder Copilot (`src/founder-copilot/`)
A pure, read-only Q&A surface over a single already-computed report. Every
answer is composed only from real field values and carries `citations`
(`fieldPath` + value); unverified fields are flagged `notVerified`. No new
source of truth, no LLM.

### 5. Monitoring (`src/monitoring/`)
`MonitorEngine` reuses the monitoring providers and the pure `diffSnapshots`
engine to detect "what changed since last check" per provider/query, persisting
snapshots in the memory engine. Never throws; per-provider isolation.

## Honesty invariants
- Unknown/unverifiable values are surfaced as `"NOT VERIFIED"` / `"unknown"` —
  never fabricated.
- No layer mutates an upstream layer's output or the report's rank.
- Network access is required only by the live collectors; all tests use mocked
  fetch, matching the sandbox's blocked-egress reality.

## HTTP surface (`src/server/routes/`)
`research.ts`, `opportunities.ts` (pipeline), `monitoring.ts`, `copilot.ts`,
`dashboard.ts`, `connectors.ts`, `auth.ts` — all session-guarded, zod-validated
bodies. See `docs/WEB_ARCHITECTURE.md` for the consuming web app.

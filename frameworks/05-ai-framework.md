# 05 · AI Framework

**Type:** Shared blueprint. Defines the standard AI *surface* every
product offers. The engineering rules for building it (provider
abstraction, prompts, routing, cost, guardrails) live in
[`standards/ai.md`](../standards/ai.md) and are authoritative for the
**how** — this framework defines the **what** and the human-control rules.

A product with no AI features can omit this surface, but must say so
explicitly in its `ARCHITECTURE.md` ("Deviations from global standards").
For every product that does use AI, these are the standard capabilities,
each built on `standards/ai.md`.

## Standard AI capabilities

| Capability | What it is | Default posture |
|---|---|---|
| **AI Assistant** | Conversational copilot scoped to the product's domain and the user's own data | Suggests and drafts; never acts irreversibly without confirmation |
| **AI Insights** | Automatic surfacing of notable patterns/anomalies in the user's data | Read-only; always labeled AI-generated |
| **AI Recommendations** | Next-best-action suggestions tied to the user's goals | Suggestion only; user chooses to act |
| **AI Automation** | Multi-step workflows the AI can run on the user's behalf | Opt-in per workflow; gated by the approval matrix below |
| **AI Predictions** | Forward-looking estimates (churn risk, forecast, trend) | Shown with confidence + basis; never as certainty |
| **AI Reports** | Narrative summaries generated over the user's data | Grounded in real data; cites the underlying figures |

Every one of these is metered, cached where deterministic, and guarded
against prompt injection per `standards/ai.md`.

## Human approval rules (the control matrix)

AI autonomy is graded by the reversibility and blast radius of the action.
This matrix is mandatory for every product:

| Action class | Examples | Rule |
|---|---|---|
| **Read / analyze** | insights, predictions, summaries | AI acts freely; output labeled AI-generated |
| **Draft / propose** | draft email, suggested config, recommended action | AI produces; user reviews before anything happens |
| **Reversible write** | create a draft record, apply a filter, tag items | AI may act; change is easily undoable and logged |
| **Irreversible / external / costly** | send email, charge money, delete data, message a customer, provision resources | **Human confirmation required, always** — AI proposes, a person clicks confirm |
| **Bulk / high blast radius** | act on many records at once | Human confirmation + explicit scope preview ("this will affect 412 rows") |

No product ships AI that autonomously executes an irreversible, external,
or costly action without a confirmation step — unless that specific
autonomy is deliberately designed, security-reviewed, and documented in an
ADR. This rule overrides convenience.

## Transparency requirements

- All AI-generated content is visibly attributed as AI-generated.
- Predictions and insights show their basis (what data, what timeframe)
  and a confidence signal — never a bare number presented as fact.
- The user can always see *why* a recommendation was made and dismiss it.

## Validation checklist

- [ ] Every AI capability offered maps to a row in the approval matrix.
- [ ] No irreversible/external/costly action is AI-autonomous without a
      documented, reviewed exception.
- [ ] All AI output is attributed and (for predictions) shows confidence.
- [ ] Implementation follows `standards/ai.md` (metering, caching,
      injection resistance, structured output).

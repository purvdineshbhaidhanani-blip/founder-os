# 18 · Product Evaluation Framework

**Type:** Per-product scorecard. The standard rubric for scoring any SaaS
in the portfolio — used to decide **build priority** across candidate
products and to sanity-check a product against the portfolio before
committing to it. Copy
[`templates/EVALUATION_SCORECARD_TEMPLATE.md`](../templates/EVALUATION_SCORECARD_TEMPLATE.md)
into `products/<name>/docs/EVALUATION.md`.

This is the closing gate of the Global Looping: a product that hasn't been
scored here hasn't finished the loop.

## Scoring dimensions

Each dimension scored **1–5** with a one-line justification (a bare number
is not a score — the reasoning is the point). Justifications cite the
earlier frameworks (research, competitor, pricing) rather than asserting.

| Dimension | 1 | 5 | Sourced from |
|---|---|---|---|
| **Market Potential** | Tiny/shrinking market | Large, growing, urgent | [`02`](./02-customer-research.md), [`03`](./03-competitor-analysis.md) |
| **Revenue Potential** | Hard to monetize, low willingness to pay | Clear, strong willingness to pay; expansion built in | [`13`](./13-pricing.md), [`02`](./02-customer-research.md) |
| **Technical Difficulty** | Very hard/risky to build well (⚠ scored **inverted** — 5 = easy/low-risk) | Straightforward on the shared foundation | `standards/`, [`16`](./16-technical-foundation.md) |
| **AI Differentiation** | AI adds little; easily copied | AI is a genuine, defensible advantage | [`05`](./05-ai-framework.md), [`03`](./03-competitor-analysis.md) |
| **Scalability** | Ceilings on growth (market, tech, or ops) | Scales cleanly across all three | [`16`](./16-technical-foundation.md) |

> Note the inversion on **Technical Difficulty**: a higher score always
> means "more attractive to build," so easy = 5. State it explicitly on
> the scorecard so scores aren't misread.

## Build Priority

A weighted roll-up, not a raw average — the portfolio's strategy sets the
weights (default below; adjust per portfolio phase and record the weights
used):

```
Build Priority = 0.25·Market
               + 0.25·Revenue
               + 0.20·AI Differentiation
               + 0.15·Scalability
               + 0.15·Technical (inverted: easier scores higher)
```

Bucket the result:
- **Build now** (≥ 4.0) — strong across the board; strong candidate.
- **Watch** (3.0–3.9) — promising but with a specific gap to close first.
- **Ignore / park** (< 3.0) — record why, so it isn't re-litigated later.

## Final Recommendation

A short written verdict that a human can act on: **Build / Watch /
Ignore**, the single biggest reason, the biggest risk, and — if Build —
the one thing that most needs to go right. This narrative matters more
than the number; the number ranks, the narrative decides.

## Rules

- **Evidence over optimism.** Every score cites an earlier framework's
  finding. An all-5s scorecard is a red flag, not a green light.
- **Honest technical scoring.** Difficulty is scored against the *actual*
  shared foundation, not wishful thinking about reuse.
- **The narrative can override the number.** A 4.2 with a fatal,
  unaddressable risk in the recommendation is not a Build. The rubric
  informs judgment; it doesn't replace it.

## Validation checklist

- [ ] All five dimensions scored 1–5 with sourced justifications.
- [ ] Technical Difficulty inversion is stated on the scorecard.
- [ ] Build Priority uses documented weights, not a blind average.
- [ ] Final recommendation names the biggest reason and biggest risk.
- [ ] "Ignore/park" verdicts record why, for future reference.

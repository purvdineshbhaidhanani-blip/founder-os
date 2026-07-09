# 03 · Competitor Analysis Framework

**Type:** Per-product fill-in. Copy
[`templates/COMPETITOR_ANALYSIS_TEMPLATE.md`](../templates/COMPETITOR_ANALYSIS_TEMPLATE.md)
into `products/<name>/docs/COMPETITOR_ANALYSIS.md`.

Establishes where the product wins. The output isn't a feature checklist
against rivals — it's a defensible answer to "why would a customer choose
this over what already exists?" That answer becomes the positioning and
feeds directly into feature priority ([`04`](./04-feature-classification.md))
and pricing ([`13`](./13-pricing.md)).

## Structure

### 1. Top Competitors
The 3–7 alternatives the target customer actually considers — including
the **status quo** (spreadsheets, manual process, "do nothing"), which is
usually the real competitor. Categorize each: direct, indirect, or
substitute.

### 2. Per-competitor profile
For each competitor, capture:

| Field | What to record |
|---|---|
| Positioning | The one-line promise they make to the market |
| Pricing | Model + tiers + entry price + what's gated where |
| Key features | What they lead with; what's table-stakes vs differentiated |
| Strengths | Where they genuinely win (be honest, not dismissive) |
| Weaknesses | Where they fall short for *our* ICP specifically |
| User complaints | Real, sourced grievances (review sites, forums, social) |
| Momentum | Growing, flat, or declining — and the evidence |

### 3. Market Gaps
The unmet needs sitting *between* or *underneath* the competitors — where
customer pain (from [`02`](./02-customer-research.md)) exists but no
adequate solution does. Each gap is a candidate for a differentiated
feature or an AI advantage ([`05`](./05-ai-framework.md)).

### 4. Opportunities
The specific, defensible wedges this product will use to enter and win:
underserved segment, a workflow nobody nails, a pricing model that
disrupts, an AI capability incumbents can't easily bolt on. Ranked by
attractiveness and by how hard they are for incumbents to copy.

## Rules

- **Source complaints, don't invent them.** Every user complaint cites
  where it came from. Fabricated grievances produce a false strategy.
- **Be honest about competitor strengths.** A competitor analysis that
  concludes "we're better at everything" is a red flag, not a result.
- **The status quo is a competitor.** Most B2B products lose to "we'll
  just keep using our spreadsheet," not to a named rival.

## Validation checklist

- [ ] The status quo / "do nothing" is listed as a competitor.
- [ ] Every profile has honest strengths, not just weaknesses.
- [ ] Every user complaint is sourced.
- [ ] At least one market gap ties to a ranked pain point from `02`.
- [ ] Each opportunity states why it's hard for incumbents to copy.

Gate: analysis is complete when the positioning statement — "for [ICP] who
[pain], unlike [top competitor], this product [key differentiator]" —
writes itself from the findings.

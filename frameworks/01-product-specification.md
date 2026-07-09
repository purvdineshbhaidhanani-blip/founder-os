# 01 · Product Specification Framework

**Type:** Per-product fill-in. Every product completes one of these before
any code is written. Copy [`templates/PRODUCT_SPEC_TEMPLATE.md`](../templates/PRODUCT_SPEC_TEMPLATE.md)
into `products/<name>/docs/PRODUCT_SPEC.md` and fill it in.

The product specification is the single source of truth for **what** a
product is and **why** it exists. It is the input every downstream
framework (research, features, pricing, evaluation) builds on. A vague or
skipped spec produces a vague product — this step is not optional.

## Structure

### 1. Product Vision
One paragraph describing the future state this product creates for its
customer. Written in the present tense as if it already exists. Not a
feature list — the outcome.

### 2. Problem Statement
The specific, concrete problem the product solves, stated from the
customer's point of view. One or two sentences. If it takes a paragraph,
the problem isn't focused enough yet.

### 3. Why This Problem Exists
The root cause — why this problem persists today despite existing tools.
Distinguishes a real, structural gap from "someone hasn't bothered." This
is what justifies building at all (and feeds the competitor analysis in
[`03`](./03-competitor-analysis.md) and market gaps).

### 4. Target Customer
Who has this problem acutely enough to pay for a solution. Named segment,
not "everyone." Feeds the full ICP work in
[`02-customer-research.md`](./02-customer-research.md).

### 5. Business Value
The value exchange: what the customer gets (time saved, revenue gained,
risk reduced), and what the business gets (how it makes money — links to
[`13-pricing.md`](./13-pricing.md)). Quantified wherever possible.

### 6. Success Goal
The one primary outcome that defines whether this product succeeded,
expressed as a measurable target with a timeframe (e.g. "reach $10k MRR
within 6 months of launch," "500 activated teams in year one"). Feeds
[`17-success-metrics.md`](./17-success-metrics.md).

### 7. Acceptance Criteria
The concrete, checkable conditions that must be true for the product to be
considered "built" (Phase 1) and "production-ready" (Phase 2). Written so
that anyone can verify them without judgment calls — each is a yes/no.

## Validation checklist

The spec is **complete** only when every item is true:

- [ ] Vision describes an outcome, not a feature list.
- [ ] Problem statement is one/two sentences and from the customer's POV.
- [ ] Root cause explains why existing tools don't already solve it.
- [ ] Target customer is a named segment, not "everyone."
- [ ] Business value is quantified for both customer and business.
- [ ] Success goal is a single measurable target with a timeframe.
- [ ] Every acceptance criterion is a checkable yes/no.
- [ ] Nothing here contradicts `MASTER_PROJECT_CONTEXT.md` or the global
      `standards/`.

If any box is unchecked, return to that section before proceeding to
[`02`](./02-customer-research.md). This is the Quality Gate for Step 1.

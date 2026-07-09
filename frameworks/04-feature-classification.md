# 04 · Feature Classification Framework

**Type:** Per-product fill-in. Lives in
`products/<name>/docs/PRODUCT_SPEC.md` (feature section) or its own
`FEATURES.md`.

Turns pain points and opportunities into a prioritized, buildable feature
set — and, critically, into an honest scope boundary for what Phase 1
ships. Prevents the two failure modes: shipping a bloated v1 nobody
finishes, and shipping a v1 too thin to solve the core job.

## Classification: MoSCoW

Every candidate feature is placed in exactly one bucket:

- **Must Have** — the product is not viable without it. It directly serves
  the core Job To Be Done. If it's cut, the product doesn't solve the
  problem. This bucket *is* the MVP.
- **Should Have** — important and expected, but the product still solves
  the core problem without it at launch. Ships soon after v1.
- **Nice To Have** — genuine value, low urgency. Differentiators and
  polish that can wait without hurting adoption.
- **Future** — explicitly deferred. Recorded so they aren't lost, and so
  scope creep has somewhere to go instead of into v1.

## Prioritization within a bucket

Order features by **value ÷ effort**, made explicit rather than by
gut feel. For each candidate score:

| Dimension | Scale | Source |
|---|---|---|
| Reach | how many ICP users it touches | `02` personas |
| Impact | how much it moves the core JTBD | `02` JTBD / pain rank |
| Confidence | how sure we are of reach × impact | evidence quality |
| Effort | build cost (person-weeks) | engineering estimate |

Priority score = (Reach × Impact × Confidence) ÷ Effort. This is a
sorting aid, not an oracle — a low score on a *Must Have* means "find a
cheaper way to do it," never "cut the core job."

## Every feature specifies

- The pain point / JTBD it serves (traceable to [`02`](./02-customer-research.md)).
- Its MoSCoW bucket and priority score.
- Acceptance criteria (checkable yes/no, per [`01`](./01-product-specification.md)).
- Whether it depends on a Phase 2 integration (and therefore ships as
  built-but-disabled in Phase 1, per `MASTER_PROJECT_CONTEXT.md`).

## Validation checklist

- [ ] Every Must Have traces to the core JTBD — no "nice extras" hiding in
      the MVP bucket.
- [ ] The Must Have set, and only that set, defines Phase 1 scope.
- [ ] Every feature cites the pain point/JTBD it serves.
- [ ] Priority scores are computed, not asserted.
- [ ] Features needing external credentials are flagged as built-disabled
      for Phase 1.

Gate: classification is complete when the Must Have list is small enough
to build well and complete enough to solve the core problem — and you can
defend cutting everything below it from v1.

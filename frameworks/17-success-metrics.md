# 17 · Success Metrics Framework

**Type:** Shared blueprint + per-product targets. Every product
instruments this standard metric set from day one — the same definitions
across the portfolio so products are comparable and the dashboard
([`06`](./06-dashboard-framework.md)) and reports
([`11`](./11-reporting.md)) render one consistent truth. Each product sets
its own **targets** (via the product spec's success goal,
[`01`](./01-product-specification.md)).

## Standard metrics

### Revenue
| Metric | Definition |
|---|---|
| **MRR** | Monthly Recurring Revenue — normalized monthly subscription revenue. The core health number for a SaaS. |
| **ARR** | Annual Recurring Revenue — MRR × 12; the headline scale figure. |

### Growth & engagement
| Metric | Definition |
|---|---|
| **Activation** | % of new signups that reach the defined "first value" moment (from the customer journey, [`02`](./02-customer-research.md)) within a set window. The single most predictive early metric. |
| **DAU** | Daily Active Users — distinct users taking a meaningful action per day. |
| **MAU** | Monthly Active Users — distinct users per month; DAU/MAU is the stickiness ratio. |

### Retention & satisfaction
| Metric | Definition |
|---|---|
| **Retention** | % of users/revenue retained across a period (by cohort). The truest signal of product-market fit. |
| **Churn** | The inverse — % of users (logo churn) or revenue (revenue churn) lost per period. Track both; revenue churn can hide behind logo churn and vice versa. |
| **NPS** | Net Promoter Score — willingness to recommend; a qualitative satisfaction pulse, not a vanity number. |

## Rules

- **Define once, use everywhere.** Each metric has one canonical
  definition (what counts as "active," what window "activation" uses) used
  identically by the dashboard, reports, and admin — no per-surface
  redefinition that makes numbers disagree.
- **Instrumented from launch.** The events that feed these metrics are
  emitted from Phase 1, even before there's traffic — you cannot
  retroactively measure activation you never logged.
- **Cohort-aware.** Retention and churn are meaningless as a single
  blended number; they're tracked by signup cohort.
- **Actionable, not vanity.** Every tracked metric maps to a decision.
  Raw pageviews and totals that don't drive action don't belong on the
  success dashboard.
- **Privacy-respecting.** Metric instrumentation follows the same PII and
  consent rules as everything else ([`14`](./14-compliance.md)); analytics
  never becomes a backdoor around data minimization.

## Validation checklist

- [ ] All standard metrics have one canonical definition, documented.
- [ ] Activation's "first value" moment is defined from the journey.
- [ ] Metric events are instrumented in Phase 1.
- [ ] Retention and churn are cohort-based; both logo and revenue churn.
- [ ] The product's targets trace to its success goal in `01`.
- [ ] Metrics on the dashboard reconcile with reports and admin.

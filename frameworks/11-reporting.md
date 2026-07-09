# 11 · Reporting Framework

**Type:** Shared blueprint. The standard reporting surface every product
offers over its own domain data. Chart/visual rules come from
[`standards/design-system.md`](../standards/design-system.md) and the
`dataviz` skill; AI-narrated reports follow
[`05`](./05-ai-framework.md) and `standards/ai.md`.

## Standard report types

| Report | What it is |
|---|---|
| **Summary Reports** | A point-in-time snapshot of the key metrics for a chosen scope and period (the "state of things" as a shareable artifact). |
| **Trend Reports** | Metrics over time with period-over-period comparison, surfacing direction and inflection points. |
| **AI Reports** | Narrative summaries generated over the data ([`05`](./05-ai-framework.md)): what changed, why it likely changed, what to consider — grounded in and citing the real figures, labeled AI-generated. |

## Standard delivery & export

| Capability | Requirement |
|---|---|
| **Export PDF** | Print-quality, branded, accessible (tagged) PDF of any report. |
| **Export CSV** | Raw underlying data for the user's own analysis; respects the same permission scope as the on-screen report. |
| **Scheduled Reports** | Recurring generation (daily/weekly/monthly) delivered via the notification engine ([`10`](./10-notifications.md)) — email delivery disabled until Phase 2, in-app delivery works in Phase 1. |

## Rules

- **Permission-scoped.** A report only ever contains data the requesting
  user is allowed to see ([`09`](./09-roles-permissions.md)); exports carry
  the same scope — no privilege escalation via CSV.
- **Reproducible.** A report states its scope, filters, period, and
  generation time so two people running "the same report" get the same
  numbers, and a saved report is unambiguous later.
- **Accurate over impressive.** Numbers reconcile with what the dashboard
  ([`06`](./06-dashboard-framework.md)) and success metrics
  ([`17`](./17-success-metrics.md)) show — one source of truth, no
  divergent definitions per report.
- **Async for heavy reports.** Large exports/scheduled runs are generated
  in the background with a "ready" notification, not a blocking request
  (respects `standards/devops.md` performance budgets).
- **Tenant-isolated.** Scheduled reports run in the recipient's tenant
  scope; a schedule can't be pointed at another tenant's data.

## Validation checklist

- [ ] Summary, trend, and (where AI is used) AI report types available.
- [ ] PDF + CSV export, both permission-scoped.
- [ ] Scheduled reports run async and deliver in-app in Phase 1; email
      delivery wired but disabled until Phase 2.
- [ ] Report numbers reconcile with dashboard and metrics definitions.
- [ ] AI reports are grounded, cite figures, and are labeled AI-generated.

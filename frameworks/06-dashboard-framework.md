# 06 · Dashboard Framework

**Type:** Shared blueprint. Every product's primary authenticated screen
follows this structure. Visual rules (tokens, states, responsive,
charts) come from [`standards/design-system.md`](../standards/design-system.md)
and the `dataviz` skill; this framework defines the standard **anatomy**
so every product's dashboard is instantly familiar and complete.

The dashboard answers, in one glance: *"What's the state of my world, what
needs my attention, and what can I do next?"* It is not a data dump.

## Standard anatomy

1. **KPI Cards** — 3–6 headline metrics at the top, each showing current
   value, trend vs. previous period (direction + %), and a sparkline where
   useful. The KPIs are the product's success metrics
   ([`17`](./17-success-metrics.md)) rendered for the user's own scope.
2. **Charts** — the 1–3 visualizations that explain the "why" behind the
   KPIs (trend over time, breakdown by category). Follow the `dataviz`
   skill for chart choice, color, and accessibility. Never a chart for
   decoration.
3. **Activity Feed** — a reverse-chronological stream of what's happened
   recently across the account (created, changed, completed), each entry
   linking to the underlying record.
4. **Alerts** — surfaced issues needing attention (errors, expirations,
   limits approaching, anomalies from [`05`](./05-ai-framework.md)),
   ranked by severity. Distinct from the activity feed: alerts are
   "something needs you," activity is "something happened."
5. **Quick Actions** — the 2–5 highest-frequency actions for the primary
   persona, one click away (create, invite, import, generate report).
6. **Search** — global, keyboard-accessible (⌘K command palette), scoped
   to the user's permitted data.
7. **Filters** — scope controls (date range, segment, status) that apply
   consistently across KPIs, charts, and feed.
8. **Recent Activity** — the user's own recently-viewed/edited items for
   fast resumption (distinct from the account-wide activity feed).

## Mandatory states

Per `standards/design-system.md`, every data region on the dashboard
defines all three:

- **Loading** — skeletons matching the eventual layout, never a blank
  screen or a full-page spinner.
- **Empty (first-run)** — a genuine empty state that onboards: explains
  what will appear here and offers the quick action to create the first
  item. The empty dashboard is a new user's first impression — it is
  designed, not defaulted.
- **Error** — per-region, retryable, never a whole-page crash because one
  widget's data failed.

## Rules

- Personalized and permission-scoped: every user sees only their permitted
  data ([`09`](./09-roles-permissions.md)), and role changes what's shown
  (a Viewer sees no Quick Actions they can't perform).
- Responsive: KPI cards reflow, charts stay legible, the layout collapses
  gracefully to mobile per the design system.
- Fast: the dashboard meets the frontend performance budget in
  `standards/devops.md` — it's the most-loaded screen in the product.

## Validation checklist

- [ ] KPI cards show value + trend, not bare numbers.
- [ ] Every chart earns its place (explains a KPI) and follows `dataviz`.
- [ ] Alerts are separated from activity and ranked by severity.
- [ ] Quick actions match the primary persona's top jobs.
- [ ] Loading, first-run empty, and error states all designed.
- [ ] Everything is permission-scoped and responsive.

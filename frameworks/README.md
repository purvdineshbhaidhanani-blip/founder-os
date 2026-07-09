# Frameworks — the Common SaaS Foundation

The **Global Looping**: eighteen reusable frameworks that every current and
future SaaS product in this portfolio runs through. Where
[`standards/`](../standards/README.md) defines **how** to build well (the
engineering, security, and design rules), these frameworks define **what**
every SaaS contains and the **business/product** work every SaaS does
before and around the build.

Running the Global Looping is **mandatory** for every product — a product
that has skipped frameworks has not finished.

## Authority order

[`MASTER_PROJECT_CONTEXT.md`](../MASTER_PROJECT_CONTEXT.md) →
[`standards/`](../standards/README.md) → these frameworks → individual
product specs. Where a framework overlaps a standard (security, technical
foundation), **the standard is authoritative** and the framework is a
checklist/lens over it — never a competing copy of the rules.

## The eighteen frameworks

| # | Framework | Type |
|---|---|---|
| 01 | [Product Specification](./01-product-specification.md) | Per-product fill-in |
| 02 | [Customer Research](./02-customer-research.md) | Per-product fill-in |
| 03 | [Competitor Analysis](./03-competitor-analysis.md) | Per-product fill-in |
| 04 | [Feature Classification](./04-feature-classification.md) | Per-product fill-in |
| 05 | [AI Framework](./05-ai-framework.md) | Shared blueprint |
| 06 | [Dashboard Framework](./06-dashboard-framework.md) | Shared blueprint |
| 07 | [Admin Panel Framework](./07-admin-panel-framework.md) | Shared blueprint |
| 08 | [User Management](./08-user-management.md) | Shared blueprint |
| 09 | [Roles & Permissions](./09-roles-permissions.md) | Shared blueprint |
| 10 | [Notifications](./10-notifications.md) | Shared blueprint |
| 11 | [Reporting](./11-reporting.md) | Shared blueprint |
| 12 | [Integrations](./12-integrations.md) | Shared blueprint |
| 13 | [Pricing](./13-pricing.md) | Shared structure + fill-in |
| 14 | [Compliance](./14-compliance.md) | Shared blueprint |
| 15 | [Security](./15-security.md) | Lens over `standards/security.md` |
| 16 | [Technical Foundation](./16-technical-foundation.md) | Lens over `standards/*` |
| 17 | [Success Metrics](./17-success-metrics.md) | Shared blueprint + targets |
| 18 | [Product Evaluation](./18-product-evaluation.md) | Per-product scorecard |

## Two kinds of framework

- **Per-product fill-in** (01–04, 13 partly, 18) — each product produces
  its *own* filled-in copy, using the matching template in
  [`templates/`](../templates/README.md). These capture what's unique to
  the product: its problem, customers, competitors, features, prices,
  score.
- **Shared blueprint** (05–12, 14–17) — the standard *shape* every product
  implements identically (the same dashboard anatomy, the same role model,
  the same notification engine), so the portfolio is consistent and
  components are reusable. Products don't re-invent these; they implement
  them and record any deliberate deviation in their `ARCHITECTURE.md`.

## How a product runs the loop

Recommended order — each step's output feeds the next:

1. **Define** (01 → 02 → 03 → 04): spec, research, competitors, features.
   *Gate: is the problem real, the customer specific, the wedge
   defensible, the MVP scope honest?*
2. **Design the standard surfaces** (05–12): AI, dashboard, admin, users,
   roles, notifications, reporting, integrations — implemented per the
   shared blueprints on top of `standards/`.
3. **Set the business rails** (13, 14, 17): pricing, compliance posture,
   success-metric instrumentation.
4. **Verify the gates** (15, 16): security and technical checklists confirm
   the product actually sits on the shared foundation.
5. **Evaluate** (18): score the product; produce the Build/Watch/Ignore
   recommendation.

## Quality Gate

If any framework is incomplete — a fill-in with unchecked validation boxes,
a shared blueprint not implemented, a gate checklist not passing — return
to that framework, complete it, validate, improve, then finalize. A
product exits the Global Looping only when all eighteen pass their
validation checklist.

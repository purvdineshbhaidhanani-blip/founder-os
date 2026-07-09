# 13 · Pricing Framework

**Type:** Shared structure + per-product fill-in. Every product uses the
standard five-tier shape below; each product fills in its own limits,
prices, and gated features via
[`templates/PRICING_TEMPLATE.md`](../templates/PRICING_TEMPLATE.md) →
`products/<name>/docs/PRICING.md`. Billing is built and wired but
**payment processing is disabled until Phase 2 credentials**.

## Standard tiers

| Tier | Role in the ladder |
|---|---|
| **Free** | Removes all friction to first value. Real (not crippled) usefulness within tight limits; the top of the funnel and the activation surface. |
| **Starter** | First paid step for an individual/small team. Lifts the most-hit Free limits; low, self-serve price. |
| **Pro** | The core tier most paying customers land on. Full standard feature set for a team; the pricing anchor. |
| **Business** | Scale tier: higher limits, advanced admin/security/roles, priority support, usage room for larger orgs. |
| **Enterprise** | Custom: SSO/SAML, advanced compliance ([`14`](./14-compliance.md)), custom limits, SLAs, procurement/invoicing. "Contact us," not a checkout. |

A product may collapse tiers (e.g. skip Starter) if its spec justifies it —
but the *shape* (a free entry, a self-serve middle, an enterprise top) is
the default.

## Pricing logic (entitlements)

- **Feature gating and usage limits are entitlements, not scattered
  `if plan === 'pro'` checks.** A central entitlements layer answers
  `can(account, feature)` and `withinLimit(account, metric)` — the single
  place that maps plan → what's allowed, mirroring the RBAC policy pattern
  ([`09`](./09-roles-permissions.md)).
- **Limits are enforced server-side** and surfaced to the user *before*
  they hit the wall (usage meters, "approaching limit" alerts via
  [`10`](./10-notifications.md)), never a silent hard stop.
- **Graceful at the boundary.** Hitting a limit prompts an upgrade path,
  preserves the user's data/work, and degrades predictably — it never
  errors or loses work.
- **Billing states are handled:** trialing, active, past-due, canceled,
  and their effect on entitlements are defined up front. Past-due
  downgrades access on a defined grace schedule, it doesn't instantly
  delete.

## Phase 1 vs Phase 2

- **Phase 1:** the full pricing model, tier definitions, entitlements
  engine, usage metering, and billing UI are built. No payment provider is
  connected — the billing screens show a clear "billing not configured"
  state and entitlements run against a default/assigned plan for
  development. No real or invented payment credentials.
- **Phase 2:** connect the real payment provider, wire checkout/upgrade/
  downgrade/invoices, test the full billing lifecycle end to end.

## Validation checklist

- [ ] Tier shape follows the standard (free entry → self-serve → enterprise).
- [ ] Free tier is genuinely useful, not a crippled demo.
- [ ] Entitlements are centralized (`can`/`withinLimit`), enforced
      server-side, not scattered plan checks.
- [ ] Usage is metered and surfaced before limits are hit.
- [ ] All billing states (trial/active/past-due/canceled) are defined.
- [ ] Payment processing built but disabled in Phase 1; no invented keys.

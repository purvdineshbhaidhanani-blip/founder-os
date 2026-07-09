# Pricing — <Product Name>

> Framework: [`frameworks/13-pricing.md`](../../../frameworks/13-pricing.md).
> Billing is built but payment processing stays disabled until Phase 2.

## Tiers
| | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Price | $0 | | | | Custom |
| Target | | | | | |
| Seats | | | | | Custom |
| Key limits | | | | | Custom |
| Gated features | — | | | | SSO/compliance/SLA |

<Collapse any tier the product doesn't need, and note why here.>

## Entitlements (pricing logic)
Central `can(account, feature)` / `withinLimit(account, metric)` mapping:

| Feature / metric | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| <feature flag> | | | | | |
| <usage limit> | | | | | |

## Limit behavior
- **Approaching limit:** <usage meter + alert via notifications>
- **At limit:** <upgrade prompt; work preserved; no error/data loss>

## Billing states
| State | Effect on entitlements |
|---|---|
| Trialing | |
| Active | |
| Past-due | <grace period, then downgrade — not instant deletion> |
| Canceled | |

## Validation checklist
- [ ] Tier shape follows the standard ladder.
- [ ] Free tier is genuinely useful.
- [ ] Entitlements centralized, enforced server-side.
- [ ] Usage metered and surfaced before limits hit.
- [ ] All billing states defined.
- [ ] Payment processing built but disabled; no invented credentials.

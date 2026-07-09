# Products

One directory per SaaS product: `products/<saas-name>/`.

Each product is a complete, independently deployable application (its own
`package.json`, its own `docs/`, its own `scripts/`, its own database) that
inherits engineering, design, security, AI, database, API, testing,
devops, and documentation rules from [`/standards`](../standards/README.md)
and defines only what's genuinely product-specific:

- Name, problem, target customer
- Features and dashboard/admin requirements
- Pricing strategy
- Workflow
- Brand style (accent color, voice, logo — layered on the shared design
  system, not a replacement for it)
- Success goal

## Starting a new product

1. Copy `templates/product-scaffold/` to `products/<name>/`.
2. **Run the Global Looping** ([`frameworks/`](../frameworks/README.md)) —
   the mandatory 18-framework loop: define the product (spec, customer
   research, competitor analysis, feature classification), design the
   standard surfaces (AI, dashboard, admin, users, roles, notifications,
   reporting, integrations), set the business rails (pricing, compliance,
   metrics), verify the security/technical gates, and score the product
   (evaluation). Use the framework fill-in templates in
   [`templates/`](../templates/README.md) for the per-product artifacts.
3. Fill in `docs/README.md`, `docs/ARCHITECTURE.md`, and the product's
   own identity content per the list above.
4. Build Phase 1 (complete architecture, no required credentials,
   integrations wired but disabled) against
   [`standards/`](../standards/README.md) and per
   [`MASTER_PROJECT_CONTEXT.md`](../MASTER_PROJECT_CONTEXT.md).
5. Add the product to the table below once its scaffold exists.

## Portfolio

| Product | Status | Description |
|---|---|---|
| _none yet_ | — | — |

# Templates

Reusable starting points shared by every SaaS product in this portfolio.
Two things live here:

- **Document templates** (`*_TEMPLATE.md`) — copy into
  `products/<name>/docs/` (or `docs/decisions/` for the ADR template) and
  fill in. See `standards/documentation.md` for what's required and when.
- **`product-scaffold/`** — the directory tree a brand-new SaaS product is
  instantiated from. Copy it to `products/<name>/` as the first step of
  starting a new product, then fill it in per that product's spec. See
  `product-scaffold/README.md`.

### Documentation templates

| Template | Copy to | Purpose |
|---|---|---|
| `README_TEMPLATE.md` | `products/<name>/docs/README.md` | Product overview + quick start |
| `ARCHITECTURE_TEMPLATE.md` | `products/<name>/docs/ARCHITECTURE.md` | System shape, components, data flow, key decisions |
| `ADR_TEMPLATE.md` | `products/<name>/docs/decisions/NNNN-title.md` | One record per significant, hard-to-reverse decision |
| `API_DOCS_TEMPLATE.md` | `products/<name>/docs/API.md` | Route-by-route API reference |
| `CHANGELOG_TEMPLATE.md` | `products/<name>/docs/CHANGELOG.md` | Dated record of notable changes |
| `ONBOARDING_TEMPLATE.md` | `products/<name>/docs/ONBOARDING.md` | Clone-to-running-locally guide |
| `TROUBLESHOOTING_TEMPLATE.md` | `products/<name>/docs/TROUBLESHOOTING.md` | Known issues and fixes |

### Framework fill-in templates

Per-product instances of the business frameworks in
[`/frameworks`](../frameworks/README.md) — each product produces its own
filled-in copy.

| Template | Copy to | Framework |
|---|---|---|
| `PRODUCT_SPEC_TEMPLATE.md` | `products/<name>/docs/PRODUCT_SPEC.md` | [01](../frameworks/01-product-specification.md) + [04](../frameworks/04-feature-classification.md) |
| `CUSTOMER_RESEARCH_TEMPLATE.md` | `products/<name>/docs/CUSTOMER_RESEARCH.md` | [02](../frameworks/02-customer-research.md) |
| `COMPETITOR_ANALYSIS_TEMPLATE.md` | `products/<name>/docs/COMPETITOR_ANALYSIS.md` | [03](../frameworks/03-competitor-analysis.md) |
| `PRICING_TEMPLATE.md` | `products/<name>/docs/PRICING.md` | [13](../frameworks/13-pricing.md) |
| `EVALUATION_SCORECARD_TEMPLATE.md` | `products/<name>/docs/EVALUATION.md` | [18](../frameworks/18-product-evaluation.md) |

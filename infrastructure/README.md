# Infrastructure

Cross-product infrastructure-as-code: shared CI/CD pipeline definitions,
deployment platform configuration, and any infra that spans more than one
product (a shared VPC/network, a shared monitoring stack, a shared secrets
manager configuration).

Per `standards/devops.md`, infrastructure is defined as code and checked
in here (or in the individual product's own directory, for infra that is
genuinely single-product) — never configured by hand with no record.

## Structure (once populated)

```
infrastructure/
  ci/            # shared CI workflow templates/reusable actions
  deploy/        # shared deployment platform config
  monitoring/    # shared observability stack config
```

Currently empty — no product exists yet to deploy. Individual products
provision their own `<product>/infrastructure/` for anything that isn't
genuinely shared across the portfolio.

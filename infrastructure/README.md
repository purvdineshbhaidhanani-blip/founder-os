# Infrastructure

Cross-product infrastructure-as-code: shared CI/CD pipeline definitions,
deployment platform configuration, and any infra that spans more than one
product (a shared VPC/network, a shared monitoring stack, a shared secrets
manager configuration).

Per `standards/devops.md`, infrastructure is defined as code and checked
in here (or in the individual product's own directory, for infra that is
genuinely single-product) — never configured by hand with no record.

## Structure

```
infrastructure/
  launcher/      # local-dev portfolio launcher — see launcher/README.md
  ci/            # shared CI workflow templates/reusable actions (not yet populated)
  deploy/        # shared deployment platform config (not yet populated)
  monitoring/    # shared observability stack config (not yet populated)
```

`launcher/` is the only populated directory so far: a local-only dashboard
(port 3000) listing all 12 products, their live status, and one-command
startup for the whole portfolio. See `launcher/README.md`.

`ci/`, `deploy/`, and `monitoring/` remain unpopulated — no product has
been deployed yet. Individual products provision their own
`<product>/infrastructure/` for anything that isn't genuinely shared
across the portfolio.

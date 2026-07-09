# Deployment

Environment configuration and infra-as-code specific to this product. Full
rules in [`standards/devops.md`](../../../standards/devops.md).

## Structure

```
deployment/
  ci/            # this product's CI workflow (or a thin wrapper around a shared one in /infrastructure)
  <platform>/     # platform-specific config (e.g. railway.json, vercel.json, Dockerfile)
```

## Before Phase 1 is "complete" for this product

- CI runs typecheck, lint, unit+integration tests, and build on every PR.
- A preview/staging deploy config exists even though it isn't wired to
  real infrastructure yet — the pipeline shape is complete, credentials
  are pending.
- `.env.example` at the product root documents every variable and what
  stays disabled without it.

## Phase 2

- Wire real staging/production targets, database migrations as a
  pipeline step, and the manual staging→production promotion gate.
- Verify rollback works before relying on it.

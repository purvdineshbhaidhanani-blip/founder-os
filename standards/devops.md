# DevOps Standards

## Environments

Every product has three environments, kept as close to identical
configuration as possible (same infra shape, different data/credentials):

- **Development** — local machine or ephemeral cloud dev environment.
  Uses mock/disabled integrations per `MASTER_PROJECT_CONTEXT.md` until
  credentials exist.
- **Staging/Preview** — deployed automatically per PR or per merge to the
  main branch, using real infrastructure but test/sandbox credentials
  (test-mode payment keys, sandbox OAuth apps). This is where Phase 2
  verification happens before production.
- **Production** — real credentials, real customer data, most restricted
  access, deployed only from the main branch through the pipeline, never
  by hand.

## Git workflow & branch strategy

- Trunk-based: `main` is always deployable. Work happens on short-lived
  feature branches (`feature/<short-desc>`, `fix/<short-desc>`) merged via
  PR.
- No direct pushes to `main` — every change lands through a reviewed PR
  with green CI (per `standards/testing.md`).
- Commit messages explain **why**, follow conventional-commit-style
  prefixes where helpful (`feat:`, `fix:`, `chore:`, `refactor:`), and
  stay scoped to one logical change per commit.
- PRs are scoped to one reviewable concern; large features land as a
  sequence of small PRs behind a flag rather than one giant diff.

## Deployment flow

1. PR opened → CI runs full suite (`standards/testing.md`) → preview
   environment deployed automatically.
2. Reviewer verifies the preview environment for UI/UX changes, not just
   the diff.
3. Merge to `main` → CI runs again → automatic deploy to staging.
4. Manual promotion (not automatic) from staging to production, gated on
   a green staging smoke pass — production deploys are a deliberate action,
   never a side effect of merging.
5. Database migrations run as a distinct, ordered step before the new
   application code that depends on them goes live (see zero-downtime
   migration rules in `standards/database.md`).

## Releases

- Each production deploy is tagged (semantic version or date-based per
  product convention) with an auto-generated changelog entry summarizing
  merged PRs since the last release.
- Feature flags decouple deploy from release for risky or partially-built
  features — code ships dark, is turned on deliberately.

## Monitoring & logging

- Application logs (structured, per `standards/engineering.md`) are
  shipped to a centralized log store per environment, retained on a
  documented schedule.
- Uptime/health checks on every deployed service, alerting on sustained
  failure (not on a single blip) to avoid alert fatigue.
- Error tracking (e.g. Sentry-equivalent) captures unhandled exceptions in
  both frontend and backend with source-mapped stack traces, grouped and
  triaged, not just logged and ignored.
- Key business metrics (signups, activation, core workflow completion,
  errors per request) are on a dashboard visible to the team, not buried
  in raw logs.
- Performance budgets (see below) are monitored continuously in
  production, not just checked once at launch.

## Backups & rollback

- Database backup schedule and retention per `standards/security.md`.
- Every production deploy can be rolled back to the previous known-good
  release within minutes — either via the deploy platform's native
  rollback or a documented redeploy-previous-tag procedure, tested at
  least once before it's relied upon for real.
- A failed migration has a tested rollback migration or an explicit,
  documented forward-fix plan before it's allowed to run in production.

## Performance budgets

- Frontend: Core Web Vitals targets — LCP < 2.5s, INP < 200ms, CLS < 0.1
  on representative connections/devices, checked in CI via Lighthouse
  budgets on the critical pages.
- Backend: p95 API latency targets defined per endpoint class (simple
  read < 200ms, write < 500ms, AI-backed endpoints have their own budget
  reflecting model latency) and monitored, not just tested once.

## Infrastructure as code

- Any infrastructure a product needs beyond the base deploy platform
  (queues, cron/schedulers, storage buckets, CDN config) is defined as
  code (Terraform, or the platform's native config-as-code) and checked
  into `infrastructure/` or the product's own repo, never clicked together
  by hand in a console with no record.

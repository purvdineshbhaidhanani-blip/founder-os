# Testing Standards

Every product ships with real test coverage as part of Phase 1 — tests are
not a Phase 2 afterthought, since Phase 2's entire job is validating
already-built architecture against real credentials.

## Test pyramid

- **Unit tests** — the largest layer. Pure functions, business logic in
  `lib/services/`, validation schemas, utility functions. Fast (no
  network, no real database), run on every save in local dev and on every
  CI run.
- **Integration tests** — API routes against a real (test) database,
  service-to-service interactions, auth flows. Run against a disposable
  test database/container, never against shared dev/staging data.
- **End-to-end tests** — critical user journeys through the real UI in a
  real browser (Playwright): signup → onboarding → core workflow →
  settings, plus the admin equivalent. Fewer in number, highest confidence,
  run in CI on every PR and against every deploy.

Rule of thumb ratio: many unit tests, a meaningful layer of integration
tests around every API route and database interaction, a focused set of
E2E tests covering only the paths that would be a real incident if broken.

## What must be tested

- Every API route: happy path, validation failure, unauthenticated,
  unauthorized (wrong role/tenant), and not-found cases.
- Every piece of business logic with a conditional or calculation
  (pricing, permissions, state transitions) — tested for each branch, not
  just the default path.
- Every auth-sensitive boundary (login, signup, password reset, session
  handling, RBAC checks) — these are the highest-cost-of-failure code
  paths in the product.
- Every database migration that transforms existing data (backfills) is
  tested against representative fixture data before it runs anywhere real.
- Accessibility: automated axe checks on core screens in CI, plus the
  manual screen-reader pass called out in `standards/design-system.md`
  before Phase 2 sign-off.

## Coverage rules

- No hard vanity coverage percentage gate — coverage is a signal, not the
  goal. Instead: no PR merges that adds business logic or an API route
  without an accompanying test for it.
- Untested code in a diff is treated the same as a lint failure in review
  — a defect to fix before merge, not a follow-up ticket.
- Bug fixes always come with a regression test that fails before the fix
  and passes after — without exception.

## Test quality

- Tests assert behavior/output, not implementation detail — a test should
  survive an internal refactor that doesn't change observable behavior.
- No flaky tests tolerated: a test that fails intermittently is fixed or
  deleted, never silently retried into green or skipped indefinitely.
- Test data is generated per-test (factories/builders), not shared mutable
  fixtures that create ordering dependencies between tests.
- Mocks/stubs are used at true external boundaries (third-party APIs,
  email/payment providers) — internal application code is tested against
  its real collaborators wherever practical.

## CI requirements

Every PR, before merge, runs:

1. Typecheck (`tsc --noEmit`) — zero errors.
2. Lint (ESLint + Prettier check) — zero errors.
3. Unit + integration test suite — zero failures.
4. E2E suite against a preview/build environment for the critical paths —
   zero failures.
5. Dependency vulnerability scan — no new criticals/highs introduced.
6. Build — the production build must succeed, not just typecheck.

A red CI run blocks merge; there is no "merge anyway" override without an
explicit, documented exception approved by the user.

## Environments for testing

- Unit tests: no external dependencies.
- Integration/E2E: a dedicated, disposable test database and, where AI or
  third-party calls are involved, recorded/mocked responses — never live
  calls to paid external services from the automated test suite by
  default.
- Staging environment (Phase 2) mirrors production configuration for a
  final manual smoke pass before release, per `standards/devops.md`.

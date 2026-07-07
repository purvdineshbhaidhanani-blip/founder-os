# Universal Platform v1.0 — Production Checklist

Actionable checklist for a product built on these packages going to
production. Each row names the concrete action and where to find the
detail. This is scoped to the `@platform/*` packages — see the root
`DEPLOYMENT.md` for Founder OS's own application-level deployment.

## Before you deploy

| # | Item | Action | Detail |
|---|---|---|---|
| 1 | Provider credentials | Set env vars for every external provider you actually use (OpenAI/Anthropic/object storage/Resend/SMTP) | `docs/PROVIDER_SETUP.md` |
| 2 | Provider validation gate | Run `npm run validate:providers` in CI (or at startup) and fail the deploy on a non-zero exit | `docs/PROVIDER_SETUP.md` §4 |
| 3 | Object storage signing | Implement `signRequest` for your chosen backend (SigV4 for S3, R2 API token signing, or a presigned-URL issuer) — this platform does not ship vendor signing code | `docs/PROVIDER_SETUP.md` §2 |
| 4 | Retry policy | Decide per-provider whether to opt into `retryPolicy` (default is no retry everywhere) | `docs/PLATFORM_UPGRADE_GUIDE.md` §4 |
| 5 | Timeouts | Confirm the default timeouts (AI: 120s, storage/email: 30s) fit your workload; override via constructor options if not | `docs/PROVIDER_SETUP.md` |
| 6 | Identity backend | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for durable identity storage, and apply `supabase/migrations/0002_identity.sql`; otherwise identity is in-memory and does not survive a restart | `docs/IDENTITY.md` |
| 7 | Health checks wired | Register each configured provider's health check (`createOpenAIHealthCheck`, `createObjectStorageHealthCheck`, `createHttpEmailHealthCheck`/`createSmtpHealthCheck`) into your app's `HealthCheckRegistry` so `/health` reflects real provider state | `docs/PROVIDER_SETUP.md` |
| 8 | Build/typecheck/lint/test | `npm run typecheck && npm run lint && npm test` all green | this checklist's "Quality gate" below |

## Known gaps and how to work around them

These are the honest limits of this release — each is a deliberate,
documented boundary, not an oversight found late:

| Gap | Why it's out of scope for this release | Workaround |
|---|---|---|
| No AWS SigV4 / vendor request-signing implementation | Hand-rolled cryptographic signing is security-sensitive code this environment cannot test against a live account | Supply `signRequest` yourself (a small vendor SDK's signer, or a presigned-URL service) — see `docs/PROVIDER_SETUP.md` §2 |
| No SMTP message-submission adapter | Raw SMTP (RFC 5321 AUTH negotiation, dot-stuffing, etc.) is real protocol work that needs a live server to test safely; only a connectivity health check (`createSmtpHealthCheck`) is implemented | Use `createResendEmailChannel` or any other HTTP-based provider via `HttpEmailChannel`, or bring a vetted SMTP client library |
| `@platform/ui` has no automated tests | No jsdom/component-testing infrastructure exists in this repo (Vitest runs `environment: "node"`); adding one is test-infra setup, not a platform-package change | Manually verify UI changes in a browser before shipping; consider adding Playwright component tests or jsdom + Testing Library as a separate, deliberate infra change |
| `PostgrestIdentityStore` untested against a live database | No reachable Supabase project in this environment | Smoke-test against a real project before relying on it in production (it is typechecked and structurally mirrors the already-production-proven `SupabaseMemoryStore`) |
| No email delivery / password reset / email verification in `@platform/identity` | Each needs transactional email delivery, a distinct larger feature | Build on top of `@platform/engines/notification` once you have a real channel configured |
| No rate limiting on `/api/identity/login` or `/register` | Password verification already runs at scrypt cost (not free to brute-force), but there's no lockout/backoff | Add rate limiting at your reverse proxy / API gateway, or wire `TokenBucketRateLimiter` (`@platform/engines/integration`) in front of these routes |
| Package test files (`packages/*/tests`) aren't covered by a dedicated `tsc --noEmit` pass | They're exercised by Vitest (esbuild transpilation — no type checking) and by ESLint's typed-linting rules (`tsconfig.eslint.json`), but that config also spans pre-existing, unrelated Founder OS test files (root `tests/web-e2e`, `tests/server`) with type gaps of their own, so it can't be wired into `npm run typecheck` without also blocking on out-of-scope failures | Rely on ESLint typed-linting + Vitest's runtime assertions for package test files; a scoped fix would need a package-local typecheck config that includes `tests/` without inheriting the root config's broader `include` |
| No published npm registry entries | Out of scope for this release | Consume via npm workspace resolution within this repo, or `npm pack` a package manually |

## Security review

| Item | Status |
|---|---|
| No `eval`/`new Function`/`child_process` anywhere in `packages/*/src` | Verified (grep, this release) |
| No hardcoded credential-shaped string literals in `packages/*/src` | Verified (grep, this release) |
| `HttpObjectStorage` key-to-URL resolution is SSRF/path-traversal-safe (keys can't escape `baseUrl` via a scheme, protocol-relative prefix, or `..`) | Verified, regression-tested (`storage.test.ts`) |
| Every session-bearing identity route requires `requireIdentityUser`/`requireOrgPermission` | See `docs/IDENTITY.md` "RBAC enforcement" |
| Session tokens are opaque + SHA-256-hashed at rest (a DB read alone can't produce a usable session) | See `docs/IDENTITY.md` |
| Secrets (`SUPABASE_SERVICE_ROLE_KEY`, provider API keys) are read from env vars only, never logged | Verified — provider adapters never log request headers |
| Every HTTP-based provider adapter now has a bounded timeout (no indefinite hang on a stalled connection) | New this release |

## Quality gate (run before every release)

```
npm install
npm run typecheck        # root + all 7 packages
npx eslint . --ext .ts,.tsx
npx vitest run            # all packages + Founder OS's own suite
npm run validate:providers  # only meaningful with real provider env vars set
```

All must pass with zero errors. Warnings pre-dating this release (a handful
of `@typescript-eslint/no-explicit-any`/`no-unused-vars` in Founder OS's own
`tests/`/`scripts/`, unrelated to the platform packages) are tracked, not
blocking.

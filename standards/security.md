# Security Standards

Every product in this portfolio ships secure by default. These rules apply
from the first Phase 1 commit — security is not deferred to Phase 2;
Phase 2 only turns on real credentials for architecture that is already
built correctly.

## Authentication

- Session-based or token-based auth via a vetted library/provider
  (e.g. Auth.js/NextAuth, Lucia, or the platform's own auth service) —
  never a hand-rolled password/session scheme.
- Passwords hashed with argon2id (preferred) or bcrypt (cost ≥ 12); never
  reversible encryption, never plaintext, never a fast general-purpose
  hash (MD5/SHA-1/SHA-256 alone).
- Sessions are httpOnly, `Secure` in production, `SameSite=Lax` (or
  `Strict` where flows allow), with server-side revocation on logout and
  password change.
- OAuth/social login (Google, GitHub, etc.) is built and wired per
  `standards/api.md` conventions but stays fully disabled — no client
  ID/secret required to run — until real credentials are supplied in
  Phase 2. The UI affordance can exist; the flow fails closed with a clear
  "not configured" state rather than crashing.
- MFA (TOTP at minimum) is designed into the auth architecture from day
  one so it can be turned on without a schema migration later.
- Account lockout / exponential backoff on repeated failed logins.

## Authorization & RBAC

- Every product defines an explicit role model (minimum: `owner`, `admin`,
  `member`; add product-specific roles as needed) before any protected
  route ships.
- Authorization checks happen server-side on every request — a hidden UI
  element is not a security control.
- Prefer centralized policy functions (`can(user, action, resource)`) over
  scattered inline role checks, so the rules are auditable in one place.
- Multi-tenant products scope every query by tenant/organization ID at the
  data-access layer, not just in the UI — cross-tenant data leakage is
  treated as a critical severity bug.

## Secrets & environment variables

- Secrets live only in environment variables (or a secrets manager in
  production), never committed to the repo, never hard-coded, never logged.
- Every product ships a `.env.example` documenting every variable name and
  what breaks if it's missing — with **no real values**, ever.
- `.env*` (except `.env.example`) is gitignored at the repo root and
  re-verified per product.
- Never invent placeholder-looking-real credentials (e.g. fake-but-valid-
  shaped API keys) — leave the value empty and the integration disabled,
  per `MASTER_PROJECT_CONTEXT.md`.
- Secrets are rotated on suspected compromise and on employee/collaborator
  offboarding; rotation procedure is documented per product in Phase 2.

## Rate limiting & abuse prevention

- Every public-facing endpoint (auth, forms, webhooks, search) has rate
  limiting by IP and/or account, sized to the endpoint's sensitivity
  (auth endpoints strictest).
- Expensive operations (AI calls, exports, bulk operations) get their own,
  tighter limits independent of general API limits.
- Rate limit responses use `429` with a `Retry-After` header — never a
  silent drop.

## Cross-cutting web security

- **CSRF** — state-changing requests are protected via same-site cookies +
  a CSRF token (double-submit or synchronizer pattern) for any form/flow
  not natively protected by the framework's request handling.
- **XSS** — no `dangerouslySetInnerHTML`/raw HTML injection without
  sanitization (e.g. DOMPurify) at the point of render; user content is
  escaped by default via the framework's templating.
- **SQL injection** — all database access goes through parameterized
  queries or a query builder/ORM; string-concatenated SQL is never
  written, reviewed as an automatic rejection if found.
- **CSP** — a Content-Security-Policy header restricting script/style/frame
  sources is defined per product, defaulting to deny-by-default and
  allow-listing only what's actually used.
- **Secure headers** — `Strict-Transport-Security`, `X-Content-Type-
  Options: nosniff`, `X-Frame-Options: DENY` (or CSP `frame-ancestors`),
  `Referrer-Policy: strict-origin-when-cross-origin` set on every response
  by default middleware, not per-route opt-in.
- File uploads: type/size validated server-side, stored outside the web
  root or in object storage with signed URLs, never executed.

## Audit logging

- Security-relevant events (login, logout, password change, role change,
  permission grant/revoke, data export, billing change, admin action on
  another user's data) are written to an append-only audit log distinct
  from general application logs.
- Audit entries record: actor, action, target, timestamp, and originating
  IP — never the payload of sensitive data itself.
- Audit logs are readable by admins for their own tenant and not editable
  by anyone through the application.

## Encryption

- TLS everywhere in transit — no plaintext HTTP in any deployed
  environment, enforced via HSTS.
- Sensitive data at rest (PII beyond basic profile info, payment tokens,
  API keys stored on behalf of a user) is encrypted at the database or
  application layer, not relied upon solely from disk-level encryption.
- Encryption keys are never stored alongside the data they protect; key
  management is a Phase 2 configuration step, not invented in Phase 1.

## Backup & recovery

- Database backups: automated, at minimum daily, retained on a documented
  schedule (e.g. 7 daily / 4 weekly / 3 monthly) once a real database
  exists in Phase 2.
- Restore procedure is documented and periodically tested — an untested
  backup is not a backup.
- Point-in-time recovery is enabled where the database provider supports
  it, for any product handling paid customer data.

## Dependency & supply chain hygiene

- Automated dependency vulnerability scanning in CI; criticals block
  merge, highs are triaged within a defined SLA.
- Lockfiles committed; no unpinned floating versions in production
  dependencies.
- New dependencies are reviewed for maintenance status and necessity
  before being added — avoid dependency bloat and abandoned packages.

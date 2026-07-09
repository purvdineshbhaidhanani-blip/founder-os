# 15 · Security Framework

**Type:** Framework lens over the authoritative standard. The complete,
binding security rules live in
[`standards/security.md`](../standards/security.md) — that document is the
source of truth and is **not** duplicated here. This framework exists so
the Global Looping has an explicit security checkpoint: a per-product
checklist verifying the product actually implements the standard.

> If anything here appears to conflict with `standards/security.md`, the
> standard wins. Update this lens, never fork the rules.

## Security surface every product must cover

| Area | Verify (details in `standards/security.md`) |
|---|---|
| **Authentication** | Vetted auth library; argon2id/bcrypt hashing; secure sessions; lockout/backoff. See [`08`](./08-user-management.md). |
| **Authorization** | Centralized `can()` policy layer; server-side on every request; tenant-scoped. See [`09`](./09-roles-permissions.md). |
| **Rate limiting** | On auth and all expensive/public endpoints; `429` + `Retry-After`. |
| **Session security** | httpOnly/Secure/SameSite cookies; revocation on logout, password change, role downgrade. |
| **Secrets** | Env/secret-manager only; never committed, logged, or invented; `.env.example` documents names with no values. |
| **API security** | Validation at every boundary; standard error shape; signed webhooks; idempotency (`standards/api.md`). |
| **Web hardening** | CSRF, XSS, SQLi protection; CSP; secure headers by default middleware. |
| **Monitoring** | Structured logs, error tracking, audit log, health checks (`standards/devops.md`). |

## Phase 1 vs Phase 2

- **Phase 1:** every control above is *implemented* against the standard,
  with integrations that need credentials wired-but-disabled and failing
  closed.
- **Phase 2:** real credentials configured; a full security verification
  pass (per `standards/testing.md` and a `security-review`) before
  production.

## Validation checklist (Global Looping security gate)

- [ ] Every area in the table above is implemented per `standards/security.md`.
- [ ] Authorization is enforced server-side and tenant-scoped everywhere.
- [ ] No secret is hard-coded, logged, or invented; `.env.example` is clean.
- [ ] Secure headers + CSP are applied by default, not per-route opt-in.
- [ ] Auth-sensitive paths have tests for unauthenticated/unauthorized/
      wrong-tenant cases.
- [ ] A security review is scheduled as a Phase 2 gate before launch.

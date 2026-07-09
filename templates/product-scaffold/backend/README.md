# Backend

Business logic and the API surface. Route/error/pagination conventions in
[`standards/api.md`](../../../standards/api.md); auth/authorization in
[`standards/security.md`](../../../standards/security.md).

## Structure

```
backend/
  api/                  # thin route handlers: parse, authorize, delegate, format
  lib/
    services/            # business logic, one module per domain concept
    db/                   # query layer — all database access goes through here
    validation/            # zod schemas (shared with frontend forms)
    auth/                   # session/RBAC helpers, policy functions
```

## Required before Phase 1 is "complete" for this product

- Auth service: sign up, log in, session management, password reset —
  fully functional with local credentials, no external provider required.
- OAuth service: built and wired against `standards/security.md`, reading
  provider credentials from env, but fails closed to a clear
  "not configured" state when they're unset — never crashes the app.
- RBAC: role model defined, `can(user, action, resource)` policy layer
  in `lib/auth/`, enforced on every protected route.
- Every route: zod-validated input, authenticated + authorized, structured
  error responses per `standards/api.md`, structured logs per
  `standards/engineering.md`.
- Rate limiting on auth and any expensive endpoints.

## Do not

- Put business logic directly in a route handler — it belongs in
  `lib/services/`, tested independent of HTTP.
- Query the database from outside `lib/db/`.
- Trust client-side validation as the security boundary — every route
  re-validates and re-authorizes server-side.

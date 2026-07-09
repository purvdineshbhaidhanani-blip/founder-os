# API Foundation Standards

Applies to every HTTP API surface a product exposes, whether consumed by
its own frontend, a public API, or webhooks.

## REST conventions

- Resource-oriented URLs, plural nouns: `/api/organizations`,
  `/api/organizations/:id/members`. Actions that aren't naturally CRUD use
  a verb sub-resource sparingly (`/api/invoices/:id/void`), not a `?action=`
  query param.
- HTTP methods carry their standard meaning: `GET` (read, no side effects,
  cacheable), `POST` (create / non-idempotent action), `PUT`/`PATCH`
  (update — `PUT` full replace, `PATCH` partial), `DELETE` (remove/soft
  delete).
- Status codes are meaningful and consistent: `200` success, `201` created,
  `204` no content, `400` validation error, `401` unauthenticated, `403`
  unauthorized, `404` not found, `409` conflict, `422` semantically invalid,
  `429` rate limited, `5xx` server error. Never `200` with an error payload.

## Error format

Every error response across every product uses the same shape so clients
can handle errors generically:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable, actionable description.",
    "details": [
      { "field": "email", "issue": "Must be a valid email address." }
    ],
    "requestId": "req_01hxyz..."
  }
}
```

- `code` is a stable, machine-readable string (`SCREAMING_SNAKE_CASE`),
  never just the HTTP status name.
- `message` is safe to show a developer/log, not necessarily the end-user
  copy (the frontend maps codes to user-facing copy where needed).
- `requestId` ties the response to server-side logs for support/debugging.
- Stack traces, SQL, and internal paths never appear in any response body,
  in any environment reachable by a client.

## Pagination

- Cursor-based pagination by default for anything that can grow
  unbounded (`?cursor=...&limit=...`), offset pagination only for small,
  bounded, admin-facing lists where total-count/page-jump UX matters more
  than scale.
- Response envelope: `{ "data": [...], "pagination": { "nextCursor":
  "...", "hasMore": true } }` (or `{ "page", "pageSize", "total" }` for
  offset-based lists) — consistent per pagination style across the product.
- `limit` is capped server-side (e.g. max 100) regardless of what the
  client requests.

## Filtering & sorting

- Query params are explicit and documented per endpoint
  (`?status=active&sort=-created_at`), never a free-form query language
  exposed directly to clients unless the endpoint is specifically a search
  endpoint with a defined grammar.
- Sortable/filterable fields are allow-listed server-side — arbitrary
  column names are never passed through to the query layer.

## Authentication

- Every non-public endpoint requires authentication, verified server-side
  on every request (see `standards/security.md`).
- Public API tokens (for programmatic/product API access, once a product
  offers one) are scoped, revocable, and never equal to a user's session
  credential.
- Webhook endpoints verify signatures (HMAC or provider-specific scheme)
  on every inbound payload before processing.

## Validation

- Every request body/query/params validated against a zod schema at the
  route boundary before any business logic runs (see
  `standards/engineering.md`); validation failures return `400` with the
  standard error format and per-field `details`.

## Versioning

- Breaking changes to a public/external API are versioned (`/api/v1/...`)
  rather than silently changing behavior under clients.
- Internal-only APIs (product's own frontend talking to its own backend)
  don't need a version prefix — they deploy atomically with the frontend —
  but a breaking contract change is still called out in the PR description.
- Deprecations are announced with a sunset date and, where feasible, a
  `Deprecation`/`Sunset` response header, never removed without notice for
  any API with external consumers.

## Idempotency

- All non-idempotent `POST` actions with real-world side effects (payments,
  sending email, provisioning resources) accept an `Idempotency-Key`
  header; repeated requests with the same key return the original result
  rather than repeating the side effect.
- `PUT`/`PATCH`/`DELETE` are naturally idempotent — implementations are
  verified to actually behave that way (a delete of an already-deleted
  resource returns success/`404`, not an error that breaks retries).

## Documentation

- Every API route is documented (OpenAPI/Swagger generated from the zod
  schemas where possible, so docs can't drift from validation) — request
  shape, response shape, auth requirement, error codes.
- Docs are generated/checked as part of CI for any product with an
  external-facing API, so undocumented or stale routes are caught, not
  discovered by a client.

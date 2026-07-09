# Database

Schema and migrations. Full naming, timestamp, soft-delete, indexing, and
multi-tenancy rules in
[`standards/database.md`](../../../standards/database.md).

## Structure

```
database/
  migrations/     # one file per versioned, checked-in schema change
  schema.sql      # (or ORM schema file) — current shape, generated/kept in sync with migrations
```

## Baseline tables every product needs

- `users` — auth identity, `email`, `password_hash` (nullable if
  OAuth-only), `created_at`/`updated_at`/`deleted_at`.
- `organizations` (if multi-tenant) — `name`, `slug`,
  `created_at`/`updated_at`/`deleted_at`.
- `organization_members` — `organization_id`, `user_id`, `role`, unique on
  `(organization_id, user_id)`.
- `sessions` (if not delegated entirely to the auth library) —
  `user_id`, `expires_at`, revocation support.
- `audit_log` — append-only, per `standards/security.md`.

## Before Phase 1 is "complete" for this product

- Every table has `created_at`/`updated_at`; soft-deletable tables have
  `deleted_at`.
- Every foreign key is indexed; every tenant-scoped table carries
  `organization_id` directly.
- Migrations are additive-first and have a tested rollback path.
- Seed script produces realistic fake data for local dev, safe to re-run.

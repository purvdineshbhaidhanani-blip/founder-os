# Database Foundation Standards

Applies to every product's schema regardless of which database engine a
product spec chooses (PostgreSQL is the default recommendation for new
products unless there's a specific reason otherwise).

## Naming

- Tables: plural, `snake_case` (`users`, `organizations`,
  `invoice_line_items`).
- Columns: `snake_case`, singular concept names (`email`, `created_at`,
  `organization_id`).
- Foreign keys: `<singular_referenced_table>_id` (`user_id`,
  `organization_id`).
- Join/junction tables: `<table_a>_<table_b>` alphabetically or by
  dependency direction, documented per schema (`organization_members`
  rather than `organizations_users` when a more meaningful domain name
  exists — prefer the domain name over the mechanical join-table name).
- Indexes: `idx_<table>_<column(s)>`. Unique constraints:
  `uq_<table>_<column(s)>`. Foreign key constraints named explicitly,
  not left to the database's auto-generated name.
- Enums/types: `snake_case`, named for the concept (`subscription_status`,
  not `status_enum`).

## Timestamps

- Every table has `created_at timestamptz not null default now()` and
  `updated_at timestamptz not null default now()`, with `updated_at`
  maintained by a trigger (or ORM hook) — never trusted to be set
  correctly by application code on every write path.
- All timestamps are stored in UTC (`timestamptz`, never bare
  `timestamp`); timezone conversion happens at the presentation layer.
- Domain-specific timestamps (`sent_at`, `expired_at`, `cancelled_at`) are
  nullable and named for what actually happened, not generic `date1`/
  `date2`.

## Soft delete & auditing

- Default to soft delete (`deleted_at timestamptz null`) for any table
  where recovery, audit, or referential history matters (users,
  organizations, billing records, anything customer-facing data can point
  to). Hard delete is reserved for genuinely ephemeral or legally-required
  erasure (see data-retention/right-to-erasure handling below).
- All application queries filter `deleted_at is null` by default through
  the query layer (a scoped default, not repeated manually in every
  query) — a forgotten filter must not be able to leak "deleted" rows.
- Sensitive/regulated tables additionally get row-level audit history
  (either an `_audit`/`_history` shadow table populated by trigger, or an
  external audit log per `standards/security.md`) capturing who changed
  what and when.
- Right-to-erasure requests (GDPR/CCPA) are handled by a documented hard-
  delete or anonymization procedure per product in Phase 2 — soft delete
  alone does not satisfy erasure obligations.

## Versioning & migrations

- Schema changes are only made through versioned, checked-in migration
  files (one migration per logical change), never by hand-editing a live
  database.
- Migrations are additive-first for zero-downtime deploys: add nullable/
  defaulted columns before backfilling, deploy code that can handle both
  old and new shape, then tighten constraints in a follow-up migration —
  never a single migration that both adds a `not null` column and expects
  existing rows to already satisfy it.
- Every migration has a tested rollback path (or is explicitly documented
  as forward-only with the reason, e.g. a destructive data cleanup).
- Migrations run automatically as part of the deployment pipeline, never
  as a manual undocumented step.

## Constraints & integrity

- Foreign keys are real database foreign keys, not application-layer-only
  references — referential integrity is enforced by the database.
- `not null` by default; nullable is an explicit, justified choice per
  column, not the default posture.
- Check constraints for invariants the database can enforce cheaply
  (non-negative amounts, valid enum values, valid date ranges) rather than
  trusting application code to always validate before insert.
- Money/currency: stored as integer minor units (cents) with an explicit
  currency column, never floating point.

## Indexes

- Every foreign key column is indexed.
- Every column used in a `WHERE`, `ORDER BY`, or `JOIN` on a table
  expected to grow beyond a few thousand rows is indexed, verified against
  actual query plans, not assumed.
- Composite indexes are ordered by selectivity/query pattern, documented
  with a comment on why the column order was chosen when it isn't obvious.
- Unique business constraints (one active subscription per org, unique
  email per tenant) are enforced via unique indexes, not just application
  checks (which race under concurrency).

## Multi-tenancy

- Every tenant-scoped table carries `organization_id` (or equivalent)
  directly — never inferred through a multi-hop join — so row-level
  security and query scoping are cheap and unambiguous.
- Where the database supports it (PostgreSQL RLS), row-level security
  policies are the enforced backstop for tenant isolation, in addition to
  application-layer scoping — defense in depth, not either/or.

## Seed & fixture data

- Local/dev seed scripts produce realistic, clearly-fake data (no real
  emails, no real payment info) and are idempotent (safe to re-run).
- Seed data never ships to or runs against a production database.

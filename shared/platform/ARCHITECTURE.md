# Shared Platform Architecture

## What this is

`shared/platform/` is the single, reusable implementation of the systems every
product in the portfolio needs identically: authentication, user management,
and organizations/teams/RBAC (Phase A — see `frameworks/08-user-management.md`
and `frameworks/09-roles-permissions.md`). Later phases add billing,
dashboard, notifications, reporting, integrations, and AI provider
abstraction (frameworks 05–07, 10–13) as separate modules in this same
package, following the same pattern.

Per `shared/README.md`, this is only justified because six products
(SpendGov, SecCorrelate, CodeAudit, CRMCapture, IncidentTriage, AuthStartup)
need the exact same auth/org/RBAC behavior — building it six times would
violate `standards/engineering.md`'s "no premature abstraction" rule in the
opposite direction: this abstraction is earned, not speculative.

Every product's `products/<name>/` app imports `@founder-os/platform` rather
than reimplementing auth, sessions, organizations, or RBAC. Product-specific
code (SpendGov's spend tracking, CodeAudit's SAST scanning, etc.) never
touches password hashes, session tokens, or role checks directly — it goes
through this package's service layer.

## Why this package is product-agnostic

This package has zero knowledge of SpendGov, CodeAudit, or any other
product's domain. It knows about `users`, `organizations`, `teams`,
`sessions`, and `roles` — nothing else. A product wires it in via:

1. A `PLATFORM_APP_ID` env var scoping all platform data to that product's
   tenant space (so AuthStartup, as its own product, isn't accidentally
   sharing user rows with SpendGov's users — see [Multi-app isolation](#multi-app-isolation)).
2. Product-specific roles layered on top of the base `owner`/`admin`/`member`
   roles (`standards/security.md`'s minimum RBAC model) via the
   `productRoles` extension point in the RBAC module.
3. Product-specific OAuth scopes/redirect URIs configured per app.

This also means AuthStartup (Product 6, a *standalone authentication SaaS*)
and this shared platform module are not the same thing, but they are
siblings built on the same underlying primitives — AuthStartup productizes
and exposes this package's auth core to external developers as an API,
while every other product consumes it internally as a library. See
`products/authstartup/docs/PRODUCT_IDENTITY.md` section 30 for that
dogfooding relationship.

## Module boundaries (Phase A — this build)

```
shared/platform/
  prisma/
    schema.prisma        # users, organizations, teams, sessions, roles — see below
  src/
    auth/                 # authentication: password, OAuth, magic link, MFA, sessions
    users/                 # user profile, avatar, account settings, status
    organizations/          # orgs, teams, members, invitations, RBAC
    db/                      # Prisma client singleton, tenant-scoping helpers
    config/                   # env validation (zod), typed config
    errors/                    # shared error types (standards/api.md error shape)
  tests/
    unit/
    integration/
  README.md                     # how a product imports and configures this package
```

Deferred to later phases (not built in this pass — tracked as follow-up
work): billing/subscriptions, dashboard framework, notifications engine,
reporting/export, audit-log *query* UI (the audit *write* path ships now,
since every mutation in auth/users/organizations must be audited from day
one per `standards/security.md`), AI provider abstraction, integrations/
webhook framework, search, file upload.

## Tech stack decisions

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript, `strict: true` | Per `standards/engineering.md`. |
| ORM | Prisma | Type-safe queries, first-class migration tooling that satisfies `standards/database.md`'s "versioned, checked-in migration files" and additive-first migration rules out of the box. |
| Database | PostgreSQL | Default per `standards/database.md`. |
| Validation | zod | Per `standards/engineering.md`; schemas are the single source of truth for types (`z.infer`). |
| Password hashing | argon2id | Per `standards/security.md` (preferred over bcrypt). |
| Session tokens | Opaque random tokens, hashed at rest, Redis-backed lookup | httpOnly/Secure/SameSite cookies per `standards/security.md`; never a JWT for the *session* itself (revocability matters more than statelessness here). |
| API-consumer auth | JWT (short-lived access token + refresh) | For product frontends/SPAs and any public API token use case, issued *from* an active session. |
| MFA | TOTP (RFC 6238) | Per `standards/security.md`, designed in from day one so it activates without a schema migration. |

## Multi-app isolation

Every table that stores product-facing data (`users`, `organizations`,
`sessions`) carries an `app_id` column identifying which product's tenant
space a row belongs to, in addition to `organization_id` for cross-org
scoping within a single product. This is a deliberate stronger boundary
than typical multi-tenancy: a user account in SpendGov and a user account
in CodeAudit are different rows even if the same person signs up with the
same email in both, because these are legally and operationally distinct
SaaS products a customer buys independently — nothing about "AuthStartup"
being an auth *company* implies AuthStartup users are the same account
space as SpendGov users.

`app_id` is indexed and included in every query's `WHERE` clause via the
scoped query helpers in `db/`, the same "scoped default, never repeated
manually" pattern `standards/database.md` requires for `deleted_at`.

## RBAC model

Base roles (every product): `owner`, `admin`, `member` — the
`standards/security.md` minimum. Products extend this with additional
roles (e.g. SpendGov's `finance_lead`, `procurement_manager`; SecCorrelate's
`threat_hunter`) via `frameworks/09-roles-permissions.md`'s reference
matrix, registered per-app rather than hard-coded in this package.

Authorization is a single centralized function:

```ts
can(actor: AuthContext, action: string, resource: ResourceRef): boolean
```

Never scattered inline role checks — every product route calls this same
function, per `standards/security.md`.

## What Phase 1 means here

No product ships with real OAuth client IDs/secrets, no real SMTP for
magic links, no real SMS/authenticator push for MFA enrollment reminders.
Every one of those flows is fully built and wired — the UI affordance
exists, the backend logic exists, the database schema exists — but fails
closed with a clear "not configured" error rather than crashing, exactly
per `standards/security.md`'s Phase 1 rule. Phase 2 only adds real
credentials to `.env`; no code changes.

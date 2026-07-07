# Production Identity Foundation

`src/identity/` is the multi-tenant identity system: users, organizations,
teams, RBAC (roles/permissions), profiles, database-backed sessions, and a
database-backed audit log. It sits alongside — and does not replace — the
existing single-founder auth in `src/server/routes/auth.ts`; both are wired
into the same server under different route prefixes (`/api/auth/*` vs.
`/api/identity/*`).

## Architecture

Same pattern as the rest of this codebase's durable-storage modules
(`src/runtime/memory`): every service depends on the `IdentityStore`
interface, never on a concrete backend.

```
AuthService, OrganizationService, RBAC guards, AuditService
                        │
                        ▼
                 IdentityStore (interface)
                   ┌────┴────┐
                   ▼         ▼
      InMemoryIdentityStore   PostgrestIdentityStore
      (zero-config default,   (production — Supabase via
       tests, local dev)       PostgREST + service_role key,
                                no SDK dependency)
```

`createIdentityStoreFromEnv()` picks the backend exactly like
`createMemoryStoreFromEnv()` already does: both `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` set → Postgres-backed; otherwise → in-memory
(logged as a warning, since that's not durable across restarts).

Sessions are **opaque, database-backed tokens** — a random 32-byte token is
handed to the client in the `identity_session` cookie, and only its SHA-256
hash is ever persisted (the same principle as a password hash: a database
read alone can't produce a usable session). This makes sessions individually
revocable (`SessionService.revoke`/`revokeAllForUser`), unlike the existing
stateless HMAC-signed `founder_session` cookie, which is valid until it
expires no matter what.

## Files changed

**New:**
- `supabase/migrations/0002_identity.sql` — schema + seed data
- `src/identity/types.ts`, `permissions-catalog.ts`, `password.ts`, `slug.ts`
- `src/identity/store.ts` (interface), `in-memory-store.ts`, `postgrest-client.ts`, `postgrest-store.ts`, `store-factory.ts`
- `src/identity/session-service.ts`, `organization-service.ts`, `auth-service.ts`, `audit-service.ts`, `rbac.ts`, `index.ts`
- `src/server/routes/identity.ts`
- `tests/identity/*.test.ts` (39 tests), `tests/server/identity-routes.test.ts` (10 tests)
- `docs/IDENTITY.md` (this file)

**Modified (additive only):**
- `src/server/wiring.ts` — added `identity: IdentityContext` to `AppContext`, built via `createIdentityContext(createIdentityStoreFromEnv())`
- `src/server/index.ts` — added `registerIdentityRoutes(router, ctx.identity)`
- `.env.example` — noted that `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` now also back identity, and that migration `0002` must be applied

Nothing in `src/server/routes/auth.ts`, `src/server/session.ts`, or any
existing route was changed — the founder single-user login continues to work
exactly as before.

## Database schema

11 tables (9 requested + 2 join tables required to implement the requested
RBAC and team-membership capabilities — `role_permissions` for the
many-to-many between roles and permissions, `team_members` for the
many-to-many between teams and users):

| Table | Purpose |
|---|---|
| `users` | Global identity: email (unique, case-insensitive), scrypt password hash, disabled/verified timestamps. |
| `organizations` | Tenant boundary: name, unique slug, owner. |
| `teams` | Sub-groups within an organization; unique name per org. |
| `team_members` | User ↔ team join. |
| `memberships` | User ↔ organization join, carrying the user's `role_id` and status (`active`/`invited`/`suspended`). |
| `roles` | System role templates (`organization_id IS NULL`: owner/admin/member) and org-specific custom roles. |
| `permissions` | Static catalog (`organization.manage`, `members.invite`, `teams.manage`, `audit.view`, ...). |
| `role_permissions` | Role ↔ permission join. |
| `profiles` | 1:1 with users — display name, avatar, timezone, locale, bio (separate from auth data). |
| `sessions` | Opaque-token sessions: `token_hash` (never the raw token), `organization_id` (active org), `expires_at`, `revoked_at`. |
| `audit_logs` | Append-only: org, actor, action, target, JSON metadata, timestamp. |

Every table enables Row Level Security with **no policies** — identical to
`0001_founder_os_memory.sql`'s convention — so only the server's
`service_role` key (which bypasses RLS) can touch identity data; the
anon/publishable key and the browser never can.

The migration also seeds the `organization.manage`, `organization.delete`,
`members.invite`, `members.remove`, `members.role.manage`, `teams.manage`,
and `audit.view` permissions, and three system roles (`owner`: all
permissions, `admin`: all except `organization.delete`, `member`: none —
base membership alone grants read access to org/team data in application
code).

## APIs

All under `/api/identity/*`. The existing router only supports GET/POST, so
mutations that would conventionally be PATCH/DELETE are POST-to-an-action
endpoints (`.../remove`, `.../role`, `.../switch`) rather than requiring a
router change.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /register` | — | Create a user (+ optional organization), sets the session cookie |
| `POST /login` | — | Verify credentials, sets the session cookie |
| `POST /logout` | session | Revoke the current session |
| `GET /me` | session | Current user + organizations + active org |
| `POST /organizations` | session | Create an organization (caller becomes owner) |
| `GET /organizations` | session | List the caller's organizations |
| `POST /organizations/:orgId/switch` | session + membership | Switch the session's active organization |
| `GET /organizations/:orgId/members` | session + membership | List members |
| `POST /organizations/:orgId/members` | `members.invite` | Add an existing user as a member by email |
| `POST /organizations/:orgId/members/:userId/remove` | `members.remove` | Remove a member (owner is protected) |
| `POST /organizations/:orgId/members/:userId/role` | `members.role.manage` | Change a member's role |
| `GET /organizations/:orgId/teams` | session + membership | List teams |
| `POST /organizations/:orgId/teams` | `teams.manage` | Create a team |
| `POST /organizations/:orgId/teams/:teamId/delete` | `teams.manage` | Delete a team |
| `GET /organizations/:orgId/teams/:teamId/members` | session + membership | List team members |
| `POST /organizations/:orgId/teams/:teamId/members` | `teams.manage` | Add a team member (must already be an org member) |
| `POST /organizations/:orgId/teams/:teamId/members/:userId/remove` | `teams.manage` | Remove a team member |
| `GET /organizations/:orgId/audit-logs` | `audit.view` | Query the audit log |
| `GET /profile` / `POST /profile` | session | Read/update the caller's own profile |

### RBAC enforcement

`src/identity/rbac.ts` exports the guards every protected route calls:

- `requireIdentityUser(ctx, deps)` — verifies the session cookie against the
  database (not just a signature) and loads the user. 401 on failure.
- `requireOrganizationMembership(ctx, store, identity, organizationId?)` —
  resolves membership in the given org (or the session's active org). 400
  (no org context) or 403 (not a member) on failure.
- `requirePermission(ctx, store, membership, permissionKey)` — checks the
  membership's role grants the permission. 403 on failure.
- `requireOrgPermission(ctx, deps, permissionKey, organizationId?)` — chains
  all three; the one call most write routes make.

## Remaining gaps

- **No email delivery.** `POST /organizations/:orgId/members` requires the
  invitee to already have an account (`addMemberByEmail` throws a clear
  error otherwise) — there is no email-invitation flow that lets someone
  join by clicking a link before registering. Marked intentional: building
  transactional email delivery is a distinct, larger feature.
- **No password reset flow.** Users who forget their password have no
  self-service recovery path yet (would need email delivery, as above).
- **No email verification enforcement.** `users.email_verified_at` exists
  in the schema but nothing sets or checks it yet.
- **System roles only, no custom-role UI/API.** The schema supports
  org-specific custom roles (`roles.organization_id` set) and
  `assignPermissionToRole` exists on `IdentityStore`, but there's no route
  to create a custom role or assign it arbitrary permissions — only the
  three seeded system roles (owner/admin/member) are reachable via the API
  today.
- **`PostgrestIdentityStore` is untested against a live database** in this
  environment (no reachable Supabase project) — it's typechecked and
  structurally mirrors the already-production-proven `SupabaseMemoryStore`,
  but should be smoke-tested against a real project before relying on it.
- **No rate limiting on `/login` or `/register`.** Password verification
  already runs at scrypt cost (not free to brute-force), but there's no
  lockout/backoff on repeated failed attempts yet.

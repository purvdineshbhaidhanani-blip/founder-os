# @founder-os/platform

The shared authentication, user management, and organizations/teams/RBAC
system used by every product in the portfolio. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design rationale,
module boundaries, and what's deliberately deferred to a later pass
(billing, dashboard, notifications, reporting, AI provider abstraction,
integrations).

**Status: Phase A shipped.** Authentication, user management, and
organizations/teams/RBAC are implemented, tested, and ready for products to
import. Billing, dashboard, and the remaining shared systems described in
`products/PORTFOLIO_WAVE_1_EXECUTION_PLAN.md` Step 5 are follow-up work,
tracked separately — importing this package today does not give a product
those systems yet.

## What's in Phase A

| Module | Import path | Covers |
|---|---|---|
| Auth | `@founder-os/platform/auth` | Email/password, OAuth (Google/Microsoft/GitHub — built, disabled until Phase 2 credentials), magic links, password reset, MFA (TOTP), session management, rate limiting |
| Users | `@founder-os/platform/users` | Profile, avatar, account settings, user status (active/invited/suspended/deactivated) |
| Organizations | `@founder-os/platform/organizations` | Organizations, teams, membership, invitations, centralized RBAC (`can()`/`requireCan()`) |
| Errors | `@founder-os/platform/errors` | Shared error shape (`standards/api.md`) every route response uses |
| Config | `@founder-os/platform/config` | Typed, validated env access; integration-configured checks |
| DB | `@founder-os/platform/db` | Prisma client singleton, current app-id accessor |

## Setup (per product)

1. Add `@founder-os/platform` as a workspace dependency in the product's
   `package.json`.
2. Copy the relevant variables from [`.env.example`](./.env.example) into
   the product's own `.env.example` and `.env` — every product sets its own
   `PLATFORM_APP_ID` (its own slug, e.g. `spendgov`) and points
   `PLATFORM_DATABASE_URL` at that product's database. **Products do not
   share a database** — `app_id` scoping (see `ARCHITECTURE.md`) protects
   against cross-product data mixing even if they did, but the default
   deployment posture is one database per product, same as any other
   product-owned table.
3. Run `npx prisma migrate deploy` (or `migrate dev` locally) against the
   product's database using this package's `prisma/schema.prisma` before
   the product's own product-specific migrations run — this package's
   tables (`users`, `organizations`, `sessions`, etc.) are the foundation
   every product-specific table's foreign keys point back to.
4. In the product's route handlers: parse and validate input (this
   package's zod schemas), call the service function, format the response
   — never reach into `@prisma/client` directly for `users`/`organizations`/
   `sessions` tables from product code (`standards/engineering.md`: business
   logic lives in a services layer, not inline).

## Example: a product's login route

```ts
// products/spendgov/app/api/auth/login/route.ts
import { loginWithPasswordSchema, loginWithPassword } from "@founder-os/platform/auth";
import { PlatformError } from "@founder-os/platform/errors";

export async function POST(req: Request) {
  const body = loginWithPasswordSchema.parse(await req.json()); // 400 on failure, per standards/api.md
  try {
    const result = await loginWithPassword(body, {
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    if (result.requiresMfa) {
      return Response.json({ data: { requiresMfa: true, userId: result.userId } });
    }
    // set result.session.token as an httpOnly, Secure, SameSite cookie here
    return Response.json({ data: { userId: result.userId } });
  } catch (err) {
    if (err instanceof PlatformError) {
      return Response.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.httpStatus });
    }
    throw err;
  }
}
```

## Example: a product-specific role on top of base RBAC

SpendGov needs a `finance_lead` role that can approve budget policy changes
— a permission this shared package has no opinion on. The pattern:

```ts
import { can, requireCan, getMembership } from "@founder-os/platform/organizations";

// 1. Base org-level actions always go through the shared can()/requireCan().
await requireCan(actor, "settings.manage");

// 2. Product-specific actions layer their own check on top, reading the
//    productRole this package already stores per membership.
async function canApproveBudgetPolicy(actor: RbacActor): Promise<boolean> {
  const baseAllowed = await can(actor, "settings.manage"); // must at least be admin/owner
  if (!baseAllowed) return false;
  const membership = await getMembership(actor);
  return membership?.productRole === "finance_lead" || membership?.role === "owner";
}
```

This keeps the shared package product-agnostic (per `ARCHITECTURE.md`)
while giving every product a documented extension point instead of forking
the RBAC logic.

## Per-product integration notes

| Product | `PLATFORM_APP_ID` | Notes |
|---|---|---|
| SpendGov | `spendgov` | Product roles: `finance_lead`, `procurement_manager` (frameworks/09). |
| SecCorrelate | `seccorrelate` | Product roles: `threat_hunter`, `soc_analyst`. |
| CodeAudit | `codeaudit` | GitHub OAuth is the primary social login for this product's developer audience — prioritize configuring `OAUTH_GITHUB_CLIENT_ID`/`SECRET` first in Phase 2. |
| CRMCapture | `crmcapture` | Product roles: none beyond base owner/admin/member for Phase 1; sales-territory scoping is product-specific, not an RBAC role. |
| IncidentTriage | `incidenttriage` | Product roles: `on_call_engineer`, `sre_lead`. |
| AuthStartup | `authstartup` | Special case: AuthStartup *is* an authentication product sold to external developers — its own end-customers' auth (the users AuthStartup's customers manage) is **not** the same thing as this package. AuthStartup's own team/dashboard auth (the AuthStartup employees and org admins who configure it) uses this package exactly like every other product; the auth-as-a-service AuthStartup sells to its customers is separate product surface built on the same underlying primitives (see `products/authstartup/docs/PRODUCT_IDENTITY.md` §30 for that relationship). Do not conflate the two when wiring `PLATFORM_APP_ID`. |

## Local development

```bash
cd shared/platform
npm install
cp .env.example .env   # fill in local Postgres/Redis URLs; leave OAuth/email blank
npx prisma migrate dev
npm run typecheck
npm test
```

## What's still open (Phase 1 completion checklist, tracked separately)

- [ ] Billing/subscriptions module (`frameworks/13-pricing.md`)
- [ ] Dashboard framework component library (`frameworks/06-dashboard-framework.md`)
- [ ] Notifications engine (`frameworks/10-notifications.md`)
- [ ] Reporting/export (`frameworks/11-reporting.md`)
- [ ] AI provider abstraction layer (`standards/ai.md`)
- [ ] Integrations/webhook framework (`frameworks/12-integrations.md`)
- [ ] Search service
- [ ] File upload/storage service

Encryption at rest for OAuth tokens and MFA secrets (`src/crypto/`,
AES-256-GCM keyed from `PLATFORM_ENCRYPTION_KEY`) is implemented and used
internally by `auth/oauth.ts` and `auth/mfa.ts` — callers pass plaintext in,
this package handles the encrypt/decrypt boundary.

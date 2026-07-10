# @founder-os/platform

The shared backend platform used by every product in the portfolio:
authentication, user management, organizations/teams/RBAC, billing, AI,
storage, notifications, reporting, search, analytics, integrations,
monitoring, and settings. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for
the full design rationale and module boundaries.

**Status: Shared Platform complete.** All 19 modules below are
implemented, typechecked, linted, tested, and built. Every external
integration (OAuth, email, AI providers, Stripe, object storage, outbound
webhooks) is fully built and wired but fails closed with
`INTEGRATION_NOT_CONFIGURED` until its Phase 2 credentials are supplied —
no product needs to wait on this package to start building; it needs to
wait on its own credentials to turn a given integration on.

## What's included

| Module | Import path | Covers |
|---|---|---|
| Auth | `@founder-os/platform/auth` | Email/password, OAuth (Google/Microsoft/GitHub), magic links, password reset, MFA (TOTP), session management, rate limiting |
| Users | `@founder-os/platform/users` | Profile, avatar, account settings, user status (active/invited/suspended/deactivated) |
| Organizations | `@founder-os/platform/organizations` | Organizations, teams, membership, invitations, centralized RBAC (`can()`/`requireCan()`) |
| Errors | `@founder-os/platform/errors` | Shared error shape (`standards/api.md`) every route response uses |
| Config | `@founder-os/platform/config` | Typed, validated env access; `isXConfigured()` checks for every optional integration |
| DB | `@founder-os/platform/db` | Prisma client singleton, Redis client singleton, current app-id accessor |
| Logging | `@founder-os/platform/logging` | Structured JSON logging, sensitive-key redaction, request-context propagation (`AsyncLocalStorage`) |
| API | `@founder-os/platform/api` | Standard response/error shapes, zod validate-at-boundary helpers, cursor pagination, idempotency keys, API key issuance/verification |
| AI | `@founder-os/platform/ai` | Provider-agnostic `complete()`/`streamComplete()`/`embed()` — Anthropic default, OpenAI fallback, cost tracking, response caching, retry, prompt versioning, structured outputs, human-approval tiers |
| Billing | `@founder-os/platform/billing` | Plans, entitlements, subscriptions (trial/active/past_due/canceled), usage metering, Stripe checkout/portal/webhooks, invoices |
| Storage | `@founder-os/platform/storage` | S3-compatible upload/download, signed URLs, upload validation (mime/size allow-list) |
| Notifications | `@founder-os/platform/notifications` | In-app + email + Slack/Teams/webhook delivery, per-user channel preferences, unread counts |
| Reporting | `@founder-os/platform/reporting` | Real CSV/XLSX/PDF export, cron-scheduled reports, AI-generated report summaries |
| Search | `@founder-os/platform/search` | Filter validation and Prisma `where` translation, Postgres full-text search, saved filters |
| Analytics | `@founder-os/platform/analytics` | Event tracking, funnel computation, MRR/ARR/churn revenue metrics |
| Integrations | `@founder-os/platform/integrations` | Per-org encrypted credential storage, outbound webhook delivery (HMAC-signed, retried with backoff), inbound signature verification |
| Monitoring | `@founder-os/platform/monitoring` | DB/Redis health checks, provider-agnostic error capture, frontend/API performance budgets |
| Settings | `@founder-os/platform/settings` | App-scoped feature flags with per-org overrides, org-level settings |
| Audit | `@founder-os/platform/audit` | Append-only audit log, written to by every mutating module above |
| Crypto | `@founder-os/platform/crypto` | AES-256-GCM encryption at rest, used internally for OAuth tokens, MFA secrets, and integration credentials |

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

## Example: gating a feature behind a billing entitlement

```ts
import { can, withinLimit } from "@founder-os/platform/billing";
import { requireCan } from "@founder-os/platform/organizations";
import { PlatformError } from "@founder-os/platform/errors";

export async function createAutomationRule(actor: RbacActor, organizationId: string, input: unknown) {
  await requireCan(actor, "settings.manage"); // RBAC: can this user act at all?
  if (!(await can(organizationId, "automation_rules"))) { // Billing: does their plan include this feature?
    throw new PlatformError("UNAUTHORIZED", "Automation rules require the Growth plan or higher.");
  }
  if (!(await withinLimit(organizationId, "automation_rules_count"))) {
    throw new PlatformError("UNAUTHORIZED", "You've reached your plan's automation rule limit.");
  }
  // ... create the rule
}
```

## Example: an AI-powered feature via the provider abstraction

```ts
// Never import @anthropic-ai/sdk or openai directly from product code —
// always route through SH-AI so cost tracking, caching, retry, and
// provider fallback apply uniformly (standards/ai.md).
import { complete } from "@founder-os/platform/ai";

const response = await complete({
  feature: "spendgov.invoice_summary",
  organizationId,
  system: "Summarize this invoice in two sentences for a finance approver.",
  messages: [{ role: "user", content: invoiceText }],
  cacheable: true,
});
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

The remaining six Wave 2 products (ERPAudit, ContactVerify,
CharacterConsistency, PayrollAudit, TranscriptionQA, SchemaLint) integrate
identically — set `PLATFORM_APP_ID` to the product's own slug and follow
`docs/PRODUCT_IDENTITY.md` in each product's directory for any
product-specific roles layered on top of base RBAC, per the extension
pattern shown above. This package makes no other distinction between Wave 1
and Wave 2 products.

## Local development

```bash
cd shared/platform
npm install
cp .env.example .env   # fill in local Postgres/Redis URLs; leave everything else blank
npx prisma migrate dev
npm run typecheck
npm run lint
npm test
npm run build
```

## Status

All 19 modules above are complete: 104 tests passing across 12 test files,
clean typecheck, clean lint (`eslint.config.js`), clean build. Pure-logic
code paths (validation, cost calculation, retry backoff, cron scheduling,
CSV/XLSX/PDF byte-level output, HMAC signature verification, filter/query
building) are behavior-tested directly. Code paths that are thin
orchestration over a live external service — Stripe API calls, the
Anthropic/OpenAI SDK adapters, S3 upload, SMTP send — are typechecked and
exercised up to the point where a real credential would be required, but
not integration-tested against a live provider in this environment, per
this repository's Phase 1 rule of never inventing credentials
(`standards/security.md`). They will need a live smoke test against real
Phase 2 credentials before a product first relies on them in production.

Encryption at rest for OAuth tokens, MFA secrets, and per-organization
integration credentials (`src/crypto/`, AES-256-GCM keyed from
`PLATFORM_ENCRYPTION_KEY`) is implemented and used internally by
`auth/oauth.ts`, `auth/mfa.ts`, and `integrations/registry.ts` — callers
pass plaintext in, this package handles the encrypt/decrypt boundary.

## The component library

Every product's frontend also depends on
[`@founder-os/ui`](../ui/README.md) — the design system implementation,
primitives, dashboard framework, layout shell, and admin panel component
library that pairs with this backend package. See that package's README
for its own module table and setup.

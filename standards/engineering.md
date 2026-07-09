# Engineering Standards

Global, non-negotiable engineering rules for every SaaS product in this
portfolio. Product specs never redefine these — they only add
product-specific detail on top.

## Language & runtime

- **TypeScript everywhere**, `strict: true`, no `any` unless justified with a
  comment explaining why a real type isn't possible. No `// @ts-ignore`
  without a linked reason.
- Node.js LTS as the runtime baseline. Pin the exact major version per
  product in `package.json#engines`.
- ESM modules (`"type": "module"`), no CommonJS in new code.

## Frontend stack

- **Next.js (App Router)** + **React** for every product frontend, unless a
  product spec explicitly calls for something else (e.g. a native mobile
  client).
- Server Components by default; add `"use client"` only where interactivity
  or browser APIs require it.
- Data fetching lives in server components or route handlers, not in
  client-side `useEffect` fetch chains.
- State management: local component state and React context for UI state;
  a dedicated server-state library (e.g. TanStack Query) for anything that
  comes from the network — no ad hoc global stores for server data.
- Forms: schema-validated (see Validation below) with accessible error
  messaging, never silent failure.

## Backend stack

- API routes are the backend surface (Next.js route handlers, or a
  standalone Node/Express-style service for products that need one).
  Whichever is chosen, business logic lives in a `services/` or `lib/`
  layer, never directly inline in the route handler — routes parse,
  authorize, delegate, and format the response.
- No product logic in framework middleware beyond cross-cutting concerns
  (auth, logging, rate limiting).

## Naming conventions

- Files: `kebab-case.ts` / `kebab-case.tsx`.
- React components: `PascalCase` export, filename matches the component
  (`UserAvatar.tsx` exports `UserAvatar`).
- Variables/functions: `camelCase`. Types/interfaces: `PascalCase`.
  Constants that are truly immutable config: `SCREAMING_SNAKE_CASE`.
- Booleans read as predicates: `isLoading`, `hasError`, `canEdit`.
- Database tables/columns: `snake_case` (see `standards/database.md`).
- No abbreviations that aren't universally obvious (`config`, `req`, `res`
  are fine; `usrMgr` is not).

## Folder structure (per product)

```
products/<name>/
  app/                # Next.js App Router routes
    (marketing)/
    (dashboard)/
    (admin)/
    api/
  components/
    ui/                # primitive/design-system components
    <feature>/          # feature-scoped composite components
  lib/
    services/           # business logic, one module per domain concept
    db/                  # query layer, never raw queries scattered in routes
    validation/          # zod schemas, shared client+server
    auth/
  hooks/
  types/
  config/
  tests/
    unit/
    integration/
    e2e/
  docs/
  scripts/
```

- Feature code is colocated by domain, not by technical layer (a
  `billing/` folder holds its components, hooks, and schemas together
  rather than being split across parallel `components/`, `hooks/`,
  `schemas/` trees).
- No file exceeds ~300 lines as a soft ceiling; past that, split by
  responsibility.

## Logging

- Structured logging only (JSON in production, pretty-printed in dev) —
  never bare `console.log` left in committed code.
- Every log line carries: timestamp, level, service/product name, request
  ID (when in a request context), and a machine-parseable `event` field.
- Log levels: `error` (needs attention), `warn` (degraded but handled),
  `info` (significant business events — signup, payment, deploy), `debug`
  (dev-only, stripped or gated in production).
- Never log secrets, tokens, passwords, or full payment details. Redact PII
  unless the log is specifically an audit log with a documented retention
  and access policy.

## Validation

- All external input (HTTP body/query/params, form submissions, webhook
  payloads, env vars) is validated at the boundary with a schema library
  (zod). No hand-rolled `if (!x) throw` validation for anything with more
  than one field.
- Schemas are the single source of truth for the corresponding TypeScript
  type (`z.infer<typeof schema>`), never hand-duplicated types that can
  drift from validation.
- Client-side validation improves UX; server-side validation is the actual
  security boundary and is never skipped because the client already
  checked.

## Error handling

- Distinguish **expected** errors (validation failure, not found, no
  permission — return a typed result / proper HTTP status) from
  **unexpected** errors (bugs, infra failures — log with full context and
  surface a generic message to the user).
- Never swallow errors silently (`catch {}`). Every catch block either
  handles the error meaningfully, rethrows, or logs with context.
- User-facing error messages are actionable and never leak stack traces,
  internal identifiers, or implementation details.
- Errors that cross the API boundary use the shared error shape defined in
  `standards/api.md`.

## Code quality

- ESLint + Prettier enforced in CI; no merges with lint errors. Warnings are
  tracked, not ignored indefinitely.
- Every exported function/module has a clear single responsibility. If a
  function needs a "and" in its description, split it.
- No dead code, no commented-out code blocks committed. Version control is
  the history, not comments.
- Comments explain **why**, not **what** — only added when the code's
  intent genuinely isn't obvious from good naming (a non-obvious
  constraint, a workaround for a specific bug, a subtle invariant).
- Prefer composition over inheritance; prefer pure functions where
  reasonable; avoid premature abstraction — three similar call sites don't
  automatically need a shared helper.

## Refactoring

- Refactors land as their own commit/PR, separate from behavior changes,
  so review can tell "what moved" from "what changed."
- No refactor without test coverage over the code being touched first —
  green tests before and after is the proof nothing broke.
- Large refactors are staged incrementally behind working code at every
  step, not delivered as one giant unreviewable diff.

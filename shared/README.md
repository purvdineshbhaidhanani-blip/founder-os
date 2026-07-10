# Shared

Code shared across more than one SaaS product: the concrete implementation
of the design system (`standards/design-system.md`), cross-product utility
functions, shared TypeScript types/config, or a shared auth/AI client
implementation once more than one product would otherwise duplicate it.

## When something belongs here

Extract to `shared/` only after the same code is genuinely needed
identically by **two or more** products — per the project's own coding
standards (`standards/engineering.md`), don't build shared abstractions
speculatively for a portfolio of one. Until then, that code lives inside
the single product that needs it.

## Structure

```
shared/
  platform/     # backend: auth, user management, organizations/teams/RBAC, billing, AI,
                # storage, notifications, reporting, search, analytics, integrations,
                # monitoring, settings — used identically by every product; see
                # shared/platform/ARCHITECTURE.md and shared/platform/README.md
  ui/           # frontend: design-system implementation, dashboard framework, and admin
                # panel framework component library — used identically by every product;
                # see shared/ui/ARCHITECTURE.md and shared/ui/README.md
  lib/          # cross-product utilities — not yet extracted
  types/        # shared TypeScript types/contracts — not yet extracted
  config/       # shared lint/tsconfig/tooling config — not yet extracted
```

`platform/` and `ui/` are the two extractions made so far, justified
because every product in the portfolio needs byte-for-byte identical
auth/org/RBAC/billing/AI/etc. behavior on the backend and an identical
dashboard/admin-panel anatomy on the frontend — see each package's own
`ARCHITECTURE.md` for why this earns the abstraction rather than violating
the "don't build shared code speculatively" rule above. `lib/`, `types/`,
and `config/` remain unextracted until a second product actually needs
that code identically.

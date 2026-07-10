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
  platform/     # authentication, user management, organizations/teams/RBAC
                # (Phase A) — used identically by all six products; see
                # shared/platform/ARCHITECTURE.md and shared/platform/README.md
  ui/           # design-system component implementation (standards/design-system.md) — not yet extracted
  lib/          # cross-product utilities — not yet extracted
  types/        # shared TypeScript types/contracts — not yet extracted
  config/       # shared lint/tsconfig/tooling config — not yet extracted
```

`platform/` is the first extraction, justified because six products
(SpendGov, SecCorrelate, CodeAudit, CRMCapture, IncidentTriage, AuthStartup)
need byte-for-byte identical auth/org/RBAC behavior — see
`shared/platform/ARCHITECTURE.md` for why this earns the abstraction rather
than violating the "don't build shared code speculatively" rule above.
`ui/`, `lib/`, `types/`, and `config/` remain unextracted until a second
product actually needs that code identically.

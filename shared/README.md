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

## Structure (once populated)

```
shared/
  ui/           # design-system component implementation (standards/design-system.md)
  lib/          # cross-product utilities
  types/        # shared TypeScript types/contracts
  config/       # shared lint/tsconfig/tooling config
```

Currently empty — no product exists yet to share code with.

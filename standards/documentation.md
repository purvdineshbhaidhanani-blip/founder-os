# Documentation Standards

Documentation is part of the deliverable, not a nice-to-have — a product
isn't "done" if it isn't documented per this standard.

## What every product must have

Located in `products/<name>/docs/` (each product owns its own `docs/`
folder — see `CLAUDE.md` for why there's no shared top-level `docs/`):

- `README.md` — what the product is, quick start, links to the rest.
- `ARCHITECTURE.md` — system shape, major components, data flow, key
  technical decisions and why.
- `API.md` (or generated OpenAPI docs) — every route, per
  `standards/api.md`.
- `CHANGELOG.md` — dated, human-readable record of notable changes.
- `ONBOARDING.md` — how a new engineer gets from clone to running
  locally, including what's stubbed/disabled pending Phase 2 credentials.
- `TROUBLESHOOTING.md` — known issues, common errors, and how to resolve
  them.
- `decisions/` — one ADR (Architecture Decision Record) per significant
  technical decision, per the template below.

Reusable starting points for all of the above live in
`templates/*_TEMPLATE.md` — copy, don't reinvent the structure per
product.

## Writing standards

- Written for the reader, not the writer: assume they don't have the
  context this session has. Define acronyms on first use.
- Docs describe the current state of the system, not the history of how it
  got there (that's what `CHANGELOG.md` and git history are for) — no
  "we used to do X, now we do Y" narration in living reference docs.
  Comments in code follow the same rule.
- Code samples in docs are real and runnable, kept in sync with the
  actual codebase — a doc with a code sample that no longer compiles is
  treated as a bug.
- Diagrams (architecture, data flow, sequence) use a plain-text-
  diffable format (Mermaid) checked into the repo, not an external tool
  that can drift silently out of sync.

## Keeping docs current

- A PR that changes a documented behavior (API contract, architecture,
  setup steps) updates the relevant doc in the same PR — docs debt is not
  deferred to a cleanup pass.
- `CHANGELOG.md` gets an entry as part of the PR that introduces the
  change, not reconstructed later from git log.
- Stale docs are worse than no docs — if a doc can't be kept accurate, it
  is deleted or clearly marked draft/outdated rather than left to mislead.

## ADRs (Architecture Decision Records)

Used for any decision that's expensive to reverse or that a future
engineer will reasonably ask "why did we do it this way?" about (schema
design, provider choice, auth architecture, major dependency). One file
per decision in `docs/decisions/NNNN-title.md`, using
`templates/ADR_TEMPLATE.md`. Never edited after acceptance — superseding
decisions get a new ADR that references the old one.

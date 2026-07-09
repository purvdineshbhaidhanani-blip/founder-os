# Platform Audit

A standing snapshot of the repository's health: technical debt, risks,
scalability/maintainability posture, and recommended next actions. This is
an analysis document — it makes **no code changes**. Re-run this audit
(update this file) whenever the repository structure changes materially
(a new product added, the legacy code is removed, standards revised).

_Last updated: 2026-07-09, after establishing the Global Standards
foundation (Mega Prompt 1)._

---

## 1. Current repository composition

| Area | Size | Status |
|---|---|---|
| `MASTER_PROJECT_CONTEXT.md`, `CLAUDE.md` | — | New project foundation |
| `standards/` | 9 docs | New — global standards, complete |
| `templates/` | 7 doc templates + `product-scaffold/` | New — complete |
| `products/`, `shared/`, `packages/`, `infrastructure/` | empty | New — scaffolded, awaiting first product |
| `src/`, `agents/` (41 agent defs), `blueprints/`, `registry/`, `artifacts/`, `web/`, `tests/`, `supabase/`, `scripts/`, `docs/` | ~6.3 MB, 41 agents, 14 test suites | **Legacy** — "Agent Factory," unrelated prior project |
| Root toolchain (`package.json`, lockfile, `tsconfig*`, `.eslintrc.cjs`, `.prettierrc`, `playwright.config.ts`, `vitest.config.ts`, `railway.json`, `.env.example`) | — | **Legacy** — wired entirely to `src/`/`web/`, not to the new project |
| `README.md`, `APP_CREATION_GUIDE.md`, `DEPLOYMENT.md` | — | **Legacy** — describe the Agent Factory |

The repository currently holds two unrelated projects side by side: the
new SaaS portfolio foundation (this audit's subject) and the legacy Agent
Factory. Per `MASTER_PROJECT_CONTEXT.md`, the new project takes zero
dependencies on the legacy code.

## 2. Technical debt

### In the new project (small surface, low debt so far)
- **None yet at the code level** — the new project is currently
  documentation and structure only (`standards/`, `templates/`,
  `MASTER_PROJECT_CONTEXT.md`, `CLAUDE.md`). No application code has been
  written, so there's no implementation debt to carry.
- **Root ambiguity**: the repository root still presents as the legacy
  Agent Factory to anyone arriving via `README.md` or `git clone` — the
  landing document doesn't reflect the new project's identity. This is a
  documentation/perception debt, not a code debt, and is flagged rather
  than fixed here (see §5 — changing the front-door `README.md` is a
  visible, repo-wide action that should be an explicit decision, not a
  byproduct of a standards pass).
- **No CI wired for the new project yet** — `standards/testing.md` and
  `standards/devops.md` define the CI gate, but no product exists yet to
  run it against, and the legacy `package.json`'s scripts don't apply to
  it. This becomes real debt the moment the first product's code lands
  without CI in the same PR.

### In the legacy Agent Factory (inherited, not ours to silently fix)
- 41 generated agent definitions, a 2.2 MB `src/` tree, and 14 test suites
  — a substantial, working system that predates this project and is out
  of scope per `MASTER_PROJECT_CONTEXT.md`. Only 1 `TODO`/`FIXME` found in
  `src/`, suggesting it was left in a reasonably clean state, not
  abandoned mid-work.
- It occupies the entire root-level namespace (`docs/`, `scripts/`,
  `package.json`, etc.), which is why the new project had to route around
  those names rather than reuse them (`templates/` instead of colliding
  with the old `scripts/`, product-owned `docs/` instead of a shared
  root `docs/`). This is now documented in `CLAUDE.md`.

## 3. Risks

| Risk | Severity | Notes |
|---|---|---|
| A future session reuses legacy `src/`/`agents/` patterns for the new SaaS products, violating the "brand-new, independent" mandate | **Medium** | Mitigated by the explicit legacy callout in `CLAUDE.md`, but relies on every session reading it first. |
| Root `README.md` misrepresents the repository to an outside visitor (still describes the Agent Factory) | **Medium** | Purely a perception/onboarding risk, not a technical one. No action taken without user direction — see §5. |
| Two unrelated `package.json`-style toolchains eventually needed (legacy Node/Vite for Agent Factory, new Next.js per product) in one repo | **Low–Medium** | Manageable today since products are self-contained (each with its own `package.json`); becomes a real workspace-tooling question once 2+ products exist — worth deciding on a monorepo tool (Turborepo/pnpm workspaces) before, not after, the second product is scaffolded. |
| Global standards drift from what products actually implement | **Low today, grows over time** | No product exists yet to drift. `standards/README.md` states the authority order and asks for an explicit "deviation" callout per product — the control exists, its effectiveness depends on future sessions following it. |
| Legacy repo (Supabase config, deploy config) accidentally targeted by a new product's Phase 2 credential wiring | **Low** | Legacy `supabase/`, `railway.json`, `.env.example` are unrelated to any future product's infrastructure; flagged here so Phase 2 work double-checks it's creating new config, not reusing old. |

## 4. Scalability & maintainability

**Scalability of the standards approach itself:**
- The "global standards, product-specific spec" split scales cleanly to
  many products — each new product is additive (a new
  `products/<name>/` directory) and doesn't require touching existing
  products or the standards themselves, unless a standard genuinely needs
  to change for everyone.
- `shared/` and `packages/` are intentionally left empty rather than
  pre-built — per the engineering standard's own "don't build for
  hypothetical future requirements" rule, cross-product extraction should
  wait for a second product to prove what's actually shared, not be
  guessed at now.

**Maintainability:**
- Every standards document is independently editable without touching the
  others, and each is scoped tightly enough (engineering vs. design vs.
  security vs. …) that a change in one rarely forces edits in another.
- The templates directory removes the main maintainability risk in
  multi-product portfolios — docs drifting into inconsistent shapes across
  products — by making the shared shape the path of least resistance.

**What would hurt scalability if skipped going forward:**
- Deciding on a monorepo workspace strategy (or confirming "fully
  independent repos per product" instead) before the second product
  exists, so tooling/CI isn't retrofitted under pressure.
- Actually extracting to `shared/` once a second product repeats the first
  product's design-system implementation, rather than letting duplication
  compound.

## 5. Recommended improvements (not executed — for user decision)

1. **Root `README.md`** — currently describes the legacy Agent Factory.
   Recommend either replacing it with a new-project overview once the
   first product exists, or adding a short "this repo now also hosts a
   new SaaS portfolio, see `MASTER_PROJECT_CONTEXT.md`" pointer in the
   interim. Left untouched pending your direction, per the standing rule
   of not modifying visible/shared-state files without confirmation.
2. **Legacy code disposition** — decide whether the Agent Factory
   (`agents/`, `src/`, `web/`, etc.) stays in this repo indefinitely,
   moves to its own repo, or is eventually deleted. No action taken; this
   audit only surfaces the question.
3. **Monorepo tooling decision** — before scaffolding the second product,
   decide pnpm/Turborepo workspaces vs. fully independent product
   toolchains, so `products/*/package.json` don't organically diverge in
   incompatible ways.
4. **First product** — the standards and scaffold are complete and ready;
   the highest-value next step is instantiating the first real SaaS
   product from `templates/product-scaffold/` once its identity (name,
   problem, target customer, features) is defined.

## 6. Summary

The new project's foundation is in a clean, low-debt state: no code has
been written yet, so there is nothing to remediate at the implementation
level. All identified risks are structural/organizational (legacy
coexistence, root-README ambiguity, a future monorepo-tooling decision)
rather than defects, and are called out for the user rather than acted on
unilaterally. The repository is ready for the first product to be built
against `standards/` and `templates/product-scaffold/`.

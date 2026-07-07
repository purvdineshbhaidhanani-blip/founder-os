# Workspace Packages

The Universal Platform is an npm workspace: each loop lives in its own
`@platform/*` package under `packages/*`, published locally (not to a
registry) and consumed via workspace resolution (`"*"` version in
`package.json`). Nothing here is Founder-OS-specific — `src/` (the Founder
OS application) depends on these packages, not the other way around.

## Packages

| Package | Path | Depends on | Purpose |
|---|---|---|---|
| `@platform/core` | `packages/core` | — | Zero-dependency runtime primitives (currently: `createLogger`/`Logger`). Exists so other platform packages never need to reach into Founder OS's own `src/utils`. |
| `@platform/shared` | `packages/shared` | — | Cross-cutting utilities used by two or more of the packages below: cron parsing, the `Scheduler` interface, `{{template}}` interpolation, retry/backoff, dependency-graph validation, confidence scoring, priority ranking, the `AITextGenerator` interface. |
| `@platform/engines` | `packages/engines` | `@platform/shared` | The 10 platform engines — AI, Workflow, Automation, Search, Knowledge, Notification, Analytics, Logging & Monitoring, Integration, Storage. See `docs/PLATFORM_ENGINES.md`. |
| `@platform/factory` | `packages/factory` | `@platform/shared`, `zod` | The SaaS Factory: product definitions, module registry, bootstrap/scaffolding, templates, configuration engine, extensions, documentation generator. See `docs/SAAS_FACTORY.md`. |
| `@platform/intelligence` | `packages/intelligence` | `@platform/shared`, `@platform/engines` | The decision-support layer: recommendations, insights, decisions, intelligence registry, feature/product intelligence, AI recommendation layer, diagnostics, optimization. See `docs/PLATFORM_INTELLIGENCE.md`. |
| `@platform/identity` | `packages/identity` | `@platform/core` | Multi-tenant identity: users, organizations, teams, RBAC, sessions, audit log. See `docs/IDENTITY.md`. |
| `@platform/ui` | `packages/ui` | react/react-dom (peer) | UI component library (`ui-kit`) and design system (tokens). |

## Dependency direction

```
@platform/core     @platform/shared
      │                   │
      │        ┌──────────┼──────────┐
      │        ▼          ▼          ▼
      │   @platform/  @platform/  @platform/
      │    engines     factory   intelligence
      │                              ▲
      ▼                              │
@platform/identity          (engines feeds intelligence's AI bridge)

@platform/ui — standalone, only peer-depends on react/react-dom
```

No package depends on Founder OS application code (`src/agents`,
`src/departments`, `src/brain`, `src/server`, etc.), and there are no
circular dependencies between packages.

## How package exports work

Every package's `package.json` declares an `exports` map that points
directly at TypeScript source (e.g. `"./ai": "./src/ai/index.ts"`), not at
compiled `dist/` output. This works because:

- Vite/Vitest resolve the npm-workspace symlink to its real path and apply
  the TS transform there (the transform's `node_modules` exclusion doesn't
  apply to the resolved real path).
- `tsc` with `moduleResolution: "NodeNext"` accepts `exports` entries that
  resolve straight to `.ts` files for local/monorepo packages.

Each engine/module is also reachable via its own subpath (e.g.
`@platform/engines/ai`, `@platform/factory/bootstrap`,
`@platform/intelligence/api`) so consumers only pull in the code they use
and avoid symbol collisions across sibling modules.

## Bootstrapped products

`ProductBootstrapper` (part of `@platform/factory`) generates a
`package.json` and `src/index.ts` for scaffolded products that import
platform modules by package specifier (e.g. `@platform/engines/workflow`),
derived from each selected module's `sourcePath`, not by relative
filesystem path — a bootstrapped product depends on the platform packages
the same way this repository's own `src/` does.

## Tests

Each package has its own `tests/` directory (`packages/*/tests/*.test.ts`),
run together with the rest of the suite via the root `npm test` (vitest)
command — `vitest.config.ts`'s `include` covers both `tests/**/*.test.ts`
(Founder OS) and `packages/*/tests/**/*.test.ts` (platform packages).

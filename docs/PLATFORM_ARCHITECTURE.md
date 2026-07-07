# Universal Platform — Architecture

(For the Founder OS agent factory's own architecture — Blueprint → Generator
→ Validator → Registry — see `docs/ARCHITECTURE.md`. This document is scoped
to the seven `@platform/*` workspace packages only.)

## Layering

```
                    @platform/core        @platform/shared
                    (logger, zero deps)   (retry, timeout, cron, schedule,
                          │                interpolate, dependency-graph,
                          │                validation, confidence, ranking,
                          │                http-health, ai-text-generator)
                          │                       │
                          │        ┌──────────────┼──────────────┐
                          │        ▼               ▼               ▼
                          │  @platform/engines @platform/factory @platform/intelligence
                          │   (10 engines)      (SaaS factory)    (decision support)
                          │        │                                    ▲
                          ▼        └────────────────────────────────────┘
                  @platform/identity                (AI bridge, optional)
                  (multi-tenant auth)

                  @platform/ui  — standalone (peer deps: react, react-dom only)
```

Arrows are "depends on." There are no cycles: `core` and `shared` depend on
nothing else in the platform; `engines`/`factory`/`intelligence` each
depend only on `shared` (`intelligence` additionally depends on `engines`,
used only for its optional `fromAIProvider()` bridge); `identity` depends
only on `core`; `ui` depends on nothing in the platform at all.

None of the seven packages import from Founder OS application code
(`src/agents`, `src/departments`, `src/brain`, `src/opportunities`,
`src/server`, ...) — dependencies only ever point from the application into
the platform, never back.

## The four layers, and why they're split this way

1. **Engines** (`@platform/engines`) are the building blocks: AI chat
   completion, workflow execution, event-driven automation, search,
   knowledge/RAG, notification delivery, analytics, logging/monitoring,
   third-party integration, object storage. Each is a standalone,
   independently-importable subpath (`@platform/engines/ai`, .../workflow`,
   ...) so a consumer only pulls in what it uses. See
   `docs/PLATFORM_ENGINES.md`.
2. **Factory** (`@platform/factory`) turns configuration (a
   `ProductDefinition`) into a resolved module set and a scaffolded
   project — it *consumes* engines by reference (via each module's
   `sourcePath` → real package specifier) but never copies their code. See
   `docs/SAAS_FACTORY.md`.
3. **Intelligence** (`@platform/intelligence`) sits above both: it turns
   raw application state into recommendations, insights, and decisions. It
   is deliberately provider-independent — the only AI-shaped dependency
   anywhere in it is the narrow `AITextGenerator` interface, with an
   optional, isolated bridge to a real `@platform/engines/ai` `AIProvider`.
   See `docs/PLATFORM_INTELLIGENCE.md`.
4. **Identity** (`@platform/identity`) is orthogonal to the other three —
   multi-tenant users/organizations/teams/RBAC/sessions/audit — and is the
   one package with a real persistence concern (an `IdentityStore`
   interface backed by an in-memory default or Postgres/Supabase). See
   `docs/IDENTITY.md`.

`@platform/core` and `@platform/shared` exist because every one of the four
layers above needed a handful of the same primitives; each is implemented
exactly once and consumed by whichever layers need it, rather than
duplicated per-layer. `@platform/ui` (component library + design tokens) is
the one package with no server-side platform dependency at all — it only
needs React.

## Design rules enforced across every package

These are asserted, not just intended — grep-verified where noted:

- **No vendor lock-in.** Every provider-shaped dependency is an interface
  (`AIProvider`, `ObjectStorageProvider`, `NotificationChannel`,
  `SearchIndexProvider`, `IdentityStore`, ...) satisfied by a swappable
  adapter. Vendor-specific request/response shaping lives only in
  `providers/`/`adapters/` subdirectories.
- **Zero-config default for every engine.** `MockProvider`,
  `InMemoryQueue`, `InMemoryVectorStore`, `LocalFsStorage`,
  `ConsoleEmailChannel`, `InMemoryIdentityStore`, `InMemoryDecisionHistoryStore`,
  `TemplateAITextGenerator` — every engine and the `IntelligenceAPI` facade
  work with zero arguments and zero external services.
- **No duplicated algorithms.** Retry/backoff, timeout-signal combining,
  HTTP reachability checks, cron parsing, `{{template}}` interpolation,
  dependency-graph validation, confidence scoring, and priority ranking are
  each implemented exactly once in `@platform/shared` and consumed by every
  package that needs them (verified: `packages/shared/src` has no
  duplicate logic in any consuming package).
- **Structural typing over hard imports** at layer boundaries that would
  otherwise create a cycle — `@platform/intelligence`'s Product
  Intelligence/Diagnostics/Optimization modules depend on
  `ModuleRegistryLike`/`ConfigValidationResultLike` shapes they define
  themselves, satisfied by `@platform/factory`'s real types without
  importing them.
- **Package `exports` maps resolve straight to TypeScript source**
  (`"./ai": "./src/ai/index.ts"`), not a compiled `dist/`. Verified against
  both `tsc --noEmit` (NodeNext module resolution) and Vitest/Vite
  (workspace-symlink real-path resolution) — see `docs/PACKAGES.md`.
- **Every HTTP-based provider adapter is timeout-bounded and typed.** As of
  this release, `OpenAIProvider`, `AnthropicProvider`, `HttpObjectStorage`,
  and `HttpEmailChannel` all default to a non-zero request timeout and
  raise a typed, `retryable`-tagged error (`AIProviderError`,
  `ObjectStorageError`, `NotificationChannelError`) instead of leaking a
  raw `fetch` rejection.

## Data flow example: a bootstrapped product

```
ProductDefinition                      (what modules, what auth mode, what billing mode)
      │  resolveEffectiveModules()      @platform/factory/product
      ▼
ModuleRegistry.resolveRequired()        @platform/factory/modules
      │  (dependency-ordered module list, each with a real sourcePath)
      ▼
ProductBootstrapper.plan()              @platform/factory/bootstrap
      │  packageForModule() derives "@platform/engines", "@platform/identity", etc.
      │  from each module's sourcePath
      ▼
ProjectPlan { packageJson, files }      generated package.json depends on the *real*
      │                                  @platform/* packages the product actually uses
      ▼
FsProjectWriter.write()                 files on disk — imports platform code by
                                         package specifier, never inlines/copies it
```

## Where things are NOT shared (intentionally)

- Founder OS's own single-founder auth (`src/server/routes/auth.ts`,
  `src/server/session.ts`) is untouched and unrelated to
  `@platform/identity` — they're wired into the same server under
  different route prefixes (`/api/auth/*` vs `/api/identity/*`) and neither
  depends on the other.
- `src/runtime/memory` (Founder OS's own memory engine) is a separate,
  older durable-storage module that predates and is not part of the
  platform packages, despite following the same interface-first pattern.

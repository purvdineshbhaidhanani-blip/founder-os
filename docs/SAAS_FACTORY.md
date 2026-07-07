# Universal SaaS Factory

`src/factory/` turns a `ProductDefinition` (configuration) into a resolved set
of platform modules and a scaffolded project — it is not a code generator for
one product, it's the reusable machinery for creating many. `web/src/ui-kit`
and `web/src/design-system` are its frontend counterpart: a product-agnostic
component library and token system. Nothing in either location contains
Founder OS logic, a hardcoded product name, or business-specific features.

## How the pieces fit together

```
ProductDefinition (product/)
        │  resolveEffectiveModules()
        ▼
ModuleRegistry (modules/)  ──validateAll/validateEnabled/resolveRequired──▶ dependency-ordered module list
        │
        ▼
ProductBootstrapper (bootstrap/) ──plan()──▶ ProjectPlan ──FsProjectWriter──▶ files on disk
        │
        ▼
DocumentationGenerator (docs/) ──▶ developer guide + API reference + per-module docs
```

`templates/` supplies five starting `ProductDefinition` presets;
`config/` (environment, feature flags, providers, deployment) is what a
bootstrapped product's own runtime configuration is built from;
`extensions/` lets third-party/plugin code register additional modules into
a `ModuleRegistry` at runtime, using the same dependency validation as the
built-in catalog.

## Modules

| Area | Path | Purpose |
|---|---|---|
| Product Definition | `src/factory/product` | `ProductDefinition` type + Zod schema + cross-field validation + `resolveEffectiveModules`. |
| Module Registry | `src/factory/modules` | Built-in catalog of Loop 1/Loop 2 modules, on-disk auto-discovery of `src/engines/*`, enable/disable, dependency resolution. |
| Bootstrap System | `src/factory/bootstrap` | Pure `ProjectPlan` planner + `FsProjectWriter` to materialize it — reuses modules, never copies their code. |
| Templates | `src/factory/templates` | SaaS, Internal Tool, API Service, AI Application, Admin Portal presets. |
| Configuration Engine | `src/factory/config` | Environment variables, feature flags (boolean/rollout/environment-scoped), named provider config, deployment config. |
| Extension System | `src/factory/extensions` | Plugin/custom-module/third-party extension registry with install/enable/disable/uninstall lifecycle hooks. |
| Documentation Generator | `src/factory/docs` | Developer guide, API reference, and per-module docs — grounded in each module's actual scanned exports, not hand-written prose. |
| Shared | `src/factory/shared` | `validateDependencyGraph` (cycle/missing-dependency detection + topological order) and a small `ValidationResult` vocabulary, used by both the Module Registry and the Extension System. |
| UI Component Library | `web/src/ui-kit` | Button, Input, Table, Form, Dialog, Card, Navigation, DashboardLayout, EmptyState, LoadingState, ErrorState. |
| Design System | `web/src/design-system` | Typography/spacing/color/shadow tokens as CSS custom properties (light + dark), breakpoints, and documented accessibility rules. |

## Example

```ts
import { applyTemplate } from "./factory/templates/apply.js";
import { ModuleRegistry } from "./factory/modules/registry.js";
import { BUILTIN_MODULES } from "./factory/modules/catalog.js";
import { ProductBootstrapper } from "./factory/bootstrap/planner.js";
import { FsProjectWriter } from "./factory/bootstrap/writer.js";

const definition = applyTemplate("ai-application", { name: "my-ai-app" });
if (definition.valid) {
  const registry = new ModuleRegistry(BUILTIN_MODULES);
  const plan = new ProductBootstrapper().plan(definition.value, registry);
  if (plan.valid) await new FsProjectWriter().write(plan.value, "/path/to/new/repo");
}
```

## Design rules this layer follows

- **Configuration drives everything.** A product is a `ProductDefinition`
  value; nothing about "which modules," "which auth mode," or "which
  billing mode" is hardcoded in factory code.
- **No duplication across engines/factory.** Dependency-graph validation
  (cycles, missing deps) is implemented once in `factory/shared` and used by
  both the Module Registry and the Extension System.
- **Bootstrap reuses, never copies.** The generated `src/index.ts` imports
  platform modules from a package specifier (`@platform/engines/<id>`, the
  convention a real monorepo/npm-linked platform package would satisfy) —
  it does not inline or duplicate any engine's source.
- **No vendor lock-in.** Provider configuration is a named registry
  (`category` + `id` + arbitrary config), not a hardcoded vendor SDK
  import; deployment targets are abstract (`local`/`container`/`serverless`/`static`).

## Tests

`tests/factory/*.test.ts` covers the product schema, module registry
(including real on-disk discovery via a temp directory), templates,
bootstrap planning + writing (via a temp directory), configuration engine,
extension lifecycle, and the documentation generator.

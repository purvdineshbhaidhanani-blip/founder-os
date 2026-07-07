# Universal Platform — Upgrade Guide

## Upgrading from local-path imports to `@platform/*` packages

Before this release, platform code lived under `src/engines`, `src/factory`,
`src/platform-intelligence`, `src/identity`, and
`web/src/{ui-kit,design-system}`, and was imported by relative path. It is
now published as seven npm workspace packages. **No public API changed** —
only where you import it from.

### 1. Update imports

| Old | New |
|---|---|
| `import { ModelRouter } from "../engines/ai/index.js"` | `import { ModelRouter } from "@platform/engines/ai"` |
| `import { WorkflowEngine } from "../../engines/workflow/index.js"` | `import { WorkflowEngine } from "@platform/engines/workflow"` |
| `import { ProductBootstrapper } from "../factory/bootstrap/index.js"` | `import { ProductBootstrapper } from "@platform/factory/bootstrap"` |
| `import { IntelligenceAPI } from "../platform-intelligence/api/index.js"` | `import { IntelligenceAPI } from "@platform/intelligence/api"` |
| `import { AuthService } from "../identity/index.js"` | `import { AuthService } from "@platform/identity"` |
| `import { Button } from "../../web/src/ui-kit"` | `import { Button } from "@platform/ui/ui-kit"` |
| Any of the three old internal `shared/` folders | `import { ... } from "@platform/shared"` |

Every engine/module subpath from before still exists as an export subpath —
see `docs/PACKAGES.md` for the full table.

### 2. Add the workspace dependency

If you're consuming these packages from **within this repository** (the
common case — Founder OS's own `package.json` already does this), add the
package(s) you use to your `package.json` `dependencies` with version `"*"`
(npm workspace resolution):

```json
{
  "dependencies": {
    "@platform/engines": "*",
    "@platform/shared": "*"
  }
}
```

Then `npm install` from the repo root (npm workspaces symlink the packages
into `node_modules` automatically — no publish step).

If you're consuming these packages from **outside this repository** (a
separate project), they are not currently published to a registry — see
"Extracting a package for external use" below.

### 3. Update `sourcePath`-derived assumptions

If your code inspected a `PlatformModule.sourcePath` string from the SaaS
Factory's module registry (e.g. to build a doc link or a custom import), the
value changed from `src/engines/<module>` to `packages/engines/src/<module>`
(and similarly for `factory`/`intelligence`). `ProductBootstrapper`'s
generated `package.json`/`src/index.ts` already derive the correct
`@platform/<package>` specifier automatically via `packageForModule()` — you
only need to update custom code that read `sourcePath` directly.

### 4. Adopt the new opt-in hardening options (optional, non-breaking)

This release adds `timeoutMs` and `retryPolicy` constructor options to
`OpenAIProvider`, `AnthropicProvider`, `HttpObjectStorage`, and
`HttpEmailChannel`. Existing code needs no changes: `timeoutMs` defaults to
a sensible non-zero value (request-hang protection you get for free), and
`retryPolicy` defaults to `NO_RETRY_POLICY` (identical to the prior
behavior of never retrying). To opt in:

```ts
import { OpenAIProvider } from "@platform/engines/ai";

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  retryPolicy: { maxAttempts: 3, baseDelayMs: 250 }, // opt-in
});
```

See `docs/PROVIDER_SETUP.md` for the full option reference per provider.

### 5. Run validation

```
npm install
npm run typecheck
npm run lint
npm test
npm run validate:providers   # only meaningful once you've set real provider env vars
```

## Extracting a package for external use

These packages are not yet published to an npm registry. To use one outside
this repository today: copy the package's `src/` directory (it has no
Founder-OS-specific code by design — see each engine's "Design rules this
layer follows" section in its doc) plus its `package.json`, or set up a
private registry / `npm pack` workflow. Publishing to a public or private
registry is out of scope for this release — see
`docs/PLATFORM_PRODUCTION_CHECKLIST.md`.

## Rollback

Package boundaries are purely organizational — every module's actual
TypeScript source is unchanged (moved via `git mv`, preserving history), and
no runtime behavior changed as part of the move. If you need to revert, the
packaging commit is a single, isolated commit; reverting it restores the
original `src/`-relative-path layout with no data or schema migrations
involved (no database changes shipped in this release).

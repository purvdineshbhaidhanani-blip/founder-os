# Universal Platform Engines

`packages/engines/src/` is a standalone, reusable layer of platform building blocks. It
has no dependency on Founder OS business logic (agents, departments,
opportunities, brain, etc.) — anything in this workspace building a new SaaS,
AI application, mobile app, web application, or API can import from it
directly.

Every engine follows the same shape: **interfaces first, adapters second**.
Callers depend on an interface (`AIProvider`, `ObjectStorageProvider`,
`SearchIndexProvider`, ...); concrete adapters (mock, in-memory, HTTP-based,
provider-specific) implement it. Swapping a backend never requires touching
calling code — that's the no-vendor-lock-in guarantee.

## Engines

| Engine | Path | Purpose |
|---|---|---|
| AI | `packages/engines/src/ai` | Provider-agnostic chat completions: routing, prompts, context window management, memory, tool calling, streaming, token accounting. Adapters: `MockProvider`, `OpenAIProvider`, `AnthropicProvider`. |
| Workflow | `packages/engines/src/workflow` | DAG step execution with conditions, retry, background (fire-and-poll) execution, and cron/interval/one-off scheduling. |
| Automation | `packages/engines/src/automation` | Event bus, trigger/action registries wired through a queue, and a cron abstraction that publishes synthetic events. |
| Search | `packages/engines/src/search` | Named collections behind `SearchIndexProvider`; filtering, sorting, full-text scoring, and a global fan-out search across collections. |
| Knowledge | `packages/engines/src/knowledge` | Document chunking, pluggable embeddings, a vector store abstraction, and citation-producing retrieval. |
| Notification | `packages/engines/src/notification` | Channel-agnostic dispatch (email, in-app, push, webhook) plus versioned templates. |
| Analytics | `packages/engines/src/analytics` | Event tracking, usage metrics (count/sum/average/time-series), dashboards, reports, and an audit trail. |
| Logging & Monitoring | `packages/engines/src/logging-monitoring` | Structured JSON logging, health checks, metrics collection, error reporting, and a tracing interface. |
| Integration Framework | `packages/engines/src/integration` | Connector base class composing auth (OAuth2 or API key), rate limiting, and retry; plus webhook signature verification, polling, and sync jobs. |
| Storage | `packages/engines/src/storage` | Object storage abstraction (local filesystem or HTTP/S3-compatible), upload/download managers, and a media processing hook pipeline. |

Cross-engine primitives (cron parsing, the `Scheduler` interface,
`{{template}}` interpolation, retry/backoff, and more) live in the sibling
`@platform/shared` package, not inside this one — see `PACKAGES.md`.

## Usage

This engine is published as the `@platform/engines` workspace package.
Import a specific engine's subpath to avoid symbol collisions across
engines:

```ts
import { ModelRouter, MockProvider } from "@platform/engines/ai";
import { WorkflowEngine } from "@platform/engines/workflow";
```

Or import the aggregated namespace export from the package root:

```ts
import { ai, workflow, storage } from "@platform/engines";

const router = new ai.ModelRouter({ routes: [{ model: "*", provider: new ai.MockProvider() }] });
```

## Design rules this layer follows

- **No Founder OS imports.** Nothing under `packages/engines/src` imports
  from `src/agents`, `src/departments`, `src/brain`, `src/opportunities`, or
  any other business-specific module — the package's only dependency,
  declared in its `package.json`, is `@platform/shared`.
- **Every engine ships a working default.** `MockProvider`,
  `InMemoryQueue`, `InMemoryVectorStore`, `LocalFsStorage`, and friends mean
  every engine runs out of the box with zero external services or API keys —
  useful for local development and tests, and a safe default for production
  until a real backend is wired in.
- **Vendor-specific code is isolated to `providers/` and `adapters/`
  subdirectories.** Anthropic- and OpenAI-specific request/response shaping
  lives in `packages/engines/src/ai/providers/*`; nowhere else in the AI engine knows
  those shapes exist.
- **Cross-engine duplication is refactored into `@platform/shared`.** Cron
  parsing, scheduling, template interpolation, and retry/backoff are each
  implemented once and consumed by every engine that needs them (e.g. the
  Workflow Engine's scheduling interface and the Automation Engine's cron
  abstraction share the same `Scheduler`).

## Tests

Each engine has a corresponding test file under `packages/engines/tests/`
(e.g. `packages/engines/tests/ai.test.ts`), run with the existing `npm test`
(vitest) suite.

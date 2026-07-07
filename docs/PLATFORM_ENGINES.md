# Universal Platform Engines

`src/engines/` is a standalone, reusable layer of platform building blocks. It
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
| AI | `src/engines/ai` | Provider-agnostic chat completions: routing, prompts, context window management, memory, tool calling, streaming, token accounting. Adapters: `MockProvider`, `OpenAIProvider`, `AnthropicProvider`. |
| Workflow | `src/engines/workflow` | DAG step execution with conditions, retry, background (fire-and-poll) execution, and cron/interval/one-off scheduling. |
| Automation | `src/engines/automation` | Event bus, trigger/action registries wired through a queue, and a cron abstraction that publishes synthetic events. |
| Search | `src/engines/search` | Named collections behind `SearchIndexProvider`; filtering, sorting, full-text scoring, and a global fan-out search across collections. |
| Knowledge | `src/engines/knowledge` | Document chunking, pluggable embeddings, a vector store abstraction, and citation-producing retrieval. |
| Notification | `src/engines/notification` | Channel-agnostic dispatch (email, in-app, push, webhook) plus versioned templates. |
| Analytics | `src/engines/analytics` | Event tracking, usage metrics (count/sum/average/time-series), dashboards, reports, and an audit trail. |
| Logging & Monitoring | `src/engines/logging-monitoring` | Structured JSON logging, health checks, metrics collection, error reporting, and a tracing interface. |
| Integration Framework | `src/engines/integration` | Connector base class composing auth (OAuth2 or API key), rate limiting, and retry; plus webhook signature verification, polling, and sync jobs. |
| Storage | `src/engines/storage` | Object storage abstraction (local filesystem or HTTP/S3-compatible), upload/download managers, and a media processing hook pipeline. |
| Shared | `src/engines/shared` | Cross-engine primitives used by more than one engine: cron parsing, the `Scheduler` interface, `{{template}}` interpolation, and retry/backoff — kept in one place so no two engines reinvent the same logic. |

## Usage

Import a specific engine's namespace to avoid symbol collisions across
engines:

```ts
import { ModelRouter, MockProvider } from "./engines/ai/index.js";
import { WorkflowEngine } from "./engines/workflow/index.js";
```

Or import the aggregated namespace export from `src/engines/index.ts`:

```ts
import { ai, workflow, storage } from "./engines/index.js";

const router = new ai.ModelRouter({ routes: [{ model: "*", provider: new ai.MockProvider() }] });
```

## Design rules this layer follows

- **No Founder OS imports.** Nothing under `src/engines` imports from
  `src/agents`, `src/departments`, `src/brain`, `src/opportunities`, or any
  other business-specific module. The only shared code it pulls from
  elsewhere is generic filesystem/id/logging utilities in `src/utils`.
- **Every engine ships a working default.** `MockProvider`,
  `InMemoryQueue`, `InMemoryVectorStore`, `LocalFsStorage`, and friends mean
  every engine runs out of the box with zero external services or API keys —
  useful for local development and tests, and a safe default for production
  until a real backend is wired in.
- **Vendor-specific code is isolated to `providers/` and `adapters/`
  subdirectories.** Anthropic- and OpenAI-specific request/response shaping
  lives in `src/engines/ai/providers/*`; nowhere else in the AI engine knows
  those shapes exist.
- **Cross-engine duplication is refactored into `src/engines/shared`.** Cron
  parsing, scheduling, template interpolation, and retry/backoff are each
  implemented once and consumed by every engine that needs them (e.g. the
  Workflow Engine's scheduling interface and the Automation Engine's cron
  abstraction share the same `Scheduler`).

## Tests

Each engine has a corresponding test file under `tests/engines/` (e.g.
`tests/engines/ai.test.ts`), run with the existing `npm test` (vitest) suite.

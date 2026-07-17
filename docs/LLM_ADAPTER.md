# LLM Adapter (`src/llm/`)

The execution layer the deterministic core never had. Founder OS's pipeline
makes **no model calls**; this adapter is an **opt-in** way to run a real local
model (default: Ollama) behind a provider abstraction, so the planned
"executable agent" runtime has something to call. It is not wired into the
scoring/decision pipeline and never runs implicitly.

## Why it exists
`src/routing/model-router.ts` *selects* a model (provider + name) but nothing
*executes* against one. `src/llm` fills that gap: `ModelRouter` decides
**which** model; `LlmProvider` decides **how** to call it.

## Files
| File | Purpose |
|------|---------|
| `types.ts` | `LlmProvider` contract, `LlmMessage`/`LlmCompletionRequest`/`LlmCompletionResult`, typed `LlmError`. |
| `ollama-provider.ts` | `OllamaProvider` — talks to a local Ollama daemon over HTTP via global `fetch` (no SDK, no key, no account). |
| `client.ts` | `LlmClient` — provider registry + dispatch; the only thing callers depend on. |
| `index.ts` | Barrel export. |

## Run it (local, no external accounts)
```
# 1. Install Ollama: https://ollama.com/download
# 2. Start the daemon:
ollama serve
# 3. Pull a model:
ollama pull llama3.1
# 4. (optional) point the adapter at a non-default host:
export OLLAMA_HOST=http://127.0.0.1:11434
```

```ts
import { createDefaultLlmClient } from "./src/llm/index.js";
const llm = createDefaultLlmClient();
if (await llm.isAvailable()) {
  const res = await llm.complete({
    model: "llama3.1",
    messages: [{ role: "user", content: "Find me a SaaS idea for dentists." }],
  });
  console.log(res.text);
}
```

## Failure model
Providers **never throw raw** for operational failures — every one becomes a
typed `LlmError` with a `reason`:

| reason | meaning |
|--------|---------|
| `unavailable` | daemon unreachable / no provider registered |
| `timeout` | request exceeded the per-call timeout |
| `model-not-found` | model not pulled (HTTP 404) |
| `http-error` | non-2xx from the backend |
| `bad-response` | unparseable / contentless body |

So callers (and the future agent runtime) can degrade cleanly when no local
model is installed, instead of crashing.

## Swap Ollama for another provider
Implement `LlmProvider` and register it — no other code changes:
```ts
class OpenAiCompatProvider implements LlmProvider {
  readonly id = "openai-compat";
  async isAvailable() { /* ping */ return true; }
  async complete(req) { /* POST /v1/chat/completions, map to LlmCompletionResult */ }
}
const llm = createDefaultLlmClient();
llm.register(new OpenAiCompatProvider(), /* makeDefault */ true);
```
The client holds **no** provider-specific logic, so this is the only file that
knows about a given backend.

## Tests
`tests/llm/ollama-provider.test.ts` (mocked `fetch`) covers response mapping,
option passing, and every `LlmError` reason, plus `LlmClient` dispatch and
provider registration. Live Ollama execution is not exercised in CI/sandbox
(no daemon, egress blocked) — see the availability guard above.

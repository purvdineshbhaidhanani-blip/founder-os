# AI Foundation Standards

Rules for every product that embeds LLM-powered features (copilots,
generation, extraction, classification, search). Applies whether the
product's core value prop is AI or AI is a supporting feature.

## Provider abstraction

- Application code never calls a model provider's SDK directly from
  feature code. All model calls go through a single internal `ai/` service
  layer (`lib/ai/client.ts` or equivalent) that wraps the provider SDK.
- The abstraction is provider-agnostic at the call site: `generate({
  task, input, ... })`, not `openai.chat.completions.create(...)` sprinkled
  through the codebase. Swapping or adding a provider is a change in one
  place.
- Provider credentials are read from environment variables through the
  same abstraction; the feature layer never sees raw API keys.
- Default to the latest Claude model family for new integrations unless a
  product requirement dictates otherwise; do not default to an older or
  deprecated model out of habit.

## Model routing

- Task-to-model mapping is explicit and centralized (a config/table, not
  scattered conditionals): cheap/fast model for classification and
  extraction, frontier model for open-ended generation and reasoning-heavy
  tasks.
- Routing config is overridable per environment (dev can route to a
  cheaper model than prod) without code changes.

## Prompt management

- Prompts are versioned artifacts, not inline string literals scattered
  across feature code — stored as named, versioned templates
  (`lib/ai/prompts/<feature>.ts` or a prompts directory) with the version
  bumped on any behavior-changing edit.
- Prompts are parameterized via a typed interface, never raw string
  concatenation of untrusted user input directly into the instruction
  portion of the prompt (this is also a prompt-injection control — see
  below).
- Every prompt change is testable in isolation via the eval harness
  (below) before it ships.

## Reliability: retries, fallbacks, timeouts

- Every model call has a bounded timeout and a small number of retries
  with exponential backoff for transient errors (5xx, rate limit) —
  never an unbounded retry loop.
- Non-retriable errors (invalid request, content policy rejection) fail
  fast with a clear typed error, not a retry.
- Where the feature is not latency-critical for a single "best" model,
  define a fallback chain (e.g. primary model → secondary model) so a
  single provider outage doesn't take down the feature — configured, not
  required to exist for every feature on day one.
- Circuit breaking: after repeated failures, the service short-circuits to
  a graceful degradation path (cached result, disabled state with a clear
  message) rather than hammering a failing provider.

## Streaming

- User-facing generative features (chat, long-form generation) stream
  tokens to the client rather than blocking for the full completion,
  unless the UX specifically calls for a single atomic result (e.g.
  structured extraction feeding a form).
- Streaming responses are still validated/moderated as they complete, not
  exempted from the guardrails below just because they're incremental.

## Token & cost management

- Every model call is metered: input tokens, output tokens, model, feature,
  and (where applicable) tenant/user, recorded for cost attribution.
- Per-feature and per-tenant budget guards exist for AI-heavy products —
  a runaway loop or abusive user cannot generate unbounded spend silently.
- Long inputs are truncated/chunked deliberately (with a documented
  strategy — e.g. sliding window, summarization) rather than silently
  hitting a context-length error in production.
- Cost dashboards/alerts are part of the admin panel for any product where
  AI is a meaningful cost driver (see `standards/database.md` for the
  usage-tracking schema pattern).

## Caching

- Deterministic or near-deterministic AI calls (classification, embedding
  generation, extraction on unchanged input) are cached by a hash of the
  normalized input + prompt version, to avoid redundant spend and latency.
- Cache invalidates automatically when the prompt version changes — a
  stale cached result from an old prompt is never served.

## Hallucination & correctness controls

- Any AI output presented as fact (not clearly labeled as a suggestion/
  draft) is either grounded in retrieved source data (RAG) with citations,
  or explicitly labeled as AI-generated and unverified.
- Structured outputs (see below) are validated against a schema before
  being trusted by downstream code — a malformed or out-of-schema response
  is treated as a failure, not coerced.
- For high-stakes actions (sending an email, charging money, deleting
  data) the AI proposes and a human confirms — the model never
  autonomously executes an irreversible action without a confirmation
  step, unless the product spec explicitly designs and reviews that
  autonomy.
- Evaluation harness: features with a prompt have a small golden-set of
  test cases (input → expected properties of output) run in CI or on
  prompt change, so regressions are caught before ship, not by users.

## Structured output

- When a feature needs machine-usable output (form-fill, extraction,
  function calling), use the provider's native structured-output/tool-use
  capability with a defined schema — never "ask nicely for JSON" and
  regex-parse free text.
- The schema is the same validation schema used elsewhere in the product
  (zod), keeping one source of truth between what the model returns and
  what the app accepts.

## Safety & abuse

- User-supplied content that flows into a prompt is treated as untrusted
  input: instructions embedded in user content do not override the
  system/developer prompt (prompt-injection resistance is a design
  requirement, not an afterthought).
- Content moderation is applied to both user input feeding generative
  features and to generated output before it's stored or shown to other
  users, for any product with multi-user visibility of AI content.
- All AI-generated content that a user did not directly request in the
  moment (e.g. background summarization) is clearly attributed as
  AI-generated in the UI.

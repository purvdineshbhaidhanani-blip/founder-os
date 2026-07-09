# AI

Model provider abstraction and prompts, only needed if this product has
AI-powered features. Full rules in
[`standards/ai.md`](../../../standards/ai.md).

## Structure

```
ai/
  client.ts       # single provider-abstraction entry point — feature code never imports a provider SDK directly
  routing.ts       # task-to-model mapping, overridable per environment
  prompts/          # versioned, named prompt templates, one file per feature
```

## Before Phase 1 is "complete" for this product

- `client.ts` reads provider credentials from env through the standard
  config layer; with no key set, AI features return a clear
  "not configured" result rather than throwing an unhandled error.
- Every prompt is versioned and parameterized, never inline string
  concatenation of user input into the instruction portion of the prompt.
- Every model call has a timeout and bounded retries.
- Structured-output features validate the response against the same zod
  schema used elsewhere in the app before trusting it.
- A small golden-set eval exists for any feature with a prompt that
  materially affects product behavior.

## Not needed

If this product has no AI features, delete this folder and note that in
the product's `ARCHITECTURE.md` under "Deviations from global standards."

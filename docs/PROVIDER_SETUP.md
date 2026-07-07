# Universal Platform — Provider Setup & Validation

This document covers the seven external providers the Universal Platform's
engines can talk to: two AI providers (`@platform/engines/ai`), three
object-storage backends (`@platform/engines/storage`, all served by the one
`HttpObjectStorage` adapter), and two email providers
(`@platform/engines/notification`). None of these are wired into Founder OS
itself today — this is setup/validation guidance for a product that chooses
to configure one.

Every adapter in this platform is a thin, auditable wrapper over plain
`fetch` (or, for SMTP, plain TCP/TLS sockets) — there is no vendor SDK
dependency anywhere. Swapping providers is a constructor-options change, not
a code change.

## 1. AI — OpenAI and Anthropic

Both are implemented in `packages/engines/src/ai/providers/`. Both now take:

| Option | Default | Behavior |
|---|---|---|
| `apiKey` | — (required) | Constructor throws immediately if empty. |
| `baseUrl` | provider's public API root | Override for a proxy or self-hosted-compatible endpoint. |
| `timeoutMs` | 120000 (2 min) | Aborts a hung request. `0` disables the timeout entirely. |
| `retryPolicy` | `NO_RETRY_POLICY` (no retry) | Opt-in only — pass `{ maxAttempts: 3, baseDelayMs: 250 }` (or your own `RetryPolicy` from `@platform/shared`) to retry `complete()` on a retryable error (429/5xx/timeout). `stream()` is never retried: retrying after the caller has already consumed some chunks would replay/duplicate output. |

```ts
import { OpenAIProvider } from "@platform/engines/ai";

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  retryPolicy: { maxAttempts: 3, baseDelayMs: 250 },
});
```

| Env var | Required | Behavior if missing |
|---|---|---|
| `OPENAI_API_KEY` | Required to use OpenAI | `OpenAIProvider` construction throws. `validate:providers` reports "skipped". |
| `OPENAI_BASE_URL` | Optional | Defaults to `https://api.openai.com/v1`. |
| `ANTHROPIC_API_KEY` | Required to use Anthropic | `AnthropicProvider` construction throws. `validate:providers` reports "skipped". |
| `ANTHROPIC_BASE_URL` | Optional | Defaults to `https://api.anthropic.com/v1`. |

**Health check** (`createOpenAIHealthCheck`/`createAnthropicHealthCheck` in
`@platform/engines/ai`): calls the provider's `GET /models` listing
endpoint — reachable and free (no completion is generated, so no token
cost). A 401/403 reports `"down"`; a 404 reports `"degraded"` (reachable,
but this build's API version may not expose `/models` the way this check
expects — verify manually); a network failure or timeout reports `"down"`.

## 2. Object storage — S3, Cloudflare R2, generic S3-compatible

All three are the same adapter, `HttpObjectStorage`
(`packages/engines/src/storage/adapters/http-object-storage.ts`) pointed at
a different `baseUrl`, with a `signRequest` callback you provide. This
platform does not hand-roll AWS SigV4 signing itself — that's real,
security-sensitive cryptographic code that needs testing against a live
account to trust, which this environment cannot do. Two supported paths:

- **Bring your own signer.** Implement `signRequest` using whatever your
  runtime already has available (a vendor SDK's signing utility, a
  presigned-URL service, etc.) and pass it in. `HttpObjectStorage` never
  needs to know the scheme.
- **Presigned URLs.** Point `baseUrl` at a presigned URL prefix your backend
  issues, and leave `signRequest` unset.

```ts
import { HttpObjectStorage } from "@platform/engines/storage";

const storage = new HttpObjectStorage({
  baseUrl: process.env.OBJECT_STORAGE_BASE_URL!, // e.g. https://<bucket>.s3.<region>.amazonaws.com
  providerId: "s3", // or "r2", "gcs", ... — included in error messages
  signRequest: async ({ method, url, headers }) => {
    // sign in place: add an Authorization/x-amz-* header, etc.
  },
  retryPolicy: { maxAttempts: 3, baseDelayMs: 250 }, // safe: every op here is a keyed, idempotent overwrite/read/delete
});
```

| Env var | Required | Behavior if missing |
|---|---|---|
| `OBJECT_STORAGE_BASE_URL` | Required to use object storage | No default — construct `HttpObjectStorage` with an explicit `baseUrl`, or use `LocalFsStorage` for local/dev. `validate:providers` reports "skipped". |
| `OBJECT_STORAGE_PROVIDER_ID` | Optional | Label only (`"s3"`, `"r2"`, ...), used in error messages and the validation script's output. Defaults to `"generic"`. |

Cloudflare R2 is S3-API-compatible: point `baseUrl` at your R2 S3 endpoint
(`https://<account-id>.r2.cloudflarestorage.com/<bucket>`) and sign with R2
API tokens the same way you would SigV4 for S3.

**Health checks** (`@platform/engines/storage`):
- `createObjectStorageReachabilityCheck({ baseUrl })` — unauthenticated
  reachability only (what `validate:providers` runs from env vars alone;
  cannot verify credentials or write access since `signRequest` is code, not
  an env var).
- `createObjectStorageHealthCheck(provider)` — a **real** `put` → `get` →
  `delete` round-trip against any `ObjectStorageProvider` (works identically
  for `HttpObjectStorage` or `LocalFsStorage`, since it's written against
  the interface). Prefer this once you have a fully-configured, signed
  storage instance — wire it into your own startup code:

```ts
import { createObjectStorageHealthCheck } from "@platform/engines/storage";
import { HealthCheckRegistry } from "@platform/engines/logging-monitoring";

const registry = new HealthCheckRegistry();
registry.register("object-storage", createObjectStorageHealthCheck(storage, { label: "s3" }));
```

## 3. Email — Resend and SMTP

### Resend

`createResendEmailChannel` (`packages/engines/src/notification/channels/email-channel.ts`)
is a thin preset over the generic `HttpEmailChannel`, pointed at
`https://api.resend.com/emails` with bearer-token auth and Resend's
`from`/`to`/`subject`/`html`|`text` JSON body shape. The shape follows
Resend's public REST API docs as of this writing — re-verify against
current docs before production use, the same as you would any vendor
integration.

```ts
import { createResendEmailChannel } from "@platform/engines/notification";

const email = createResendEmailChannel({
  apiKey: process.env.RESEND_API_KEY!,
  from: "Acme <notifications@acme.com>",
});
```

| Env var | Required | Behavior if missing |
|---|---|---|
| `RESEND_API_KEY` | Required to use Resend | `validate:providers` reports "skipped". |

**Health check**: `createHttpEmailHealthCheck` — reachability only (an
`OPTIONS` request to the endpoint). Does **not** send a test email on every
check; a real send is only proven by actually sending through the channel.

### SMTP

There is no SMTP *sending* adapter in this platform. Raw SMTP (RFC 5321 —
`AUTH` mechanism negotiation, `MAIL FROM`/`RCPT TO`/`DATA`, dot-stuffing) is
real wire-protocol implementation work, and this environment has no live
SMTP server to test a hand-rolled client against — shipping one unverified
would risk silently malformed mail. This is a deliberate, documented gap
(see `PLATFORM_PRODUCTION_CHECKLIST.md`), not an oversight: pick a
well-tested SMTP client, or if your provider also exposes an HTTP API,
prefer `HttpEmailChannel` (as Resend does above).

What **is** implemented is a connectivity check —
`createSmtpHealthCheck` (`@platform/engines/notification`): opens a socket,
reads the SMTP greeting, sends `EHLO`, negotiates `STARTTLS` if applicable,
then disconnects. This confirms host/port reachability and that something
SMTP-shaped answers; it proves nothing about a specific account's
credentials, since it never authenticates or sends.

| Env var | Required | Behavior if missing |
|---|---|---|
| `SMTP_HOST` | Required to run the SMTP connectivity check | `validate:providers` reports "skipped". |
| `SMTP_PORT` | Optional | Defaults to `587` (STARTTLS submission). Use `465` for implicit TLS. |
| `SMTP_SECURE` | Optional | Set to `"true"` for implicit TLS (paired with port `465`). Otherwise the check negotiates `STARTTLS` after the greeting. |

## 4. Running the validation script

```
npm run validate:providers
```

Reads the env vars above; for each *configured* provider, runs its health
check and prints `ok` / `degraded` / `down`. A provider with no env vars set
is reported `skipped`, not `down` — the script only fails (exit code `1`)
if a provider you actually configured is unreachable or unauthenticated.
None of these checks generate a chat completion, send an email, or write
durable data outside a storage backend's own reserved
`.platform-health-check/` probe key (cleaned up automatically). Run it in
CI before a deploy, or as a startup gate, to catch a bad API key or an
unreachable endpoint before real traffic hits it.

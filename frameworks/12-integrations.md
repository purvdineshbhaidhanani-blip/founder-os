# 12 · Integration Framework

**Type:** Shared blueprint. The standard mechanisms every product uses to
connect to the outside world. API design, auth, signing, and idempotency
rules are authoritative in [`standards/api.md`](../standards/api.md) and
[`standards/security.md`](../standards/security.md); this framework defines
the standard **integration surface**. All external integrations are built
and wired but **disabled until Phase 2 credentials**.

## Standard mechanisms

| Mechanism | Purpose | Phase 1 status |
|---|---|---|
| **OAuth** | Let users connect third-party accounts (Google, Slack, GitHub, etc.) and let others connect to this product | Built, wired, disabled until provider credentials exist — fails closed to "not configured" |
| **API Keys** | Programmatic access for the product's own public API; scoped, revocable, hashed at rest | Issuance/management fully functional in Phase 1 (no external dependency) |
| **REST APIs** | The product's own outward API surface, per `standards/api.md` (versioned, validated, documented, idempotent) | Fully functional in Phase 1 |
| **Webhooks (outbound)** | Push product events to customer systems; signed (HMAC), retried with backoff, replayable | Built in Phase 1; deliver to real endpoints once customers configure them |
| **Webhooks (inbound)** | Receive events from third parties; signature-verified before processing | Built in Phase 1; activated per integration in Phase 2 |
| **Import** | Bring data in (CSV/JSON/third-party API) with validation, dedup, and a dry-run/preview before commit | Fully functional in Phase 1 for file-based import |
| **Export** | Take data out (CSV/JSON/API) within the user's permission scope | Fully functional in Phase 1 |

## Rules

- **Credentials via environment only.** No integration hard-codes a key;
  none is invented (`MASTER_PROJECT_CONTEXT.md`, `standards/security.md`).
  Missing credentials → the integration is cleanly disabled, never broken.
- **Every inbound payload is verified.** Webhook signatures checked before
  any processing; unverified payloads rejected.
- **Scoped and revocable.** API keys and OAuth grants are least-privilege,
  revocable, and their use is audited.
- **Resilient.** Outbound calls have timeouts, bounded retries with
  backoff, and circuit-breaking — a flaky third party degrades one
  integration, not the product.
- **Idempotent.** Inbound and outbound event processing tolerates
  duplicates (`standards/api.md`); import is safe to re-run.
- **Permission-respecting.** Import/export and connected integrations obey
  the user's data scope ([`09`](./09-roles-permissions.md)) — no
  exfiltration path around RBAC.

## Validation checklist

- [ ] OAuth, API keys, REST, inbound+outbound webhooks, import, export all
      built and wired.
- [ ] Everything requiring external credentials fails closed to a clean
      disabled state in Phase 1.
- [ ] Inbound webhooks verify signatures before processing.
- [ ] API keys/OAuth grants are scoped, revocable, and audited.
- [ ] Import offers a preview/dry-run; import and export respect RBAC.

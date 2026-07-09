# 10 · Notification Framework

**Type:** Shared blueprint. Every product delivers notifications through a
single channel-agnostic engine. External channels are built and wired but
**disabled until Phase 2 credentials**, per `MASTER_PROJECT_CONTEXT.md`.

## Architecture: one engine, many channels

Feature code never calls an email/Slack SDK directly. It emits a
**notification event** (`invoice.paid`, `member.invited`,
`report.ready`) to a central notification service, which resolves:

1. **Who** should be notified (from the event + user notification prefs).
2. **Which channels** each recipient has enabled.
3. **How** to render the event for each channel (shared template, per
   channel).

Adding a channel or changing routing is a change in one place, not across
every feature — the same abstraction discipline as `standards/ai.md`.

## Standard channels

| Channel | Phase 1 status | Notes |
|---|---|---|
| **In-App** | **Fully working** | The always-available baseline: a notification center + unread badge. Requires no external credentials. |
| **Email** | Built, disabled | Transactional + digest email; sending enabled in Phase 2 with a real email provider. |
| **Push** | Built, disabled | Web/mobile push; enabled with provider credentials in Phase 2. |
| **Slack** | Built, disabled | Per-workspace via OAuth ([`12`](./12-integrations.md)); enabled when connected. |
| **Teams** | Built, disabled | Microsoft Teams webhook/app; enabled when connected. |
| **Webhooks** | Built, disabled | Outbound signed webhooks so customers pipe events into their own systems ([`12`](./12-integrations.md)). |

Every disabled channel renders a clear "not configured" state in settings
and simply isn't offered to users — it never errors.

## Rules

- **In-app always works.** No product depends on an external provider to
  notify a user in Phase 1.
- **User preferences are respected.** Every recipient controls which
  events reach them on which channels; transactional/security notices
  (password reset, security alerts) are the only non-optional category.
- **Idempotent & deduplicated.** The same event doesn't fire the same
  notification twice; retries (per channel) don't double-send.
- **Rate-limited & digestible.** High-frequency events batch into digests
  rather than flooding the user.
- **Templated & localized.** Channel templates are versioned and
  respect the user's locale/timezone.
- **Never leaks data.** Notifications respect permissions — a user is
  never notified about data they can't see.

## Validation checklist

- [ ] Features emit events; nothing calls a channel SDK directly.
- [ ] In-app notifications fully functional in Phase 1.
- [ ] Every external channel built, wired, and cleanly disabled without
      credentials.
- [ ] User notification preferences enforced; security notices exempt.
- [ ] Delivery is idempotent, rate-limited, and permission-respecting.

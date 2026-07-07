import { NO_RETRY_POLICY, withRetry, type RetryPolicy } from "@platform/shared";
import type { NotificationMessage } from "../types.js";
import type { NotificationChannel } from "./channel.js";

export interface WebhookChannelOptions {
  /** Resolves the destination URL for a given recipient (e.g. a per-tenant webhook URL). */
  resolveUrl: (recipient: string) => string;
  headers?: Record<string, string>;
  /** Defaults to a single attempt (no retry) — pass a policy explicitly if the receiving endpoint tolerates duplicate deliveries. */
  retry?: RetryPolicy;
  fetchImpl?: typeof fetch;
}

/** Delivers a notification as an HTTP POST — the generic "webhook" channel. */
export class WebhookChannel implements NotificationChannel {
  readonly type = "webhook" as const;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: WebhookChannelOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(message: NotificationMessage): Promise<void> {
    const url = this.options.resolveUrl(message.recipient);
    await withRetry(async () => {
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...this.options.headers },
        body: JSON.stringify({
          subject: message.subject,
          body: message.body,
          data: message.data,
        }),
      });
      if (!response.ok) {
        throw new Error(`Webhook delivery failed (${response.status}): ${await response.text()}`);
      }
    }, this.options.retry ?? NO_RETRY_POLICY);
  }
}

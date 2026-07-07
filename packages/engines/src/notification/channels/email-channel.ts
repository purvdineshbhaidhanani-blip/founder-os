import { NO_RETRY_POLICY, withRetry, withTimeoutSignal, type RetryPolicy } from "@platform/shared";
import { createNotificationChannelError, isNotificationChannelError } from "../errors.js";
import type { NotificationMessage } from "../types.js";
import type { NotificationChannel } from "./channel.js";

/** A typical transactional-email API responds well under this; large attachments may need a higher override. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Logs email to the console instead of sending it — the safe default for local/dev/test. */
export class ConsoleEmailChannel implements NotificationChannel {
  readonly type = "email" as const;

  async send(message: NotificationMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[email] to=${message.recipient} subject=${message.subject ?? ""}\n${message.body}`);
  }
}

export interface HttpEmailChannelOptions {
  /** REST endpoint of any transactional email provider (Resend, SendGrid, Postmark, SES HTTP, etc). */
  endpoint: string;
  headers: Record<string, string>;
  /** Maps a NotificationMessage to the provider's expected JSON body — keeps this adapter vendor-neutral. */
  buildBody: (message: NotificationMessage) => Record<string, unknown>;
  fetchImpl?: typeof fetch;
  /** Tag included in error messages/diagnostics, e.g. "resend", "sendgrid". Defaults to "http-email". */
  providerId?: string;
  /** Aborts a send that runs longer than this. 0 disables the timeout. Defaults to 30s. */
  timeoutMs?: number;
  /**
   * A single email send is not always safe to retry blindly (a provider
   * could accept the message but time out on the response), so this
   * defaults to `NO_RETRY_POLICY` (no retry) — enable explicitly once your
   * provider's idempotency behavior is known (e.g. via an idempotency-key
   * header added through a custom `headers`/`buildBody`).
   */
  retryPolicy?: RetryPolicy;
}

/** Sends email through any HTTP-based transactional email API, configured entirely by the caller. */
export class HttpEmailChannel implements NotificationChannel {
  readonly type = "email" as const;
  private readonly fetchImpl: typeof fetch;
  private readonly providerId: string;
  private readonly timeoutMs: number;
  private readonly retryPolicy: RetryPolicy;

  constructor(private readonly options: HttpEmailChannelOptions) {
    if (!options.endpoint) throw new Error("HttpEmailChannel requires an endpoint.");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.providerId = options.providerId ?? "http-email";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryPolicy = options.retryPolicy ?? NO_RETRY_POLICY;
  }

  private effectiveRetryPolicy(): RetryPolicy {
    return {
      ...this.retryPolicy,
      shouldRetry: (error, attempt) => {
        if (this.retryPolicy.shouldRetry) return this.retryPolicy.shouldRetry(error, attempt);
        return isNotificationChannelError(error) && error.retryable;
      },
    };
  }

  async send(message: NotificationMessage): Promise<void> {
    return withRetry(() => this.doSend(message), this.effectiveRetryPolicy());
  }

  private async doSend(message: NotificationMessage): Promise<void> {
    const { signal, cancel } = withTimeoutSignal(this.timeoutMs);
    try {
      const response = await this.fetchImpl(this.options.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", ...this.options.headers },
        body: JSON.stringify(this.options.buildBody(message)),
        signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw createNotificationChannelError(this.providerId, `Email send failed (${response.status}): ${text}`, {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }
    } catch (error) {
      if (isNotificationChannelError(error)) throw error;
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw createNotificationChannelError(this.providerId, `Email send timed out after ${this.timeoutMs}ms.`, {
          retryable: true,
          cause: error,
        });
      }
      throw error;
    } finally {
      cancel();
    }
  }
}

export interface ResendEmailChannelOptions {
  apiKey: string;
  /** Sender address, e.g. `"Acme <notifications@acme.com>"`. Resend requires a verified sending domain. */
  from: string;
  /** Defaults to `"html"` — `message.body` is sent as the `html` field; use `"text"` if your templates render plain text. */
  format?: "html" | "text";
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
}

/**
 * Thin preset over `HttpEmailChannel` for Resend's REST API
 * (`POST https://api.resend.com/emails`, bearer-token auth, JSON body of
 * `from`/`to`/`subject`/`html`|`text`). Shape follows Resend's public API
 * docs as of this writing — re-verify against current docs before
 * production use, the same way you would any vendor integration.
 */
export function createResendEmailChannel(options: ResendEmailChannelOptions): HttpEmailChannel {
  const format = options.format ?? "html";
  return new HttpEmailChannel({
    endpoint: "https://api.resend.com/emails",
    headers: { authorization: `Bearer ${options.apiKey}` },
    buildBody: (message) => ({
      from: options.from,
      to: [message.recipient],
      subject: message.subject ?? "",
      [format]: message.body,
    }),
    fetchImpl: options.fetchImpl,
    providerId: "resend",
    timeoutMs: options.timeoutMs,
    retryPolicy: options.retryPolicy,
  });
}

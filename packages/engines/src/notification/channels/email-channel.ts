import type { NotificationMessage } from "../types.js";
import type { NotificationChannel } from "./channel.js";

/** Logs email to the console instead of sending it — the safe default for local/dev/test. */
export class ConsoleEmailChannel implements NotificationChannel {
  readonly type = "email" as const;

  async send(message: NotificationMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[email] to=${message.recipient} subject=${message.subject ?? ""}\n${message.body}`);
  }
}

export interface HttpEmailChannelOptions {
  /** REST endpoint of any transactional email provider (SendGrid, Postmark, SES HTTP, etc). */
  endpoint: string;
  headers: Record<string, string>;
  /** Maps a NotificationMessage to the provider's expected JSON body — keeps this adapter vendor-neutral. */
  buildBody: (message: NotificationMessage) => Record<string, unknown>;
  fetchImpl?: typeof fetch;
}

/** Sends email through any HTTP-based transactional email API, configured entirely by the caller. */
export class HttpEmailChannel implements NotificationChannel {
  readonly type = "email" as const;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: HttpEmailChannelOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async send(message: NotificationMessage): Promise<void> {
    const response = await this.fetchImpl(this.options.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.options.headers },
      body: JSON.stringify(this.options.buildBody(message)),
    });
    if (!response.ok) {
      throw new Error(`Email send failed (${response.status}): ${await response.text()}`);
    }
  }
}

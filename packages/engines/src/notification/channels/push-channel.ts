import type { NotificationMessage } from "../types.js";
import type { NotificationChannel } from "./channel.js";

export interface PushSender {
  /** Sends a push to a device/subscription token. Left abstract so any provider (FCM, APNs, Web Push) can implement it. */
  sendPush(token: string, title: string | undefined, body: string, data?: Record<string, unknown>): Promise<void>;
}

/** No-op push sender — safe default that never fails, useful for local/dev/test. */
export class NoopPushSender implements PushSender {
  async sendPush(): Promise<void> {
    // intentionally does nothing
  }
}

export interface HttpPushChannelOptions {
  sender: PushSender;
}

/** Delegates to an injected `PushSender` so the channel itself stays provider-agnostic. */
export class PushChannel implements NotificationChannel {
  readonly type = "push" as const;

  constructor(private readonly options: HttpPushChannelOptions) {}

  async send(message: NotificationMessage): Promise<void> {
    await this.options.sender.sendPush(message.recipient, message.subject, message.body, message.data);
  }
}

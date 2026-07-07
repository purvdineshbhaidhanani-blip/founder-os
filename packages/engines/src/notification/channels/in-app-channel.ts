import type { NotificationMessage, SentNotification } from "../types.js";
import type { NotificationChannel } from "./channel.js";

export interface InAppStore {
  save(notification: SentNotification): Promise<void>;
  listForRecipient(recipient: string, limit?: number): Promise<SentNotification[]>;
  markRead(id: string): Promise<void>;
}

export class InMemoryInAppStore implements InAppStore {
  private readonly notifications: SentNotification[] = [];
  private readonly read = new Set<string>();

  async save(notification: SentNotification): Promise<void> {
    this.notifications.push(notification);
  }

  async listForRecipient(recipient: string, limit?: number): Promise<SentNotification[]> {
    const matches = this.notifications
      .filter((n) => n.recipient === recipient)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    return limit ? matches.slice(0, limit) : matches;
  }

  async markRead(id: string): Promise<void> {
    this.read.add(id);
  }

  isRead(id: string): boolean {
    return this.read.has(id);
  }
}

let counter = 0;
function generateNotificationId(): string {
  counter += 1;
  return `notif_${Date.now()}_${counter}`;
}

/** Delivers notifications into an in-app inbox store instead of an external channel. */
export class InAppChannel implements NotificationChannel {
  readonly type = "in-app" as const;

  constructor(private readonly store: InAppStore = new InMemoryInAppStore()) {}

  async send(message: NotificationMessage): Promise<void> {
    await this.store.save({
      ...message,
      id: generateNotificationId(),
      sentAt: new Date().toISOString(),
      status: "sent",
    });
  }
}

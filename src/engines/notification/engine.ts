import type { NotificationChannel } from "./channels/channel.js";
import { NotificationTemplateRegistry } from "./templates.js";
import type { NotificationChannelType, NotificationMessage, SentNotification } from "./types.js";

export interface NotificationEngineOptions {
  channels?: NotificationChannel[];
  templates?: NotificationTemplateRegistry;
  onSent?: (notification: SentNotification) => void;
}

let counter = 0;
function generateNotificationId(): string {
  counter += 1;
  return `notif_${Date.now()}_${counter}`;
}

/**
 * Dispatches notifications to the registered channel for their type. Callers
 * either send a fully-formed message or render one of the registered
 * templates first — the engine itself has no delivery logic of its own,
 * that all lives in the channel implementations.
 */
export class NotificationEngine {
  private readonly channels = new Map<NotificationChannelType, NotificationChannel>();
  readonly templates: NotificationTemplateRegistry;

  constructor(private readonly options: NotificationEngineOptions = {}) {
    this.templates = options.templates ?? new NotificationTemplateRegistry();
    for (const channel of options.channels ?? []) {
      this.channels.set(channel.type, channel);
    }
  }

  registerChannel(channel: NotificationChannel): void {
    this.channels.set(channel.type, channel);
  }

  async send(message: NotificationMessage): Promise<SentNotification> {
    const channel = this.channels.get(message.channel);
    if (!channel) throw new Error(`No notification channel registered for "${message.channel}".`);

    const base = { ...message, id: generateNotificationId(), sentAt: new Date().toISOString() };
    try {
      await channel.send(message);
      const sent: SentNotification = { ...base, status: "sent" };
      this.options.onSent?.(sent);
      return sent;
    } catch (error) {
      const sent: SentNotification = {
        ...base,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
      this.options.onSent?.(sent);
      throw error;
    }
  }

  async sendFromTemplate(
    templateId: string,
    channel: NotificationChannelType,
    recipient: string,
    variables: Record<string, unknown>,
    version?: string,
  ): Promise<SentNotification> {
    const rendered = this.templates.renderById(templateId, variables, version);
    return this.send({ channel, recipient, subject: rendered.subject, body: rendered.body, data: variables });
  }
}

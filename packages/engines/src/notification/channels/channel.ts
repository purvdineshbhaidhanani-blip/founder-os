import type { NotificationChannelType, NotificationMessage } from "../types.js";

/**
 * The contract every delivery channel must satisfy. The `NotificationEngine`
 * dispatches to whichever channel matches `message.channel` — it never knows
 * or cares whether that's SMTP, a push provider, or an in-app inbox.
 */
export interface NotificationChannel {
  readonly type: NotificationChannelType;
  send(message: NotificationMessage): Promise<void>;
}

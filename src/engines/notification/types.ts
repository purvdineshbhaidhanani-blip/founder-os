export type NotificationChannelType = "email" | "in-app" | "push" | "webhook";

export interface NotificationMessage {
  channel: NotificationChannelType;
  recipient: string;
  subject?: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface SentNotification extends NotificationMessage {
  id: string;
  sentAt: string;
  status: "sent" | "failed";
  error?: string;
}

export interface NotificationTemplate {
  id: string;
  version: string;
  channel: NotificationChannelType;
  subjectTemplate?: string;
  bodyTemplate: string;
}

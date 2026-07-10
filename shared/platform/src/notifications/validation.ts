import { z } from "zod";

export const notificationChannelSchema = z.enum(["in_app", "email", "slack", "teams", "webhook"]);

export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Channels to attempt delivery on, beyond the always-on in-app channel. */
  channels: z.array(notificationChannelSchema).default([]),
});
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const setNotificationPreferenceSchema = z.object({
  channel: notificationChannelSchema,
  category: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
});
export type SetNotificationPreferenceInput = z.infer<typeof setNotificationPreferenceSchema>;

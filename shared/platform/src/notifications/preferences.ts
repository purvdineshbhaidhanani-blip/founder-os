import { getPlatformDb } from "../db/index.js";
import type { SetNotificationPreferenceInput } from "./validation.js";
import type { NotificationChannel } from "@prisma/client";

/** Default: every channel/category is enabled unless the user has explicitly opted out — per frameworks/10-notifications.md "user prefs respected." */
export async function isChannelEnabledForUser(userId: string, channel: NotificationChannel, category: string): Promise<boolean> {
  const preference = await getPlatformDb().notificationPreference.findUnique({
    where: { uq_notification_prefs_user_channel_category: { userId, channel, category } },
  });
  return preference?.enabled ?? true;
}

export async function setNotificationPreference(userId: string, input: SetNotificationPreferenceInput) {
  return getPlatformDb().notificationPreference.upsert({
    where: { uq_notification_prefs_user_channel_category: { userId, channel: input.channel, category: input.category } },
    create: { userId, channel: input.channel, category: input.category, enabled: input.enabled },
    update: { enabled: input.enabled },
  });
}

export async function listNotificationPreferences(userId: string) {
  return getPlatformDb().notificationPreference.findMany({ where: { userId } });
}

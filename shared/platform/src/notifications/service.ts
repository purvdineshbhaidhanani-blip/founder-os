import type { Prisma } from "@prisma/client";
import { getPlatformDb, currentAppId } from "../db/index.js";
import { paginate } from "../api/pagination.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import { isChannelEnabledForUser } from "./preferences.js";
import { deliverInApp, deliverEmail, deliverSlack, deliverTeams } from "./channels.js";
import type { CreateNotificationInput } from "./validation.js";
import type { NotificationChannel } from "@prisma/client";

/**
 * One notification engine, many channels, per frameworks/10-notifications.md:
 * "in-app always works, user prefs respected, idempotent, rate-limited,
 * templated, permission-respecting." Rate limiting for delivery volume is
 * handled by SH-RATE (auth/rate-limit.ts's generic primitive) at the
 * caller's discretion for high-frequency notification sources.
 */
export async function createNotification(input: CreateNotificationInput): Promise<{ notificationId: string }> {
  const db = getPlatformDb();

  const notification = await db.notification.create({
    data: {
      appId: currentAppId(),
      organizationId: input.organizationId,
      userId: input.userId,
      category: input.category,
      title: input.title,
      body: input.body,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  // In-app is always attempted regardless of the caller's requested channel
  // list — per frameworks/10-notifications.md, "in-app always works."
  const channelsToAttempt = new Set<NotificationChannel>(["in_app", ...input.channels]);

  for (const channel of channelsToAttempt) {
    await dispatchToChannel({ notification, channel, organizationId: input.organizationId });
  }

  return { notificationId: notification.id };
}

async function dispatchToChannel(params: {
  notification: { id: string; userId: string; title: string; body: string; category: string; organizationId: string | null } & Record<string, unknown>;
  channel: NotificationChannel;
  organizationId?: string;
}): Promise<void> {
  const db = getPlatformDb();

  if (params.channel !== "in_app") {
    const enabled = await isChannelEnabledForUser(params.notification.userId, params.channel, params.notification.category);
    if (!enabled) {
      await db.notificationDelivery.create({
        data: { notificationId: params.notification.id, channel: params.channel, status: "skipped_not_configured", attemptedAt: new Date() },
      });
      return;
    }
  }

  let status: "sent" | "skipped_not_configured" | "failed";

  switch (params.channel) {
    case "in_app":
      status = await deliverInApp();
      break;
    case "email": {
      const user = await db.user.findUnique({ where: { id: params.notification.userId } });
      status = user
        ? await deliverEmail({ toEmail: user.email, notification: params.notification as never, appName: currentAppId() })
        : "failed";
      break;
    }
    case "slack":
      status = params.organizationId
        ? await deliverSlack({ organizationId: params.organizationId, notification: params.notification as never })
        : "skipped_not_configured";
      break;
    case "teams":
      status = params.organizationId
        ? await deliverTeams({ organizationId: params.organizationId, notification: params.notification as never })
        : "skipped_not_configured";
      break;
    case "webhook":
      // Generic webhook delivery routes through SH-INTEG's outbound dispatcher (integrations/webhooks.ts), not this module directly.
      status = "skipped_not_configured";
      break;
  }

  await db.notificationDelivery.create({
    data: { notificationId: params.notification.id, channel: params.channel, status, attemptedAt: new Date(), deliveredAt: status === "sent" ? new Date() : undefined },
  });
}

export async function listNotificationsForUser(params: { userId: string; unreadOnly?: boolean; cursor?: string; limit?: number }) {
  return paginate({
    cursor: params.cursor,
    limit: params.limit,
    findMany: (args) =>
      getPlatformDb().notification.findMany({
        where: { userId: params.userId, ...(params.unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function markNotificationRead(params: { notificationId: string; userId: string }): Promise<void> {
  const db = getPlatformDb();
  const notification = await db.notification.findUnique({ where: { id: params.notificationId } });
  if (!notification) throw notFoundError("Notification");
  if (notification.userId !== params.userId) throw unauthorizedError();

  await db.notification.update({ where: { id: params.notificationId }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await getPlatformDb().notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return getPlatformDb().notification.count({ where: { userId, readAt: null } });
}

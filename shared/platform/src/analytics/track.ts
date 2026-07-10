import type { Prisma } from "@prisma/client";
import { getPlatformDb, currentAppId } from "../db/index.js";

export interface TrackEventInput {
  organizationId?: string;
  userId?: string;
  eventName: string;
  properties?: Record<string, unknown>;
  occurredAt?: Date;
}

/**
 * The one event-tracking call every product uses for product/usage
 * analytics — never a direct write to a product-specific analytics table,
 * so cross-product funnel/cohort analysis stays possible.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  await getPlatformDb().analyticsEvent.create({
    data: {
      appId: currentAppId(),
      organizationId: input.organizationId,
      userId: input.userId,
      eventName: input.eventName,
      properties: (input.properties ?? {}) as Prisma.InputJsonValue,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

/** Fire-and-forget variant for call sites where tracking must never block or fail the primary operation (e.g. a hot request path). Errors are swallowed after being surfaced to the caller's logger. */
export function trackEventAsync(input: TrackEventInput, onError?: (err: unknown) => void): void {
  trackEvent(input).catch((err) => onError?.(err));
}

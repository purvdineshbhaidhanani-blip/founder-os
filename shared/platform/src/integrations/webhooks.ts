import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getPlatformDb } from "../db/index.js";
import { encryptAtRest, decryptAtRest } from "../crypto/index.js";
import { validationError, notFoundError } from "../errors/index.js";
import { requireCan, type RbacActor } from "../organizations/rbac.js";

/**
 * Outbound + inbound webhooks per standards/api.md: "Webhook endpoints
 * verify signatures on every inbound payload before processing." Outbound
 * deliveries are queued with retry/backoff and a delivery log, per
 * frameworks/12-integrations.md's "resilient, idempotent" rule.
 */

export async function createWebhookEndpoint(params: { organizationId: string; actor: RbacActor; url: string; eventTypes: string[] }) {
  await requireCan(params.actor, "settings.manage");

  if (!params.url.startsWith("https://")) {
    throw validationError([{ field: "url", issue: "Webhook URLs must use https://." }]);
  }

  const secret = randomBytes(32).toString("hex");

  const endpoint = await getPlatformDb().webhookEndpoint.create({
    data: {
      organizationId: params.organizationId,
      url: params.url,
      encryptedSecret: encryptAtRest(secret),
      eventTypes: params.eventTypes as Prisma.InputJsonValue,
    },
  });

  // The signing secret is returned once, exactly like an API key — the
  // customer needs it to verify inbound deliveries on their end.
  return { id: endpoint.id, url: endpoint.url, signingSecret: secret };
}

export async function deactivateWebhookEndpoint(params: { webhookEndpointId: string; actor: RbacActor }): Promise<void> {
  await requireCan(params.actor, "settings.manage");
  const endpoint = await getPlatformDb().webhookEndpoint.findUnique({ where: { id: params.webhookEndpointId } });
  if (!endpoint || endpoint.organizationId !== params.actor.organizationId) throw notFoundError("Webhook endpoint");

  await getPlatformDb().webhookEndpoint.update({ where: { id: params.webhookEndpointId }, data: { isActive: false } });
}

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Queues an outbound delivery for every active endpoint subscribed to eventType — the actual HTTP call happens in `deliverPendingWebhooks`, invoked by a worker, so a slow/dead customer endpoint never blocks the request that triggered the event. */
export async function queueWebhookDelivery(params: { organizationId: string; eventType: string; payload: Record<string, unknown> }): Promise<void> {
  const db = getPlatformDb();
  const endpoints = await db.webhookEndpoint.findMany({ where: { organizationId: params.organizationId, isActive: true } });

  for (const endpoint of endpoints) {
    const subscribedEvents = Array.isArray(endpoint.eventTypes) ? (endpoint.eventTypes as string[]) : [];
    if (!subscribedEvents.includes(params.eventType) && !subscribedEvents.includes("*")) continue;

    await db.webhookDelivery.create({
      data: {
        webhookEndpointId: endpoint.id,
        eventType: params.eventType,
        payload: params.payload as Prisma.InputJsonValue,
      },
    });
  }
}

const MAX_DELIVERY_ATTEMPTS = 5;

/** Called by a worker on an interval: attempts every pending delivery, applying exponential backoff between retries. */
export async function deliverPendingWebhooks(): Promise<{ delivered: number; failed: number }> {
  const db = getPlatformDb();
  const pending = await db.webhookDelivery.findMany({
    where: { status: "pending", attempts: { lt: MAX_DELIVERY_ATTEMPTS } },
    include: { webhookEndpoint: true },
    take: 100,
  });

  let delivered = 0;
  let failed = 0;

  for (const delivery of pending) {
    if (!isBackoffElapsed(delivery.attempts, delivery.lastAttemptAt)) continue;

    const secret = decryptAtRest(delivery.webhookEndpoint.encryptedSecret);
    const body = JSON.stringify({ eventType: delivery.eventType, payload: delivery.payload });
    const signature = signPayload(secret, body);

    try {
      const response = await fetch(delivery.webhookEndpoint.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-webhook-signature": signature },
        body,
      });

      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? "delivered" : "pending",
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          responseStatus: response.status,
        },
      });

      if (response.ok) {
        delivered++;
      } else {
        failed++;
      }
    } catch {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "pending", attempts: { increment: 1 }, lastAttemptAt: new Date() },
      });
      failed++;
    }
  }

  return { delivered, failed };
}

function isBackoffElapsed(attempts: number, lastAttemptAt: Date | null): boolean {
  if (!lastAttemptAt) return true;
  const backoffMs = Math.min(2 ** attempts * 1000, 30 * 60 * 1000); // cap at 30 min
  return Date.now() - lastAttemptAt.getTime() >= backoffMs;
}

/** Inbound verification for webhooks this platform *receives* from third parties (distinct from the outbound signing above) — constant-time comparison per standards/security.md. */
export function verifyInboundWebhookSignature(params: { payload: string; signature: string; secret: string }): boolean {
  const expected = signPayload(params.secret, params.payload);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(params.signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

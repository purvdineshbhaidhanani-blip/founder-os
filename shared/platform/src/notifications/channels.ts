import { getPlatformDb } from "../db/index.js";
import { decryptAtRest } from "../crypto/index.js";
import { sendEmail, notificationDigestEmail } from "../email/index.js";
import { isEmailConfigured } from "../config/index.js";
import type { Notification } from "@prisma/client";

/**
 * Per-channel delivery. Each function returns a NotificationDeliveryStatus
 * string rather than throwing on "not configured" — a missing Slack
 * integration is an expected, common state (most orgs haven't connected
 * it), not an error worth crashing a notification dispatch over.
 */

export async function deliverInApp(): Promise<"sent"> {
  // In-app delivery is implicit — the Notification row itself, created by
  // the dispatcher before channels run, IS the in-app delivery. Nothing
  // further to do; this function exists so the channel list in
  // notifications/service.ts is uniform (every channel is "attempted").
  return "sent";
}

export async function deliverEmail(params: { toEmail: string; notification: Notification; appName: string }): Promise<"sent" | "skipped_not_configured" | "failed"> {
  if (!isEmailConfigured()) return "skipped_not_configured";

  try {
    const { subject, html, text } = notificationDigestEmail({
      appName: params.appName,
      items: [{ title: params.notification.title, body: params.notification.body }],
    });
    await sendEmail({ to: params.toEmail, subject, html, text });
    return "sent";
  } catch {
    return "failed";
  }
}

async function getIntegrationWebhookUrl(organizationId: string, provider: "slack" | "teams"): Promise<string | null> {
  const integration = await getPlatformDb().integration.findUnique({
    where: { uq_integrations_org_provider: { organizationId, provider } },
  });
  if (!integration || integration.status !== "connected" || !integration.encryptedCredentials) return null;
  const decrypted = JSON.parse(decryptAtRest(integration.encryptedCredentials)) as { webhookUrl?: string };
  return decrypted.webhookUrl ?? null;
}

async function postToWebhook(webhookUrl: string, payload: unknown): Promise<"sent" | "failed"> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

export async function deliverSlack(params: { organizationId: string; notification: Notification }): Promise<"sent" | "skipped_not_configured" | "failed"> {
  const webhookUrl = await getIntegrationWebhookUrl(params.organizationId, "slack");
  if (!webhookUrl) return "skipped_not_configured";

  return postToWebhook(webhookUrl, {
    text: `*${params.notification.title}*\n${params.notification.body}`,
  });
}

export async function deliverTeams(params: { organizationId: string; notification: Notification }): Promise<"sent" | "skipped_not_configured" | "failed"> {
  const webhookUrl = await getIntegrationWebhookUrl(params.organizationId, "teams");
  if (!webhookUrl) return "skipped_not_configured";

  return postToWebhook(webhookUrl, {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: params.notification.title,
    title: params.notification.title,
    text: params.notification.body,
  });
}

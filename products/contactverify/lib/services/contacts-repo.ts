import { paginate } from "@founder-os/platform/api";
import { incrementUsage, withinLimit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { getContactVerifyDb } from "../db.js";
import { validateEmail } from "./email-validator.js";
import { validatePhone } from "./phone-validator.js";
import { normalizeEmail, normalizePhone, findDuplicateGroups } from "./dedup-engine.js";
import { computeHealthScore } from "./health-score.js";
import type { z } from "zod";
import type { createContactSchema, listContactsQuerySchema } from "../validation/contacts.js";

type CreateContactInput = z.infer<typeof createContactSchema>;
type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;

/**
 * Creates a contact and immediately runs email/phone verification per
 * products/contactverify/docs/PRODUCT_IDENTITY.md §7 — verification is
 * real-time on ingest, not a separate deferred step, matching "continuous
 * verification" from §5.
 */
export async function createContact(params: { organizationId: string; input: CreateContactInput }) {
  const db = getContactVerifyDb();

  const limitCheck = await withinLimit(params.organizationId, "verifications_monthly");
  if (!limitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} verifications this billing period. Upgrade your plan to verify more.`);
  }

  const emailResult = params.input.email ? validateEmail(params.input.email) : null;
  const phoneResult = params.input.phone ? validatePhone(params.input.phone) : null;

  const contact = await db.contact.create({
    data: {
      organizationId: params.organizationId,
      firstName: params.input.firstName,
      lastName: params.input.lastName,
      email: params.input.email,
      normalizedEmail: normalizeEmail(params.input.email),
      phone: params.input.phone,
      normalizedPhone: normalizePhone(params.input.phone),
      company: params.input.company,
      jobTitle: params.input.jobTitle,
      emailStatus: emailResult?.status ?? "unchecked",
      phoneStatus: phoneResult?.status ?? "unchecked",
    },
  });

  await incrementUsage({ organizationId: params.organizationId, metricKey: "verifications_monthly", amount: 1 });

  const isDuplicate = await isLikelyDuplicate(params.organizationId, contact.id);
  const healthScore = computeHealthScore({
    emailStatus: contact.emailStatus,
    phoneStatus: contact.phoneStatus,
    hasCompany: Boolean(contact.company),
    hasJobTitle: Boolean(contact.jobTitle),
    isDuplicate,
  });

  return db.contact.update({ where: { id: contact.id }, data: { healthScore } });
}

async function isLikelyDuplicate(organizationId: string, contactId: string): Promise<boolean> {
  const groups = await findAllDuplicateGroups(organizationId);
  return groups.some((group) => group.contactIds.includes(contactId));
}

export async function findAllDuplicateGroups(organizationId: string) {
  const db = getContactVerifyDb();
  const contacts = await db.contact.findMany({
    where: { organizationId },
    select: { id: true, firstName: true, lastName: true, normalizedEmail: true, normalizedPhone: true, company: true },
  });
  return findDuplicateGroups(
    contacts.map((c) => ({
      id: c.id,
      normalizedEmail: c.normalizedEmail,
      normalizedPhone: c.normalizedPhone,
      fullName: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      company: c.company,
    })),
  );
}

export async function listContacts(params: { organizationId: string; query: ListContactsQuery }) {
  const db = getContactVerifyDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.contact.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.emailStatus ? { emailStatus: params.query.emailStatus } : {}),
        },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getContact(params: { organizationId: string; contactId: string }) {
  const db = getContactVerifyDb();
  return db.contact.findFirst({
    where: { id: params.contactId, organizationId: params.organizationId },
    include: { healthProfile: true },
  });
}

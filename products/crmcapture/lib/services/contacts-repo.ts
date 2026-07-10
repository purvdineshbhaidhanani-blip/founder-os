import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getCRMCaptureDb } from "../db.js";
import { findDuplicateGroups, normalizeEmail, normalizePhone } from "./dedup-engine.js";
import type { z } from "zod";
import type { createContactSchema, listContactsQuerySchema } from "../validation/contacts.js";

type CreateContactInput = z.infer<typeof createContactSchema>;
type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;

export async function createContact(params: { organizationId: string; input: CreateContactInput }) {
  const db = getCRMCaptureDb();

  const limitCheck = await withinLimit(params.organizationId, "contacts");
  if (!limitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} contacts. Upgrade your plan to add more.`);
  }
  const currentCount = await db.contact.count({ where: { organizationId: params.organizationId } });
  if (limitCheck.limit !== null && currentCount >= limitCheck.limit) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} contacts. Upgrade your plan to add more.`);
  }

  return db.contact.create({
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
      linkedinUrl: params.input.linkedinUrl,
      source: params.input.source,
    },
  });
}

export async function listContacts(params: { organizationId: string; query: ListContactsQuery }) {
  const db = getCRMCaptureDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.contact.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getContact(params: { organizationId: string; contactId: string }) {
  const db = getCRMCaptureDb();
  return db.contact.findFirst({ where: { id: params.contactId, organizationId: params.organizationId } });
}

/** Runs the dedup engine over every contact in the org — per PID §7 "Deduplication: Detect duplicate leads across lead sources and CRM." */
export async function findDuplicateContacts(organizationId: string) {
  const db = getCRMCaptureDb();
  const contacts = await db.contact.findMany({
    where: { organizationId },
    select: { id: true, firstName: true, lastName: true, email: true, normalizedEmail: true, normalizedPhone: true },
  });
  const groups = findDuplicateGroups(contacts);
  return groups.map((group) => ({
    ...group,
    contacts: group.contactIds.map((id) => contacts.find((c) => c.id === id)!),
  }));
}

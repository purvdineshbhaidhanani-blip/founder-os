import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getCRMCaptureDb } from "../db.js";
import { computeLeadScore } from "./lead-scoring.js";
import type { z } from "zod";
import type { createLeadSchema, listLeadsQuerySchema, updateLeadSchema } from "../validation/leads.js";

type CreateLeadInput = z.infer<typeof createLeadSchema>;
type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export async function createLead(params: { organizationId: string; input: CreateLeadInput }) {
  const db = getCRMCaptureDb();

  const limitCheck = await withinLimit(params.organizationId, "leads");
  if (!limitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} leads. Upgrade your plan to add more.`);
  }
  const currentCount = await db.lead.count({ where: { organizationId: params.organizationId } });
  if (limitCheck.limit !== null && currentCount >= limitCheck.limit) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} leads. Upgrade your plan to add more.`);
  }

  const contact = await db.contact.findFirst({ where: { id: params.input.contactId, organizationId: params.organizationId } });
  if (!contact) {
    throw new PlatformError("NOT_FOUND", "Contact not found.");
  }

  const score = computeLeadScore(
    {
      source: contact.source,
      hasCompany: Boolean(contact.company),
      hasJobTitle: Boolean(contact.jobTitle),
      hasPhone: Boolean(contact.phone),
    },
    contact.jobTitle,
  );

  return db.lead.create({
    data: {
      organizationId: params.organizationId,
      contactId: contact.id,
      source: contact.source,
      score,
      notes: params.input.notes,
      assignedToUserId: params.input.assignedToUserId,
    },
  });
}

export async function listLeads(params: { organizationId: string; query: ListLeadsQuery }) {
  const db = getCRMCaptureDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.lead.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.status ? { status: params.query.status } : {}),
          ...(params.query.assignedToUserId ? { assignedToUserId: params.query.assignedToUserId } : {}),
        },
        include: { contact: true },
        orderBy: { score: "desc" },
        ...args,
      }),
  });
}

export async function getLead(params: { organizationId: string; leadId: string }) {
  const db = getCRMCaptureDb();
  return db.lead.findFirst({
    where: { id: params.leadId, organizationId: params.organizationId },
    include: { contact: true, followUpSuggestion: true },
  });
}

export async function updateLead(params: { organizationId: string; leadId: string; input: UpdateLeadInput }) {
  const db = getCRMCaptureDb();
  const result = await db.lead.updateMany({
    where: { id: params.leadId, organizationId: params.organizationId },
    data: params.input,
  });
  if (result.count === 0) {
    throw new PlatformError("NOT_FOUND", "Lead not found.");
  }
  return getLead({ organizationId: params.organizationId, leadId: params.leadId });
}

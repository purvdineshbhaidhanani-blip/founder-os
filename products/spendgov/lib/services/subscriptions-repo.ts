import { paginate, type PaginatedResult } from "@founder-os/platform/api";
import { getSpendGovDb } from "../db.js";
import type { CreateSubscriptionInput, ListSubscriptionsQuery, UpdateSubscriptionInput } from "./types.js";

export async function createSubscription(params: { organizationId: string; createdByUserId: string; input: CreateSubscriptionInput }) {
  const db = getSpendGovDb();
  return db.subscription.create({
    data: {
      organizationId: params.organizationId,
      createdByUserId: params.createdByUserId,
      kind: params.input.kind,
      vendorName: params.input.vendorName,
      productName: params.input.productName,
      category: params.input.category,
      department: params.input.department,
      monthlyCostCents: params.input.monthlyCostCents,
      billingCycle: params.input.billingCycle,
      seatsPurchased: params.input.seatsPurchased,
      seatsActive: params.input.seatsActive,
      lastUsedAt: params.input.lastUsedAt,
      renewalDate: params.input.renewalDate,
      contractNotes: params.input.contractNotes,
      source: "manual",
    },
  });
}

export async function listSubscriptions(params: {
  organizationId: string;
  query: ListSubscriptionsQuery;
}): Promise<PaginatedResult<Awaited<ReturnType<typeof createSubscription>>>> {
  const db = getSpendGovDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.subscription.findMany({
        where: {
          organizationId: params.organizationId,
          deletedAt: null,
          ...(params.query.kind ? { kind: params.query.kind } : {}),
          ...(params.query.category ? { category: params.query.category } : {}),
          ...(params.query.status ? { status: params.query.status } : {}),
        },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getSubscription(params: { organizationId: string; subscriptionId: string }) {
  const db = getSpendGovDb();
  return db.subscription.findFirst({
    where: { id: params.subscriptionId, organizationId: params.organizationId, deletedAt: null },
  });
}

export async function updateSubscription(params: { organizationId: string; subscriptionId: string; input: UpdateSubscriptionInput }) {
  const db = getSpendGovDb();
  return db.subscription.updateMany({
    where: { id: params.subscriptionId, organizationId: params.organizationId, deletedAt: null },
    data: params.input,
  });
}

export async function deleteSubscription(params: { organizationId: string; subscriptionId: string }) {
  const db = getSpendGovDb();
  return db.subscription.updateMany({
    where: { id: params.subscriptionId, organizationId: params.organizationId, deletedAt: null },
    data: { deletedAt: new Date(), status: "canceled" },
  });
}

export async function listAllActiveSubscriptions(organizationId: string) {
  const db = getSpendGovDb();
  return db.subscription.findMany({ where: { organizationId, deletedAt: null } });
}

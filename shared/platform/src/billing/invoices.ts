import { getPlatformDb } from "../db/index.js";
import { paginate } from "../api/pagination.js";

export async function listInvoicesForOrganization(params: { organizationId: string; cursor?: string; limit?: number }) {
  return paginate({
    cursor: params.cursor,
    limit: params.limit,
    findMany: (args) =>
      getPlatformDb().invoice.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { issuedAt: "desc" },
        ...args,
      }),
  });
}

export async function recordInvoice(params: {
  organizationId: string;
  subscriptionId: string;
  stripeInvoiceId?: string;
  amountDueCents: number;
  amountPaidCents?: number;
  currency?: string;
  status: "open" | "paid" | "past_due" | "void";
  issuedAt: Date;
  dueAt?: Date;
  paidAt?: Date;
  hostedInvoiceUrl?: string;
}) {
  return getPlatformDb().invoice.create({
    data: {
      organizationId: params.organizationId,
      subscriptionId: params.subscriptionId,
      stripeInvoiceId: params.stripeInvoiceId,
      amountDueCents: params.amountDueCents,
      amountPaidCents: params.amountPaidCents ?? 0,
      currency: params.currency ?? "usd",
      status: params.status,
      issuedAt: params.issuedAt,
      dueAt: params.dueAt,
      paidAt: params.paidAt,
      hostedInvoiceUrl: params.hostedInvoiceUrl,
    },
  });
}

import { getSpendGovDb } from "../db.js";
import { detectDuplicates } from "./duplicate-detection.js";
import { detectWaste } from "./waste-detection.js";
import { analyzeVendorConsolidation } from "./vendor-consolidation.js";
import { listAllActiveSubscriptions } from "./subscriptions-repo.js";

/**
 * Re-runs duplicate detection against the org's current subscriptions and
 * replaces the previous open findings with fresh ones — run on demand
 * (from the UI) or by a scheduled job once one exists; kept idempotent by
 * superseding rather than accumulating duplicate rows on repeated runs.
 */
export async function runDuplicateDetection(organizationId: string) {
  const db = getSpendGovDb();
  const subscriptions = await listAllActiveSubscriptions(organizationId);
  const candidates = detectDuplicates(
    subscriptions
      .filter((s) => s.status === "active")
      .map((s) => ({ id: s.id, vendorName: s.vendorName, productName: s.productName, category: s.category, monthlyCostCents: s.monthlyCostCents })),
  );

  return db.$transaction(async (tx) => {
    await tx.duplicateFinding.updateMany({
      where: { organizationId, status: "open" },
      data: { status: "resolved", resolvedAt: new Date() },
    });

    const created = [];
    for (const candidate of candidates) {
      const finding = await tx.duplicateFinding.create({
        data: {
          organizationId,
          category: candidate.category,
          rationale: candidate.rationale,
          estimatedSavingsCents: candidate.estimatedSavingsCents,
          subscriptions: { create: candidate.subscriptionIds.map((subscriptionId) => ({ subscriptionId })) },
        },
      });
      created.push(finding);
    }
    return created;
  });
}

export async function runWasteDetection(organizationId: string) {
  const db = getSpendGovDb();
  const subscriptions = await listAllActiveSubscriptions(organizationId);
  const candidates = detectWaste(
    subscriptions.map((s) => ({
      id: s.id,
      monthlyCostCents: s.monthlyCostCents,
      seatsPurchased: s.seatsPurchased,
      seatsActive: s.seatsActive,
      lastUsedAt: s.lastUsedAt,
      status: s.status,
    })),
  );

  return db.$transaction(async (tx) => {
    await tx.wasteFinding.updateMany({
      where: { organizationId, status: "open" },
      data: { status: "resolved", resolvedAt: new Date() },
    });

    return Promise.all(
      candidates.map((candidate) =>
        tx.wasteFinding.create({
          data: {
            organizationId,
            subscriptionId: candidate.subscriptionId,
            type: candidate.type,
            evidence: candidate.evidence,
            estimatedSavingsCents: candidate.estimatedSavingsCents,
          },
        }),
      ),
    );
  });
}

export async function runVendorConsolidationAnalysis(organizationId: string) {
  const db = getSpendGovDb();
  const subscriptions = await listAllActiveSubscriptions(organizationId);
  const candidates = analyzeVendorConsolidation(
    subscriptions
      .filter((s) => s.status === "active")
      .map((s) => ({ vendorName: s.vendorName, category: s.category, monthlyCostCents: s.monthlyCostCents })),
  );

  return db.$transaction(async (tx) => {
    await tx.vendorConsolidationRecommendation.updateMany({
      where: { organizationId, status: "open" },
      data: { status: "resolved" },
    });

    return Promise.all(
      candidates.map((candidate) =>
        tx.vendorConsolidationRecommendation.create({
          data: {
            organizationId,
            vendorGroup: candidate.vendorGroup,
            vendorNames: candidate.vendorNames,
            rationale: candidate.rationale,
            estimatedSavingsCents: candidate.estimatedSavingsCents,
          },
        }),
      ),
    );
  });
}

export async function listDuplicateFindings(organizationId: string) {
  const db = getSpendGovDb();
  return db.duplicateFinding.findMany({
    where: { organizationId, status: "open" },
    include: { subscriptions: { include: { subscription: true } } },
    orderBy: { estimatedSavingsCents: "desc" },
  });
}

export async function listWasteFindings(organizationId: string) {
  const db = getSpendGovDb();
  return db.wasteFinding.findMany({
    where: { organizationId, status: "open" },
    include: { subscription: true },
    orderBy: { estimatedSavingsCents: "desc" },
  });
}

export async function listVendorConsolidationRecommendations(organizationId: string) {
  const db = getSpendGovDb();
  return db.vendorConsolidationRecommendation.findMany({
    where: { organizationId, status: "open" },
    orderBy: { estimatedSavingsCents: "desc" },
  });
}

export interface ScorableLead {
  source: "web_form" | "email" | "linkedin" | "csv_import" | "manual";
  hasCompany: boolean;
  hasJobTitle: boolean;
  hasPhone: boolean;
}

const SOURCE_WEIGHT: Record<ScorableLead["source"], number> = {
  web_form: 25,
  linkedin: 20,
  email: 15,
  csv_import: 5,
  manual: 5,
};

const SENIOR_TITLE_PATTERN = /\b(chief|vp|vice president|director|head of|founder|owner|president)\b/i;

/**
 * Rule-based lead scoring per products/crmcapture/docs/PRODUCT_IDENTITY.md
 * §7 "Lead scoring: Pre-fill scoring fields based on lead source, company
 * size, engagement signals." Deterministic and testable — the AI Sales
 * Assistant (fix-engine-equivalent) layers qualitative next-step guidance
 * on top of this, it doesn't replace it.
 */
export function computeLeadScore(lead: ScorableLead, jobTitle?: string | null): number {
  let score = SOURCE_WEIGHT[lead.source];
  if (lead.hasCompany) score += 20;
  if (lead.hasJobTitle) score += 10;
  if (lead.hasPhone) score += 15;
  if (jobTitle && SENIOR_TITLE_PATTERN.test(jobTitle)) score += 30;
  return Math.min(100, score);
}

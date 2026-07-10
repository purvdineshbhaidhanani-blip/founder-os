export interface HealthScoreInput {
  emailStatus: "valid" | "invalid" | "risky" | "unchecked";
  phoneStatus: "valid" | "invalid" | "risky" | "unchecked";
  hasCompany: boolean;
  hasJobTitle: boolean;
  isDuplicate: boolean;
}

/**
 * Composite contact health score per
 * products/contactverify/docs/PRODUCT_IDENTITY.md §5's "complete health
 * profile" (not just valid/invalid) — combines validity, completeness,
 * and duplicate status into one 0-100 score.
 */
export function computeHealthScore(input: HealthScoreInput): number {
  let score = 0;

  if (input.emailStatus === "valid") score += 35;
  else if (input.emailStatus === "risky") score += 15;

  if (input.phoneStatus === "valid") score += 25;
  else if (input.phoneStatus === "risky") score += 10;

  if (input.hasCompany) score += 15;
  if (input.hasJobTitle) score += 15;

  if (input.isDuplicate) score -= 20;

  return Math.max(0, Math.min(100, score));
}

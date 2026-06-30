import type { ReviewerOutput, DebateArgument } from "./types.js";

// ---------------------------------------------------------------------------
// Evidence Engine
// Aggregates and deduplicates arguments across all reviewers.
// Returns top arguments for and against, ranked by weight × reviewer agreement.
// ---------------------------------------------------------------------------

interface WeightedArgument extends DebateArgument {
  supportingRoles: string[];
  totalWeight: number;
}

export function aggregateEvidence(outputs: ReviewerOutput[]): {
  topArgumentsFor: DebateArgument[];
  topArgumentsAgainst: DebateArgument[];
  evidenceSummary: string[];
  risks: string[];
  unknowns: string[];
} {
  const forMap = new Map<string, WeightedArgument>();
  const againstMap = new Map<string, WeightedArgument>();

  for (const output of outputs) {
    for (const arg of output.argumentsFor) {
      const key = normaliseKey(arg.claim);
      const existing = forMap.get(key);
      if (existing) {
        existing.supportingRoles.push(output.role);
        existing.totalWeight += arg.weight;
        existing.evidence.push(...arg.evidence);
      } else {
        forMap.set(key, { ...arg, evidence: [...arg.evidence], supportingRoles: [output.role], totalWeight: arg.weight });
      }
    }
    for (const arg of output.argumentsAgainst) {
      const key = normaliseKey(arg.claim);
      const existing = againstMap.get(key);
      if (existing) {
        existing.supportingRoles.push(output.role);
        existing.totalWeight += arg.weight;
        existing.evidence.push(...arg.evidence);
      } else {
        againstMap.set(key, { ...arg, evidence: [...arg.evidence], supportingRoles: [output.role], totalWeight: arg.weight });
      }
    }
  }

  const topArgumentsFor = rankArgs([...forMap.values()]).slice(0, 5);
  const topArgumentsAgainst = rankArgs([...againstMap.values()]).slice(0, 5);

  // Deduplicate evidence snippets
  const allEvidence = outputs.flatMap((o) => o.evidence).filter(Boolean);
  const evidenceSummary = [...new Set(allEvidence)].slice(0, 8);

  // Collect risks and unknowns
  const allRisks = outputs.flatMap((o) => o.risks).filter(Boolean);
  const allUnknowns = outputs.flatMap((o) => o.unknowns).filter(Boolean);
  const risks = [...new Set(allRisks)].slice(0, 8);
  const unknowns = [...new Set(allUnknowns)].slice(0, 8);

  return { topArgumentsFor, topArgumentsAgainst, evidenceSummary, risks, unknowns };
}

function rankArgs(args: WeightedArgument[]): DebateArgument[] {
  return args
    .sort((a, b) => b.totalWeight - a.totalWeight)
    .map(({ claim, totalWeight, evidence, supportingRoles }) => ({
      claim,
      weight: Math.min(1, totalWeight / Math.max(1, supportingRoles.length)),
      evidence: [...new Set(evidence)].slice(0, 3),
    }));
}

function normaliseKey(claim: string): string {
  return claim.toLowerCase().replace(/[^a-z0-9 ]/g, "").slice(0, 60);
}

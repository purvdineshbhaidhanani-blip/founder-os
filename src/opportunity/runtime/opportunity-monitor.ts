import { nowIso } from "../../utils/id.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Opportunity Monitor — tracks opportunity state over time
// ---------------------------------------------------------------------------

interface ScoreSnapshot {
  score: number;
  recordedAt: string;
}

interface OpportunityState {
  opportunityId: string;
  currentScore: number;
  peakScore: number;
  lowestScore: number;
  trend: "rising" | "falling" | "stable";
  history: ScoreSnapshot[];
  firstSeenAt: string;
  lastUpdatedAt: string;
  updateCount: number;
}

const TREND_THRESHOLD = 0.03;
const HISTORY_WINDOW = 20;

export class OpportunityMonitor {
  private readonly states = new Map<string, OpportunityState>();

  constructor(private readonly audit: AuditLog) {}

  update(intel: OpportunityIntelligence): OpportunityState {
    const id = intel.opportunityId;
    const score = intel.overallConfidence;
    const existing = this.states.get(id);

    if (!existing) {
      const state: OpportunityState = {
        opportunityId: id,
        currentScore: score,
        peakScore: score,
        lowestScore: score,
        trend: "stable",
        history: [{ score, recordedAt: nowIso() }],
        firstSeenAt: nowIso(),
        lastUpdatedAt: nowIso(),
        updateCount: 1,
      };
      this.states.set(id, state);
      this.audit.log("opportunity-created", { opportunityId: id, score }, id, "opportunity");
      return state;
    }

    const prev = existing.currentScore;
    existing.history.push({ score, recordedAt: nowIso() });
    if (existing.history.length > HISTORY_WINDOW) existing.history.shift();

    existing.currentScore = score;
    existing.peakScore = Math.max(existing.peakScore, score);
    existing.lowestScore = Math.min(existing.lowestScore, score);
    existing.trend = deriveTrend(prev, score);
    existing.lastUpdatedAt = nowIso();
    existing.updateCount++;

    this.audit.log("opportunity-updated", { opportunityId: id, prevScore: prev, newScore: score }, id, "opportunity");
    return existing;
  }

  get(opportunityId: string): OpportunityState | undefined {
    return this.states.get(opportunityId);
  }

  rising(): OpportunityState[] {
    return [...this.states.values()].filter((s) => s.trend === "rising");
  }

  falling(): OpportunityState[] {
    return [...this.states.values()].filter((s) => s.trend === "falling");
  }

  newThisWindow(windowMs = 7 * 24 * 60 * 60 * 1000): OpportunityState[] {
    const cutoff = Date.now() - windowMs;
    return [...this.states.values()].filter((s) => new Date(s.firstSeenAt).getTime() >= cutoff);
  }

  topN(n: number): OpportunityState[] {
    return [...this.states.values()]
      .sort((a, b) => b.currentScore - a.currentScore)
      .slice(0, n);
  }

  size(): number {
    return this.states.size;
  }

  all(): OpportunityState[] {
    return [...this.states.values()];
  }
}

function deriveTrend(prev: number, current: number): "rising" | "falling" | "stable" {
  const delta = current - prev;
  if (delta > TREND_THRESHOLD) return "rising";
  if (delta < -TREND_THRESHOLD) return "falling";
  return "stable";
}

import { generateId, nowIso } from "../../utils/id.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { ChangeEvent, ChangeType } from "./types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Change Detection Engine — 10 change types, auto re-score trigger
// ---------------------------------------------------------------------------

interface ScoreSnapshot {
  overallConfidence: number;
  existingSolutionScore: number;
  marketSizeScore: number;
  humanTimeSaved: number;
  aiReadinessScore: number;
  technicalFeasibilityScore: number;
  noiseScore: number;
}

function snapshot(intel: OpportunityIntelligence): ScoreSnapshot {
  return {
    overallConfidence: intel.overallConfidence,
    existingSolutionScore: intel.existingSolutionScore.score,
    marketSizeScore: intel.marketSizeEstimate.score,
    humanTimeSaved: intel.humanTimeSavedScore.score,
    aiReadinessScore: intel.aiReadinessScore.score,
    technicalFeasibilityScore: intel.technicalFeasibilityScore.score,
    noiseScore: intel.noiseScore.score,
  };
}

const CHANGE_THRESHOLD = 0.08;

export class ChangeDetectionEngine {
  private readonly snapshots = new Map<string, ScoreSnapshot>();
  private readonly events: ChangeEvent[] = [];

  constructor(private readonly audit: AuditLog) {}

  detect(intel: OpportunityIntelligence): ChangeEvent[] {
    const id = intel.opportunityId;
    const current = snapshot(intel);
    const previous = this.snapshots.get(id);
    const detected: ChangeEvent[] = [];

    if (previous) {
      const checks: Array<{ type: ChangeType; prev: number; curr: number }> = [
        { type: "growing-demand", prev: previous.noiseScore, curr: current.noiseScore },
        { type: "declining-demand", prev: previous.noiseScore, curr: current.noiseScore },
        { type: "competitor-improvement", prev: previous.existingSolutionScore, curr: current.existingSolutionScore },
        { type: "price-change", prev: previous.marketSizeScore, curr: current.marketSizeScore },
        { type: "technology-change", prev: previous.technicalFeasibilityScore, curr: current.technicalFeasibilityScore },
        { type: "api-change", prev: previous.aiReadinessScore, curr: current.aiReadinessScore },
        { type: "customer-sentiment-change", prev: previous.humanTimeSaved, curr: current.humanTimeSaved },
        { type: "market-saturation", prev: previous.existingSolutionScore, curr: current.existingSolutionScore },
      ];

      for (const { type, prev, curr } of checks) {
        const delta = curr - prev;
        if (Math.abs(delta) < CHANGE_THRESHOLD) continue;

        // Filter directional types
        if (type === "growing-demand" && delta <= 0) continue;
        if (type === "declining-demand" && delta >= 0) continue;

        const event = this.buildEvent(id, type, prev, curr, previous.overallConfidence, current.overallConfidence);
        detected.push(event);
      }

      // Detect overall demand shift via overallConfidence
      const overallDelta = current.overallConfidence - previous.overallConfidence;
      if (overallDelta > CHANGE_THRESHOLD) {
        detected.push(this.buildEvent(id, "growing-demand", previous.overallConfidence, current.overallConfidence, previous.overallConfidence, current.overallConfidence));
      } else if (overallDelta < -CHANGE_THRESHOLD) {
        detected.push(this.buildEvent(id, "declining-demand", previous.overallConfidence, current.overallConfidence, previous.overallConfidence, current.overallConfidence));
      }

      // Detect new competitor when existingSolution score drops (more competition)
      if (previous.existingSolutionScore - current.existingSolutionScore > CHANGE_THRESHOLD) {
        const event = this.buildEvent(
          id, "new-competitor",
          previous.existingSolutionScore, current.existingSolutionScore,
          previous.overallConfidence, current.overallConfidence,
        );
        detected.push(event);
      }

      // Legal change via feasibility
      if (Math.abs(current.technicalFeasibilityScore - previous.technicalFeasibilityScore) > CHANGE_THRESHOLD) {
        const event = this.buildEvent(
          id, "legal-change",
          previous.technicalFeasibilityScore, current.technicalFeasibilityScore,
          previous.overallConfidence, current.overallConfidence,
        );
        detected.push(event);
      }
    }

    this.snapshots.set(id, current);
    this.events.push(...detected);

    for (const e of detected) {
      this.audit.log("change-detected", { changeType: e.changeType, opportunityId: id, impactScore: e.impactScore }, id, "opportunity");
    }

    return detected;
  }

  getEventsFor(opportunityId: string): ChangeEvent[] {
    return this.events.filter((e) => e.opportunityId === opportunityId);
  }

  recentEvents(windowMs = 24 * 60 * 60 * 1000): ChangeEvent[] {
    const cutoff = Date.now() - windowMs;
    return this.events.filter((e) => new Date(e.detectedAt).getTime() >= cutoff);
  }

  all(): ChangeEvent[] {
    return [...this.events];
  }

  private buildEvent(
    opportunityId: string,
    changeType: ChangeType,
    prev: number,
    curr: number,
    prevOverall: number,
    currOverall: number,
  ): ChangeEvent {
    return {
      id: generateId("chg"),
      opportunityId,
      changeType,
      description: `${changeType}: ${prev.toFixed(3)} → ${curr.toFixed(3)}`,
      impactScore: Math.abs(currOverall - prevOverall),
      previousScore: prevOverall,
      newScore: currOverall,
      detectedAt: nowIso(),
      requiresRescore: Math.abs(currOverall - prevOverall) > 0.05,
    };
  }
}

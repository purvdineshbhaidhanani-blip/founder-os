import { generateId, nowIso } from "../../utils/id.js";
import type { Notification, NotificationTrigger, ChangeEvent } from "./types.js";
import type { ChampionRecord, TournamentResult } from "./types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Notification Engine — notify founder ONLY on 9 specific trigger conditions
// ---------------------------------------------------------------------------

const CONFIDENCE_CHANGE_THRESHOLD = 0.10;

export class NotificationEngine {
  private readonly notifications: Notification[] = [];

  constructor(private readonly audit: AuditLog) {}

  // Trigger 1: New champion first set
  onNewChampion(champion: ChampionRecord): Notification {
    return this.emit(
      "new-champion",
      "New Champion Opportunity",
      `${champion.opportunityId} is now champion with score ${champion.score.toFixed(3)}`,
      champion.opportunityId,
      "urgent",
    );
  }

  // Trigger 2: Champion replaced by stronger opportunity
  onChampionReplaced(tournament: TournamentResult): Notification | null {
    if (!tournament.championChanged || !tournament.previousChampionId) return null;
    return this.emit(
      "champion-replaced",
      "Champion Replaced",
      `${tournament.champion.opportunityId} (score=${tournament.champion.score.toFixed(3)}) replaced ${tournament.previousChampionId}`,
      tournament.champion.opportunityId,
      "urgent",
    );
  }

  // Trigger 3: Confidence changed significantly
  onConfidenceChange(
    intel: OpportunityIntelligence,
    previousConfidence: number,
  ): Notification | null {
    const delta = Math.abs(intel.overallConfidence - previousConfidence);
    if (delta < CONFIDENCE_CHANGE_THRESHOLD) return null;
    const direction = intel.overallConfidence > previousConfidence ? "↑" : "↓";
    return this.emit(
      "confidence-changed-significantly",
      `Confidence ${direction} ${(delta * 100).toFixed(0)}%`,
      `${intel.opportunityId}: ${previousConfidence.toFixed(3)} → ${intel.overallConfidence.toFixed(3)}`,
      intel.opportunityId,
      "high",
    );
  }

  // Trigger 4: Major market change
  onMajorMarketChange(event: ChangeEvent): Notification | null {
    if (!["growing-demand", "declining-demand", "market-saturation"].includes(event.changeType)) return null;
    if (event.impactScore < 0.10) return null;
    return this.emit(
      "major-market-change",
      `Major Market Change: ${event.changeType}`,
      event.description,
      event.opportunityId,
      "high",
    );
  }

  // Trigger 5: Major revenue change (market size shifted)
  onMajorRevenueChange(event: ChangeEvent): Notification | null {
    if (!["price-change"].includes(event.changeType)) return null;
    if (event.impactScore < 0.10) return null;
    return this.emit(
      "major-revenue-change",
      `Major Revenue Change Detected`,
      event.description,
      event.opportunityId,
      "high",
    );
  }

  // Trigger 6: Major cost change (technical feasibility shifted)
  onMajorCostChange(event: ChangeEvent): Notification | null {
    if (!["technology-change", "api-change"].includes(event.changeType)) return null;
    if (event.impactScore < 0.10) return null;
    return this.emit(
      "major-cost-change",
      `Major Cost/Tech Change Detected`,
      event.description,
      event.opportunityId,
      "high",
    );
  }

  // Trigger 7: Major competition change
  onMajorCompetitionChange(event: ChangeEvent): Notification | null {
    if (!["new-competitor", "competitor-improvement"].includes(event.changeType)) return null;
    if (event.impactScore < 0.08) return null;
    return this.emit(
      "major-competition-change",
      `Major Competition Change: ${event.changeType}`,
      event.description,
      event.opportunityId,
      "high",
    );
  }

  // Trigger 8: Major legal change
  onMajorLegalChange(event: ChangeEvent): Notification | null {
    if (event.changeType !== "legal-change") return null;
    return this.emit(
      "major-legal-change",
      "Major Legal Change Detected",
      event.description,
      event.opportunityId,
      "urgent",
    );
  }

  // Trigger 9: Existing opportunity becomes invalid
  onOpportunityInvalidated(intel: OpportunityIntelligence, reason: string): Notification {
    return this.emit(
      "opportunity-invalidated",
      "Opportunity Invalidated",
      `${intel.opportunityId}: ${reason}`,
      intel.opportunityId,
      "high",
    );
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  unread(): Notification[] {
    return this.notifications.filter((n) => !n.read);
  }

  markRead(notificationId: string): void {
    const n = this.notifications.find((n) => n.id === notificationId);
    if (n) n.read = true;
  }

  markAllRead(): void {
    for (const n of this.notifications) n.read = true;
  }

  size(): number {
    return this.notifications.length;
  }

  private emit(
    trigger: NotificationTrigger,
    title: string,
    body: string,
    opportunityId: string | null,
    priority: "urgent" | "high" | "normal",
  ): Notification {
    const notification: Notification = {
      id: generateId("notif"),
      trigger,
      title,
      body,
      opportunityId,
      priority,
      sentAt: nowIso(),
      read: false,
    };
    this.notifications.push(notification);
    this.audit.log("notification-sent", { trigger, title, opportunityId }, opportunityId, "notification");
    return notification;
  }
}

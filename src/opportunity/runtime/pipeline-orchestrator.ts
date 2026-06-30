import { generateId, nowIso } from "../../utils/id.js";
import type { Opportunity } from "../types.js";
import { scoreOpportunity } from "../intelligence/scorer.js";
import { runDecisionCourt } from "../decision/court.js";
import { generateBlueprint } from "../blueprint/blueprint-engine.js";
import type { PipelineResult } from "./types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { CourtDecision } from "../decision/types.js";
import type { BusinessBlueprint } from "../blueprint/types.js";
import type { ParallelExecutor } from "./parallel-executor.js";
import type { OpportunityArchive } from "./opportunity-archive.js";
import type { OpportunityMonitor } from "./opportunity-monitor.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Pipeline Orchestrator — collect → score → court → blueprint
// ---------------------------------------------------------------------------

export interface PipelineOutput {
  opportunityId: string;
  intelligence: OpportunityIntelligence;
  decision: CourtDecision;
  blueprint: BusinessBlueprint;
  archived: boolean;
}

export class PipelineOrchestrator {
  constructor(
    private readonly executor: ParallelExecutor,
    private readonly archive: OpportunityArchive,
    private readonly monitor: OpportunityMonitor,
    private readonly audit: AuditLog,
  ) {}

  async runBatch(opportunities: Opportunity[]): Promise<{ result: PipelineResult; outputs: PipelineOutput[] }> {
    const runId = generateId("run");
    const startedAt = nowIso();
    const startMs = Date.now();
    const errors: string[] = [];
    const outputs: PipelineOutput[] = [];

    const tasks = opportunities.map((opp) => async (): Promise<PipelineOutput | null> => {
      try {
        return await this.runSingle(opp);
      } catch (err) {
        errors.push(`${opp.id}: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    });

    const execResults = await this.executor.run(tasks);

    let created = 0;
    let updated = 0;
    let archived = 0;

    for (const r of execResults) {
      if (!r.value) continue;
      outputs.push(r.value);
      if (r.value.archived) {
        archived++;
      } else {
        const state = this.monitor.get(r.value.opportunityId);
        if (!state) created++;
        else updated++;
      }
      this.monitor.update(r.value.intelligence);
    }

    const result: PipelineResult = {
      runId,
      startedAt,
      completedAt: nowIso(),
      stage: "blueprint",
      opportunitiesProcessed: opportunities.length,
      opportunitiesCreated: created,
      opportunitiesUpdated: updated,
      opportunitiesArchived: archived,
      errors,
      durationMs: Date.now() - startMs,
    };

    this.audit.log("pipeline-run", {
      runId,
      processed: opportunities.length,
      errors: errors.length,
      durationMs: result.durationMs,
    }, runId, "pipeline");

    return { result, outputs };
  }

  async runSingle(opportunity: Opportunity): Promise<PipelineOutput> {
    // Stage 1: Score
    const intelligence = scoreOpportunity(opportunity);

    // Stage 2: Archive check
    const { archive: shouldArchive, reason } = this.archive.shouldArchive(intelligence);
    if (shouldArchive) {
      this.archive.archive(intelligence, reason);
      const decision = runDecisionCourt(intelligence);
      const blueprint = generateBlueprint(intelligence, decision);
      return { opportunityId: opportunity.id, intelligence, decision, blueprint, archived: true };
    }

    // Stage 3: Decision Court
    const decision = runDecisionCourt(intelligence);

    // Stage 4: Blueprint
    const blueprint = generateBlueprint(intelligence, decision);

    return { opportunityId: opportunity.id, intelligence, decision, blueprint, archived: false };
  }
}

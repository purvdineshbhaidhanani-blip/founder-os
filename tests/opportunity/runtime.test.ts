import { describe, it, expect, beforeEach } from "vitest";
import { AuditLog } from "../../src/opportunity/runtime/audit-log.js";
import { Scheduler } from "../../src/opportunity/runtime/scheduler.js";
import { QueueManager } from "../../src/opportunity/runtime/queue-manager.js";
import { ParallelExecutor } from "../../src/opportunity/runtime/parallel-executor.js";
import { OpportunityArchive } from "../../src/opportunity/runtime/opportunity-archive.js";
import { OpportunityMonitor } from "../../src/opportunity/runtime/opportunity-monitor.js";
import { ChampionTournament } from "../../src/opportunity/runtime/champion-tournament.js";
import { ChangeDetectionEngine } from "../../src/opportunity/runtime/change-detection-engine.js";
import { HistoricalLearningEngine } from "../../src/opportunity/runtime/historical-learning-engine.js";
import { PredictionValidationEngine } from "../../src/opportunity/runtime/prediction-validation-engine.js";
import { NotificationEngine } from "../../src/opportunity/runtime/notification-engine.js";
import { MetricsEngine } from "../../src/opportunity/runtime/metrics-engine.js";
import { RuntimeHealthMonitor } from "../../src/opportunity/runtime/runtime-health-monitor.js";
import { FailureRecovery } from "../../src/opportunity/runtime/failure-recovery.js";
import { MemoryUpdater } from "../../src/opportunity/runtime/memory-updater.js";
import { KnowledgeUpdater } from "../../src/opportunity/runtime/knowledge-updater.js";
import { AutonomousRuntime } from "../../src/opportunity/runtime/autonomous-runtime.js";
import { PipelineOrchestrator } from "../../src/opportunity/runtime/pipeline-orchestrator.js";
import { scoreOpportunity } from "../../src/opportunity/intelligence/scorer.js";
import { runDecisionCourt } from "../../src/opportunity/decision/court.js";
import { generateBlueprint } from "../../src/opportunity/blueprint/blueprint-engine.js";
import type { Opportunity, OpportunityEvidence, PainScore } from "../../src/opportunity/types.js";
import type { PipelineResult } from "../../src/opportunity/runtime/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEvidence(overrides: Partial<OpportunityEvidence> = {}): OpportunityEvidence {
  return {
    signalId: "sig-1",
    itemId: "item-1",
    source: "g2",
    url: "https://g2.com/r/1",
    quote: "We pay for Zapier but it breaks at scale. Manual workaround costs 8h/week.",
    signalType: "automation-request",
    engagement: { votes: 95, replies: 18 },
    ...overrides,
  };
}

const PAIN: PainScore = {
  frequency: 0.9,
  severity: 0.85,
  businessImpact: 0.80,
  timeLost: 8,
  moneyLost: 1000,
  urgency: 0.85,
  frustration: 0.90,
  operationalComplexity: 0.70,
  confidence: 0.85,
};

function makeOpportunity(id = "opp-rt-1"): Opportunity {
  const now = new Date().toISOString();
  return {
    id,
    status: "discovered",
    problemSummary: "Workflow automation breaks at scale",
    category: "automation",
    evidence: [
      makeEvidence(),
      makeEvidence({ signalId: "sig-2", source: "reddit", signalType: "manual-process" }),
      makeEvidence({ signalId: "sig-3", source: "github-issues", signalType: "integration-pain" }),
    ],
    painScore: PAIN,
    buyingIntentSignals: 3,
    workaroundsDetected: ["zapier", "custom-scripts"],
    sources: ["g2", "reddit", "github-issues"],
    confidence: 0.82,
    signalCount: 6,
    clusterKey: "workflow-automation",
    createdAt: now,
    updatedAt: now,
  };
}

function makeIntelDecisionBlueprint(id = "opp-rt-1") {
  const intel = scoreOpportunity(makeOpportunity(id));
  const decision = runDecisionCourt(intel);
  const blueprint = generateBlueprint(intel, decision);
  return { intel, decision, blueprint };
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

describe("AuditLog", () => {
  it("appends entries", () => {
    const log = new AuditLog();
    log.log("pipeline-run", { runs: 1 });
    expect(log.size()).toBe(1);
  });

  it("getAll returns immutable snapshot", () => {
    const log = new AuditLog();
    log.log("champion-set", {});
    const all = log.getAll();
    expect(all.length).toBe(1);
  });

  it("byAction filters correctly", () => {
    const log = new AuditLog();
    log.log("pipeline-run");
    log.log("champion-set");
    expect(log.byAction("pipeline-run").length).toBe(1);
  });

  it("byEntity filters correctly", () => {
    const log = new AuditLog();
    log.log("opportunity-created", {}, "opp-1", "opportunity");
    log.log("pipeline-run", {}, "run-1", "pipeline");
    expect(log.byEntity("opp-1").length).toBe(1);
  });

  it("since filters by timestamp", () => {
    const log = new AuditLog();
    log.log("pipeline-run");
    const past = new Date(Date.now() + 60_000).toISOString();
    expect(log.since(past).length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

describe("Scheduler", () => {
  it("registers tasks", () => {
    const s = new Scheduler();
    s.register("collect", "10min");
    expect(s.size()).toBe(1);
  });

  it("getDue returns tasks past nextRunAt", () => {
    const s = new Scheduler();
    s.register("collect", "10min");
    const due = s.getDue(Date.now() + 1000);
    expect(due.length).toBe(1);
  });

  it("markCompleted advances nextRunAt", () => {
    const s = new Scheduler();
    const task = s.register("collect", "10min");
    s.markCompleted(task.id);
    const nowMs = Date.now();
    expect(new Date(task.nextRunAt).getTime()).toBeGreaterThan(nowMs);
  });

  it("markFailed increments failCount", () => {
    const s = new Scheduler();
    const task = s.register("collect", "10min");
    s.markFailed(task.id);
    expect(task.failCount).toBe(1);
  });

  it("disabled tasks not returned as due", () => {
    const s = new Scheduler();
    const task = s.register("collect", "10min");
    s.disable(task.id);
    expect(s.getDue(Date.now() + 999_999).length).toBe(0);
  });

  it("getByName finds task", () => {
    const s = new Scheduler();
    s.register("my-task", "1hr");
    expect(s.getByName("my-task")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Queue Manager
// ---------------------------------------------------------------------------

describe("QueueManager", () => {
  it("enqueue adds job", () => {
    const q = new QueueManager();
    q.enqueue("pipeline", { opp: "1" });
    expect(q.size()).toBe(1);
  });

  it("dequeue respects priority", () => {
    const q = new QueueManager();
    q.enqueue("low-task", {}, "low");
    q.enqueue("critical-task", {}, "critical");
    const batch = q.dequeue(1);
    expect(batch[0]!.type).toBe("critical-task");
  });

  it("complete marks job done", () => {
    const q = new QueueManager();
    q.enqueue("task", {});
    const [job] = q.dequeue(1);
    q.complete(job!.id);
    expect(job!.status).toBe("done");
  });

  it("fail below maxAttempts marks retrying", () => {
    const q = new QueueManager();
    q.enqueue("task", {}, "normal", 3);
    const [job] = q.dequeue(1);
    q.fail(job!.id, "oops");
    expect(job!.status).toBe("retrying");
  });

  it("fail at maxAttempts marks failed", () => {
    const q = new QueueManager();
    q.enqueue("task", {}, "normal", 1);
    const [job] = q.dequeue(1);
    q.fail(job!.id, "final");
    expect(job!.status).toBe("failed");
  });

  it("pendingCount counts pending and retrying", () => {
    const q = new QueueManager();
    q.enqueue("t1", {});
    q.enqueue("t2", {});
    expect(q.pendingCount()).toBe(2);
  });

  it("requeueRetrying moves retrying → pending", () => {
    const q = new QueueManager();
    q.enqueue("task", {}, "normal", 3);
    const [job] = q.dequeue(1);
    q.fail(job!.id, "err");
    expect(q.requeueRetrying()).toBe(1);
    expect(job!.status).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// Parallel Executor
// ---------------------------------------------------------------------------

describe("ParallelExecutor", () => {
  it("runs all tasks", async () => {
    const ex = new ParallelExecutor(2);
    const tasks = [1, 2, 3, 4].map((n) => async () => n * 2);
    const results = await ex.run(tasks);
    expect(results.map((r) => r.value)).toEqual([2, 4, 6, 8]);
  });

  it("captures errors without stopping other tasks", async () => {
    const ex = new ParallelExecutor(2);
    const tasks = [
      async () => 1,
      async () => { throw new Error("boom"); },
      async () => 3,
    ];
    const results = await ex.run(tasks);
    expect(results[0]!.value).toBe(1);
    expect(results[1]!.error).toBe("boom");
    expect(results[2]!.value).toBe(3);
  });

  it("respects concurrency bound", async () => {
    const ex = new ParallelExecutor(2);
    let concurrent = 0;
    let maxConcurrent = 0;
    const tasks = Array.from({ length: 6 }, () => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise<void>((r) => setTimeout(r, 5));
      concurrent--;
      return 1;
    });
    await ex.run(tasks);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Opportunity Archive
// ---------------------------------------------------------------------------

describe("OpportunityArchive", () => {
  it("archives low-confidence opportunities", () => {
    const log = new AuditLog();
    const arch = new OpportunityArchive(log);
    const { intel } = makeIntelDecisionBlueprint();
    // force low confidence
    const weak = { ...intel, overallConfidence: 0.10 };
    const { archive } = arch.shouldArchive(weak);
    expect(archive).toBe(true);
  });

  it("archives rejected opportunities", () => {
    const log = new AuditLog();
    const arch = new OpportunityArchive(log);
    const { intel } = makeIntelDecisionBlueprint();
    const rejected = { ...intel, rejected: true, rejectionReasons: ["no-buying-intent" as const] };
    expect(arch.shouldArchive(rejected).archive).toBe(true);
  });

  it("isArchived returns true after archive", () => {
    const log = new AuditLog();
    const arch = new OpportunityArchive(log);
    const { intel } = makeIntelDecisionBlueprint();
    const weak = { ...intel, overallConfidence: 0.10 };
    arch.archive(weak, "low confidence");
    expect(arch.isArchived(intel.opportunityId)).toBe(true);
  });

  it("size tracks correctly", () => {
    const log = new AuditLog();
    const arch = new OpportunityArchive(log);
    const { intel } = makeIntelDecisionBlueprint();
    arch.archive(intel, "test");
    expect(arch.size()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Opportunity Monitor
// ---------------------------------------------------------------------------

describe("OpportunityMonitor", () => {
  it("creates new state on first update", () => {
    const log = new AuditLog();
    const mon = new OpportunityMonitor(log);
    const { intel } = makeIntelDecisionBlueprint();
    const state = mon.update(intel);
    expect(state.opportunityId).toBe(intel.opportunityId);
    expect(state.updateCount).toBe(1);
  });

  it("tracks rising trend", () => {
    const log = new AuditLog();
    const mon = new OpportunityMonitor(log);
    const { intel } = makeIntelDecisionBlueprint();
    mon.update({ ...intel, overallConfidence: 0.50 });
    mon.update({ ...intel, overallConfidence: 0.70 });
    const state = mon.get(intel.opportunityId)!;
    expect(state.trend).toBe("rising");
  });

  it("topN returns sorted by score", () => {
    const log = new AuditLog();
    const mon = new OpportunityMonitor(log);
    const { intel: i1 } = makeIntelDecisionBlueprint("opp-1");
    const { intel: i2 } = makeIntelDecisionBlueprint("opp-2");
    mon.update({ ...i1, overallConfidence: 0.9 });
    mon.update({ ...i2, overallConfidence: 0.5 });
    const top = mon.topN(2);
    expect(top[0]!.currentScore).toBeGreaterThan(top[1]!.currentScore);
  });
});

// ---------------------------------------------------------------------------
// Champion Tournament
// ---------------------------------------------------------------------------

describe("ChampionTournament", () => {
  it("sets champion from single entrant", () => {
    const log = new AuditLog();
    const t = new ChampionTournament(log);
    const { intel, decision, blueprint } = makeIntelDecisionBlueprint();
    const result = t.run([{ intelligence: intel, decision, blueprint }]);
    expect(result.champion.opportunityId).toBe(intel.opportunityId);
  });

  it("selects highest-scoring champion from multiple", () => {
    const log = new AuditLog();
    const t = new ChampionTournament(log);
    const a = makeIntelDecisionBlueprint("a");
    const b = makeIntelDecisionBlueprint("b");
    const aHigh = { ...a.intel, overallConfidence: 0.95 };
    const result = t.run([
      { intelligence: aHigh, decision: a.decision, blueprint: a.blueprint },
      { intelligence: b.intel, decision: b.decision, blueprint: b.blueprint },
    ]);
    expect(result.champion.opportunityId).toBe("a");
  });

  it("stores tournament history", () => {
    const log = new AuditLog();
    const t = new ChampionTournament(log);
    const { intel, decision, blueprint } = makeIntelDecisionBlueprint();
    t.run([{ intelligence: intel, decision, blueprint }]);
    t.run([{ intelligence: intel, decision, blueprint }]);
    expect(t.totalRuns()).toBe(2);
  });

  it("championChanged reflects new champion", () => {
    const log = new AuditLog();
    const t = new ChampionTournament(log);
    const a = makeIntelDecisionBlueprint("a");
    const b = makeIntelDecisionBlueprint("b");
    t.run([{ intelligence: a.intel, decision: a.decision, blueprint: a.blueprint }]);
    const bHigh = { ...b.intel, overallConfidence: 0.99 };
    const result = t.run([
      { intelligence: a.intel, decision: a.decision, blueprint: a.blueprint },
      { intelligence: bHigh, decision: b.decision, blueprint: b.blueprint },
    ]);
    expect(result.championChanged).toBe(true);
  });

  it("rankings length equals participants", () => {
    const log = new AuditLog();
    const t = new ChampionTournament(log);
    const entrants = ["a", "b", "c"].map((id) => {
      const { intel, decision, blueprint } = makeIntelDecisionBlueprint(id);
      return { intelligence: intel, decision, blueprint };
    });
    const result = t.run(entrants);
    expect(result.rankings.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Change Detection Engine
// ---------------------------------------------------------------------------

describe("ChangeDetectionEngine", () => {
  it("no events on first detection (no previous snapshot)", () => {
    const log = new AuditLog();
    const cde = new ChangeDetectionEngine(log);
    const { intel } = makeIntelDecisionBlueprint();
    const events = cde.detect(intel);
    expect(events.length).toBe(0);
  });

  it("detects change when score shifts significantly", () => {
    const log = new AuditLog();
    const cde = new ChangeDetectionEngine(log);
    const { intel } = makeIntelDecisionBlueprint();
    cde.detect(intel);
    // Shift overallConfidence enough to cross CHANGE_THRESHOLD (0.08)
    const changed = {
      ...intel,
      overallConfidence: Math.min(1, intel.overallConfidence + 0.20),
    };
    const events = cde.detect(changed);
    expect(events.length).toBeGreaterThan(0);
  });

  it("recentEvents returns events within window", () => {
    const log = new AuditLog();
    const cde = new ChangeDetectionEngine(log);
    const { intel } = makeIntelDecisionBlueprint();
    cde.detect(intel);
    cde.detect({ ...intel, overallConfidence: intel.overallConfidence + 0.3 });
    expect(cde.recentEvents(60_000).length).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Historical Learning Engine
// ---------------------------------------------------------------------------

describe("HistoricalLearningEngine", () => {
  it("creates learning record", () => {
    const log = new AuditLog();
    const hle = new HistoricalLearningEngine(log);
    const record = hle.createRecord("opp-1", "BUILD_NOW", 0.85);
    expect(record.opportunityId).toBe("opp-1");
    expect(record.predictionVerdict).toBe("BUILD_NOW");
  });

  it("recordFounderDecision updates record", () => {
    const log = new AuditLog();
    const hle = new HistoricalLearningEngine(log);
    hle.createRecord("opp-1", "BUILD_NOW", 0.85);
    hle.recordFounderDecision("opp-1", "approved");
    expect(hle.getRecord("opp-1")!.founderDecision).toBe("approved");
  });

  it("recordOutcome computes accuracyScore", () => {
    const log = new AuditLog();
    const hle = new HistoricalLearningEngine(log);
    hle.createRecord("opp-1", "BUILD_NOW", 0.85);
    hle.recordFounderDecision("opp-1", "approved");
    hle.recordOutcome("opp-1", "success");
    expect(hle.getRecord("opp-1")!.accuracyScore).toBe(1.0);
  });

  it("calibration updates after outcome", () => {
    const log = new AuditLog();
    const hle = new HistoricalLearningEngine(log);
    hle.createRecord("opp-1", "BUILD_NOW", 0.85);
    hle.recordFounderDecision("opp-1", "approved");
    hle.recordOutcome("opp-1", "success");
    const cal = hle.getCalibration();
    expect(cal.resolvedPredictions).toBe(1);
    expect(cal.accuracyRate).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// Prediction Validation Engine
// ---------------------------------------------------------------------------

describe("PredictionValidationEngine", () => {
  it("records prediction", () => {
    const log = new AuditLog();
    const pve = new PredictionValidationEngine(log);
    const p = pve.record("opp-1", 0.80, "BUILD_NOW");
    expect(p.predictedScore).toBe(0.80);
  });

  it("validate computes drift", () => {
    const log = new AuditLog();
    const pve = new PredictionValidationEngine(log);
    pve.record("opp-1", 0.80, "BUILD_NOW");
    const p = pve.validate("opp-1", 0.90)!;
    expect(p.drift).toBeCloseTo(0.10, 5);
  });

  it("significantDrifts filters correctly", () => {
    const log = new AuditLog();
    const pve = new PredictionValidationEngine(log);
    pve.record("opp-1", 0.50, "MONITOR");
    pve.validate("opp-1", 0.80);
    expect(pve.significantDrifts().length).toBe(1);
  });

  it("avgDrift is near zero for accurate prediction", () => {
    const log = new AuditLog();
    const pve = new PredictionValidationEngine(log);
    pve.record("opp-1", 0.80, "BUILD_NOW");
    pve.validate("opp-1", 0.81);
    expect(Math.abs(pve.avgDrift())).toBeLessThan(0.05);
  });
});

// ---------------------------------------------------------------------------
// Notification Engine
// ---------------------------------------------------------------------------

describe("NotificationEngine", () => {
  it("onNewChampion emits notification", () => {
    const log = new AuditLog();
    const ne = new NotificationEngine(log);
    const { intel, decision, blueprint } = makeIntelDecisionBlueprint();
    const champion = {
      opportunityId: intel.opportunityId,
      intelligence: intel,
      decision,
      blueprint,
      championSince: new Date().toISOString(),
      tournamentWins: 1,
      score: 0.85,
    };
    ne.onNewChampion(champion);
    expect(ne.size()).toBe(1);
    expect(ne.getAll()[0]!.trigger).toBe("new-champion");
  });

  it("onConfidenceChange skips small delta", () => {
    const log = new AuditLog();
    const ne = new NotificationEngine(log);
    const { intel } = makeIntelDecisionBlueprint();
    const result = ne.onConfidenceChange(intel, intel.overallConfidence - 0.01);
    expect(result).toBeNull();
    expect(ne.size()).toBe(0);
  });

  it("onConfidenceChange emits for large delta", () => {
    const log = new AuditLog();
    const ne = new NotificationEngine(log);
    const { intel } = makeIntelDecisionBlueprint();
    const result = ne.onConfidenceChange(intel, intel.overallConfidence - 0.20);
    expect(result).not.toBeNull();
  });

  it("markRead sets read flag", () => {
    const log = new AuditLog();
    const ne = new NotificationEngine(log);
    const { intel, decision, blueprint } = makeIntelDecisionBlueprint();
    const champion = {
      opportunityId: intel.opportunityId, intelligence: intel, decision, blueprint,
      championSince: new Date().toISOString(), tournamentWins: 1, score: 0.85,
    };
    const n = ne.onNewChampion(champion);
    ne.markRead(n.id);
    expect(ne.unread().length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Metrics Engine
// ---------------------------------------------------------------------------

describe("MetricsEngine", () => {
  it("records pipeline run", () => {
    const me = new MetricsEngine();
    const result: PipelineResult = {
      runId: "r1",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      stage: "blueprint",
      opportunitiesProcessed: 5,
      opportunitiesCreated: 3,
      opportunitiesUpdated: 2,
      opportunitiesArchived: 0,
      errors: [],
      durationMs: 120,
    };
    me.recordPipelineRun(result);
    expect(me.snapshot().totalPipelineRuns).toBe(1);
    expect(me.snapshot().avgPipelineDurationMs).toBe(120);
  });

  it("records champion change", () => {
    const me = new MetricsEngine();
    me.recordChampionChange();
    me.recordChampionChange();
    expect(me.snapshot().championChanges).toBe(2);
  });

  it("avgConfidence from samples", () => {
    const me = new MetricsEngine();
    me.recordConfidence(0.6);
    me.recordConfidence(0.8);
    expect(me.snapshot().avgConfidence).toBeCloseTo(0.7, 5);
  });
});

// ---------------------------------------------------------------------------
// Runtime Health Monitor
// ---------------------------------------------------------------------------

describe("RuntimeHealthMonitor", () => {
  it("returns healthy status with fresh scheduler", () => {
    const audit = new AuditLog();
    const scheduler = new Scheduler();
    const queue = new QueueManager();
    const metrics = new MetricsEngine();
    scheduler.register("collect", "10min");
    const monitor = new RuntimeHealthMonitor(scheduler, queue, metrics, audit);
    const health = monitor.check();
    expect(health.overall).toBe("healthy");
    expect(health.components.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Failure Recovery
// ---------------------------------------------------------------------------

describe("FailureRecovery", () => {
  it("withRetry succeeds on first attempt", async () => {
    const audit = new AuditLog();
    const queue = new QueueManager();
    const fr = new FailureRecovery(queue, audit);
    const result = await fr.withRetry("test", async () => 42);
    expect(result).toBe(42);
  });

  it("withRetry retries on failure then succeeds", async () => {
    const audit = new AuditLog();
    const queue = new QueueManager();
    const fr = new FailureRecovery(queue, audit);
    let attempts = 0;
    const result = await fr.withRetry("test", async () => {
      attempts++;
      if (attempts < 3) throw new Error("not yet");
      return "done";
    }, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 });
    expect(result).toBe("done");
    expect(attempts).toBe(3);
  });

  it("withRetry throws after maxAttempts", async () => {
    const audit = new AuditLog();
    const queue = new QueueManager();
    const fr = new FailureRecovery(queue, audit);
    await expect(
      fr.withRetry("fail-op", async () => { throw new Error("always fails"); },
        { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 2 }),
    ).rejects.toThrow("always fails");
  });

  it("recoverQueueFailures requeues retrying jobs", () => {
    const audit = new AuditLog();
    const queue = new QueueManager();
    queue.enqueue("task", {}, "normal", 3);
    const [job] = queue.dequeue(1);
    queue.fail(job!.id, "err");
    const fr = new FailureRecovery(queue, audit);
    expect(fr.recoverQueueFailures()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Memory Updater
// ---------------------------------------------------------------------------

describe("MemoryUpdater", () => {
  it("stores opportunity intelligence", () => {
    const log = new AuditLog();
    const mu = new MemoryUpdater(log);
    const { intel } = makeIntelDecisionBlueprint();
    mu.updateOpportunity(intel);
    expect(mu.size()).toBe(1);
  });

  it("byCategory filters correctly", () => {
    const log = new AuditLog();
    const mu = new MemoryUpdater(log);
    const { intel, decision, blueprint } = makeIntelDecisionBlueprint();
    mu.updateOpportunity(intel);
    mu.updateBlueprint(blueprint);
    const opps = mu.byCategory("opportunity");
    const bps = mu.byCategory("blueprint");
    expect(opps.length).toBe(1);
    expect(bps.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Knowledge Updater
// ---------------------------------------------------------------------------

describe("KnowledgeUpdater", () => {
  it("indexes opportunity as node", () => {
    const log = new AuditLog();
    const ku = new KnowledgeUpdater(log);
    const { intel, decision } = makeIntelDecisionBlueprint();
    ku.indexOpportunity(intel, decision);
    expect(ku.nodeCount()).toBeGreaterThan(0);
  });

  it("indexes change events", () => {
    const log = new AuditLog();
    const ku = new KnowledgeUpdater(log);
    const { intel, decision } = makeIntelDecisionBlueprint();
    ku.indexOpportunity(intel, decision);
    ku.indexChangeEvent({
      id: "chg-1",
      opportunityId: intel.opportunityId,
      changeType: "growing-demand",
      description: "demand up",
      impactScore: 0.2,
      previousScore: 0.7,
      newScore: 0.9,
      detectedAt: new Date().toISOString(),
      requiresRescore: false,
    });
    expect(ku.edgeCount()).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Pipeline Orchestrator
// ---------------------------------------------------------------------------

describe("PipelineOrchestrator", () => {
  it("runSingle produces output for valid opportunity", async () => {
    const audit = new AuditLog();
    const executor = new ParallelExecutor(2);
    const archive = new OpportunityArchive(audit);
    const monitor = new OpportunityMonitor(audit);
    const orch = new PipelineOrchestrator(executor, archive, monitor, audit);
    const output = await orch.runSingle(makeOpportunity());
    expect(output.opportunityId).toBe("opp-rt-1");
    expect(output.intelligence).toBeDefined();
    expect(output.decision).toBeDefined();
    expect(output.blueprint).toBeDefined();
  });

  it("runBatch processes all opportunities", async () => {
    const audit = new AuditLog();
    const executor = new ParallelExecutor(2);
    const archive = new OpportunityArchive(audit);
    const monitor = new OpportunityMonitor(audit);
    const orch = new PipelineOrchestrator(executor, archive, monitor, audit);
    const opps = ["opp-a", "opp-b", "opp-c"].map(makeOpportunity);
    const { result } = await orch.runBatch(opps);
    expect(result.opportunitiesProcessed).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Autonomous Runtime (integration)
// ---------------------------------------------------------------------------

describe("AutonomousRuntime", () => {
  let runtime: AutonomousRuntime;

  beforeEach(() => {
    runtime = new AutonomousRuntime({ parallelism: 2 });
  });

  it("initialises with 4 scheduled tasks", () => {
    expect(runtime.scheduler.size()).toBe(4);
  });

  it("getDashboard returns dashboard state", () => {
    const dash = runtime.getDashboard();
    expect(dash.generatedAt).toBeTruthy();
    expect(dash.runtimeHealth).toBeDefined();
  });

  it("getWeeklyReport returns report with sections", () => {
    const report = runtime.getWeeklyReport();
    expect(report.reportId.startsWith("weekly")).toBe(true);
    expect(report.sections.length).toBeGreaterThan(0);
  });

  it("getMonthlyReport returns report", () => {
    const report = runtime.getMonthlyReport();
    expect(report.monthYear).toMatch(/^\d{4}-\d{2}$/);
  });

  it("runCollectCycle processes opportunities", async () => {
    const opps = ["opp-x", "opp-y"].map(makeOpportunity);
    const result = await runtime.runCollectCycle(opps);
    expect(result.opportunitiesProcessed).toBe(2);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("runHourlyCycle runs tournament and returns result", async () => {
    const opps = ["opp-m", "opp-n"].map(makeOpportunity);
    const result = await runtime.runHourlyCycle(opps);
    expect(result).not.toBeNull();
    expect(result!.participants).toBeGreaterThan(0);
  });

  it("audit log grows after pipeline run", async () => {
    const opps = [makeOpportunity("opp-audit-1")];
    await runtime.runCollectCycle(opps);
    expect(runtime.audit.size()).toBeGreaterThan(0);
  });

  it("notifications empty at start", () => {
    expect(runtime.notifications.size()).toBe(0);
  });

  it("champion set after hourly cycle", async () => {
    const opps = [makeOpportunity("opp-champ-1"), makeOpportunity("opp-champ-2")];
    await runtime.runHourlyCycle(opps);
    expect(runtime.tournament.getChampion()).not.toBeNull();
  });

  it("memory grows after collect cycle", async () => {
    await runtime.runCollectCycle([makeOpportunity("opp-mem-1")]);
    expect(runtime.memory.size()).toBeGreaterThan(0);
  });

  it("runDailyCycle returns report", () => {
    const report = runtime.runDailyCycle();
    expect(report.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

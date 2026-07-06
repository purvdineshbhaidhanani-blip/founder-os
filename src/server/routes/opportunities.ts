import { z } from "zod";
import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import { openSSE, type SseChannel } from "../sse.js";
import type { AppContext } from "../wiring.js";
import { requireSession } from "./guard.js";
import { generateId } from "../../utils/id.js";
import { MissingKeysError } from "../../research/engine.js";
import { exportAsJson, exportAsMarkdown } from "../../opportunities/export.js";
import type { ResearchProgressEvent, ResearchSession } from "../../research/types.js";
import type { ProblemIntelligenceReport } from "../../problems/types.js";
import type { FounderOpportunityReport, TopOpportunitiesReport } from "../../opportunities/types.js";

const RunBody = z.object({
  windowDays: z.number().int().positive().max(365).optional(),
  topic: z.string().trim().min(1).max(200).optional(),
});

/**
 * One-button pipeline route: chains ResearchEngine -> ProblemIntelligenceEngine
 * -> OpportunityEngine behind a single SSE progress stream, addressed by a
 * pipeline id this route mints itself (never the individual engines' own
 * session/report ids).
 *
 * Architecture note / deviation, mirroring `research.ts`'s own documented
 * deviation: `ResearchEngine.run()` can reject with `MissingKeysError`
 * before any real I/O happens, and we still need to respond 422
 * synchronously in that case while opening the SSE channel eagerly for the
 * success path. We reuse the exact same "race the settled run promise
 * against a `setImmediate` marker" technique `research.ts` uses — see the
 * comment block in that file for the full reasoning, which applies
 * unchanged here.
 *
 * Lookup note / deviation: the task spec offered two options for how
 * `/opportunities` and `/opportunities/:id` should look up a completed
 * pipeline's report — "via the OpportunityRepository, or from an in-memory
 * map keyed by pipelineId". Unlike `research.ts`'s `/api/research/:sessionId`
 * routes (where the URL param *is* the engine's own real session id, so a
 * `memory.recall({ key: sessionId })` fallback is meaningful across process
 * restarts), the `pipelineId` here is a stream id this route mints itself —
 * it is never persisted anywhere except this route's own in-memory map, and
 * is unrelated to `TopOpportunitiesReport.id` or `ResearchSession.id`. A
 * `memory`/`OpportunityRepository` fallback keyed by `pipelineId` therefore
 * cannot work even in principle. We use the in-memory map exclusively (same
 * data structure family as `research.ts`'s `progressSubscriptions`), which
 * is the only lookup path that is actually addressable by `pipelineId`.
 */

export type PipelineStage = "research" | "problems" | "opportunities" | "complete";

export type PipelineProgressEvent =
  | ({ stage: "research" } & ResearchProgressEvent)
  | { stage: "problems"; type: "progress"; percent: number; message: string }
  | { stage: "opportunities"; type: "progress"; percent: number; message: string }
  | { stage: "complete"; type: "complete"; topOpportunitiesReportId: string; pipelineId: string }
  | { stage: PipelineStage; type: "error"; message: string; missing?: string[] };

interface PipelineState {
  subscribers: Set<SseChannel>;
  /** Buffered events emitted before any subscriber connected. */
  buffered: PipelineProgressEvent[];
  /** Set once the pipeline finishes (successfully or not), so late subscribers still learn the outcome. */
  done: boolean;
  researchSession?: ResearchSession;
  problemReport?: ProblemIntelligenceReport;
  opportunityReport?: TopOpportunitiesReport;
  error?: { message: string; missing?: string[] };
}

const pipelineStates = new Map<string, PipelineState>();

function getOrCreateState(pipelineId: string): PipelineState {
  let state = pipelineStates.get(pipelineId);
  if (!state) {
    state = { subscribers: new Set(), buffered: [], done: false };
    pipelineStates.set(pipelineId, state);
  }
  return state;
}

function broadcast(pipelineId: string, event: PipelineProgressEvent): void {
  const state = getOrCreateState(pipelineId);
  state.buffered.push(event);
  for (const channel of state.subscribers) channel.send(event.type, event);
}

type RunOutcome =
  | { status: "resolved"; session: ResearchSession }
  | { status: "rejected"; error: unknown }
  | { status: "pending" };

/** Runs the problems + opportunities stages once the research stage has produced a session, broadcasting progress throughout. */
async function continuePipeline(
  ctx: AppContext,
  pipelineId: string,
  runPromise: Promise<ResearchSession>,
  immediateOutcome: RunOutcome,
): Promise<void> {
  const state = getOrCreateState(pipelineId);
  let session: ResearchSession;

  try {
    if (immediateOutcome.status === "resolved") {
      session = immediateOutcome.session;
    } else if (immediateOutcome.status === "rejected") {
      throw immediateOutcome.error;
    } else {
      session = await runPromise;
    }
  } catch (error) {
    state.done = true;
    const message = error instanceof Error ? error.message : String(error);
    state.error = { message };
    broadcast(pipelineId, { stage: "research", type: "source.failed", sourceId: "*", error: message });
    broadcast(pipelineId, { stage: "research", type: "error", message });
    return;
  }

  state.researchSession = session;

  try {
    broadcast(pipelineId, { stage: "problems", type: "progress", percent: 0, message: "Clustering problems from research findings..." });
    const problemReport = await ctx.problems.analyze(session);
    state.problemReport = problemReport;
    broadcast(pipelineId, {
      stage: "problems",
      type: "progress",
      percent: 100,
      message: `Clustered ${problemReport.clusters.length} problem cluster(s) from ${problemReport.totalItemsAnalyzed} item(s).`,
    });

    broadcast(pipelineId, { stage: "opportunities", type: "progress", percent: 0, message: "Scoring founder opportunities..." });
    const opportunityReport = await ctx.opportunities.analyze(session, problemReport);
    state.opportunityReport = opportunityReport;
    broadcast(pipelineId, {
      stage: "opportunities",
      type: "progress",
      percent: 100,
      message: `Ranked ${opportunityReport.opportunities.length} opportunit(y/ies) out of ${opportunityReport.totalClustersConsidered} cluster(s) considered.`,
    });

    state.done = true;
    broadcast(pipelineId, {
      stage: "complete",
      type: "complete",
      topOpportunitiesReportId: opportunityReport.id,
      pipelineId,
    });
  } catch (error) {
    state.done = true;
    const message = error instanceof Error ? error.message : String(error);
    state.error = { message };
    broadcast(pipelineId, { stage: "complete", type: "error", message });
  }
}

export function registerOpportunityPipelineRoutes(router: Router, ctx: AppContext): void {
  router.post<z.infer<typeof RunBody>>(
    "/api/pipeline/run",
    async (reqCtx) => {
      if (!requireSession(reqCtx)) return;

      const windowDays = reqCtx.body.windowDays ?? 30;
      const topic = reqCtx.body.topic;
      const pipelineId = generateId("pipeline");
      getOrCreateState(pipelineId);

      const runPromise = ctx.research.run(
        windowDays,
        (event) => broadcast(pipelineId, { ...event, stage: "research" }),
        topic,
      );
      const settledPromise: Promise<RunOutcome> = runPromise.then(
        (session) => ({ status: "resolved" as const, session }),
        (error) => ({ status: "rejected" as const, error }),
      );
      // Swallow here so an eventual rejection isn't reported as an unhandled
      // rejection while we race below — the real handling happens in
      // `continuePipeline` further down.
      runPromise.catch(() => undefined);

      const immediateOutcome = await Promise.race<RunOutcome>([
        settledPromise,
        new Promise<RunOutcome>((resolve) => {
          setImmediate(() => resolve({ status: "pending" }));
        }),
      ]);

      if (immediateOutcome.status === "rejected" && immediateOutcome.error instanceof MissingKeysError) {
        const state = getOrCreateState(pipelineId);
        state.done = true;
        state.error = { message: immediateOutcome.error.message, missing: immediateOutcome.error.missingEnv };
        sendJson(reqCtx.res, 422, {
          error: immediateOutcome.error.message,
          missing: immediateOutcome.error.missingEnv,
        });
        return;
      }

      // Respond with the pipeline id so the caller can open the SSE
      // connection (it may already have raced ahead and connected).
      sendJson(reqCtx.res, 202, { pipelineId });

      void continuePipeline(ctx, pipelineId, runPromise, immediateOutcome);
    },
    RunBody,
  );

  router.get("/api/pipeline/:pipelineId/progress", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const pipelineId = reqCtx.params.pipelineId!;
    const state = getOrCreateState(pipelineId);
    const channel = openSSE(reqCtx.res);

    for (const event of state.buffered) channel.send(event.type, event);
    if (state.done) {
      if (state.error) {
        channel.send("error", { stage: "complete", type: "error", ...state.error });
      } else if (state.opportunityReport) {
        channel.send("complete", {
          stage: "complete",
          type: "complete",
          topOpportunitiesReportId: state.opportunityReport.id,
          pipelineId,
        });
      }
      channel.close();
      return;
    }

    state.subscribers.add(channel);
    reqCtx.req.on("close", () => {
      state.subscribers.delete(channel);
    });
  });

  router.get("/api/pipeline/:pipelineId/opportunities", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const pipelineId = reqCtx.params.pipelineId!;
    const state = pipelineStates.get(pipelineId);

    if (!state || !state.opportunityReport) {
      sendJson(reqCtx.res, 404, {
        error: state?.error?.message ?? "Unknown pipeline, or the pipeline has not produced opportunities yet.",
      });
      return;
    }

    sendJson(reqCtx.res, 200, state.opportunityReport);
  });

  router.get("/api/pipeline/:pipelineId/opportunities/:opportunityId", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const pipelineId = reqCtx.params.pipelineId!;
    const opportunityId = reqCtx.params.opportunityId!;
    const state = pipelineStates.get(pipelineId);

    if (!state || !state.opportunityReport) {
      sendJson(reqCtx.res, 404, {
        error: state?.error?.message ?? "Unknown pipeline, or the pipeline has not produced opportunities yet.",
      });
      return;
    }

    const opportunity = state.opportunityReport.opportunities.find((entry) => entry.id === opportunityId);
    if (!opportunity) {
      sendJson(reqCtx.res, 404, { error: "Unknown opportunity for this pipeline." });
      return;
    }

    sendJson(reqCtx.res, 200, opportunity);
  });

  router.get("/api/pipeline/:pipelineId/export", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const pipelineId = reqCtx.params.pipelineId!;
    const state = pipelineStates.get(pipelineId);

    if (!state || !state.opportunityReport) {
      sendJson(reqCtx.res, 404, {
        error: state?.error?.message ?? "Unknown pipeline, or the pipeline has not produced opportunities yet.",
      });
      return;
    }

    const format = reqCtx.query.get("format") === "json" ? "json" : "markdown";
    const body = format === "json" ? exportAsJson(state.opportunityReport) : exportAsMarkdown(state.opportunityReport);
    const contentType = format === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8";
    const filename = format === "json" ? "founder-report.json" : "founder-report.md";

    reqCtx.res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": Buffer.byteLength(body),
    });
    reqCtx.res.end(body);
  });
}

/**
 * Shared, read-only accessor for the pipeline's completed opportunity report,
 * keyed by the same `pipelineId` this route mints. Exported so sibling routes
 * (e.g. the Founder Copilot) can resolve an opportunity WITHOUT duplicating
 * the `pipelineStates` lookup or re-running the pipeline. Returns `undefined`
 * when the pipeline is unknown or has not yet produced opportunities.
 */
export function getPipelineOpportunityReport(pipelineId: string): TopOpportunitiesReport | undefined {
  return pipelineStates.get(pipelineId)?.opportunityReport;
}

/** Resolves a single opportunity within a pipeline's report — same lookup the `/opportunities/:opportunityId` route uses. */
export function getPipelineOpportunity(
  pipelineId: string,
  opportunityId: string,
): FounderOpportunityReport | undefined {
  return getPipelineOpportunityReport(pipelineId)?.opportunities.find((entry) => entry.id === opportunityId);
}

/** Test-only hook to reset in-memory pipeline state between test cases. */
export function __resetPipelineStreamsForTests(): void {
  pipelineStates.clear();
}

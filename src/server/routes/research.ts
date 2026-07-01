import { z } from "zod";
import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import { openSSE, type SseChannel } from "../sse.js";
import type { AppContext } from "../wiring.js";
import { requireSession } from "./guard.js";
import { generateId } from "../../utils/id.js";
import { MissingKeysError } from "../../research/engine.js";
import type { ResearchProgressEvent, ResearchSession } from "../../research/types.js";

const RunBody = z.object({
  windowDays: z.number().int().positive().max(365).optional(),
});

/**
 * Architecture note / deviation from a literal reading of the task spec:
 *
 * `ResearchEngine.run(windowDays, onProgress)` returns a single Promise that
 * only resolves (or rejects) once every eligible source adapter has
 * settled — there is no separate "start" call that hands back a session id
 * synchronously before work begins. `MissingKeysError` is thrown from
 * *inside* that same async function, before the adapter fan-out starts, but
 * because `run()` is declared `async`, that throw still surfaces as a
 * rejected Promise rather than a synchronous exception — it cannot be
 * caught with a plain try/catch around the call without awaiting.
 *
 * To satisfy both requirements ("422 on MissingKeysError" AND "SSE
 * connection opened before work starts") we:
 *   1. Mint a streaming sessionId and register its subscriber list
 *      immediately (so a client racing to open the SSE connection right
 *      after receiving our response never misses an event).
 *   2. Race `engine.run()`'s settlement against a `setImmediate` marker —
 *      `MissingKeysError` is thrown synchronously (before any `await`
 *      inside `run()`), so the run promise is *already rejected* well
 *      before the event loop reaches its next `setImmediate` callback
 *      (which only runs once the microtask queue has fully drained). This
 *      lets us detect it and respond 422 without waiting for any network
 *      I/O, while still preserving the "respond before adapters run"
 *      property for the success path.
 *   3. On the success path, respond 202 with the streaming sessionId
 *      immediately and let the run continue, broadcasting progress to any
 *      SSE subscribers for that id as it goes.
 *
 * The engine's own internally-generated session id (on the resulting
 * ResearchSession) differs from this pre-issued streaming id; both are
 * tracked so `/report` and `/:sessionId` can be looked up by the engine's
 * real id once the run completes, while progress events are addressed by
 * the pre-issued streaming id.
 */

interface ProgressSubscription {
  subscribers: Set<SseChannel>;
  /** Buffered events emitted before any subscriber connected. */
  buffered: ResearchProgressEvent[];
  /** Set once the run completes (successfully or not), so late subscribers still learn the outcome. */
  done: boolean;
  session?: ResearchSession;
  error?: { message: string; missing?: string[] };
}

const progressSubscriptions = new Map<string, ProgressSubscription>();

function getOrCreateSubscription(streamId: string): ProgressSubscription {
  let sub = progressSubscriptions.get(streamId);
  if (!sub) {
    sub = { subscribers: new Set(), buffered: [], done: false };
    progressSubscriptions.set(streamId, sub);
  }
  return sub;
}

function broadcast(streamId: string, event: ResearchProgressEvent): void {
  const sub = getOrCreateSubscription(streamId);
  sub.buffered.push(event);
  for (const channel of sub.subscribers) channel.send(event.type, event);
}

export function registerResearchRoutes(router: Router, ctx: AppContext): void {
  router.post<z.infer<typeof RunBody>>(
    "/api/research/run",
    async (reqCtx) => {
      if (!requireSession(reqCtx)) return;

      const windowDays = reqCtx.body.windowDays ?? 30;
      const streamId = generateId("stream");
      const sub = getOrCreateSubscription(streamId);

      const runPromise = ctx.research.run(windowDays, (event) => broadcast(streamId, event));
      const settledPromise = runPromise.then(
        (session) => ({ status: "resolved" as const, session }),
        (error) => ({ status: "rejected" as const, error }),
      );
      // Swallow here so an eventual rejection isn't reported as an unhandled
      // rejection while we race below — the real handling happens off
      // `settledPromise` further down.
      runPromise.catch(() => undefined);

      // MissingKeysError (and any other failure that happens before the
      // engine's first genuine `await`, e.g. adapter I/O) rejects on one of
      // the very first microtask turns. `setImmediate` runs after the
      // microtask queue has fully drained, so racing against it reliably
      // observes a same-tick-ish rejection without waiting on real adapter
      // I/O (which only resolves after network round-trips, far later).
      const immediateOutcome = await Promise.race([
        settledPromise,
        new Promise<{ status: "pending" }>((resolve) => {
          setImmediate(() => resolve({ status: "pending" }));
        }),
      ]);

      if (immediateOutcome.status === "rejected" && immediateOutcome.error instanceof MissingKeysError) {
        sub.done = true;
        sub.error = { message: immediateOutcome.error.message, missing: immediateOutcome.error.missingEnv };
        sendJson(reqCtx.res, 422, {
          error: immediateOutcome.error.message,
          missing: immediateOutcome.error.missingEnv,
        });
        return;
      }

      // Respond with the streaming session id so the caller can open the
      // SSE connection (it may already have raced ahead and connected).
      sendJson(reqCtx.res, 202, { sessionId: streamId });

      if (immediateOutcome.status === "resolved") {
        sub.done = true;
        sub.session = immediateOutcome.session;
        return;
      }
      if (immediateOutcome.status === "rejected") {
        sub.done = true;
        const message =
          immediateOutcome.error instanceof Error ? immediateOutcome.error.message : String(immediateOutcome.error);
        sub.error = { message };
        broadcast(streamId, { type: "source.failed", sourceId: "*", error: message });
        return;
      }

      // Still running — let it finish in the background and broadcast to
      // whatever SSE subscribers connect for this streamId.
      try {
        const session = await runPromise;
        sub.done = true;
        sub.session = session;
      } catch (error) {
        sub.done = true;
        const message = error instanceof Error ? error.message : String(error);
        sub.error = { message };
        broadcast(streamId, { type: "source.failed", sourceId: "*", error: message });
      }
    },
    RunBody,
  );

  router.get("/api/research/:sessionId/progress", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const streamId = reqCtx.params.sessionId!;
    const sub = getOrCreateSubscription(streamId);
    const channel = openSSE(reqCtx.res);

    for (const event of sub.buffered) channel.send(event.type, event);
    if (sub.done) {
      if (sub.error) {
        channel.send("error", sub.error);
      } else if (sub.session) {
        channel.send("complete", { session: sub.session });
      }
      channel.close();
      return;
    }

    sub.subscribers.add(channel);
    reqCtx.req.on("close", () => {
      sub.subscribers.delete(channel);
    });
  });

  router.get("/api/research/:sessionId/report", async (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const sessionId = reqCtx.params.sessionId!;

    const bySubscription = [...progressSubscriptions.values()].find(
      (sub) => sub.session?.id === sessionId,
    );
    if (bySubscription?.session) {
      sendJson(reqCtx.res, 200, bySubscription.session.report);
      return;
    }

    const recalled = await ctx.memory.recall({ namespace: "project", key: sessionId });
    const entry = recalled.find((item) => item.key === sessionId);
    if (!entry) {
      sendJson(reqCtx.res, 404, { error: "Unknown research session." });
      return;
    }
    const session = entry.data as ResearchSession;
    sendJson(reqCtx.res, 200, session.report);
  });

  router.get("/api/research/sessions", async (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    // ResearchEngine persists every completed session as a "report" artifact
    // (see research/engine.ts's `artifacts.register({ kind: "report", ... })`)
    // and also indexes it in project memory. Artifacts carry the lighter
    // metadata needed for a session list without deserializing full session
    // bodies.
    const reports = ctx.artifacts.list({ kind: "report" });
    const sessions = reports
      .filter((artifact) => typeof artifact.metadata.sessionId === "string")
      .map((artifact) => ({
        sessionId: artifact.metadata.sessionId as string,
        windowDays: artifact.metadata.windowDays as number | undefined,
        artifactId: artifact.id,
        createdAt: artifact.createdAt,
      }));
    sendJson(reqCtx.res, 200, sessions);
  });

  router.get("/api/research/:sessionId", async (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const sessionId = reqCtx.params.sessionId!;

    const bySubscription = [...progressSubscriptions.values()].find(
      (sub) => sub.session?.id === sessionId,
    );
    if (bySubscription?.session) {
      sendJson(reqCtx.res, 200, bySubscription.session);
      return;
    }

    const recalled = await ctx.memory.recall({ namespace: "project", key: sessionId });
    const entry = recalled.find((item) => item.key === sessionId);
    if (!entry) {
      sendJson(reqCtx.res, 404, { error: "Unknown research session." });
      return;
    }
    sendJson(reqCtx.res, 200, entry.data);
  });
}

/** Test-only hook to reset in-memory subscription state between test cases. */
export function __resetResearchStreamsForTests(): void {
  progressSubscriptions.clear();
}

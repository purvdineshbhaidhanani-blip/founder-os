import { z } from "zod";
import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import type { AppContext } from "../wiring.js";
import { requireSession } from "./guard.js";

/**
 * Monitoring routes — the production HTTP surface over the autonomous
 * monitoring engine (`src/monitoring/engine.ts`), which itself reuses the
 * existing providers and pure diff engine unchanged.
 *
 *   GET  /api/monitoring/providers  — list configured providers
 *   POST /api/monitoring/run        — trigger a monitoring job, return changes
 *   GET  /api/monitoring/snapshot   — read the last persisted snapshot
 *   GET  /api/monitoring/runs       — list recent runs
 *
 * All routes require an authenticated session, mirroring the research and
 * opportunity pipeline routes.
 */

const MONITOR_CATEGORIES = [
  "competitor-launch",
  "pricing",
  "feature-release",
  "funding",
  "product-hunt",
  "trending-github",
  "complaint",
  "market",
] as const;

const RunBody = z.object({
  query: z.string().trim().min(1).max(500),
  windowDays: z.number().int().positive().max(365).optional(),
  providerIds: z.array(z.string().min(1)).min(1).max(20).optional(),
  category: z.enum(MONITOR_CATEGORIES).optional(),
});

export function registerMonitoringRoutes(router: Router, ctx: AppContext): void {
  router.get("/api/monitoring/providers", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    sendJson(reqCtx.res, 200, { providers: ctx.monitoring.listProviders() });
  });

  router.post<z.infer<typeof RunBody>>(
    "/api/monitoring/run",
    async (reqCtx) => {
      if (!requireSession(reqCtx)) return;
      const result = await ctx.monitoring.run({
        query: reqCtx.body.query,
        windowDays: reqCtx.body.windowDays,
        providerIds: reqCtx.body.providerIds,
        category: reqCtx.body.category,
      });
      sendJson(reqCtx.res, 200, result);
    },
    RunBody,
  );

  router.get("/api/monitoring/snapshot", async (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const providerId = reqCtx.query.get("providerId");
    const query = reqCtx.query.get("query");
    if (!providerId || !query) {
      sendJson(reqCtx.res, 400, { error: "Both 'providerId' and 'query' query parameters are required." });
      return;
    }
    const snapshot = await ctx.monitoring.getSnapshot(providerId, query);
    if (!snapshot) {
      sendJson(reqCtx.res, 404, { error: "No snapshot exists yet for that provider/query." });
      return;
    }
    sendJson(reqCtx.res, 200, snapshot);
  });

  router.get("/api/monitoring/runs", async (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const limitParam = reqCtx.query.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(100, Number.parseInt(limitParam, 10) || 20)) : 20;
    const runs = await ctx.monitoring.listRuns(limit);
    sendJson(reqCtx.res, 200, { runs });
  });
}

import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import type { AppContext } from "../wiring.js";
import { requireSession } from "./guard.js";

export function registerDashboardRoutes(router: Router, ctx: AppContext): void {
  router.get("/api/dashboard", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    sendJson(reqCtx.res, 200, ctx.commandCenter.founderDashboard());
  });
}

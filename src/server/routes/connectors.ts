import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import type { AppContext } from "../wiring.js";
import { requireSession } from "./guard.js";

export interface ConnectorStatusView {
  id: string;
  name: string;
  status: string;
  missingEnv: string[];
  required: boolean;
}

/** Connectors relevant to the research engine — the only ones the frontend needs status for today. */
const RESEARCH_CONNECTOR_IDS = new Set(["github", "youtube", "stackexchange"]);

/**
 * `hackernews` and `rss` are keyless research sources that never appear in
 * the ConnectorRegistry (they need no credentials to run), so they are
 * synthesized here as always-configured entries rather than being added to
 * the registry itself.
 */
const KEYLESS_RESEARCH_SOURCES: ConnectorStatusView[] = [
  { id: "hackernews", name: "Hacker News", status: "configured", missingEnv: [], required: false },
  { id: "rss", name: "RSS", status: "configured", missingEnv: [], required: false },
];

function missingEnvFromNotes(notes?: string): string[] {
  const prefix = "Missing: ";
  if (notes?.startsWith(prefix)) return notes.slice(prefix.length).split(", ").filter(Boolean);
  return [];
}

export function registerConnectorRoutes(router: Router, ctx: AppContext): void {
  router.get("/api/connectors/status", (reqCtx) => {
    if (!requireSession(reqCtx)) return;

    const registered: ConnectorStatusView[] = ctx.connectors
      .list()
      .filter((record) => RESEARCH_CONNECTOR_IDS.has(record.id))
      .map((record) => ({
        id: record.id,
        name: record.name,
        status: record.status,
        missingEnv: missingEnvFromNotes(record.notes),
        required: record.requiredEnv.length > 0,
      }));

    sendJson(reqCtx.res, 200, [...registered, ...KEYLESS_RESEARCH_SOURCES]);
  });
}

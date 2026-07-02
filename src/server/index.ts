import http, { type IncomingMessage, type ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router, sendJson } from "./router.js";
import { composeAppContext, type AppContext } from "./wiring.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerConnectorRoutes } from "./routes/connectors.js";
import { registerResearchRoutes } from "./routes/research.js";
import { registerOpportunityPipelineRoutes } from "./routes/opportunities.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("server");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Repo root resolved relative to this compiled module (dist/server -> repo root, or src/server -> repo root). */
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WEB_DIST_DIR = path.join(REPO_ROOT, "web", "dist");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const PLACEHOLDER_HTML = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Founder OS</title></head>
  <body>
    <h1>Founder OS</h1>
    <p>The web frontend has not been built yet (expected at <code>web/dist/</code>).</p>
    <p>The API is available under <code>/api/*</code>.</p>
  </body>
</html>
`;

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", "http://localhost");
  const webDistExists = fs.existsSync(WEB_DIST_DIR);

  if (!webDistExists) {
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(PLACEHOLDER_HTML);
      return;
    }
    sendJson(res, 404, { error: "Web frontend has not been built yet." });
    return;
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolved = path.normalize(path.join(WEB_DIST_DIR, requestedPath));

  // Prevent path traversal outside the dist directory.
  if (!resolved.startsWith(WEB_DIST_DIR)) {
    sendJson(res, 400, { error: "Invalid path." });
    return;
  }

  const finalPath = fs.existsSync(resolved) && fs.statSync(resolved).isFile()
    ? resolved
    : path.join(WEB_DIST_DIR, "index.html");

  if (!fs.existsSync(finalPath)) {
    sendJson(res, 404, { error: "Not found." });
    return;
  }

  const ext = path.extname(finalPath);
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(finalPath).pipe(res);
}

/** Builds the Node http.Server wiring every API route plus static file serving of web/dist/. */
export function createServer(ctx: AppContext): http.Server {
  const router = new Router();

  registerAuthRoutes(router);
  registerDashboardRoutes(router, ctx);
  registerConnectorRoutes(router, ctx);
  registerResearchRoutes(router, ctx);
  registerOpportunityPipelineRoutes(router, ctx);

  return http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      void router.handle(req, res);
      return;
    }
    serveStatic(req, res);
  });
}

export function startServer(port = Number(process.env.PORT) || 4173): { server: http.Server; ctx: AppContext } {
  const ctx = composeAppContext();
  const server = createServer(ctx);
  server.listen(port, () => {
    logger.info(`Founder OS server listening on port ${port}`);
  });
  return { server, ctx };
}

function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const normalizedEntry = entry.replace(/\\/g, "/");
  return import.meta.url.endsWith(normalizedEntry) || normalizedEntry.endsWith("server/index.ts") || normalizedEntry.endsWith("server/index.js");
}

if (isDirectInvocation()) {
  startServer();
}

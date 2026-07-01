import type { IncomingMessage, ServerResponse } from "node:http";
import type { ZodSchema } from "zod";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("server.router");

export interface RouteParams {
  [key: string]: string;
}

export interface RequestContext<TBody = unknown> {
  req: IncomingMessage;
  res: ServerResponse;
  params: RouteParams;
  query: URLSearchParams;
  body: TBody;
}

export type RouteHandler<TBody = unknown> = (ctx: RequestContext<TBody>) => void | Promise<void>;

interface CompiledRoute {
  method: string;
  segments: string[];
  handler: RouteHandler;
  bodySchema?: ZodSchema;
}

/** Sends a JSON response with the given status code. */
export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function splitPath(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

function matchSegments(routeSegments: string[], requestSegments: string[]): RouteParams | null {
  if (routeSegments.length !== requestSegments.length) return null;
  const params: RouteParams = {};
  for (let i = 0; i < routeSegments.length; i += 1) {
    const routeSegment = routeSegments[i]!;
    const requestSegment = requestSegments[i]!;
    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(requestSegment);
    } else if (routeSegment !== requestSegment) {
      return null;
    }
  }
  return params;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Minimal typed router for the Founder OS HTTP API — no external routing
 * dependency. Supports `:param` path segments, a JSON body reader with
 * optional zod validation, and per-route method dispatch.
 */
export class Router {
  private readonly routes: CompiledRoute[] = [];

  get<TBody = unknown>(path: string, handler: RouteHandler<TBody>): void {
    this.routes.push({ method: "GET", segments: splitPath(path), handler: handler as RouteHandler });
  }

  post<TBody = unknown>(path: string, handler: RouteHandler<TBody>, bodySchema?: ZodSchema<TBody>): void {
    this.routes.push({
      method: "POST",
      segments: splitPath(path),
      handler: handler as RouteHandler,
      bodySchema: bodySchema as ZodSchema | undefined,
    });
  }

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");
    const requestSegments = splitPath(url.pathname);

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = matchSegments(route.segments, requestSegments);
      if (params === null) continue;

      let body: unknown = undefined;
      if (method === "POST") {
        const raw = await readBody(req);
        if (raw.length > 0) {
          try {
            body = JSON.parse(raw);
          } catch {
            sendJson(res, 400, { error: "Invalid JSON body." });
            return;
          }
        } else {
          body = {};
        }

        if (route.bodySchema) {
          const parsed = route.bodySchema.safeParse(body);
          if (!parsed.success) {
            sendJson(res, 400, { error: parsed.error.issues.map((issue) => issue.message).join("; ") });
            return;
          }
          body = parsed.data;
        }
      }

      try {
        await route.handler({ req, res, params, query: url.searchParams, body });
      } catch (error) {
        logger.error("unhandled route error", {
          path: url.pathname,
          error: error instanceof Error ? error.message : String(error),
        });
        if (!res.headersSent) sendJson(res, 500, { error: "Internal server error." });
      }
      return;
    }

    sendJson(res, 404, { error: "Not found." });
  }
}

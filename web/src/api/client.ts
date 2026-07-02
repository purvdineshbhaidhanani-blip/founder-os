import type {
  ApiErrorBody,
  ConnectorStatusView,
  FounderDashboardView,
  FounderOpportunityReport,
  LoginResponse,
  MeResponse,
  PipelineProgressEvent,
  ResearchProgressEvent,
  ResearchSession,
  ResearchSessionSummary,
  RunPipelineAccepted,
  RunResearchAccepted,
  RunResearchMissingKeys,
  FounderReport,
  TopOpportunitiesReport,
} from "./types";

const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error || `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, (payload as ApiErrorBody) ?? { error: res.statusText });
  }

  return payload as T;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export function me(): Promise<MeResponse> {
  return request<MeResponse>("/auth/me");
}

export function getDashboard(): Promise<FounderDashboardView> {
  return request<FounderDashboardView>("/dashboard");
}

export function getConnectorStatus(): Promise<ConnectorStatusView[]> {
  return request<ConnectorStatusView[]>("/connectors/status");
}

/**
 * Kicks off a research run. Resolves with the streaming sessionId on success
 * (202). On a 422 (MissingKeysError) the promise rejects with an ApiError
 * whose `.body` carries `{ error, missing }` — callers should catch ApiError
 * and render `error.body.missing` to the user rather than a generic message.
 *
 * `topic`, when provided, narrows research to that topic instead of general
 * discovery — see src/research/types.ts's `SourceAdapter.fetch` `topic` param.
 */
export function runResearch(windowDays: number, topic?: string): Promise<RunResearchAccepted> {
  return request<RunResearchAccepted>("/research/run", {
    method: "POST",
    body: JSON.stringify({ windowDays, ...(topic ? { topic } : {}) }),
  });
}

export function isMissingKeysError(error: unknown): error is ApiError & { body: RunResearchMissingKeys } {
  return error instanceof ApiError && error.status === 422 && Array.isArray(error.body.missing);
}

export function getReport(sessionId: string): Promise<FounderReport> {
  return request<FounderReport>(`/research/${encodeURIComponent(sessionId)}/report`);
}

export function getSession(sessionId: string): Promise<ResearchSession> {
  return request<ResearchSession>(`/research/${encodeURIComponent(sessionId)}`);
}

export function getSessions(): Promise<ResearchSessionSummary[]> {
  return request<ResearchSessionSummary[]>("/research/sessions");
}

/**
 * Subscribes to the SSE progress stream for a research run's streaming
 * sessionId (the id returned by `runResearch`, not the engine's own session
 * id). Named events are: source.start, source.done, source.failed, progress,
 * complete, error — matching src/research/types.ts's ResearchProgressEvent
 * plus the server's synthetic "error" event (src/server/routes/research.ts).
 */
export function subscribeProgress(
  sessionId: string,
  onEvent: (event: ResearchProgressEvent) => void,
): () => void {
  const source = new EventSource(
    `${API_BASE}/research/${encodeURIComponent(sessionId)}/progress`,
    { withCredentials: true },
  );

  const eventNames = ["source.start", "source.done", "source.failed", "progress", "complete", "error"] as const;

  for (const name of eventNames) {
    source.addEventListener(name, (evt) => {
      const messageEvent = evt as MessageEvent<string>;
      try {
        const data = JSON.parse(messageEvent.data);
        onEvent({ type: name, ...data } as ResearchProgressEvent);
      } catch {
        // Ignore malformed events rather than crashing the subscriber.
      }
    });
  }

  return () => source.close();
}

/**
 * Kicks off the full one-button pipeline (research -> problem clustering ->
 * opportunity scoring). Resolves with the pipelineId on success (202). On a
 * 422 (MissingKeysError, thrown before the research stage even starts) the
 * promise rejects with an ApiError whose `.body` carries
 * `{ error, missing }` — same shape as `runResearch`'s 422, so
 * `isMissingKeysError` works for either.
 *
 * `topic`, when provided, narrows research to that topic instead of general
 * discovery — see `runResearch`'s doc comment.
 */
export function runPipeline(windowDays: number, topic?: string): Promise<RunPipelineAccepted> {
  return request<RunPipelineAccepted>("/pipeline/run", {
    method: "POST",
    body: JSON.stringify({ windowDays, ...(topic ? { topic } : {}) }),
  });
}

export function getPipelineOpportunities(pipelineId: string): Promise<TopOpportunitiesReport> {
  return request<TopOpportunitiesReport>(`/pipeline/${encodeURIComponent(pipelineId)}/opportunities`);
}

export function getOpportunityDetail(pipelineId: string, opportunityId: string): Promise<FounderOpportunityReport> {
  return request<FounderOpportunityReport>(
    `/pipeline/${encodeURIComponent(pipelineId)}/opportunities/${encodeURIComponent(opportunityId)}`,
  );
}

/** Builds the download URL for a pipeline's exported report — a plain same-origin link so the browser sends the session cookie on navigation. */
export function getPipelineExportUrl(pipelineId: string, format: "markdown" | "json"): string {
  return `${API_BASE}/pipeline/${encodeURIComponent(pipelineId)}/export?format=${format}`;
}

/**
 * Subscribes to the SSE progress stream for a pipeline run's pipelineId (the
 * id returned by `runPipeline`). Named events mirror
 * src/server/routes/opportunities.ts's PipelineProgressEvent: every
 * forwarded research-stage event keeps its original name (source.start,
 * source.done, source.failed, progress, complete), plus the synthetic
 * "progress" events for the problems/opportunities stages, the final
 * "complete" event (distinguished from research's own "complete" by its
 * `stage: "complete"` field), and a synthetic "error" event on fatal
 * failure.
 */
export function subscribePipelineProgress(
  pipelineId: string,
  onEvent: (event: PipelineProgressEvent) => void,
): () => void {
  const source = new EventSource(
    `${API_BASE}/pipeline/${encodeURIComponent(pipelineId)}/progress`,
    { withCredentials: true },
  );

  const eventNames = ["source.start", "source.done", "source.failed", "progress", "complete", "error"] as const;

  for (const name of eventNames) {
    source.addEventListener(name, (evt) => {
      const messageEvent = evt as MessageEvent<string>;
      try {
        const data = JSON.parse(messageEvent.data);
        onEvent(data as PipelineProgressEvent);
      } catch {
        // Ignore malformed events rather than crashing the subscriber.
      }
    });
  }

  return () => source.close();
}

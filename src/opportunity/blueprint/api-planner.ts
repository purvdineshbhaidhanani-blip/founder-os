import type { BlueprintContext, APIPlan, APIEndpoint } from "./types.js";

// ---------------------------------------------------------------------------
// API Planner
// Generates core REST endpoints based on product category.
// ---------------------------------------------------------------------------

export function planAPI(ctx: BlueprintContext): APIPlan {
  const { intelligence: intel } = ctx;

  const endpoints: APIEndpoint[] = [
    // Auth
    { method: "POST", path: "/auth/signup", description: "Create account" },
    { method: "POST", path: "/auth/login", description: "Authenticate user, return JWT" },
    { method: "DELETE", path: "/auth/logout", description: "Invalidate session" },

    // Core resource (generic — named after problem domain)
    { method: "GET", path: "/v1/items", description: "List all items with pagination + filters" },
    { method: "POST", path: "/v1/items", description: "Create new item" },
    { method: "GET", path: "/v1/items/:id", description: "Get single item by ID" },
    { method: "PATCH", path: "/v1/items/:id", description: "Update item" },
    { method: "DELETE", path: "/v1/items/:id", description: "Delete item" },

    // AI endpoint
    ...(intel.aiReadinessScore.score >= 0.5 ? [
      { method: "POST", path: "/v1/ai/process", description: "Trigger AI processing on input, returns streamed result" },
      { method: "GET", path: "/v1/ai/status/:jobId", description: "Poll async AI job status" },
    ] : []),

    // Integration/webhook
    { method: "POST", path: "/v1/webhooks", description: "Register webhook endpoint" },
    { method: "GET", path: "/v1/webhooks", description: "List registered webhooks" },

    // Analytics
    { method: "GET", path: "/v1/analytics/summary", description: "Dashboard summary metrics" },
    { method: "GET", path: "/v1/analytics/events", description: "Paginated event timeline" },
  ];

  const webhooks = [
    "item.created — fires when new item created",
    "item.updated — fires on any field change",
    "ai.completed — fires when async AI job finishes",
    "integration.error — fires when downstream API fails",
  ];

  return {
    style: "REST+Webhooks",
    coreEndpoints: endpoints,
    webhooks,
    authentication: "JWT (short-lived access token) + refresh token rotation; API keys for server-to-server",
    rationale: `REST chosen for broad client compatibility. Webhooks for real-time integrations. AI endpoints use streaming (SSE) for UX responsiveness.`,
  };
}

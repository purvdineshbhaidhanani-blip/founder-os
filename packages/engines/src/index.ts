/**
 * Universal Platform Engines — reusable, provider-agnostic building blocks
 * (AI, workflow, automation, search, knowledge, notification, analytics,
 * logging/monitoring, integrations, storage) that any future SaaS, AI
 * application, mobile app, web application, or API in this workspace can
 * depend on. Nothing in this tree references Founder OS-specific code.
 *
 * Import a specific engine's namespace to avoid name collisions, e.g.:
 *   import { AIProvider, ModelRouter } from "./engines/ai/index.js";
 *   import { WorkflowEngine } from "./engines/workflow/index.js";
 */
export * as ai from "./ai/index.js";
export * as workflow from "./workflow/index.js";
export * as automation from "./automation/index.js";
export * as search from "./search/index.js";
export * as knowledge from "./knowledge/index.js";
export * as notification from "./notification/index.js";
export * as analytics from "./analytics/index.js";
export * as loggingMonitoring from "./logging-monitoring/index.js";
export * as integration from "./integration/index.js";
export * as storage from "./storage/index.js";
export * as shared from "@platform/shared";

import type { PlatformModule } from "./types.js";

/**
 * The built-in catalog: every reusable platform module shipped by Loop 1
 * (core foundation) and Loop 2 (the ten platform engines). This is data, not
 * logic — the Module Registry is what turns it into something queryable and
 * enable/disable-able.
 */
export const BUILTIN_MODULES: PlatformModule[] = [
  {
    id: "auth",
    name: "Authentication",
    description: "Session-based login and OAuth, with signed cookies and CSRF-safe state.",
    category: "core",
    sourcePath: "src/server/routes/auth.ts",
  },
  {
    id: "teams-roles",
    name: "Teams & Roles",
    description: "Organizations, teams, and role/permission primitives.",
    category: "core",
    dependsOn: ["auth"],
    sourcePath: "src/org/org.ts",
  },
  {
    id: "feature-flags",
    name: "Feature Flags",
    description: "Boolean, percentage-rollout, and environment-scoped feature flag evaluation.",
    category: "core",
    sourcePath: "packages/factory/src/config/features.ts",
  },
  {
    id: "ai",
    name: "AI Engine",
    description: "Provider-agnostic AI completions: routing, prompts, context, memory, tool calling, streaming.",
    category: "ai",
    sourcePath: "packages/engines/src/ai",
  },
  {
    id: "workflow",
    name: "Workflow Engine",
    description: "DAG step execution with conditions, retry, background execution, and scheduling.",
    category: "workflow",
    sourcePath: "packages/engines/src/workflow",
  },
  {
    id: "automation",
    name: "Automation Engine",
    description: "Triggers, actions, event bus, queue integration, and cron abstraction.",
    category: "automation",
    dependsOn: ["workflow"],
    sourcePath: "packages/engines/src/automation",
  },
  {
    id: "search",
    name: "Search Engine",
    description: "Global search across named collections: filtering, sorting, index adapters.",
    category: "search",
    sourcePath: "packages/engines/src/search",
  },
  {
    id: "knowledge",
    name: "Knowledge Engine",
    description: "Document chunking, embeddings, vector store abstraction, retrieval, and citations.",
    category: "knowledge",
    dependsOn: ["ai"],
    sourcePath: "packages/engines/src/knowledge",
  },
  {
    id: "notification",
    name: "Notification Engine",
    description: "Email, in-app, push, and webhook delivery with versioned templates.",
    category: "notification",
    sourcePath: "packages/engines/src/notification",
  },
  {
    id: "analytics",
    name: "Analytics Engine",
    description: "Event tracking, usage metrics, dashboards, reports, and audit metrics.",
    category: "analytics",
    sourcePath: "packages/engines/src/analytics",
  },
  {
    id: "logging-monitoring",
    name: "Logging & Monitoring",
    description: "Structured logs, health checks, metrics collection, error reporting, and tracing.",
    category: "observability",
    sourcePath: "packages/engines/src/logging-monitoring",
  },
  {
    id: "integration",
    name: "Integration Framework",
    description: "Connector framework: OAuth, API keys, webhooks, polling, sync jobs, rate limiting, retry.",
    category: "integration",
    sourcePath: "packages/engines/src/integration",
  },
  {
    id: "storage",
    name: "Storage Engine",
    description: "Object storage abstraction, upload/download managers, and media processing hooks.",
    category: "storage",
    sourcePath: "packages/engines/src/storage",
  },
  {
    id: "shared",
    name: "Shared Platform Utilities",
    description: "Cross-package primitives (cron, scheduling, retry/backoff, template interpolation, dependency-graph validation, confidence scoring, ranking) reused by the engines, factory, and intelligence packages.",
    category: "core",
    sourcePath: "packages/shared/src",
  },
];

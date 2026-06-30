import type { BlueprintContext, TechStack, ArchitectureSummary } from "./types.js";
import type { ContentCategory } from "../types.js";

// ---------------------------------------------------------------------------
// Tech Stack Selector
// Recommends production-proven stack per category + AI readiness.
// ---------------------------------------------------------------------------

interface StackTemplate {
  frontend: string[];
  backend: string[];
  database: string[];
  infrastructure: string[];
  thirdParty: string[];
  pattern: string;
  dataFlow: string;
  scalingApproach: string;
}

const CATEGORY_STACK: Partial<Record<ContentCategory, StackTemplate>> = {
  "developer-tools": {
    frontend: ["React", "TypeScript", "Radix UI"],
    backend: ["Node.js", "TypeScript", "Fastify"],
    database: ["PostgreSQL", "Redis (queue/cache)"],
    infrastructure: ["AWS ECS (Fargate)", "CloudFront CDN", "S3"],
    thirdParty: ["GitHub OAuth", "Stripe", "Posthog", "Sentry"],
    pattern: "API-first, event-driven, CLI + web dashboard",
    dataFlow: "CLI → REST API → PostgreSQL; background jobs via Redis queue",
    scalingApproach: "Horizontal pod scaling on ECS; read replicas for analytics queries",
  },
  "automation": {
    frontend: ["React", "TypeScript", "React Flow (visual builder)"],
    backend: ["Python", "FastAPI", "Celery"],
    database: ["PostgreSQL", "Redis (task queue)", "S3 (execution logs)"],
    infrastructure: ["AWS ECS", "SQS", "Lambda (connectors)"],
    thirdParty: ["Stripe", "SendGrid", "Sentry", "Datadog"],
    pattern: "Event-driven workflow engine, visual builder + headless API",
    dataFlow: "Trigger → SQS → Celery worker → execute steps → log to S3 → notify",
    scalingApproach: "Celery worker auto-scaling based on queue depth",
  },
  "saas": {
    frontend: ["Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui"],
    backend: ["Node.js", "TypeScript", "tRPC"],
    database: ["PostgreSQL (Supabase)", "Redis"],
    infrastructure: ["Vercel (web)", "Railway / Fly.io (API)", "Cloudflare"],
    thirdParty: ["Stripe", "Resend", "Posthog", "Sentry", "Linear"],
    pattern: "Monolith-first SaaS, server components + REST API",
    dataFlow: "Next.js server component → tRPC → PostgreSQL; background jobs via Railway cron",
    scalingApproach: "Vercel edge for frontend; Postgres connection pooling via PgBouncer",
  },
  "finance": {
    frontend: ["React", "TypeScript", "Tremor (charts)"],
    backend: ["Node.js", "TypeScript", "Express"],
    database: ["PostgreSQL (multi-AZ)", "TimescaleDB (time-series)"],
    infrastructure: ["AWS (SOC2 compliant)", "RDS Multi-AZ", "CloudTrail audit logs"],
    thirdParty: ["Stripe", "Plaid", "Sentry", "Datadog", "Auth0"],
    pattern: "Security-first API, multi-tenant with row-level security",
    dataFlow: "Authenticated API → audit log → business logic → PostgreSQL with RLS",
    scalingApproach: "Read replicas for reporting; time-series DB for financial metrics",
  },
  "ai": {
    frontend: ["Next.js", "TypeScript", "Tailwind", "Vercel AI SDK"],
    backend: ["Python", "FastAPI", "LangChain"],
    database: ["PostgreSQL", "Pinecone (vector store)", "Redis (cache)"],
    infrastructure: ["AWS ECS", "Bedrock / OpenAI API", "S3 (artifacts)"],
    thirdParty: ["Anthropic API", "OpenAI fallback", "Stripe", "Posthog"],
    pattern: "AI-native, RAG architecture, streaming responses",
    dataFlow: "User query → embedding → vector search → LLM with context → stream response",
    scalingApproach: "Token budget management; async processing for long-running AI jobs",
  },
};

const FALLBACK_STACK: StackTemplate = {
  frontend: ["Next.js", "TypeScript", "Tailwind CSS"],
  backend: ["Node.js", "TypeScript", "Express"],
  database: ["PostgreSQL", "Redis"],
  infrastructure: ["AWS ECS", "RDS", "CloudFront"],
  thirdParty: ["Stripe", "SendGrid", "Sentry", "Posthog"],
  pattern: "Standard API-first SaaS monolith",
  dataFlow: "React client → REST API → PostgreSQL; background jobs via Redis queue",
  scalingApproach: "Horizontal scaling; read replicas for heavy queries",
};

export function selectTechStack(ctx: BlueprintContext): { stack: TechStack; architecture: ArchitectureSummary } {
  const { intelligence: intel } = ctx;
  const template = CATEGORY_STACK[intel.category] ?? FALLBACK_STACK;

  const aiModels = intel.aiReadinessScore.score >= 0.5
    ? ["Claude (claude-sonnet-4-6)", "text-embedding-3-small (OpenAI)", "Pinecone (vector search)"]
    : ["Claude (claude-haiku-4-5-20251001) for simple tasks"];

  const stack: TechStack = {
    frontend: template.frontend,
    backend: template.backend,
    database: template.database,
    infrastructure: template.infrastructure,
    ai: aiModels,
    thirdParty: template.thirdParty,
    rationale: `${intel.category} — ${template.pattern}. Stack chosen for developer velocity + production reliability.`,
  };

  const architecture: ArchitectureSummary = {
    pattern: template.pattern,
    keyComponents: [
      "REST/tRPC API layer",
      "Authentication (JWT + OAuth)",
      "Background job processor",
      "AI orchestration layer",
      "Multi-tenant PostgreSQL with RLS",
    ],
    dataFlow: template.dataFlow,
    scalingApproach: template.scalingApproach,
  };

  return { stack, architecture };
}

import { nowIso } from "../utils/id.js";
import type { ConnectorCategory, ConnectorDefinition, ConnectorRecord, ConnectorStatus } from "./types.js";

/**
 * Built-in connector catalog. Architecture only — no actual outbound calls.
 * The registry computes each connector's `status` from environment variables;
 * after secrets are supplied (real deployment), every connector flips to
 * `configured` without any code change.
 */
export const BUILTIN_CONNECTORS: ConnectorDefinition[] = [
  { id: "github", name: "GitHub", vendor: "GitHub", category: "vcs", requiredEnv: ["GITHUB_TOKEN"], optionalEnv: ["GITHUB_APP_ID"], description: "GitHub repository, PR and issue automation." },
  { id: "git", name: "Git", vendor: "Git", category: "vcs", requiredEnv: [], optionalEnv: [], description: "Local git operations." },
  { id: "docker", name: "Docker", vendor: "Docker", category: "infra", requiredEnv: [], optionalEnv: ["DOCKER_HOST"], description: "Container build and runtime." },
  { id: "supabase", name: "Supabase", vendor: "Supabase", category: "data", requiredEnv: ["SUPABASE_URL", "SUPABASE_ANON_KEY"], optionalEnv: ["SUPABASE_SERVICE_ROLE"], description: "Postgres-backed app data." },
  { id: "stripe", name: "Stripe", vendor: "Stripe", category: "payments", requiredEnv: ["STRIPE_SECRET_KEY"], optionalEnv: ["STRIPE_WEBHOOK_SECRET"], description: "Payments and billing." },
  { id: "cloudflare", name: "Cloudflare", vendor: "Cloudflare", category: "infra", requiredEnv: ["CLOUDFLARE_API_TOKEN"], optionalEnv: ["CLOUDFLARE_ACCOUNT_ID"], description: "DNS, edge functions, R2." },
  { id: "vercel", name: "Vercel", vendor: "Vercel", category: "infra", requiredEnv: ["VERCEL_TOKEN"], optionalEnv: ["VERCEL_TEAM_ID"], description: "Frontend hosting and edge runtime." },
  { id: "slack", name: "Slack", vendor: "Slack", category: "comms", requiredEnv: ["SLACK_BOT_TOKEN"], optionalEnv: ["SLACK_SIGNING_SECRET"], description: "Channel messages and DMs." },
  { id: "notion", name: "Notion", vendor: "Notion", category: "data", requiredEnv: ["NOTION_TOKEN"], optionalEnv: [], description: "Notion pages and databases." },
  { id: "linear", name: "Linear", vendor: "Linear", category: "data", requiredEnv: ["LINEAR_API_KEY"], optionalEnv: [], description: "Project management API." },
  { id: "email", name: "Email", vendor: "SMTP", category: "comms", requiredEnv: ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"], optionalEnv: ["SMTP_PORT"], description: "Transactional email." },
  { id: "calendar", name: "Calendar", vendor: "Google", category: "comms", requiredEnv: ["GOOGLE_CALENDAR_CREDENTIALS"], optionalEnv: [], description: "Calendar reads and event creation." },
  { id: "browser", name: "Browser", vendor: "Playwright", category: "browser", requiredEnv: [], optionalEnv: ["PLAYWRIGHT_BROWSERS_PATH"], description: "Headless browser automation." },
  { id: "mcp", name: "MCP", vendor: "Model Context Protocol", category: "mcp", requiredEnv: [], optionalEnv: ["MCP_REGISTRY_URL"], description: "Connects MCP tool servers." },
  { id: "youtube", name: "YouTube Data API", vendor: "Google", category: "data", requiredEnv: ["YOUTUBE_API_KEY"], optionalEnv: [], description: "YouTube video/channel search for research." },
  { id: "stackexchange", name: "Stack Exchange API", vendor: "Stack Exchange", category: "data", requiredEnv: [], optionalEnv: ["STACK_EXCHANGE_KEY"], description: "Stack Exchange Q&A search for research (key optional, raises quota)." },
];

export class ConnectorRegistry {
  private records = new Map<string, ConnectorRecord>();
  private env: Record<string, string | undefined>;

  constructor(initial: ConnectorDefinition[] = BUILTIN_CONNECTORS, env: Record<string, string | undefined> = process.env) {
    this.env = env;
    for (const def of initial) this.records.set(def.id, this.evaluate(def));
  }

  private evaluate(def: ConnectorDefinition): ConnectorRecord {
    const missing = def.requiredEnv.filter((key) => !this.env[key]);
    const status: ConnectorStatus = missing.length === 0 ? "configured" : "missing-credentials";
    return {
      ...def,
      status,
      lastChecked: nowIso(),
      notes: missing.length > 0 ? `Missing: ${missing.join(", ")}` : undefined,
    };
  }

  register(def: ConnectorDefinition): ConnectorRecord {
    const record = this.evaluate(def);
    this.records.set(def.id, record);
    return record;
  }

  refresh(env: Record<string, string | undefined> = process.env): void {
    this.env = env;
    for (const [id, def] of this.records) this.records.set(id, this.evaluate(def));
  }

  list(): ConnectorRecord[] { return [...this.records.values()]; }
  get(id: string): ConnectorRecord | undefined { return this.records.get(id); }
  byStatus(status: ConnectorStatus): ConnectorRecord[] { return this.list().filter((r) => r.status === status); }
  byCategory(category: ConnectorCategory): ConnectorRecord[] { return this.list().filter((r) => r.category === category); }
}

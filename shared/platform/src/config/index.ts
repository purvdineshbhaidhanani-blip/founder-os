import { z } from "zod";

/**
 * Every env var this package reads is documented here and in each product's
 * .env.example (standards/security.md) — no undocumented config, no real
 * values ever committed. OAuth/SMTP secrets are optional: when absent, the
 * corresponding flow fails closed via integrationNotConfiguredError rather
 * than crashing at boot (Phase 1 rule, standards/security.md).
 */
const envSchema = z.object({
  PLATFORM_APP_ID: z
    .string()
    .min(1, "PLATFORM_APP_ID identifies which product's tenant space this process serves (e.g. \"spendgov\")."),
  PLATFORM_DATABASE_URL: z.string().min(1),
  PLATFORM_REDIS_URL: z.string().min(1),
  PLATFORM_SESSION_SECRET: z
    .string()
    .min(32, "PLATFORM_SESSION_SECRET must be at least 32 characters — used to sign short-lived JWTs issued from a session."),
  PLATFORM_ENCRYPTION_KEY: z
    .string()
    .min(32, "PLATFORM_ENCRYPTION_KEY must be at least 32 characters — used to encrypt OAuth tokens and MFA secrets at rest."),

  // OAuth — optional; each provider is disabled until its pair is present.
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_ID: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_SECRET: z.string().optional(),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),

  // Transactional email — optional; magic links / password reset / invites
  // fail closed with INTEGRATION_NOT_CONFIGURED until present.
  PLATFORM_EMAIL_FROM: z.string().email().optional(),
  PLATFORM_EMAIL_PROVIDER_API_KEY: z.string().optional(),

  // AI providers — optional; SH-AI fails closed with INTEGRATION_NOT_CONFIGURED
  // until at least the primary provider's key is present. A configured
  // secondary provider enables automatic fallback on primary failure.
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Billing — optional; Stripe-backed billing fails closed until present, per
  // the same Phase 1 rule as every other integration.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Object storage — optional; upload endpoints fail closed until present.
  PLATFORM_STORAGE_BUCKET: z.string().optional(),
  PLATFORM_STORAGE_REGION: z.string().optional(),
  PLATFORM_STORAGE_ACCESS_KEY_ID: z.string().optional(),
  PLATFORM_STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  PLATFORM_STORAGE_ENDPOINT: z.string().optional(), // for S3-compatible providers (R2, MinIO, etc.)

  // Outbound integrations (Slack, Teams, generic webhooks) — optional,
  // per-organization credentials are stored encrypted via SH-INTEG rather
  // than as process-level env vars; this flag just gates whether the
  // outbound webhook dispatcher runs at all in this environment.
  PLATFORM_WEBHOOKS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type PlatformEnv = z.infer<typeof envSchema>;

let cachedEnv: PlatformEnv | undefined;

/** Parses and validates process.env once per process; throws on first use if misconfigured, never silently. */
export function getPlatformEnv(): PlatformEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid platform environment configuration: ${issues}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isOAuthProviderConfigured(provider: "google" | "microsoft" | "github"): boolean {
  const env = getPlatformEnv();
  switch (provider) {
    case "google":
      return Boolean(env.OAUTH_GOOGLE_CLIENT_ID && env.OAUTH_GOOGLE_CLIENT_SECRET);
    case "microsoft":
      return Boolean(env.OAUTH_MICROSOFT_CLIENT_ID && env.OAUTH_MICROSOFT_CLIENT_SECRET);
    case "github":
      return Boolean(env.OAUTH_GITHUB_CLIENT_ID && env.OAUTH_GITHUB_CLIENT_SECRET);
  }
}

export function isEmailConfigured(): boolean {
  const env = getPlatformEnv();
  return Boolean(env.PLATFORM_EMAIL_FROM && env.PLATFORM_EMAIL_PROVIDER_API_KEY);
}

export function isAIProviderConfigured(provider: "anthropic" | "openai"): boolean {
  const env = getPlatformEnv();
  return provider === "anthropic" ? Boolean(env.ANTHROPIC_API_KEY) : Boolean(env.OPENAI_API_KEY);
}

export function isStripeConfigured(): boolean {
  const env = getPlatformEnv();
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function isStorageConfigured(): boolean {
  const env = getPlatformEnv();
  return Boolean(
    env.PLATFORM_STORAGE_BUCKET && env.PLATFORM_STORAGE_ACCESS_KEY_ID && env.PLATFORM_STORAGE_SECRET_ACCESS_KEY,
  );
}

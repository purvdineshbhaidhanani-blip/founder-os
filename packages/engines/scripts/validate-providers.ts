/**
 * Provider validation script — startup/CI check that every *configured*
 * external provider (AI, object storage, email) is actually reachable and
 * authenticated, without faking success and without spending real usage
 * (no chat completion is generated, no email is sent). A provider whose env
 * vars are unset is reported as "skipped", not "down" — this script only
 * fails on providers you've actually configured.
 *
 * Run: npx tsx packages/engines/scripts/validate-providers.ts
 * Exit code: 0 if every configured provider is "ok"/"degraded", 1 if any is "down".
 *
 * See docs/PROVIDER_SETUP.md for what each environment variable does and
 * what each check does and does not verify.
 */
import {
  createAnthropicHealthCheck,
  createOpenAIHealthCheck,
} from "../src/ai/diagnostics.js";
import { createHttpEmailHealthCheck, createSmtpHealthCheck } from "../src/notification/diagnostics.js";
import { createObjectStorageReachabilityCheck } from "../src/storage/diagnostics.js";

interface CheckOutcome {
  name: string;
  result: "skipped" | "ok" | "degraded" | "down";
  details?: string;
}

async function run(name: string, envHint: string, check: (() => Promise<{ status: "ok" | "degraded" | "down"; details?: string }>) | undefined): Promise<CheckOutcome> {
  if (!check) return { name, result: "skipped", details: `${envHint} not set` };
  const { status, details } = await check();
  return { name, result: status, details };
}

async function main(): Promise<void> {
  const env = process.env;
  const outcomes: CheckOutcome[] = [];

  outcomes.push(
    await run(
      "openai",
      "OPENAI_API_KEY",
      env.OPENAI_API_KEY
        ? createOpenAIHealthCheck({ apiKey: env.OPENAI_API_KEY, baseUrl: env.OPENAI_BASE_URL })
        : undefined,
    ),
  );

  outcomes.push(
    await run(
      "anthropic",
      "ANTHROPIC_API_KEY",
      env.ANTHROPIC_API_KEY
        ? createAnthropicHealthCheck({ apiKey: env.ANTHROPIC_API_KEY, baseUrl: env.ANTHROPIC_BASE_URL })
        : undefined,
    ),
  );

  outcomes.push(
    await run(
      `object-storage (${env.OBJECT_STORAGE_PROVIDER_ID ?? "generic"})`,
      "OBJECT_STORAGE_BASE_URL",
      env.OBJECT_STORAGE_BASE_URL
        ? createObjectStorageReachabilityCheck({
            // Reachability-only: signing (SigV4 etc.) is caller-supplied per HttpObjectStorage's
            // design and can't be exercised generically from env vars alone. For a real read/write
            // round-trip, call createObjectStorageHealthCheck() against your configured
            // HttpObjectStorage instance directly (see docs/PROVIDER_SETUP.md).
            baseUrl: env.OBJECT_STORAGE_BASE_URL,
            label: env.OBJECT_STORAGE_PROVIDER_ID ?? "object-storage",
          })
        : undefined,
    ),
  );

  outcomes.push(
    await run(
      "resend",
      "RESEND_API_KEY",
      env.RESEND_API_KEY
        ? createHttpEmailHealthCheck({
            endpoint: "https://api.resend.com/emails",
            headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
            label: "resend",
          })
        : undefined,
    ),
  );

  outcomes.push(
    await run(
      "smtp",
      "SMTP_HOST",
      env.SMTP_HOST
        ? createSmtpHealthCheck({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined,
            secure: env.SMTP_SECURE === "true",
          })
        : undefined,
    ),
  );

  let anyDown = false;
  for (const outcome of outcomes) {
    const marker = { skipped: "—", ok: "✓", degraded: "!", down: "✗" }[outcome.result];
    // eslint-disable-next-line no-console
    console.log(`[${marker}] ${outcome.name}: ${outcome.result}${outcome.details ? ` — ${outcome.details}` : ""}`);
    if (outcome.result === "down") anyDown = true;
  }

  if (outcomes.every((o) => o.result === "skipped")) {
    // eslint-disable-next-line no-console
    console.log("\nNo provider environment variables are set — nothing to validate. See docs/PROVIDER_SETUP.md.");
  }

  process.exit(anyDown ? 1 : 0);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("validate-providers failed unexpectedly:", error);
  process.exit(1);
});

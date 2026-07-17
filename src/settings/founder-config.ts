import path from "node:path";
import { z } from "zod";
import { PATHS } from "../constants/paths.js";

/**
 * Founder OS runtime configuration — the typed, validated, env-sourced
 * config the `founder` CLI and its commands (doctor/run/agent/tools/models)
 * read. Distinct from `SettingsManager` (the generic, imperative company-OS
 * key/value + provider/limits bag used by the Command Center/Cost
 * Optimizer): this module is specifically "what does THIS process need to
 * run agents and tools locally," loaded once from `process.env` with zod
 * validation and safe defaults — genuinely missing before Loop 4, not a
 * duplicate of SettingsManager's broader, untyped surface.
 */

const ModelAliasesSchema = z.record(z.string()).default({});

export const FounderConfigSchema = z.object({
  /** Sandbox root every file/shell/git tool call is contained to. Defaults to the repo root. */
  workspaceRoot: z.string().default(PATHS.root),
  /** Local Ollama daemon base URL. */
  ollamaHost: z.string().url().default("http://127.0.0.1:11434"),
  /** Local model id used when an agent/command doesn't specify one. */
  defaultModel: z.string().min(1).default("llama3.1"),
  /**
   * Provider-independent model aliases (Loop 4 item 2): maps a Claude-era
   * frontmatter model hint ("opus"/"sonnet"/"haiku") to a real local model
   * id, entirely configuration-driven — `resolveModel` in
   * `src/runtime/agents/executor.ts` is deliberately UNCHANGED and still
   * never performs this mapping itself; the CLI applies the alias (if any)
   * BEFORE calling `executeAgent`, so the mapping stays fully opt-in and
   * swappable without touching the execution engine.
   */
  modelAliases: ModelAliasesSchema,
  logLevel: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
  logFormat: z.enum(["text", "json"]).default("text"),
  /** Default tool-call turn cap for `founder agent execute`/`founder run`. */
  maxToolTurns: z.coerce.number().int().positive().max(50).default(5),
  /** Seconds an "ask-user" tool approval waits at the CLI before treating it as denied. */
  approvalTimeoutSeconds: z.coerce.number().int().positive().max(3600).default(300),
});

export type FounderConfig = z.infer<typeof FounderConfigSchema>;

export interface ConfigValidationIssue {
  path: string;
  message: string;
}

export interface ConfigLoadResult {
  config: FounderConfig;
  issues: ConfigValidationIssue[];
  /** True when every raw env value parsed cleanly (issues, if any, are only about unknown/malformed values that fell back to defaults). */
  ok: boolean;
}

/**
 * Reads Founder OS config from `env` (defaults to `process.env`), applying
 * safe defaults for anything unset. Never throws: a malformed value (e.g. a
 * non-numeric `FOUNDER_MAX_TOOL_TURNS`) is reported in `issues` and the
 * field falls back to its default rather than crashing the CLI.
 */
export function loadFounderConfig(env: NodeJS.ProcessEnv = process.env): ConfigLoadResult {
  const issues: ConfigValidationIssue[] = [];

  let modelAliases: Record<string, string> = {};
  if (env.FOUNDER_MODEL_ALIASES) {
    try {
      const parsed = JSON.parse(env.FOUNDER_MODEL_ALIASES) as unknown;
      const result = ModelAliasesSchema.safeParse(parsed);
      if (result.success) modelAliases = result.data;
      else issues.push({ path: "FOUNDER_MODEL_ALIASES", message: "Must be a JSON object of string->string; ignoring." });
    } catch {
      issues.push({ path: "FOUNDER_MODEL_ALIASES", message: "Not valid JSON; ignoring." });
    }
  }

  const raw = {
    ...(env.FOUNDER_WORKSPACE ? { workspaceRoot: path.resolve(env.FOUNDER_WORKSPACE) } : {}),
    ...(env.OLLAMA_HOST ? { ollamaHost: env.OLLAMA_HOST } : {}),
    ...(env.FOUNDER_DEFAULT_MODEL ? { defaultModel: env.FOUNDER_DEFAULT_MODEL } : {}),
    modelAliases,
    ...(env.AGENT_FACTORY_LOG_LEVEL ? { logLevel: env.AGENT_FACTORY_LOG_LEVEL } : {}),
    ...(env.AGENT_FACTORY_LOG_FORMAT ? { logFormat: env.AGENT_FACTORY_LOG_FORMAT } : {}),
    ...(env.FOUNDER_MAX_TOOL_TURNS ? { maxToolTurns: env.FOUNDER_MAX_TOOL_TURNS } : {}),
    ...(env.FOUNDER_APPROVAL_TIMEOUT_SECONDS ? { approvalTimeoutSeconds: env.FOUNDER_APPROVAL_TIMEOUT_SECONDS } : {}),
  };

  const result = FounderConfigSchema.safeParse(raw);
  if (result.success) {
    return { config: result.data, issues, ok: issues.length === 0 };
  }

  for (const issue of result.error.issues) {
    issues.push({ path: issue.path.join(".") || "(root)", message: `${issue.message}; using default.` });
  }
  // Re-parse with only the fields that DID validate, so one bad value never
  // discards every other correctly-set value.
  const salvaged: Record<string, unknown> = { ...raw };
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") delete salvaged[key];
  }
  const fallback = FounderConfigSchema.parse(salvaged);
  return { config: fallback, issues, ok: false };
}

/** Resolves a frontmatter model hint (e.g. "opus") through the configured alias map, falling back to the config's defaultModel when there is no alias — never falls back to a fabricated mapping. */
export function resolveAliasedModel(config: FounderConfig, frontmatterModelHint: string | undefined): string {
  if (frontmatterModelHint && config.modelAliases[frontmatterModelHint]) {
    return config.modelAliases[frontmatterModelHint];
  }
  return config.defaultModel;
}

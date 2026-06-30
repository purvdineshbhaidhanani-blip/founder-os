import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ResearchCredentials } from "./types.js";

// ---------------------------------------------------------------------------
// Env Loader — reads credentials from .env.local then falls back to process.env
// Never hardcodes secrets. Never logs values.
// ---------------------------------------------------------------------------

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const raw = readFileSync(filePath, "utf8");
    const result: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      // Strip optional surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function resolveEnvFile(cwd: string = process.cwd()): Record<string, string> {
  return parseEnvFile(resolve(cwd, ".env.local"));
}

export function loadCredentials(cwd?: string): ResearchCredentials {
  const fileEnv = resolveEnvFile(cwd);

  // process.env takes precedence over .env.local (allows CI override)
  const get = (key: string): string | undefined =>
    process.env[key] || fileEnv[key] || undefined;

  const githubToken = get("GITHUB_TOKEN");
  const youtubeApiKey = get("YOUTUBE_API_KEY");
  const stackexchangeApiKey = get("STACKEXCHANGE_API_KEY");

  const missingKeys: string[] = [];
  if (!githubToken) missingKeys.push("GITHUB_TOKEN");
  if (!youtubeApiKey) missingKeys.push("YOUTUBE_API_KEY");
  if (!stackexchangeApiKey) missingKeys.push("STACKEXCHANGE_API_KEY");

  return { githubToken, youtubeApiKey, stackexchangeApiKey, missingKeys };
}

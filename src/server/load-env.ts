import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Loads `.env` from the repo root into `process.env` before any other module
 * reads it, so `npm start` behaves the same as `node --env-file=.env ...`
 * without requiring the flag. Must be the first import in the entry point —
 * ESM evaluates a file's own top-level statements before its later imports'
 * modules run, so importing this first (for its side effect) guarantees
 * env vars are populated before any route/adapter module reads process.env.
 *
 * Safe for production: `process.loadEnvFile` never overrides a variable
 * that is already set in the environment (verified — platform-injected
 * secrets on Railway/etc. always win over a stray `.env`), and this is a
 * no-op if no `.env` file exists (e.g. in that same production case).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", "..", ".env");

if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

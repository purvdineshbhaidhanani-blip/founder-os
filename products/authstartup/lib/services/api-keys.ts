import { randomBytes, createHash } from "node:crypto";

export interface GeneratedApiKey {
  /** The raw key — shown to the caller exactly once, never persisted. */
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}

const KEY_BYTE_LENGTH = 32;
const PREFIX_LENGTH = 8;

/** Generates a new API key per products/authstartup/docs/PRODUCT_IDENTITY.md §7 "API keys." High-entropy random secret; only its SHA-256 hash and a short identifying prefix are ever persisted, mirroring how shared/platform hashes session tokens. */
export function generateApiKey(): GeneratedApiKey {
  const rawKey = `as_${randomBytes(KEY_BYTE_LENGTH).toString("hex")}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(0, PREFIX_LENGTH),
    keyHash: hashApiKey(rawKey),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function verifyApiKey(rawKey: string, keyHash: string): boolean {
  return hashApiKey(rawKey) === keyHash;
}

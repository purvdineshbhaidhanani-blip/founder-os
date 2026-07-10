import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { getPlatformEnv } from "../config/index.js";

/**
 * AES-256-GCM encryption for sensitive fields stored at rest (OAuth tokens,
 * MFA secrets) per standards/security.md: "sensitive data at rest... is
 * encrypted at the database or application layer, not relied upon solely
 * from disk-level encryption." Keys are never stored alongside the data
 * they protect — PLATFORM_ENCRYPTION_KEY lives only in the environment.
 *
 * Output format: `<iv>:<authTag>:<ciphertext>`, each hex-encoded, so a
 * single string column can hold the full envelope.
 */

function getKey(): Buffer {
  // PLATFORM_ENCRYPTION_KEY is a passphrase, not a raw key — sha256 derives
  // a fixed 32-byte key from it so any sufficiently long secret works.
  return createHash("sha256").update(getPlatformEnv().PLATFORM_ENCRYPTION_KEY).digest();
}

export function encryptAtRest(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV, the GCM-recommended size
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptAtRest(envelope: string): string {
  const parts = envelope.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted envelope — expected <iv>:<authTag>:<ciphertext>.");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}

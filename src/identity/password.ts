import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const ALGORITHM = "scrypt";
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Hashes a password with scrypt (Node's built-in KDF — no bcrypt/argon2
 * dependency needed). Stored format is `scrypt$<saltHex>$<hashHex>`, self
 * -describing so the algorithm can be upgraded later without invalidating
 * every existing hash in one migration.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${ALGORITHM}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Verifies a password against a stored hash produced by `hashPassword`, in constant time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== ALGORITHM) return false;

  const [, saltHex, hashHex] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex!, "hex");
    expected = Buffer.from(hashHex!, "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = (await scrypt(password, salt, expected.length)) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

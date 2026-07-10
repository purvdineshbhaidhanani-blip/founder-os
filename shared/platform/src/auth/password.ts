import * as argon2 from "argon2";

/**
 * argon2id per standards/security.md ("preferred"). Parameters follow the
 * OWASP-recommended baseline for argon2id (19 MiB memory, 2 iterations,
 * 1 degree of parallelism) — tuned, not defaults left unexamined.
 */
const HASH_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, HASH_OPTIONS);
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Malformed hash or verification failure — never throw into caller's control flow;
    // an unverifiable password is simply not a match.
    return false;
  }
}

const MIN_PASSWORD_LENGTH = 12;

export function isPasswordStrongEnough(plaintext: string): boolean {
  return plaintext.length >= MIN_PASSWORD_LENGTH;
}

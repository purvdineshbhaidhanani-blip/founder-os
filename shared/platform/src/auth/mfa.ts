import { authenticator } from "otplib";
import { getPlatformDb } from "../db/index.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import { encryptAtRest, decryptAtRest } from "../crypto/index.js";

/**
 * TOTP (RFC 6238) per standards/security.md — "designed into the auth
 * architecture from day one so it can be turned on without a schema
 * migration later." The schema already supports it (MfaFactor); this
 * module is that activation.
 *
 * Secrets are encrypted at the application layer before being written
 * (standards/security.md) via crypto/index.ts; this module owns that
 * encrypt/decrypt boundary so no caller ever handles a raw TOTP secret
 * outside of enrollment/verification.
 */

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function buildTotpEnrollmentUri(params: { secret: string; accountLabel: string; issuer: string }): string {
  return authenticator.keyuri(params.accountLabel, params.issuer, params.secret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return authenticator.check(code, secret);
}

export async function enrollMfaFactor(params: { userId: string; secret: string }) {
  return getPlatformDb().mfaFactor.create({
    data: { userId: params.userId, secret: encryptAtRest(params.secret), type: "totp" },
  });
}

export async function confirmMfaFactor(params: { factorId: string; code: string }): Promise<void> {
  const factor = await getPlatformDb().mfaFactor.findUnique({ where: { id: params.factorId } });
  if (!factor) throw notFoundError("MFA factor");

  const secret = decryptAtRest(factor.secret);
  if (!verifyTotpCode(secret, params.code)) {
    throw unauthorizedError("Invalid verification code.");
  }

  await getPlatformDb().mfaFactor.update({
    where: { id: params.factorId },
    data: { verifiedAt: new Date() },
  });
}

/** Verifies a login-time TOTP code against a user's enrolled, verified factor. */
export async function verifyMfaLoginCode(params: { userId: string; code: string }): Promise<boolean> {
  const factor = await getPlatformDb().mfaFactor.findFirst({
    where: { userId: params.userId, verifiedAt: { not: null } },
  });
  if (!factor) return false;
  const secret = decryptAtRest(factor.secret);
  return verifyTotpCode(secret, params.code);
}

export async function hasVerifiedMfa(userId: string): Promise<boolean> {
  const count = await getPlatformDb().mfaFactor.count({
    where: { userId, verifiedAt: { not: null } },
  });
  return count > 0;
}

export async function requireMfaFactorOwnedBy(factorId: string, userId: string) {
  const factor = await getPlatformDb().mfaFactor.findUnique({ where: { id: factorId } });
  if (!factor) throw notFoundError("MFA factor");
  if (factor.userId !== userId) throw unauthorizedError();
  return factor;
}

export * from "./types.js";
export * from "./validation.js";
export {
  signUpWithPassword,
  loginWithPassword,
  verifyMfaAndCreateSession,
  logout,
  requestPasswordReset,
  resetPassword,
  requestMagicLink,
  consumeMagicLink,
  getUserById,
  type AuthResult,
} from "./service.js";
export { validateSessionToken, revokeSession, revokeAllSessionsForUser, listActiveSessionsForUser } from "./session.js";
export {
  generateTotpSecret,
  buildTotpEnrollmentUri,
  verifyTotpCode,
  enrollMfaFactor,
  confirmMfaFactor,
  hasVerifiedMfa,
  verifyMfaLoginCode,
  requireMfaFactorOwnedBy,
} from "./mfa.js";
export { buildOAuthAuthorizeUrl, upsertOAuthIdentity } from "./oauth.js";
export { hashPassword, verifyPassword, isPasswordStrongEnough } from "./password.js";

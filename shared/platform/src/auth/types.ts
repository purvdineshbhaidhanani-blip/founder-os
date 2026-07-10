/**
 * Server-side authentication context attached to every authenticated
 * request. This — never a client-supplied header or hidden form field — is
 * what standards/security.md's `can(user, action, resource)` policy
 * functions read from (see organizations/rbac.ts).
 */
export interface AuthContext {
  userId: string;
  appId: string;
  sessionId: string;
}

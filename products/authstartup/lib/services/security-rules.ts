export interface SecurityRuleInput {
  requireMfa: boolean;
  sessionTtlMinutes: number;
  endUserCount: number;
  recentLoginEvents: { endUserId: string; occurredAt: Date; success: boolean }[];
}

export interface SecurityFindingCandidate {
  ruleId: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
}

const MFA_ENFORCEMENT_MIN_USERS = 5;
const MAX_HEALTHY_SESSION_TTL_MINUTES = 30 * 24 * 60;
const VELOCITY_WINDOW_MS = 5 * 60 * 1000;
const VELOCITY_THRESHOLD = 5;

/**
 * Rule-based Phase 1 detection for the AI Security Advisor per
 * products/authstartup/docs/PRODUCT_IDENTITY.md §5 (Killer Feature) and
 * the AS-4.1.2 "no-MFA-on-admin, weak session TTL, unusual login
 * velocity" rules from products/execution/06-authstartup-tasks.md.
 * Deterministic and testable — the AI layer (security-advisor.ts) only
 * adds explanation copy on top of these findings, it doesn't decide
 * whether a finding exists.
 */
export function evaluateSecurityPosture(input: SecurityRuleInput): SecurityFindingCandidate[] {
  const findings: SecurityFindingCandidate[] = [];

  if (!input.requireMfa && input.endUserCount >= MFA_ENFORCEMENT_MIN_USERS) {
    findings.push({
      ruleId: "mfa_not_enforced",
      severity: "medium",
      title: "MFA is not enforced",
      description: `This project has ${input.endUserCount} end users but does not require multi-factor authentication. Enabling MFA enforcement significantly reduces account-takeover risk as your user base grows.`,
    });
  }

  if (input.sessionTtlMinutes > MAX_HEALTHY_SESSION_TTL_MINUTES) {
    findings.push({
      ruleId: "session_ttl_too_long",
      severity: "low",
      title: "Session TTL exceeds 30 days",
      description: `Sessions in this project last ${Math.round(input.sessionTtlMinutes / (24 * 60))} days before expiring. Long-lived sessions increase the window of exposure if a session token is ever leaked or stolen.`,
    });
  }

  const velocityByUser = new Map<string, Date[]>();
  for (const event of input.recentLoginEvents) {
    const list = velocityByUser.get(event.endUserId) ?? [];
    list.push(event.occurredAt);
    velocityByUser.set(event.endUserId, list);
  }
  for (const [endUserId, timestamps] of velocityByUser) {
    const sorted = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
    for (let i = 0; i + VELOCITY_THRESHOLD - 1 < sorted.length; i++) {
      const windowStart = sorted[i]!.getTime();
      const windowEnd = sorted[i + VELOCITY_THRESHOLD - 1]!.getTime();
      if (windowEnd - windowStart <= VELOCITY_WINDOW_MS) {
        findings.push({
          ruleId: "login_velocity_anomaly",
          severity: "high",
          title: "Unusual login velocity detected",
          description: `End user ${endUserId} attempted ${VELOCITY_THRESHOLD}+ logins within a 5-minute window. This pattern is consistent with credential stuffing or a compromised account.`,
        });
        break;
      }
    }
  }

  return findings;
}

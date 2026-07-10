import { describe, expect, it } from "vitest";
import { evaluateSecurityPosture } from "../../lib/services/security-rules.js";

describe("evaluateSecurityPosture", () => {
  it("flags missing MFA enforcement once the user base is large enough", () => {
    const findings = evaluateSecurityPosture({ requireMfa: false, sessionTtlMinutes: 1000, endUserCount: 10, recentLoginEvents: [] });
    expect(findings.some((f) => f.ruleId === "mfa_not_enforced")).toBe(true);
  });

  it("does not flag missing MFA for a tiny user base", () => {
    const findings = evaluateSecurityPosture({ requireMfa: false, sessionTtlMinutes: 1000, endUserCount: 2, recentLoginEvents: [] });
    expect(findings.some((f) => f.ruleId === "mfa_not_enforced")).toBe(false);
  });

  it("does not flag MFA when it is already required", () => {
    const findings = evaluateSecurityPosture({ requireMfa: true, sessionTtlMinutes: 1000, endUserCount: 100, recentLoginEvents: [] });
    expect(findings.some((f) => f.ruleId === "mfa_not_enforced")).toBe(false);
  });

  it("flags a session TTL over 30 days", () => {
    const findings = evaluateSecurityPosture({ requireMfa: true, sessionTtlMinutes: 60 * 24 * 45, endUserCount: 1, recentLoginEvents: [] });
    expect(findings.some((f) => f.ruleId === "session_ttl_too_long")).toBe(true);
  });

  it("does not flag a healthy session TTL", () => {
    const findings = evaluateSecurityPosture({ requireMfa: true, sessionTtlMinutes: 60 * 24 * 7, endUserCount: 1, recentLoginEvents: [] });
    expect(findings.some((f) => f.ruleId === "session_ttl_too_long")).toBe(false);
  });

  it("flags 5+ logins from the same user within a 5-minute window", () => {
    const base = new Date("2026-01-01T00:00:00Z").getTime();
    const events = Array.from({ length: 5 }, (_, i) => ({ endUserId: "u1", occurredAt: new Date(base + i * 60_000), success: false }));
    const findings = evaluateSecurityPosture({ requireMfa: true, sessionTtlMinutes: 1000, endUserCount: 1, recentLoginEvents: events });
    expect(findings.some((f) => f.ruleId === "login_velocity_anomaly")).toBe(true);
  });

  it("does not flag logins spread across a longer window", () => {
    const base = new Date("2026-01-01T00:00:00Z").getTime();
    const events = Array.from({ length: 5 }, (_, i) => ({ endUserId: "u1", occurredAt: new Date(base + i * 10 * 60_000), success: false }));
    const findings = evaluateSecurityPosture({ requireMfa: true, sessionTtlMinutes: 1000, endUserCount: 1, recentLoginEvents: events });
    expect(findings.some((f) => f.ruleId === "login_velocity_anomaly")).toBe(false);
  });

  it("does not confuse two different users' logins as one velocity anomaly", () => {
    const base = new Date("2026-01-01T00:00:00Z").getTime();
    const events = [
      { endUserId: "u1", occurredAt: new Date(base), success: false },
      { endUserId: "u2", occurredAt: new Date(base + 60_000), success: false },
      { endUserId: "u1", occurredAt: new Date(base + 120_000), success: false },
      { endUserId: "u2", occurredAt: new Date(base + 180_000), success: false },
    ];
    const findings = evaluateSecurityPosture({ requireMfa: true, sessionTtlMinutes: 1000, endUserCount: 2, recentLoginEvents: events });
    expect(findings.some((f) => f.ruleId === "login_velocity_anomaly")).toBe(false);
  });
});

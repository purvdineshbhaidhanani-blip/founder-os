import { describe, expect, it } from "vitest";
import { evaluateCorrelationRule, evaluateCorrelationRules } from "../../lib/services/correlation-engine.js";

const rule = { id: "rule-1", firstEventType: "login_failed", secondEventType: "firewall_block", windowMinutes: 5 };

describe("evaluateCorrelationRule", () => {
  it("matches a failed login followed by a firewall block from the same IP within the window", () => {
    const matches = evaluateCorrelationRule(
      [
        { id: "1", eventType: "login_failed", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:00:00Z") },
        { id: "2", eventType: "firewall_block", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:03:00Z") },
      ],
      rule,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ ruleId: "rule-1", firstLogEventId: "1", secondLogEventId: "2", correlationKey: "10.0.0.1" });
  });

  it("does not match events outside the correlation window", () => {
    const matches = evaluateCorrelationRule(
      [
        { id: "1", eventType: "login_failed", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:00:00Z") },
        { id: "2", eventType: "firewall_block", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:10:00Z") },
      ],
      rule,
    );
    expect(matches).toHaveLength(0);
  });

  it("does not match events from different source IPs", () => {
    const matches = evaluateCorrelationRule(
      [
        { id: "1", eventType: "login_failed", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:00:00Z") },
        { id: "2", eventType: "firewall_block", sourceIp: "10.0.0.2", occurredAt: new Date("2026-07-10T00:01:00Z") },
      ],
      rule,
    );
    expect(matches).toHaveLength(0);
  });

  it("does not match a second event that occurs before the first", () => {
    const matches = evaluateCorrelationRule(
      [
        { id: "1", eventType: "login_failed", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:05:00Z") },
        { id: "2", eventType: "firewall_block", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:00:00Z") },
      ],
      rule,
    );
    expect(matches).toHaveLength(0);
  });

  it("does not reuse a first event across multiple matches", () => {
    const matches = evaluateCorrelationRule(
      [
        { id: "1", eventType: "login_failed", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:00:00Z") },
        { id: "2", eventType: "firewall_block", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:01:00Z") },
        { id: "3", eventType: "firewall_block", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:02:00Z") },
      ],
      rule,
    );
    expect(matches).toHaveLength(1);
  });

  it("ignores events without a source IP", () => {
    const matches = evaluateCorrelationRule(
      [
        { id: "1", eventType: "login_failed", sourceIp: null, occurredAt: new Date("2026-07-10T00:00:00Z") },
        { id: "2", eventType: "firewall_block", sourceIp: null, occurredAt: new Date("2026-07-10T00:01:00Z") },
      ],
      rule,
    );
    expect(matches).toHaveLength(0);
  });
});

describe("evaluateCorrelationRules", () => {
  it("evaluates multiple rules and concatenates matches", () => {
    const secondRule = { id: "rule-2", firstEventType: "vpn_login", secondEventType: "file_download", windowMinutes: 10 };
    const matches = evaluateCorrelationRules(
      [
        { id: "1", eventType: "login_failed", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:00:00Z") },
        { id: "2", eventType: "firewall_block", sourceIp: "10.0.0.1", occurredAt: new Date("2026-07-10T00:01:00Z") },
        { id: "3", eventType: "vpn_login", sourceIp: "10.0.0.2", occurredAt: new Date("2026-07-10T00:00:00Z") },
        { id: "4", eventType: "file_download", sourceIp: "10.0.0.2", occurredAt: new Date("2026-07-10T00:05:00Z") },
      ],
      [rule, secondRule],
    );
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.ruleId)).toEqual(["rule-1", "rule-2"]);
  });
});

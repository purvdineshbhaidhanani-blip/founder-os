export interface CorrelationCandidateLogEvent {
  id: string;
  eventType: string;
  sourceIp: string | null;
  occurredAt: Date;
}

export interface CorrelationRuleDefinition {
  id: string;
  firstEventType: string;
  secondEventType: string;
  windowMinutes: number;
}

export interface CorrelationMatch {
  ruleId: string;
  firstLogEventId: string;
  secondLogEventId: string;
  correlationKey: string;
}

/**
 * Real-time correlation rule engine per
 * products/seccorrelate/docs/PRODUCT_IDENTITY.md §7 "Real-time rule
 * engine" — matches the PID's own example: "failed login from IP +
 * firewall block from same IP within 5 min = potential brute force."
 * Correlates on sourceIp (the product's only correlation field for
 * Phase 1) rather than a general expression evaluator — no-code rule
 * authoring composes firstEventType/secondEventType/windowMinutes,
 * which this function evaluates.
 *
 * O(n*m) over the two event-type buckets, which is fine at the batch
 * sizes a rule evaluation pass processes; a production-scale correlation
 * engine (500M+ events/day, per PID §27) would need a windowed stream
 * join instead — out of scope for this Phase 1 pass.
 */
export function evaluateCorrelationRule(
  events: CorrelationCandidateLogEvent[],
  rule: CorrelationRuleDefinition,
): CorrelationMatch[] {
  const firstEvents = events.filter((e) => e.eventType === rule.firstEventType && e.sourceIp);
  const secondEvents = events.filter((e) => e.eventType === rule.secondEventType && e.sourceIp);
  const windowMs = rule.windowMinutes * 60 * 1000;

  const matches: CorrelationMatch[] = [];
  const matchedFirstIds = new Set<string>();

  for (const second of secondEvents) {
    const candidate = firstEvents.find(
      (first) =>
        !matchedFirstIds.has(first.id) &&
        first.sourceIp === second.sourceIp &&
        first.occurredAt <= second.occurredAt &&
        second.occurredAt.getTime() - first.occurredAt.getTime() <= windowMs,
    );
    if (candidate) {
      matchedFirstIds.add(candidate.id);
      matches.push({
        ruleId: rule.id,
        firstLogEventId: candidate.id,
        secondLogEventId: second.id,
        correlationKey: second.sourceIp!,
      });
    }
  }

  return matches;
}

export function evaluateCorrelationRules(
  events: CorrelationCandidateLogEvent[],
  rules: CorrelationRuleDefinition[],
): CorrelationMatch[] {
  return rules.flatMap((rule) => evaluateCorrelationRule(events, rule));
}

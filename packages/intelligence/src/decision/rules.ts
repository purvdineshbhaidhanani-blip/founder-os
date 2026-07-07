import type { DecisionContext, DecisionRule, RuleEvaluationResult } from "./types.js";

/** Runs every rule against a context and reports pass/fail per rule — never throws on a rule's own logic error, so one bad rule can't sink a decision. */
export function evaluateRules(rules: DecisionRule[], context: DecisionContext): RuleEvaluationResult[] {
  return rules.map((rule) => {
    let passed = false;
    try {
      passed = rule.evaluate(context);
    } catch {
      passed = false;
    }
    return { ruleId: rule.id, description: rule.description, passed };
  });
}

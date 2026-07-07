import type { RecommendationContext, RecommendationDraft, RecommendationSource } from "./types.js";

export interface RecommendationRule {
  id: string;
  when: (context: RecommendationContext) => boolean;
  recommend: (context: RecommendationContext) => RecommendationDraft;
}

/** Deterministic, explainable recommendations from a set of if/then rules — the zero-dependency default source. */
export class RuleBasedRecommendationSource implements RecommendationSource {
  readonly type = "rule" as const;

  constructor(
    public readonly id: string,
    private readonly rules: RecommendationRule[],
  ) {}

  generate(context: RecommendationContext): RecommendationDraft[] {
    return this.rules.filter((rule) => rule.when(context)).map((rule) => rule.recommend(context));
  }
}

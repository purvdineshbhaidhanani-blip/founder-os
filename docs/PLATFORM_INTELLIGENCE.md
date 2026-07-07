# Universal Platform Intelligence

`packages/intelligence/src/` is the decision-support layer on top of the
Loop 2 engines and Loop 3 factory: it helps products make better decisions,
not just get built faster. Every module is provider-independent and
product-agnostic — nothing here contains Founder OS logic, a hardcoded
market, or business-specific rules. All inputs are generic context objects
or structural interfaces supplied by the caller.

## Modules

| Module | Path | Purpose |
|---|---|---|
| Recommendation Engine | `packages/intelligence/src/recommendation` | Rule-based (`RuleBasedRecommendationSource`) and AI-powered (`AIRecommendationSource`) recommendation sources, confidence scoring, explanation generation, priority ranking. |
| Insights Engine | `packages/intelligence/src/insights` | Usage/growth/adoption/retention/error insight collectors, all built on one generic `ThresholdSeriesInsightCollector` over a `MetricSeriesSource` interface. |
| Decision Engine | `packages/intelligence/src/decision` | Weighted multi-factor scoring, rule evaluation, configurable thresholds, confidence levels, decision history. |
| Intelligence Registry | `packages/intelligence/src/registry` | Registration, on-disk discovery, enable/disable, and semver-based versioning for intelligence modules — reuses `@platform/shared`'s `validateDependencyGraph`. |
| Feature Intelligence | `packages/intelligence/src/feature-intelligence` | Feature adoption, usage summaries, success scoring, lifecycle staging, and retirement-candidate detection from raw usage events. |
| Product Intelligence | `packages/intelligence/src/product-intelligence` | Product/module/dependency health and configuration validation, aggregated from structural `ModuleRegistryLike`/`ConfigValidationResultLike` inputs. |
| AI Recommendation Layer | `packages/intelligence/src/ai-layer` | The narrow `AITextGenerator` interface, a zero-dependency `TemplateAITextGenerator` default, an optional bridge from a Loop 2 `AIProvider`, and `AIRecommendationAssistant` (explain / summarize / action items). |
| Health & Diagnostics | `packages/intelligence/src/diagnostics` | Pluggable checks for missing configuration, broken dependencies, invalid/undocumented modules, and performance warnings. |
| Optimization Engine | `packages/intelligence/src/optimization` | Analyzers for module selection, performance, cost, and simplification, ranked by confidence × impact. |
| Intelligence API | `packages/intelligence/src/api` | `IntelligenceAPI` — one facade exposing every module above through simple, dependency-injected methods. |

`classifyConfidence`/`combineConfidence` (confidence scoring + levels) and
`rankByPriority`, used across Recommendation, Decision, and Optimization,
live in the sibling `@platform/shared` package.

## Example

This module is published as the `@platform/intelligence` workspace package:

```ts
import { IntelligenceAPI } from "@platform/intelligence/api";
import { RuleBasedRecommendationSource, RecommendationEngine } from "@platform/intelligence/recommendation";

const api = new IntelligenceAPI({
  recommendationEngine: new RecommendationEngine([
    new RuleBasedRecommendationSource("onboarding-rules", [
      {
        id: "low-adoption",
        when: (ctx) => (ctx.adoptionRate as number) < 0.2,
        recommend: () => ({
          title: "Improve onboarding",
          description: "Adoption is below 20%.",
          factors: [{ label: "adoption", detail: "Adoption rate is under 20%", weight: 0.9 }],
        }),
      },
    ]),
  ]),
});

const recommendations = await api.getRecommendations({ adoptionRate: 0.1 });
const explanation = await api.explainRecommendation(recommendations[0]!);
```

## Design rules this layer follows

- **Provider independence.** The only AI-shaped dependency anywhere in this
  layer is `AITextGenerator` (`generate(prompt) => Promise<string>`) —
  deliberately narrower than the Loop 2 `AIProvider`. `fromAIProvider()` is
  an optional, isolated bridge; nothing else knows a concrete provider
  exists.
- **Structural typing over hard imports** for Product Intelligence,
  Diagnostics, and Optimization: each depends on a `ModuleRegistryLike`/
  `ConfigValidationResultLike`/`OptimizableModuleRegistry` shape it defines
  itself, satisfied by the Loop 3 `ModuleRegistry`/`ConfigurationEngine`
  without importing either — so this layer works with any registry/config
  implementation, present or future.
- **No duplicated algorithms.** Dependency-graph validation is imported
  from `@platform/shared` (also used by the SaaS Factory), not
  reimplemented. Confidence scoring (`@platform/shared`'s `confidence.ts`)
  and priority ranking (`ranking.ts`) are each written once and shared by
  every module that needs them.
- **Reuse across loops where it's genuinely the same utility.** The AI
  Recommendation Layer's prompt templating reuses the Loop 2
  `interpolate()` helper instead of reimplementing `{{placeholder}}`
  substitution a third time.
- **Every engine ships a zero-config default** — `TemplateAITextGenerator`,
  `InMemoryDecisionHistoryStore`, empty `RecommendationEngine`/`InsightsEngine`
  — so `new IntelligenceAPI()` with no arguments is immediately usable.

## Tests

`packages/intelligence/tests/*.test.ts` (51 tests) covers every module,
including registry discovery via a temp directory, decision scoring/rules/
thresholds, insight collectors' severity thresholds, and the API facade's
dependency injection.

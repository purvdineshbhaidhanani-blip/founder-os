import {
  answerAdditionalFounderQuestions,
  answerAllFounderQuestions,
  answerFounderQuestion,
  ADDITIONAL_FOUNDER_QUESTIONS,
  CANONICAL_FOUNDER_QUESTIONS,
} from "./copilot.js";
import type { FounderCopilotAnswer, FounderOpportunityReport } from "./types.js";

/**
 * Thin, STATELESS delegator that gives the server wiring a single injectable
 * handle onto the Founder Copilot's existing pure functions (`copilot.ts`).
 * It holds no state and contains NO reasoning/business logic of its own —
 * every method forwards directly to the already-tested pure functions, so the
 * route layer depends on `AppContext.copilot` rather than importing the pure
 * functions ad hoc. This mirrors how other subsystems are exposed on
 * `AppContext` while keeping the copilot's logic in exactly one place.
 */
export interface FounderCopilotService {
  /** The fixed supported question vocabulary — no report needed (capability discovery). */
  listQuestions(): { canonical: readonly string[]; additional: readonly string[] };
  /** Answers one free-text question against a single already-computed report. */
  ask(report: FounderOpportunityReport, question: string): FounderCopilotAnswer;
  /** Answers the full battery (8 canonical + 8 additional) for one report, canonical first. */
  answerAll(report: FounderOpportunityReport): FounderCopilotAnswer[];
}

export function createFounderCopilotService(): FounderCopilotService {
  return {
    listQuestions() {
      return { canonical: CANONICAL_FOUNDER_QUESTIONS, additional: ADDITIONAL_FOUNDER_QUESTIONS };
    },
    ask(report, question) {
      return answerFounderQuestion(report, question);
    },
    answerAll(report) {
      return [...answerAllFounderQuestions(report), ...answerAdditionalFounderQuestions(report)];
    },
  };
}

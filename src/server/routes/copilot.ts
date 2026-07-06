import { z } from "zod";
import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import type { AppContext } from "../wiring.js";
import { requireSession } from "./guard.js";
import { getPipelineOpportunity } from "./opportunities.js";
import type { FounderCopilotAnswer } from "../../founder-copilot/index.js";

/**
 * Founder Copilot routes — the production HTTP surface over the pure,
 * read-only Q&A functions in `src/founder-copilot/copilot.ts` (exposed via
 * `AppContext.copilot`). The copilot answers questions about ONE already-
 * computed opportunity, so its routes are nested under the existing
 * `/api/pipeline/:pipelineId/opportunities/:opportunityId` path and reuse
 * that route's `getPipelineOpportunity` lookup — no report is re-computed and
 * no reasoning logic is duplicated here.
 *
 *   GET  /api/copilot/questions
 *        — the fixed supported-question vocabulary (no report required)
 *   GET  /api/pipeline/:pipelineId/opportunities/:opportunityId/copilot/answers
 *        — the full battery (8 canonical + 8 additional) for that opportunity
 *   POST /api/pipeline/:pipelineId/opportunities/:opportunityId/copilot/ask
 *        — a single free-text question against that opportunity
 *
 * All routes require an authenticated session, mirroring the sibling routes.
 */

const AskBody = z.object({
  question: z.string().trim().min(1).max(500),
});

/** Response of GET /api/copilot/questions. */
export interface CopilotQuestionsResponse {
  canonical: readonly string[];
  additional: readonly string[];
}

/** Response of the single-question ask route. */
export interface CopilotAskResponse {
  pipelineId: string;
  opportunityId: string;
  answer: FounderCopilotAnswer;
}

/** Response of the full-battery answers route. */
export interface CopilotAnswersResponse {
  pipelineId: string;
  opportunityId: string;
  answers: FounderCopilotAnswer[];
}

export function registerCopilotRoutes(router: Router, ctx: AppContext): void {
  router.get("/api/copilot/questions", (reqCtx) => {
    if (!requireSession(reqCtx)) return;
    const response: CopilotQuestionsResponse = ctx.copilot.listQuestions();
    sendJson(reqCtx.res, 200, response);
  });

  router.get(
    "/api/pipeline/:pipelineId/opportunities/:opportunityId/copilot/answers",
    (reqCtx) => {
      if (!requireSession(reqCtx)) return;
      const pipelineId = reqCtx.params.pipelineId!;
      const opportunityId = reqCtx.params.opportunityId!;
      const opportunity = getPipelineOpportunity(pipelineId, opportunityId);
      if (!opportunity) {
        sendJson(reqCtx.res, 404, {
          error: "Unknown pipeline/opportunity, or the pipeline has not produced opportunities yet.",
        });
        return;
      }
      const response: CopilotAnswersResponse = {
        pipelineId,
        opportunityId,
        answers: ctx.copilot.answerAll(opportunity),
      };
      sendJson(reqCtx.res, 200, response);
    },
  );

  router.post<z.infer<typeof AskBody>>(
    "/api/pipeline/:pipelineId/opportunities/:opportunityId/copilot/ask",
    (reqCtx) => {
      if (!requireSession(reqCtx)) return;
      const pipelineId = reqCtx.params.pipelineId!;
      const opportunityId = reqCtx.params.opportunityId!;
      const opportunity = getPipelineOpportunity(pipelineId, opportunityId);
      if (!opportunity) {
        sendJson(reqCtx.res, 404, {
          error: "Unknown pipeline/opportunity, or the pipeline has not produced opportunities yet.",
        });
        return;
      }
      const response: CopilotAskResponse = {
        pipelineId,
        opportunityId,
        answer: ctx.copilot.ask(opportunity, reqCtx.body.question),
      };
      sendJson(reqCtx.res, 200, response);
    },
    AskBody,
  );
}

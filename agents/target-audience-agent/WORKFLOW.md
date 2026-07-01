# Workflow — Target Audience Agent

## Research Pipeline

1. **Receive** — Accept research query from problem-discovery-agent.
2. **Clarify** — Validate query and constraints; request clarification if ambiguous.
3. **Research** — Execute research methodology appropriate to the question.
4. **Synthesize** — Integrate findings with prior context from upstream agents.
5. **Score** — Assign confidence scores and identify gaps.
6. **Output** — Produce structured JSON output with sources.
7. **Hand Off** — Send output to market-research-agent, user-research-agent; no silent failures.

## Failure Modes

- Insufficient evidence: Report confidence < 0.6; flag as gap
- Contradictory findings: Escalate to problem-discovery-agent; don't guess
- Missing data: Request additional research time or note limitation

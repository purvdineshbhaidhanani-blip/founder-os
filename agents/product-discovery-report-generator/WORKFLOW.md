# Workflow — Product Discovery Report Generator

## Research Pipeline

1. **Receive** — Accept research query from success-metrics-agent.
2. **Clarify** — Validate query and constraints; request clarification if ambiguous.
3. **Research** — Execute research methodology appropriate to the question.
4. **Synthesize** — Integrate findings with prior context from upstream agents.
5. **Score** — Assign confidence scores and identify gaps.
6. **Output** — Produce structured JSON output with sources.
7. **Hand Off** — Send output to founder; no silent failures.

## Failure Modes

- Insufficient evidence: Report confidence < 0.6; flag as gap
- Contradictory findings: Escalate to success-metrics-agent; don't guess
- Missing data: Request additional research time or note limitation

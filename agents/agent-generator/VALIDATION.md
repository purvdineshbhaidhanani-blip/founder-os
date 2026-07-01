# Validation & Acceptance Criteria — Agent Generator

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every accepted spec produces a syntactically valid, registered agent file**
2. **Generation is idempotent — re-running with the same spec produces no diff**
3. **Validation failures are surfaced with structured error messages, never silenced**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, requirement-analyzer → agent-generator → agent-registry, quality-controller
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator

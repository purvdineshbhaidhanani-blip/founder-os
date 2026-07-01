# Validation & Acceptance Criteria — Prompt Optimizer

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every system prompt ships with a measurable quality score above the team baseline**
2. **No prompt regression reaches production — rollback triggers before agents re-register**
3. **Prompt improvements are versioned and traceable to the benchmark that motivated them**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, quality-controller → prompt-optimizer → agent-generator, quality-controller
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator

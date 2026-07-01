# Validation & Acceptance Criteria — Configuration Manager

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **No agent starts with invalid or missing configuration — validation blocks startup**
2. **Configuration changes are audited in the ObservabilityHub before taking effect**
3. **Feature flags are applied atomically — no partial-rollout state is possible**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: founder, orchestrator-agent → configuration-manager → orchestrator-agent, logger-agent
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator

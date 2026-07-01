# Validation & Acceptance Criteria — Quality Controller

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Zero agents with failing validation reach the registry**
2. **Test coverage for the factory core stays above 90% line coverage**
3. **Every quality regression is caught within the same CI run that introduced it**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: agent-generator, prompt-optimizer → quality-controller → orchestrator-agent, agent-registry
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator

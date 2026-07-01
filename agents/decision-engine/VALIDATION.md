# Validation & Acceptance Criteria — Decision Engine

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every build-vs-buy and architecture decision is recorded before implementation starts**
2. **Decision records are immutable after ratification — amendments create new entries**
3. **Options with missing evaluation data are never defaulted — analysis is requested first**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, requirement-analyzer, knowledge-manager → decision-engine → orchestrator-agent, knowledge-manager
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator

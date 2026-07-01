# Validation & Acceptance Criteria — Requirement Analyzer

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every AgentSpec produced passes Zod schema validation on first attempt**
2. **Redundant agent requests are rejected — capability gap is confirmed first**
3. **Ambiguous requirements are never silently defaulted — always escalated**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: founder, orchestrator-agent → requirement-analyzer → agent-generator, orchestrator-agent
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator

# Validation & Acceptance Criteria — Knowledge Manager

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every decision is cross-linked to its affected project before the decision record closes**
2. **Search returns relevant results across all 10 domains in under 10 ms**
3. **No duplicate project or decision entries — deduplication runs on insert**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, memory-manager, report-generator → knowledge-manager → orchestrator-agent, decision-engine, context-manager
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator

# Validation & Acceptance Criteria — Opportunity Discovery Agent

## Output Requirements

- All findings backed by credible sources
- Confidence scores reflect evidence quality (not optimism)
- Contradictions flagged, not hidden
- Gaps explicitly documented
- Structured outputs parse as valid JSON

## Quality Gates

- Blueprint passes validateBlueprint() ✓
- Generated agent passes validateGeneratedAgent() ✓
- Agent registered in registry with status active ✓
- Integration test: user-research-agent, market-research-agent, competitor-intelligence-agent → opportunity-discovery-agent → pricing-strategy-agent, business-model-agent ✓
- Memory read/write tests passing ✓

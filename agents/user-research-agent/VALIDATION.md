# Validation & Acceptance Criteria — User Research Agent

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
- Integration test: problem-discovery-agent, trend-intelligence-agent → user-research-agent → opportunity-discovery-agent ✓
- Memory read/write tests passing ✓

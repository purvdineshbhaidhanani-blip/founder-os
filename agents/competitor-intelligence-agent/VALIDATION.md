# Validation & Acceptance Criteria — Competitor Intelligence Agent

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
- Integration test: market-research-agent → competitor-intelligence-agent → trend-intelligence-agent ✓
- Memory read/write tests passing ✓

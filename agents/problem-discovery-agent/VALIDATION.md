# Validation & Acceptance Criteria — Problem Discovery Agent

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
- Integration test: idea-validator → problem-discovery-agent → target-audience-agent, user-research-agent ✓
- Memory read/write tests passing ✓

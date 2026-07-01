# Validation &amp; Acceptance Criteria — QA Engineer (App Generation)

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Zero MVP acceptance criteria ship unverified**
2. **Zero known security/compliance gaps from the discovery package's risk report reach deployment**
3. **Every QA failure includes a specific, reproducible finding — not a vague rejection**

## Quality Gates

- Deliverable traces every decision to an upstream artifact
- No MVP-scope violations (features beyond Product Discovery Package MVP scope)
- Integration test confirms message round-trip: developer-agent → qa-engineer-app → deployment-agent, developer-agent
- Memory read/write round-trip confirmed in agent namespace

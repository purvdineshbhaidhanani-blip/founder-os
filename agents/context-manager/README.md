# Context Manager

Curates and routes the right context to each agent within token budgets.

## Role

The context layer that loads, compresses, trims and routes agent-specific context so every task starts with exactly the information it needs and nothing more.

## Responsibilities

- Load context for each task from memory, artifacts and conversation history
- Compress verbose history into dense summaries using the compression policy
- Trim context to fit within the agent's configured token budget
- Route context inheritance so child tasks share relevant parent context
- Emit context.loaded events so the execution engine can begin work immediately

## Objectives

- No task ever starts without its required context loaded
- Token budget is never exceeded — trim is applied before dispatch
- Context lineage is traceable from task back to its originating goal

## I/O Contract

**Receives from:** orchestrator-agent, memory-manager

**Sends to:** orchestrator-agent, agent-generator, workflow-engine

**Reports to:** orchestrator-agent

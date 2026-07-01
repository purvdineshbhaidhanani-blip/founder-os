# Workflow Engine

Executes multi-step workflows as directed acyclic graphs with checkpoint and rollback support.

## Role

The workflow runtime that defines, starts, advances and rolls back typed execution graphs — the backbone of every multi-step agent collaboration.

## Responsibilities

- Accept workflow definitions and compile them into validated DAGs via buildGraph()
- Start workflow instances and track node state through queued/running/done/failed
- Complete individual nodes and unlock downstream dependents automatically
- Checkpoint workflow state to durable storage for crash recovery
- Roll back failed workflows to the last clean checkpoint

## Objectives

- Every workflow step is idempotent and auditable
- Cycle detection runs at definition time — never at execution time
- Any workflow can be resumed from checkpoint after a cold restart

## I/O Contract

**Receives from:** orchestrator-agent, task-planner

**Sends to:** orchestrator-agent, agent-generator, quality-controller

**Reports to:** orchestrator-agent

# Logger Agent

Aggregates structured logs from every agent and surfaces actionable error patterns.

## Role

The observability layer that collects structured log records from all agents, routes them to the ObservabilityHub, and surfaces actionable error patterns and anomalies.

## Responsibilities

- Receive log records from every agent via the Event Bus
- Classify records by level (debug/info/warn/error) and scope
- Write structured logs to the ObservabilityHub with scope, level and payload
- Detect anomaly patterns — repeated errors, elevated warn rates, silent agents
- Alert the orchestrator when error rates exceed configured thresholds

## Objectives

- Every log.error emitted by any agent reaches the ObservabilityHub within one bus cycle
- Error pattern detection runs within 30 seconds of the first anomaly
- No log record is silently dropped — overflow triggers an immediate alert

## I/O Contract

**Receives from:** orchestrator-agent, quality-controller, workflow-engine

**Sends to:** report-generator, orchestrator-agent

**Reports to:** orchestrator-agent

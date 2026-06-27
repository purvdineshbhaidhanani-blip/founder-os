/**
 * Public surface of the AI Founder OS Runtime layer.
 *
 * Composition pattern (see orchestrator/orchestrator.ts):
 *
 *     const memory = new MemoryEngine();
 *     const events = new EventBus();
 *     const queue = new TaskQueue();
 *     const workflow = new WorkflowEngine();
 *     const agents = new AgentRuntime({ bus: events });
 *     const artifacts = new ArtifactManager({ bus: events });
 *     const approvals = new ApprovalSystem({ bus: events, workflowEngine: workflow });
 *     const comms = new CommunicationBus({ events });
 *     const context = new ContextManager();
 *     const execution = new ExecutionEngine({ bus: events });
 *     const orchestrator = new MasterOrchestrator({ memory, events, queue, workflowEngine: workflow, agents, artifacts });
 *     const dashboard = new DashboardBackend({ events, queue, workflowEngine: workflow, agents });
 */
export * from "./memory/index.js";
export * from "./events/index.js";
export * from "./queue/index.js";
export * from "./workflow/index.js";
export * from "./agents/index.js";
export * from "./comms/index.js";
export * from "./context/index.js";
export * from "./execution/index.js";
export * from "./approval/index.js";
export * from "./artifacts/index.js";
export * from "./orchestrator/index.js";
export * from "./dashboard/index.js";

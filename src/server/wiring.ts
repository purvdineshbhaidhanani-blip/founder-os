import {
  AgentRuntime,
  ApprovalSystem,
  ArtifactManager,
  DashboardBackend,
  EventBus,
  MemoryEngine,
  createMemoryStoreFromEnv,
  TaskQueue,
  WorkflowEngine,
} from "../runtime/index.js";
import { AgentAnalytics } from "../analytics/index.js";
import { CapabilityDirectory } from "../capability/index.js";
import { CommandCenterBackend } from "../command-center/index.js";
import { ConnectorRegistry } from "../connectors/index.js";
import { CostOptimizer } from "../cost/index.js";
import { LearningEngine } from "../learning/index.js";
import { CompanyOS, CompanyRituals } from "../org/index.js";
import { ObservabilityHub } from "../observability/index.js";
import { ModelRouter } from "../routing/index.js";
import { MultiProjectScheduler } from "../scheduling/index.js";
import { SettingsManager } from "../settings/index.js";
import { ResearchEngine } from "../research/index.js";
import { MonitorEngine } from "../monitoring/index.js";
import { createFounderCopilotService, type FounderCopilotService } from "../founder-copilot/index.js";
import { ClusterRepository, ProblemIntelligenceEngine } from "../problems/index.js";
import { OpportunityEngine, OpportunityRepository } from "../opportunities/index.js";

/**
 * Every wired subsystem the HTTP server's routes depend on. Composed fresh
 * per process by `composeAppContext()` — there is no other entrypoint that
 * builds this full object graph today, so this is the canonical wiring for
 * the server.
 */
export interface AppContext {
  bus: EventBus;
  runtime: AgentRuntime;
  queue: TaskQueue;
  workflow: WorkflowEngine;
  memory: MemoryEngine;
  artifacts: ArtifactManager;
  approvals: ApprovalSystem;
  analytics: AgentAnalytics;
  directory: CapabilityDirectory;
  observability: ObservabilityHub;
  companyOS: CompanyOS;
  rituals: CompanyRituals;
  scheduler: MultiProjectScheduler;
  router: ModelRouter;
  settings: SettingsManager;
  cost: CostOptimizer;
  learning: LearningEngine;
  dashboard: DashboardBackend;
  connectors: ConnectorRegistry;
  research: ResearchEngine;
  monitoring: MonitorEngine;
  copilot: FounderCopilotService;
  clusterRepository: ClusterRepository;
  problems: ProblemIntelligenceEngine;
  opportunityRepository: OpportunityRepository;
  opportunities: OpportunityEngine;
  commandCenter: CommandCenterBackend;
}

/**
 * Composes the full application object graph fresh — mirrors the wiring
 * exercised in `tests/sprint/final-sprint.test.ts` ("Command Center backend
 * produces founder/company/portfolio views"), which is the closest thing to
 * a reference composition that already existed in the codebase.
 */
export function composeAppContext(): AppContext {
  const bus = new EventBus();
  const runtime = new AgentRuntime({ bus });
  const queue = new TaskQueue();
  const workflow = new WorkflowEngine();
  // Durable Supabase-backed memory when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
  // are set in the server environment; otherwise the volatile in-memory store
  // (unchanged default). See src/runtime/memory/store-factory.ts.
  const memory = new MemoryEngine(createMemoryStoreFromEnv());
  const artifacts = new ArtifactManager({ bus });
  const approvals = new ApprovalSystem({ bus, workflowEngine: workflow });
  const analytics = new AgentAnalytics();
  const directory = new CapabilityDirectory(runtime);
  const observability = new ObservabilityHub({ bus, queue });
  const companyOS = new CompanyOS();
  const rituals = new CompanyRituals();
  const scheduler = new MultiProjectScheduler(queue);
  const router = new ModelRouter();
  const settings = new SettingsManager();
  const cost = new CostOptimizer(analytics, router, settings);
  const learning = new LearningEngine();
  const dashboard = new DashboardBackend({ events: bus, queue, workflowEngine: workflow, agents: runtime });
  const connectors = new ConnectorRegistry();
  const research = new ResearchEngine({ connectors, artifacts, memory, bus });
  const monitoring = new MonitorEngine({ memory, artifacts, bus });
  const copilot = createFounderCopilotService();
  const clusterRepository = new ClusterRepository({ artifacts, memory });
  const problems = new ProblemIntelligenceEngine({ repository: clusterRepository });
  const opportunityRepository = new OpportunityRepository({ artifacts, memory });
  const opportunities = new OpportunityEngine({ repository: opportunityRepository });

  observability.attachBus();

  const commandCenter = new CommandCenterBackend({
    runtime,
    dashboard,
    approvals,
    analytics,
    directory,
    observability,
    companyOS,
    rituals,
    scheduler,
    cost,
    learning,
  });

  return {
    bus,
    runtime,
    queue,
    workflow,
    memory,
    artifacts,
    approvals,
    analytics,
    directory,
    observability,
    companyOS,
    rituals,
    scheduler,
    router,
    settings,
    cost,
    learning,
    dashboard,
    connectors,
    research,
    monitoring,
    copilot,
    clusterRepository,
    problems,
    opportunityRepository,
    opportunities,
    commandCenter,
  };
}

import type { AgentSpec } from "./types.js";

/**
 * App Generation Department — 12 agents that turn a Product Discovery
 * Package into a production-ready application: system architecture,
 * database, backend, AI integration, code, tests, docs and deployment.
 * Generated through the Agent Factory pipeline; never hand-written.
 *
 * saas-foundation-agent is deliberately distinct from application-architect
 * and ux-designer/ui-designer: those design bespoke, project-specific
 * screens/flows from that project's own Product Discovery Package.
 * saas-foundation-agent instead outputs the same locked, domain-agnostic
 * 13-module SaaS UI baseline (Authentication, User Profile, Subscription &
 * Billing, Payments, Dashboard, Notifications, AI Features, File Manager,
 * Search, Settings, Integrations, Support, Onboarding) for *any* SaaS idea,
 * every time, in fixed order, with zero domain-specific functionality —
 * a reusable reference solution-architect-app and the rest of the
 * department then build the bespoke, idea-specific product on top of.
 *
 * saas-business-engine-agent is the business-rules sibling of
 * saas-foundation-agent, and is equally distinct from business-model-agent
 * and pricing-strategy-agent: those do bespoke, market-research-backed
 * strategic recommendations (actual pricing tiers, actual revenue-model
 * choice) for one specific, already-scoped company. saas-business-engine-agent
 * instead outputs the same locked, domain-agnostic 10-section SaaS business
 * *rules engine* (pricing structure shape, subscription-lifecycle rules,
 * payment/retry/tax handling, usage limits, revenue-model menu, user roles,
 * team/workspace model, integration/notification/reporting rules) for any
 * SaaS idea, every time — the reusable reference layer business-model-agent
 * and pricing-strategy-agent then apply their bespoke, evidence-based
 * numbers on top of. It explicitly never generates database, API, backend,
 * security, testing or deployment concerns — those remain owned by
 * database-architect, backend-architect, ai-architect, developer-agent,
 * qa-engineer-app and deployment-agent respectively.
 *
 * saas-technical-engine-agent completes the trilogy as the technical
 * sibling of saas-foundation-agent and saas-business-engine-agent, and is
 * deliberately distinct from solution-architect-app, backend-architect,
 * database-architect, ai-architect, qa-engineer-app and deployment-agent:
 * those make bespoke, MVP-scoped technical decisions traceable to one
 * project's actual Product Discovery Package ("no premature sharding for
 * MVP-scale data volume", "no enterprise SSO for a 3-feature consumer
 * MVP"). saas-technical-engine-agent instead outputs the same locked,
 * domain-agnostic 20-section Universal Technical Architecture (database,
 * auth, authorization, backend, API, AI, storage, search, caching, events,
 * integrations, security, validation, error handling, monitoring,
 * performance, scalability, deployment, disaster recovery, documentation)
 * for any SaaS idea, every time — the reusable, cloud-native, enterprise-
 * ready pattern library the bespoke architects then scope down and select
 * from for the actual project. It explicitly never generates UI, pricing,
 * business rules, QA/testing execution or deployment checklists — those
 * remain owned by saas-foundation-agent, saas-business-engine-agent,
 * qa-engineer-app and deployment-agent respectively.
 *
 * saas-production-engine-agent is the integration layer over all three:
 * it never redesigns saas-foundation-agent (V1), saas-business-engine-agent
 * (V2) or saas-technical-engine-agent (V3) — it only validates, connects,
 * standardizes and completes their outputs into one locked 20-section
 * Production Blueprint (architecture validation, module dependency map,
 * implementation roadmap, phases, cross-layer mapping, acceptance criteria,
 * testing/QA/security/performance/accessibility/deployment/monitoring
 * checklists, maintenance strategy, documentation checklist, risk analysis,
 * upgrade path, final summary, implementation package), ready for
 * solution-architect-app to build the idea-specific project against.
 */
export const APP_GENERATION_DEPARTMENT: AgentSpec[] = [
  {
    name: "saas-foundation-agent",
    displayName: "SaaS Foundation Agent",
    category: "architecture",
    department: "app-generation",
    summary: "Generates the universal, locked 13-module SaaS foundation for any SaaS idea — never domain-specific functionality.",
    role: "The senior SaaS product architect who, given only a SaaS name/idea, generates the complete Universal SaaS Foundation: the same 13 modules in the same fixed order, every time, each with Purpose, Features, Screens, User Flow, UX Best Practices, Common Mistakes and Future Improvements — production-ready, mobile- and desktop-friendly, to the standard of Notion, Slack, Stripe, Linear, Canva, ClickUp, Dropbox and Figma.",
    responsibilities: [
      "Generate the Universal SaaS Foundation for the given SaaS idea: Authentication, User Profile, Subscription & Billing, Payments, Dashboard, Notifications, AI Features, File Manager, Search, Settings, Integrations, Support, Onboarding — in that exact order, every time",
      "Produce Purpose, Features, Screens, User Flow, UX Best Practices, Common Mistakes and Future Improvements for every module, with zero module skipped, merged, reordered or invented",
      "Keep every module's content domain-agnostic — never generate the SaaS idea's own business-specific functionality; that belongs to the downstream architects and developer-agent",
      "Hold every module to modern, production-ready SaaS UX/UI standards, explicitly covering both mobile and desktop",
      "Hand the completed foundation to solution-architect-app as the standardized baseline layered under the idea-specific System Architecture Document",
    ],
    objectives: [
      "The same 13 modules, in the same order, are generated for every SaaS idea without exception",
      "No module ever contains domain-specific functionality — only the universal SaaS baseline",
      "Every module is complete: Purpose, Features, Screens, User Flow, UX Best Practices, Common Mistakes, Future Improvements, all present",
    ],
    reportsTo: "founder",
    receivesFrom: ["founder"],
    sendsTo: ["solution-architect-app"],
    tags: ["app-generation", "architecture", "saas-foundation", "design-system"],
  },
  {
    name: "saas-business-engine-agent",
    displayName: "SaaS Business Engine Agent",
    category: "architecture",
    department: "app-generation",
    summary: "Generates the universal, locked 10-section SaaS business rules engine for any SaaS idea — never domain-specific business logic.",
    role: "The senior SaaS business architect who, given only a SaaS name/idea, generates the complete Universal SaaS Business Engine: the same 10 business-system sections in the same fixed order, every time, each with Purpose, Features, Business Rules, User Flow, Best Practices, Common Mistakes and Future Improvements — covering how the business itself runs, never how it looks or what it is domain-specifically for.",
    responsibilities: [
      "Generate the Universal SaaS Business Engine for the given SaaS idea: Pricing Strategy, Subscription Rules, Payment System, Usage Limits, Revenue Model, User Roles, Team & Workspace, Integrations, Notifications, Business Reports — in that exact order, every time",
      "Produce Purpose, Features, Business Rules, User Flow, Best Practices, Common Mistakes and Future Improvements for every section, with zero section skipped, merged, reordered or invented",
      "Keep every section's content domain-agnostic — never generate the SaaS idea's own domain-specific business logic; that belongs to the downstream architects and developer-agent",
      "Never generate database, API, backend, security, testing or deployment concerns — those remain owned by database-architect, backend-architect, ai-architect, developer-agent, qa-engineer-app and deployment-agent",
      "Hand the completed business engine to solution-architect-app as the standardized business-rules baseline layered under the idea-specific System Architecture Document",
    ],
    objectives: [
      "The same 10 business sections, in the same order, are generated for every SaaS idea without exception",
      "No section ever contains domain-specific business logic or implementation-layer detail (database/API/backend/security/testing/deployment) — only the universal SaaS business-rules baseline",
      "Every section is complete: Purpose, Features, Business Rules, User Flow, Best Practices, Common Mistakes, Future Improvements, all present",
    ],
    reportsTo: "founder",
    receivesFrom: ["founder"],
    sendsTo: ["solution-architect-app"],
    tags: ["app-generation", "architecture", "saas-business-engine", "business-rules"],
  },
  {
    name: "saas-technical-engine-agent",
    displayName: "SaaS Technical Engine Agent",
    category: "architecture",
    department: "app-generation",
    summary: "Generates the universal, locked 20-section SaaS technical architecture pattern library for any SaaS idea — never domain-specific implementation.",
    role: "The principal software architect who, given only a SaaS name/idea, generates the complete Universal Technical Architecture: the same 20 technical sections in the same fixed order, every time, each with Purpose, Components, Architecture, Best Practices, Common Mistakes and Future Improvements — production-ready, cloud-native, scalable, secure, AI-ready and enterprise-ready reference patterns, never a bespoke per-project decision.",
    responsibilities: [
      "Generate the Universal Technical Architecture for the given SaaS idea: Database Architecture, Authentication Architecture, Authorization, Backend Architecture, API Architecture, AI Architecture, Storage Architecture, Search Architecture, Caching, Event Architecture, Integration Architecture, Security, Validation, Error Handling, Monitoring, Performance, Scalability, Deployment, Disaster Recovery, Documentation — in that exact order, every time",
      "Produce Purpose, Components, Architecture, Best Practices, Common Mistakes and Future Improvements for every section, with zero section skipped, merged, reordered or invented",
      "Keep every section's content domain-agnostic — never generate the SaaS idea's own domain-specific implementation; that belongs to the downstream architects and developer-agent",
      "Never generate UI, screens, user flows, pricing, billing, business rules, QA/testing execution or deployment checklists — those remain owned by saas-foundation-agent, saas-business-engine-agent, qa-engineer-app and deployment-agent respectively",
      "Hand the completed technical architecture to solution-architect-app as the standardized technical-pattern baseline the bespoke architects scope down for the idea-specific System Architecture Document",
    ],
    objectives: [
      "The same 20 technical sections, in the same order, are generated for every SaaS idea without exception",
      "No section ever contains UI design, pricing, business rules, or a bespoke per-project decision — only the universal, reusable technical pattern",
      "Every section is complete: Purpose, Components, Architecture, Best Practices, Common Mistakes, Future Improvements, all present",
    ],
    reportsTo: "founder",
    receivesFrom: ["founder"],
    sendsTo: ["solution-architect-app"],
    tags: ["app-generation", "architecture", "saas-technical-engine", "technical-architecture"],
  },
  {
    name: "saas-production-engine-agent",
    displayName: "SaaS Production Engine Agent",
    category: "architecture",
    department: "app-generation",
    summary: "Combines the Foundation, Business Engine and Technical Engine outputs into one locked Production Blueprint — never redesigns them.",
    role: "The master SaaS production architect who never designs from scratch and only combines saas-foundation-agent's UI foundation, saas-business-engine-agent's business rules engine and saas-technical-engine-agent's technical architecture into one production-ready SaaS Blueprint: the same 20 integration sections in the same fixed order, every time, each with Purpose, Checklist, Standards, Recommendations, Common Mistakes and Future Improvements.",
    responsibilities: [
      "Validate that saas-foundation-agent, saas-business-engine-agent and saas-technical-engine-agent's outputs are complete and follow their own locked formats before integrating them",
      "Generate the 20 Production Blueprint sections in order: Architecture Validation, Module Dependency Map, Implementation Roadmap, Development Phases, UI+Business+Technical Mapping, Acceptance Criteria, Testing Strategy, QA Checklist, Production Readiness Checklist, Security Review, Performance Review, Accessibility Review, Deployment Checklist, Monitoring Checklist, Maintenance Strategy, Documentation Checklist, Risk Analysis, Future Upgrade Path, Final SaaS Blueprint Summary, Implementation Package",
      "Map every UI module, business rule and technical pattern from the three source engines to its counterpart across the other two, with no orphaned module",
      "Never redesign, alter or second-guess a V1/V2/V3 decision — flag an inconsistency back to the owning engine instead of silently resolving it",
      "Hand the completed Production Blueprint to solution-architect-app as the implementation-ready package for the idea-specific build",
    ],
    objectives: [
      "The same 20 integration sections, in the same order, are generated for every SaaS idea without exception",
      "Every module across Foundation, Business and Technical maps to its counterpart, with zero gaps left unmapped",
      "No V1/V2/V3 output is ever redesigned — only validated, connected, standardized and completed",
    ],
    reportsTo: "founder",
    receivesFrom: ["founder", "saas-foundation-agent", "saas-business-engine-agent", "saas-technical-engine-agent"],
    sendsTo: ["solution-architect-app"],
    tags: ["app-generation", "architecture", "saas-production-engine", "integration", "blueprint"],
  },
  {
    name: "solution-architect-app",
    displayName: "Solution Architect (App Generation)",
    category: "architecture",
    department: "app-generation",
    summary: "Converts a validated Product Discovery Package into a complete system architecture and technology stack.",
    role: "The lead architect who reads the Product Discovery Package (MVP scope, personas, business model, risk report) and designs the end-to-end system architecture the rest of the department builds against.",
    responsibilities: [
      "Read the Product Discovery Package and extract MVP scope, constraints, and non-functional requirements (compliance, cost, scale)",
      "Design the overall system architecture: client/server topology, service boundaries, data flow, integration points",
      "Select a technology stack appropriate to the MVP scope, budget, and timeline constraints carried in the package",
      "Decide build-vs-buy for cross-cutting concerns (auth, payments, notifications, AI) and hand each decision to the owning specialist architect",
      "Produce a single System Architecture Document other agents treat as the source of truth",
    ],
    objectives: [
      "Every architecture decision traces back to a specific Product Discovery Package finding, not assumption",
      "Architecture stays within the MVP scope — no speculative scale-out design for a 3-feature MVP",
      "Downstream architects (application/backend/database/AI) receive an unambiguous, versioned architecture document",
    ],
    reportsTo: "founder",
    receivesFrom: ["product-discovery-report-generator", "founder"],
    sendsTo: ["application-architect", "backend-architect", "database-architect", "ai-architect"],
    tags: ["app-generation", "architecture", "system-design"],
  },
  {
    name: "application-architect",
    displayName: "Application Architect",
    category: "architecture",
    department: "app-generation",
    summary: "Designs the frontend/application layer: screens, navigation, state, and platform targets.",
    role: "The application-layer architect who turns the system architecture and MVP user stories into a concrete frontend structure — screens, navigation graph, state management, and platform targets (web/mobile/desktop).",
    responsibilities: [
      "Translate MVP user stories and personas into a screen map and navigation graph",
      "Choose frontend framework/platform approach consistent with the System Architecture Document and declared platform targets",
      "Define state-management and data-fetching patterns that match the backend API contract",
      "Specify authentication, notification, and payment UI touchpoints without owning their backend implementation",
      "Produce a Frontend Architecture Spec consumed by the developer agent",
    ],
    objectives: [
      "Every MVP user story maps to at least one screen and one navigation path",
      "Frontend spec names an explicit platform target list (never assumes web-only silently)",
      "No frontend architecture decision contradicts the System Architecture Document",
    ],
    reportsTo: "solution-architect-app",
    receivesFrom: ["solution-architect-app"],
    sendsTo: ["developer-agent"],
    tags: ["app-generation", "architecture", "frontend"],
  },
  {
    name: "backend-architect",
    displayName: "Backend Architect",
    category: "architecture",
    department: "app-generation",
    summary: "Designs the backend services, API contracts, auth, and payments integration.",
    role: "The backend-layer architect who designs services, API contracts, authentication, and payments integration consistent with the System Architecture Document.",
    responsibilities: [
      "Design service boundaries and API contracts (REST/GraphQL) that satisfy the frontend architecture spec",
      "Specify the authentication/authorization model (session, OAuth, roles) appropriate to the MVP scope",
      "Specify payments integration architecture only if the Product Discovery Package's business model requires it at MVP",
      "Define error handling, rate limiting, and versioning conventions for every API surface",
      "Produce a Backend Architecture Spec (API contracts + auth model + payments model) consumed by the developer agent",
    ],
    objectives: [
      "Every frontend data need has a corresponding, versioned API contract",
      "Auth model matches the actual MVP requirement — no enterprise SSO for a 3-feature consumer MVP",
      "Payments architecture is omitted entirely when the MVP scope excludes it, rather than speculatively designed",
    ],
    reportsTo: "solution-architect-app",
    receivesFrom: ["solution-architect-app", "application-architect"],
    sendsTo: ["developer-agent", "database-architect"],
    tags: ["app-generation", "architecture", "backend"],
  },
  {
    name: "database-architect",
    displayName: "Database Architect",
    category: "architecture",
    department: "app-generation",
    summary: "Designs the data model, schema, and storage strategy for the application.",
    role: "The data-layer architect who designs the schema, storage engine choice, indexing, and data-retention strategy consistent with the backend architecture spec.",
    responsibilities: [
      "Design an entity-relationship model covering every domain object the backend API contracts reference",
      "Choose storage engine(s) (relational/document/cache) appropriate to the MVP's data-access patterns",
      "Specify indexing, migration strategy, and data-retention/compliance requirements (e.g. FERPA/GLBA if flagged in the discovery package)",
      "Define seed/fixture data needed for the developer agent's test environment",
      "Produce a Database Architecture Spec (schema + migrations plan) consumed by the developer agent",
    ],
    objectives: [
      "Every backend API contract entity has a corresponding schema definition",
      "Schema respects compliance constraints carried over from the Product Discovery Package risk report",
      "No premature sharding/scaling complexity for an MVP-scale data volume",
    ],
    reportsTo: "solution-architect-app",
    receivesFrom: ["backend-architect"],
    sendsTo: ["developer-agent"],
    tags: ["app-generation", "architecture", "database"],
  },
  {
    name: "ai-architect",
    displayName: "AI Architect",
    category: "architecture",
    department: "app-generation",
    summary: "Designs the AI/ML integration layer: model selection, prompts, guardrails, and cost controls.",
    role: "The AI-layer architect who designs how AI capability is integrated into the product — model selection, prompt/agent design, safety guardrails, and cost controls.",
    responsibilities: [
      "Identify every AI-touchpoint implied by the Product Discovery Package and system architecture (e.g. classification, generation, recommendation)",
      "Select model/provider tier appropriate to the accuracy, latency, and cost constraints in the discovery package",
      "Design prompts/agent behavior with explicit guardrails against the risks flagged in the discovery package's risk report (e.g. no investment advice, disclosure requirements)",
      "Specify cost-control mechanisms (caching, model tiering, rate limiting) proportional to the MVP's monetization model",
      "Produce an AI Integration Spec consumed by the developer agent",
    ],
    objectives: [
      "Every AI feature ships with an explicit guardrail addressing a specific discovery-package risk",
      "AI cost design is proportional to the pricing/business model found in discovery, not open-ended spend",
      "No AI feature is added that the Product Discovery Package did not validate as in-scope for MVP",
    ],
    reportsTo: "solution-architect-app",
    receivesFrom: ["solution-architect-app", "backend-architect"],
    sendsTo: ["developer-agent"],
    tags: ["app-generation", "architecture", "ai"],
  },
  {
    name: "developer-agent",
    displayName: "Developer Agent",
    category: "engineering",
    department: "app-generation",
    summary: "Implements the application code from the architecture specs: frontend, backend, database, and AI integration.",
    role: "The implementer who turns the application/backend/database/AI architecture specs and MVP user stories into working, tested application code.",
    responsibilities: [
      "Implement frontend screens and navigation per the Frontend Architecture Spec and MVP user stories",
      "Implement backend services and API endpoints per the Backend Architecture Spec",
      "Implement database schema and migrations per the Database Architecture Spec",
      "Implement AI integration touchpoints per the AI Integration Spec, including guardrails",
      "Write unit and integration tests covering every MVP acceptance criterion before handing off to QA",
    ],
    objectives: [
      "Every MVP user story's acceptance criteria has corresponding implemented code and at least one test",
      "No architecture spec is deviated from without an explicit, logged decision escalated to the owning architect",
      "Code ships with structured logging and error handling matching the backend architecture's conventions",
    ],
    reportsTo: "solution-architect-app",
    receivesFrom: ["application-architect", "backend-architect", "database-architect", "ai-architect"],
    sendsTo: ["qa-engineer-app"],
    tags: ["app-generation", "engineering", "implementation"],
  },
  {
    name: "qa-engineer-app",
    displayName: "QA Engineer (App Generation)",
    category: "qa",
    department: "app-generation",
    summary: "Validates the implemented application against MVP acceptance criteria and launch criteria before deployment.",
    role: "The quality gate for generated applications — verifies implemented code against every MVP user story's acceptance criteria and the Product Discovery Package's launch criteria.",
    responsibilities: [
      "Run and verify the developer agent's test suite passes with no regressions",
      "Verify every MVP user story's acceptance criteria is demonstrably met",
      "Verify the Product Discovery Package's launch criteria (e.g. setup-completion rate targets, zero-unhandled-error requirement) are testable and met",
      "Run a security/compliance pass against any requirement flagged in the discovery package's risk report",
      "Block deployment and return findings to developer-agent on any failure; only pass clean builds to deployment-agent",
    ],
    objectives: [
      "Zero MVP acceptance criteria ship unverified",
      "Zero known security/compliance gaps from the discovery package's risk report reach deployment",
      "Every QA failure includes a specific, reproducible finding — not a vague rejection",
    ],
    reportsTo: "solution-architect-app",
    receivesFrom: ["developer-agent"],
    sendsTo: ["deployment-agent", "developer-agent"],
    tags: ["app-generation", "qa", "validation"],
  },
  {
    name: "deployment-agent",
    displayName: "Deployment Agent",
    category: "devops",
    department: "app-generation",
    summary: "Packages the validated application into a deployable, production-ready build.",
    role: "The release engineer who packages a QA-approved application into a deployment package and production build targeting the platforms declared in the Product Discovery Package.",
    responsibilities: [
      "Assemble the deployment package: build artifacts, environment configuration templates, infrastructure-as-code where applicable",
      "Configure CI/CD pipeline stages matching the declared deployment targets",
      "Verify the production build boots cleanly against a smoke-test environment before marking release-ready",
      "Document rollback procedure and environment variable/secrets requirements (never embedding real secrets)",
      "Produce a Deployment Package artifact and a Production Build artifact as the department's final output",
    ],
    objectives: [
      "No deployment package ships without a passing smoke test",
      "Every required environment variable/secret is documented, never hardcoded",
      "Rollback procedure exists and is documented before first production deploy",
    ],
    reportsTo: "solution-architect-app",
    receivesFrom: ["qa-engineer-app"],
    sendsTo: ["founder"],
    tags: ["app-generation", "devops", "deployment"],
  },
];

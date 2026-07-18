# Universal Technical Architecture

**SaaS:** AI Meal Planning
**Pattern Library:** Universal, locked 20-section technical reference
**Scope:** Domain-agnostic, production-ready, cloud-native, scalable, secure, AI-ready, enterprise-ready reference patterns. This document defines the reusable technical baseline only — it contains no domain-specific implementation, UI, pricing, or business rules. Downstream architects scope these patterns down for the idea-specific System Architecture Document.

---

## 1. Database Architecture

**Purpose**
Provide a durable, consistent, and query-efficient system of record for all application state, supporting transactional integrity, tenant isolation, and evolutionary schema change without data loss.

**Components**
- Primary relational store (OLTP) for transactional, normalized entities.
- Optional document/NoSQL store for semi-structured, high-write, or flexible-schema data.
- Read replicas for horizontal read scaling and reporting isolation.
- Connection pooler (e.g., pooling proxy) to bound concurrent connections.
- Schema migration framework with versioned, reversible migrations.
- Backup and point-in-time-recovery subsystem.

**Architecture**
A primary node handles writes and streams to asynchronous read replicas. Multi-tenancy is enforced via one of three isolation models — shared schema with tenant discriminator, schema-per-tenant, or database-per-tenant — selected by compliance and scale requirements. All access routes through a data-access layer that owns pooling, retries, and query timeouts. Migrations run through a controlled pipeline gated ahead of application deploys.

**Best Practices**
- Enforce tenant isolation at the query layer and via row-level security.
- Index for the top query patterns; measure with explain plans, not intuition.
- Make every migration backward-compatible (expand/contract pattern).
- Separate transactional and analytical workloads.
- Encrypt data at rest and enforce least-privilege database roles.

**Common Mistakes**
- Allowing application code to open raw connections without pooling.
- Destructive migrations deployed in a single step, breaking rollback.
- Missing tenant filters, causing cross-tenant data leakage.
- Over-indexing, degrading write throughput.
- Treating a read replica as strongly consistent.

**Future Improvements**
- Introduce sharding or partitioning as data volume grows.
- Adopt CDC (change data capture) to feed downstream systems.
- Evaluate distributed SQL for multi-region write locality.
- Add automated index advisory from live query telemetry.

---

## 2. Authentication Architecture

**Purpose**
Verify the identity of users, services, and machines reliably, and establish trustworthy, revocable sessions.

**Components**
- Identity provider (managed IdP or self-hosted auth service).
- Credential store with strong password hashing (argon2/bcrypt) or passwordless flows.
- Token issuance service (OIDC/OAuth2) issuing short-lived access + refresh tokens.
- Multi-factor authentication (MFA) module.
- Session and token revocation store.
- Social/enterprise SSO (SAML/OIDC) connectors.

**Architecture**
Clients authenticate against the IdP and receive signed, short-lived access tokens (JWT) plus longer-lived refresh tokens. Services validate tokens via published signing keys (JWKS) without a network hop. Refresh rotation and a revocation list handle logout and compromise. MFA and step-up authentication gate sensitive actions.

**Best Practices**
- Keep access tokens short-lived; rotate refresh tokens on use.
- Store secrets and signing keys in a managed secrets vault.
- Enforce MFA for privileged accounts.
- Use standard protocols (OIDC/OAuth2); never hand-roll crypto.
- Bind sessions to device/context signals for anomaly detection.

**Common Mistakes**
- Long-lived, non-revocable tokens.
- Storing tokens in insecure client storage vulnerable to XSS.
- Rolling custom password hashing or encryption.
- Treating authentication as authorization.

**Future Improvements**
- Adopt passkeys/WebAuthn for phishing-resistant auth.
- Add continuous/risk-based authentication.
- Introduce workload identity federation for service-to-service auth.

---

## 3. Authorization Architecture

**Purpose**
Determine what an authenticated principal is permitted to do, enforcing least privilege consistently across all entry points.

**Components**
- Policy model (RBAC, ABAC, or ReBAC).
- Central policy decision point (PDP) and distributed policy enforcement points (PEP).
- Role/permission registry.
- Tenant- and resource-scoped access rules.
- Audit log of authorization decisions.

**Architecture**
Enforcement happens at every service boundary. A PDP evaluates policies against principal attributes, resource attributes, and context, returning allow/deny; PEPs at API gateways and services enforce the decision. Permissions are scoped by tenant and resource. Policy is declarative and versioned, decoupled from application logic.

**Best Practices**
- Default-deny; grant explicitly.
- Centralize policy definition, distribute enforcement.
- Check authorization at the data layer, not just the UI.
- Make authorization decisions auditable.
- Keep roles coarse, permissions fine-grained.

**Common Mistakes**
- Enforcing access only in the frontend.
- Hardcoding role checks scattered through the codebase.
- Confusing authentication with authorization.
- Privilege creep from unreviewed role grants.

**Future Improvements**
- Move to policy-as-code with automated policy testing.
- Adopt relationship-based authorization for complex sharing graphs.
- Add just-in-time, time-boxed privilege elevation.

---

## 4. Backend Architecture

**Purpose**
Provide the core application logic, orchestration, and business-rule execution in a maintainable, testable, independently deployable structure.

**Components**
- Service layer (modular monolith or microservices).
- Domain/business logic modules with clear boundaries.
- Data-access repositories.
- Background job/worker subsystem.
- Inter-service communication (sync RPC + async messaging).
- Configuration and feature-flag management.

**Architecture**
Layered/hexagonal architecture separates transport, application, domain, and infrastructure concerns. Services are stateless where possible, externalizing state to datastores and caches. Start as a modular monolith with strong internal boundaries; extract services along seams when scaling or team autonomy demands it. Long-running work is offloaded to workers.

**Best Practices**
- Keep services stateless and horizontally scalable.
- Enforce clear module boundaries and dependency direction.
- Externalize configuration; never hardcode environment values.
- Design for idempotency in all mutating operations.
- Prefer async for slow or unreliable downstream work.

**Common Mistakes**
- Premature microservice decomposition adding distributed-system cost.
- Shared mutable state defeating horizontal scale.
- Business logic leaking into controllers or the database.
- Tight coupling between services via shared databases.

**Future Improvements**
- Extract hotspots into dedicated services as load concentrates.
- Introduce a service mesh for traffic management and observability.
- Adopt domain-driven bounded contexts as the domain matures.

---

## 5. API Architecture

**Purpose**
Expose backend capabilities through stable, versioned, secure, and well-documented contracts for internal and external consumers.

**Components**
- API gateway (routing, auth, rate limiting).
- REST and/or GraphQL and/or gRPC interfaces.
- Contract/schema definitions (OpenAPI, GraphQL SDL, protobuf).
- Rate limiting and quota enforcement.
- Versioning strategy and deprecation policy.
- Client SDK generation.

**Architecture**
A gateway fronts all traffic, terminating TLS and enforcing authentication, rate limits, and request validation before routing to services. Contracts are defined schema-first and drive generated types, docs, and mocks. Versioning is explicit (URI or header). Pagination, filtering, and consistent error envelopes are standardized across endpoints.

**Best Practices**
- Design contract-first; treat the schema as the source of truth.
- Version APIs and publish deprecation timelines.
- Standardize pagination, filtering, sorting, and error shapes.
- Enforce rate limits and payload size caps at the gateway.
- Make endpoints idempotent where semantics allow.

**Common Mistakes**
- Breaking changes shipped without versioning.
- Inconsistent error formats across endpoints.
- Leaking internal data models directly through the API.
- Unbounded list endpoints without pagination.

**Future Improvements**
- Add GraphQL federation or BFF layers for diverse clients.
- Introduce API analytics and usage-based governance.
- Adopt automated contract testing between producers and consumers.

---

## 6. AI Architecture

**Purpose**
Integrate machine learning and generative AI capabilities safely, cost-effectively, and reliably as first-class system components.

**Components**
- Model gateway/abstraction layer over hosted or self-hosted models.
- Prompt/template management and versioning.
- Retrieval-augmented generation (RAG) pipeline with a vector store.
- Inference orchestration (chains, agents, tool-calling).
- Guardrails, moderation, and output validation.
- Evaluation, feedback capture, and observability for model quality.

**Architecture**
An abstraction layer decouples the application from any specific model provider, enabling failover and cost routing. Context is assembled via retrieval from a vector index plus structured data, then passed to the model with versioned prompts. Outputs pass through validation and moderation before use. Inference calls are async, cached, and rate-limited. Evaluation harnesses track quality, drift, and cost over time.

**Best Practices**
- Abstract the provider; never couple to a single model API.
- Version prompts and treat them as deployable artifacts.
- Validate and constrain model outputs before acting on them.
- Cache deterministic responses; batch where possible to cut cost.
- Log inputs/outputs (privacy-safe) for evaluation and audit.
- Set token, cost, and latency budgets with circuit breakers.

**Common Mistakes**
- Trusting model output without validation or guardrails.
- Hardcoding a single provider with no fallback.
- Leaking sensitive data into prompts or third-party models.
- No evaluation loop, so quality regressions go unnoticed.
- Unbounded costs from uncapped inference.

**Future Improvements**
- Add semantic caching and model routing by cost/quality.
- Introduce fine-tuning or distillation for hot paths.
- Adopt automated red-teaming and continuous eval pipelines.
- Move latency-critical inference to edge or dedicated hosting.

---

## 7. Storage Architecture

**Purpose**
Store and serve large binary and unstructured objects (files, media, documents, exports) durably and economically.

**Components**
- Object storage service (blob store).
- CDN for edge delivery.
- Signed URL issuance for direct, time-limited access.
- Lifecycle and tiering policies (hot/warm/cold/archive).
- Virus/malware scanning on upload.
- Metadata index linking objects to domain records.

**Architecture**
Clients upload and download directly to object storage via short-lived signed URLs, bypassing application servers for bandwidth efficiency. A CDN caches public/read-heavy assets at the edge. Lifecycle policies transition aging data to cheaper tiers. Object metadata is indexed in the primary datastore for lookup and access control.

**Best Practices**
- Use signed, expiring URLs; never proxy large files through app servers.
- Scan uploads for malware before making them accessible.
- Apply lifecycle tiering to control cost.
- Enforce access control and encryption on every object.
- Separate user content from application/static assets.

**Common Mistakes**
- Streaming large files through application servers.
- Public buckets exposing private data.
- No lifecycle policy, so storage costs grow unbounded.
- Storing binaries in the relational database.

**Future Improvements**
- Add multi-region replication for locality and resilience.
- Introduce content deduplication and compression.
- Adopt event-driven post-processing pipelines on upload.

---

## 8. Search Architecture

**Purpose**
Provide fast, relevant full-text, faceted, and semantic search across large datasets independent of the transactional store.

**Components**
- Dedicated search engine/index.
- Indexing pipeline synced from the system of record.
- Query layer with ranking, faceting, and filtering.
- Vector index for semantic/similarity search.
- Relevance tuning and synonym management.

**Architecture**
Data is projected from the primary store into a denormalized search index via an asynchronous indexing pipeline (event-driven or CDC-fed). Queries hit the search engine, not the OLTP database. Keyword and vector search combine (hybrid) for relevance. The index is treated as a rebuildable derived store, reconstructable from the source of truth.

**Best Practices**
- Keep search indexes asynchronous and eventually consistent.
- Treat the index as disposable/rebuildable from source.
- Combine keyword and semantic search for relevance.
- Enforce tenant and permission filters within search queries.
- Monitor and tune relevance with real query data.

**Common Mistakes**
- Running full-text search directly on the transactional database.
- Synchronous indexing that couples writes to search availability.
- Leaking cross-tenant results through unfiltered queries.
- No reindexing path when the schema changes.

**Future Improvements**
- Add learning-to-rank models for relevance.
- Introduce personalization signals into ranking.
- Adopt hybrid semantic + keyword ranking with feedback loops.

---

## 9. Caching Architecture

**Purpose**
Reduce latency and backend load by serving frequently accessed data from fast, in-memory tiers.

**Components**
- Distributed in-memory cache (e.g., key-value cache cluster).
- Application-local caches for hot, small datasets.
- CDN/edge cache for static and cacheable responses.
- Cache invalidation and TTL policies.
- Cache-aside/read-through/write-through strategies.

**Architecture**
Multiple cache tiers operate from edge to application to shared distributed cache. Most reads use cache-aside: check cache, fall back to source, populate. TTLs bound staleness; explicit invalidation handles writes. Cache keys are namespaced by tenant and version to prevent collisions and enable bulk invalidation.

**Best Practices**
- Namespace and version cache keys.
- Set sensible TTLs; never cache without an expiry strategy.
- Protect against stampedes with request coalescing/locks.
- Cache computed/expensive results, not just raw rows.
- Design for cache misses as the normal case.

**Common Mistakes**
- No invalidation strategy, serving stale data indefinitely.
- Cache stampede on popular expired keys.
- Caching sensitive/per-user data in shared caches.
- Treating the cache as a durable store.

**Future Improvements**
- Add write-through/write-behind for hot write paths.
- Introduce tiered and semantic caching.
- Adopt adaptive TTLs based on access patterns.

---

## 10. Event Architecture

**Purpose**
Enable asynchronous, decoupled communication and reliable propagation of state changes across services.

**Components**
- Message broker / event streaming platform.
- Event schema registry.
- Producers and consumers with consumer groups.
- Dead-letter queues (DLQ) for poison messages.
- Outbox pattern for transactional event publishing.
- Idempotent consumer handlers.

**Architecture**
Services publish domain events to durable topics; consumers subscribe independently. The transactional outbox guarantees events are published atomically with state changes. Consumers are idempotent and commit offsets after processing. Failed messages route to DLQs for inspection and replay. Schemas are versioned and registered for compatibility.

**Best Practices**
- Use the outbox pattern to avoid dual-write inconsistency.
- Make all consumers idempotent.
- Version event schemas with backward compatibility.
- Route failures to DLQs; enable replay.
- Keep events as facts, not commands, where possible.

**Common Mistakes**
- Dual writes to DB and broker without an outbox.
- Non-idempotent consumers causing duplicate side effects.
- No DLQ, so a single bad message blocks a partition.
- Breaking event schema changes.

**Future Improvements**
- Adopt event sourcing for auditable state.
- Add stream processing for real-time aggregation.
- Introduce schema evolution automation and contract tests.

---

## 11. Integration Architecture

**Purpose**
Connect the system to third-party services and external partners reliably, securely, and observably.

**Components**
- Outbound integration/anti-corruption layer.
- Webhook ingestion and dispatch subsystem.
- API client wrappers with retries and circuit breakers.
- Credential/secret management for third parties.
- Rate-limit and quota handling per provider.
- Integration event and error logging.

**Architecture**
An anti-corruption layer isolates external APIs from the domain model, translating between formats. Outbound calls are wrapped with timeouts, retries with backoff, and circuit breakers. Inbound webhooks are verified (signatures), queued, and processed asynchronously with idempotency. Third-party credentials live in a secrets vault, scoped and rotated.

**Best Practices**
- Isolate external contracts behind an adapter layer.
- Apply timeouts, retries with backoff, and circuit breakers.
- Verify and idempotently process inbound webhooks.
- Store third-party secrets in a vault; rotate them.
- Handle provider rate limits gracefully.

**Common Mistakes**
- Calling third-party APIs synchronously in request paths without timeouts.
- Trusting unverified inbound webhooks.
- Leaking provider-specific models into the domain.
- No handling for partner outages or throttling.

**Future Improvements**
- Add an integration hub/iPaaS for many connectors.
- Introduce sandbox/replay tooling for partner testing.
- Adopt automated contract monitoring for external APIs.

---

## 12. Security Architecture

**Purpose**
Protect confidentiality, integrity, and availability across the system through defense-in-depth.

**Components**
- Secrets management vault.
- Encryption in transit (TLS) and at rest.
- Network segmentation, WAF, and DDoS protection.
- Vulnerability scanning and dependency/SCA checks.
- Audit logging and intrusion detection.
- Security headers and input sanitization.

**Architecture**
Security is layered: perimeter (WAF, DDoS, gateway auth), network (segmentation, private subnets), application (input validation, output encoding, CSRF/XSS defenses), and data (encryption, key management). Secrets are never in code; they are injected from a vault. All privileged actions are audited. Continuous scanning covers code, dependencies, and infrastructure.

**Best Practices**
- Apply least privilege everywhere (IAM, DB, network).
- Encrypt in transit and at rest with managed keys.
- Keep secrets out of code and logs.
- Patch dependencies continuously; scan in CI.
- Maintain immutable, tamper-evident audit logs.

**Common Mistakes**
- Secrets committed to source control.
- Over-permissive IAM roles and open network access.
- Trusting client input without validation.
- No audit trail for sensitive operations.

**Future Improvements**
- Move toward zero-trust network architecture.
- Add runtime application self-protection (RASP).
- Introduce automated secret rotation and short-lived credentials.

---

## 13. Validation Architecture

**Purpose**
Ensure all data entering the system is well-formed, safe, and semantically valid before it is processed or persisted.

**Components**
- Schema validation at API boundaries.
- Domain/business-rule validation in the service layer.
- Database constraints (types, foreign keys, checks, uniqueness).
- Sanitization for injection and encoding attacks.
- Shared validation contracts between client and server.

**Architecture**
Validation is layered and defense-in-depth: structural validation at the gateway/API against the schema, semantic/business validation in the domain layer, and integrity constraints in the database as the last line. Validation contracts are shared or generated from a single schema so client and server agree. The server never trusts client-side validation.

**Best Practices**
- Validate at every trust boundary; never trust the client.
- Enforce integrity with database constraints as a backstop.
- Fail fast with clear, structured validation errors.
- Sanitize and canonicalize input before use.
- Derive client and server validation from one schema.

**Common Mistakes**
- Relying solely on frontend validation.
- Missing database constraints, allowing corrupt data.
- Inconsistent rules between client and server.
- Vague error messages that hide the failing field.

**Future Improvements**
- Generate validators from a shared schema registry.
- Add property-based/fuzz testing of validators.
- Introduce runtime type contracts across service boundaries.

---

## 14. Error Handling Architecture

**Purpose**
Detect, classify, communicate, and recover from failures gracefully without corrupting state or leaking internals.

**Components**
- Standardized error taxonomy and codes.
- Consistent error response envelope.
- Retry, backoff, and circuit-breaker policies.
- Graceful degradation and fallback paths.
- Correlation IDs for tracing failures.
- Centralized error tracking/alerting.

**Architecture**
Errors are classified (client vs. server, retryable vs. terminal) and mapped to consistent response envelopes with correlation IDs. Transient failures use retry-with-backoff and circuit breakers; terminal failures fail fast. Non-critical dependency failures degrade gracefully to fallbacks. All errors are captured centrally with context for triage, never exposing stack traces to clients.

**Best Practices**
- Use a consistent error envelope and error codes.
- Distinguish retryable from non-retryable failures.
- Never leak internal details or stack traces to clients.
- Propagate correlation IDs through every layer.
- Degrade gracefully rather than fail catastrophically.

**Common Mistakes**
- Swallowing exceptions silently.
- Retrying non-idempotent operations, causing duplicates.
- Exposing stack traces or internal messages to users.
- Inconsistent error formats across services.

**Future Improvements**
- Add automated anomaly detection on error rates.
- Introduce self-healing/auto-remediation for known failures.
- Adopt chaos engineering to validate failure handling.

---

## 15. Monitoring & Observability Architecture

**Purpose**
Provide full visibility into system health, performance, and behavior to detect, diagnose, and prevent issues.

**Components**
- Metrics collection and time-series storage.
- Structured, centralized logging.
- Distributed tracing.
- Dashboards and SLO/SLI definitions.
- Alerting and on-call routing.
- Synthetic and real-user monitoring.

**Architecture**
The three pillars — metrics, logs, and traces — are correlated via shared trace/correlation IDs. Services emit structured logs and metrics; traces span service boundaries. SLOs define acceptable thresholds and drive alerting on symptoms, not just causes. Dashboards surface golden signals (latency, traffic, errors, saturation). Alerts route to on-call with actionable context.

**Best Practices**
- Instrument the four golden signals for every service.
- Correlate logs, metrics, and traces with shared IDs.
- Alert on user-facing symptoms and SLO burn, not noise.
- Define SLOs/SLIs and track error budgets.
- Keep logs structured and queryable.

**Common Mistakes**
- Logging without structure or correlation.
- Alert fatigue from noisy, non-actionable alerts.
- Monitoring infrastructure but not user experience.
- No tracing across service boundaries.

**Future Improvements**
- Add AI-assisted anomaly detection and root-cause analysis.
- Introduce continuous profiling.
- Adopt OpenTelemetry end-to-end standardization.

---

## 16. Performance Architecture

**Purpose**
Meet latency and throughput targets efficiently under expected and peak load.

**Components**
- Performance budgets and SLIs.
- Caching and CDN tiers.
- Query and index optimization.
- Asynchronous and batch processing.
- Load and stress testing harness.
- Profiling and bottleneck analysis tooling.

**Architecture**
Performance is designed in via caching, efficient data access, and async offloading of slow work. Hot paths are profiled and optimized against defined budgets. Expensive operations move off the request path to workers. Load tests validate behavior at target and peak concurrency before release, and continuous profiling catches regressions.

**Best Practices**
- Define and enforce performance budgets.
- Optimize the critical path; measure before optimizing.
- Push slow work to async/background processing.
- Cache aggressively at appropriate tiers.
- Load test to realistic peak, not just average.

**Common Mistakes**
- Optimizing without measuring (guesswork).
- N+1 query patterns in data access.
- Synchronous slow work blocking request threads.
- Testing only at average, ignoring peak/tail latency.

**Future Improvements**
- Add adaptive/predictive autoscaling tied to performance signals.
- Introduce edge compute for latency-sensitive paths.
- Adopt continuous performance regression gating in CI.

---

## 17. Scalability Architecture

**Purpose**
Allow the system to grow with load and data volume without redesign, scaling cost roughly with usage.

**Components**
- Stateless, horizontally scalable services.
- Auto-scaling groups and orchestration.
- Load balancing across instances.
- Database read replicas, partitioning, and sharding.
- Asynchronous queues to absorb bursts.
- Multi-region capability for global scale.

**Architecture**
Stateless services scale horizontally behind load balancers with auto-scaling driven by load metrics. State is externalized to scalable datastores and caches. Queues decouple producers from consumers to absorb spikes. Data scales via replicas, partitioning, and sharding. The design favors scaling out over scaling up, and isolates bottleneck components for independent scaling.

**Best Practices**
- Keep compute stateless; externalize all state.
- Scale out horizontally, not just up.
- Decouple with queues to absorb load spikes.
- Identify and independently scale bottlenecks.
- Design data partitioning early, before it hurts.

**Common Mistakes**
- Stateful services that can't scale horizontally.
- A single database as an unscalable bottleneck.
- Auto-scaling without load testing the limits.
- Ignoring data-layer scaling until it fails.

**Future Improvements**
- Adopt multi-region active-active topology.
- Introduce cell-based architecture for fault isolation.
- Add predictive scaling from historical patterns.

---

## 18. Deployment Architecture

**Purpose**
Deliver software to production safely, repeatably, and frequently with minimal risk and fast rollback.

**Components**
- CI/CD pipeline with automated gates.
- Infrastructure as code (IaC).
- Containerization and orchestration.
- Environment promotion (dev → staging → prod).
- Progressive delivery (blue-green, canary, feature flags).
- Automated rollback mechanisms.

**Architecture**
Every change flows through a pipeline: build, test, scan, and deploy via immutable, versioned artifacts. Infrastructure is provisioned from code and reviewed like application code. Progressive rollout (canary/blue-green) exposes changes to a subset first, with automated health checks and rollback on regression. Feature flags decouple deploy from release.

**Best Practices**
- Automate the full pipeline; no manual production changes.
- Deploy immutable, versioned artifacts.
- Use progressive delivery with automated rollback.
- Manage infrastructure as version-controlled code.
- Decouple deployment from release via feature flags.

**Common Mistakes**
- Manual, non-reproducible deployments.
- No automated rollback path.
- Config drift between environments.
- Big-bang releases without canary/staged rollout.

**Future Improvements**
- Adopt GitOps for declarative, auditable deploys.
- Add progressive delivery driven by automated analysis.
- Introduce ephemeral preview environments per change.

---

## 19. Disaster Recovery Architecture

**Purpose**
Ensure the system can recover from catastrophic failures within defined RTO and RPO targets, protecting against data loss.

**Components**
- Automated, tested backups with retention policies.
- Point-in-time recovery for datastores.
- Cross-region replication and failover.
- Defined RTO/RPO objectives.
- Runbooks and disaster-recovery drills.
- Infrastructure-as-code for rapid rebuild.

**Architecture**
Regular automated backups and continuous replication protect data with a bounded RPO. Critical data replicates cross-region for regional failover meeting the RTO. Infrastructure is reconstructable from code, enabling rebuild in a new region. Recovery procedures are documented in runbooks and validated by periodic drills — backups are restore-tested, not assumed.

**Best Practices**
- Define and validate RTO/RPO with real drills.
- Automate backups and regularly test restores.
- Replicate critical data across regions.
- Keep infrastructure reproducible from code.
- Maintain and rehearse runbooks.

**Common Mistakes**
- Backups that are never restore-tested.
- No defined or measured RTO/RPO.
- Single-region dependency with no failover.
- Runbooks that are stale or untested.

**Future Improvements**
- Move to automated cross-region failover.
- Adopt continuous DR validation and game days.
- Introduce active-active to minimize RTO toward zero.

---

## 20. Documentation Architecture

**Purpose**
Capture and maintain the knowledge needed to build, operate, integrate with, and evolve the system.

**Components**
- Architecture decision records (ADRs).
- API reference (generated from contracts).
- Runbooks and operational playbooks.
- Onboarding and developer guides.
- System/architecture diagrams (kept current).
- Changelogs and release notes.

**Architecture**
Documentation is treated as code: versioned alongside the system, reviewed in pull requests, and generated from sources of truth where possible (API docs from schemas, diagrams from IaC). ADRs record significant decisions and their trade-offs. Runbooks support on-call operations. Docs live close to the code and are updated as part of the definition of done.

**Best Practices**
- Keep docs in version control, reviewed like code.
- Generate reference docs from the source of truth.
- Record decisions and their trade-offs as ADRs.
- Make documentation part of the definition of done.
- Keep diagrams and runbooks current, not aspirational.

**Common Mistakes**
- Stale documentation that misleads.
- Knowledge trapped in individuals' heads.
- Manually duplicated docs that drift from reality.
- No record of why key decisions were made.

**Future Improvements**
- Add AI-assisted doc generation and freshness checks.
- Introduce automated diagram generation from infrastructure.
- Adopt a searchable, unified knowledge portal.

---

*End of Universal Technical Architecture. This baseline is handed to solution-architect-app; the bespoke architects scope these universal patterns down into the idea-specific System Architecture Document.*

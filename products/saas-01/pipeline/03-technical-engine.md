# Universal Technical Architecture — Freelancer Budgeting AI

> Standardized, domain-agnostic technical pattern baseline. The 20 sections below are the locked reference architecture. Every pattern here is reusable and cloud-native; none encodes the idea's domain-specific budgeting logic, UI, pricing or business rules — those are scoped down by the downstream bespoke architects and the developer-agent.

---

## 1. Database Architecture

**Purpose**
Provide a durable, consistent, and query-efficient system of record for all application state, supporting transactional integrity, evolvable schemas, and multi-tenant isolation.

**Components**
- Primary relational store (PostgreSQL-class) for transactional, relational data.
- Optional document/NoSQL store for schema-flexible or high-write entities.
- Read replicas for read scaling and reporting isolation.
- Connection pooler (e.g., PgBouncer) between application and database.
- Schema migration tool (versioned, forward-only migrations).
- Backup and point-in-time-recovery subsystem.

**Architecture**
A primary-writer / multiple-read-replica topology behind a pooler. Tenancy is enforced via a tenant discriminator column with row-level security, or schema-per-tenant for stronger isolation at higher tenant value. Writes go to the primary; reads that tolerate replication lag route to replicas. Migrations run through a CI-gated, versioned pipeline. Logical separation between OLTP and analytical workloads (CDC to a warehouse).

**Best Practices**
- Explicit schema versioning; every change is a reviewed, reversible migration.
- Enforce tenant isolation at the database layer (RLS), not only in application code.
- Index for real query patterns; measure with query plans, not assumptions.
- Use foreign keys and constraints to keep integrity in the data layer.
- Separate read and write paths; never report off the primary.

**Common Mistakes**
- Tenant isolation only in application code, allowing cross-tenant leakage on a bug.
- Unbounded tables without partitioning or archival strategy.
- Destructive, non-reversible migrations run directly against production.
- Over-indexing, degrading write throughput.

**Future Improvements**
- Horizontal sharding by tenant when a single primary saturates.
- Automated index recommendation from live query telemetry.
- Time-series or columnar partitioning for high-volume append data.

---

## 2. Authentication Architecture

**Purpose**
Verify identity of humans and machines reliably, resisting credential attacks while keeping login friction low.

**Components**
- Identity provider / auth service (managed IdP or self-hosted OIDC).
- Token issuer producing short-lived access tokens and rotating refresh tokens.
- MFA/TOTP and WebAuthn/passkey support.
- Social and enterprise SSO connectors (OAuth2, SAML, OIDC).
- Session and refresh-token store.

**Architecture**
Standards-based OAuth2/OIDC. Clients obtain short-lived JWT access tokens plus a rotating refresh token stored in an httpOnly, secure cookie. Access tokens are stateless and signed with rotating asymmetric keys (JWKS endpoint). MFA is a step-up challenge on sensitive operations. Machine-to-machine uses the client-credentials grant with scoped service identities.

**Best Practices**
- Short access-token lifetime; rotate refresh tokens and detect reuse.
- Store tokens in httpOnly cookies, never in localStorage.
- Sign with asymmetric keys and publish JWKS for rotation.
- Enforce MFA on privileged and financial actions via step-up.

**Common Mistakes**
- Long-lived tokens with no revocation path.
- Rolling custom crypto/password hashing instead of vetted libraries.
- Treating authentication as sufficient for authorization.

**Future Improvements**
- Passwordless-first (passkeys) as the default flow.
- Continuous/adaptive authentication driven by risk signals.
- Decentralized or verifiable-credential identity support.

---

## 3. Authorization

**Purpose**
Decide what an authenticated principal may do, enforced consistently across every entry point.

**Components**
- Policy model (RBAC baseline, ABAC for fine-grained rules).
- Central policy decision point (PDP) and distributed enforcement points (PEP).
- Permission/role registry.
- Tenant- and resource-scoped access checks.

**Architecture**
A hybrid RBAC + ABAC model. Roles grant coarse permissions; attribute policies refine by resource ownership, tenant, and context. Authorization is centralized as a policy engine (e.g., OPA-style) queried by each service, with decisions cached briefly. Every resource carries an owning tenant/principal; checks are enforced server-side at the API boundary and again at the data layer.

**Best Practices**
- Deny by default; grant explicitly.
- Enforce at the API and data layers, never only in the UI.
- Externalize policy from code so rules are auditable and versioned.
- Scope every query by tenant automatically.

**Common Mistakes**
- Client-side-only permission checks.
- Coarse roles that force over-provisioning of access.
- Scattered inline `if` checks that drift out of sync.

**Future Improvements**
- Relationship-based authorization (ReBAC, Zanzibar-style) for shared resources.
- Just-in-time, time-boxed privilege elevation.
- Policy simulation/what-if tooling before rollout.

---

## 4. Backend Architecture

**Purpose**
Organize server-side business logic for maintainability, testability, and independent evolution.

**Components**
- Service layer (modular monolith or bounded microservices).
- Domain layer with clear boundaries and interfaces.
- Async worker/background-job subsystem.
- Shared platform libraries (logging, config, auth clients).

**Architecture**
Start as a modular monolith with strict internal module boundaries (hexagonal/ports-and-adapters), extractable into services when scaling or team boundaries demand. Business logic is isolated from transport (HTTP) and infrastructure (DB, queues) via interfaces. Long-running work is offloaded to idempotent background workers. Stateless services enable horizontal scaling.

**Best Practices**
- Keep services stateless; push state to data stores.
- Separate domain logic from framework and I/O concerns.
- Make background jobs idempotent and retry-safe.
- Version internal contracts between modules.

**Common Mistakes**
- Premature microservice decomposition adding distributed-systems overhead.
- Business logic entangled with controllers and ORM models.
- Non-idempotent jobs that corrupt state on retry.

**Future Improvements**
- Extract high-load modules into independently scaled services.
- Adopt CQRS where read and write models diverge sharply.
- Workflow/saga orchestration for multi-step processes.

---

## 5. API Architecture

**Purpose**
Expose backend capabilities through a stable, versioned, well-documented contract for internal and external consumers.

**Components**
- API gateway (routing, rate limiting, auth offload).
- REST and/or GraphQL interface layer.
- Contract/schema definitions (OpenAPI, GraphQL SDL).
- Versioning and deprecation framework.

**Architecture**
An API gateway fronts all traffic, handling authentication, rate limiting, and routing. Resource-oriented REST is the default; GraphQL is offered where clients need flexible aggregation. Contracts are schema-first (OpenAPI/SDL) and generated docs/SDKs derive from them. Versioning is explicit (URI or header); breaking changes ship under a new version with a deprecation window.

**Best Practices**
- Schema-first contracts as the source of truth.
- Consistent pagination, filtering, and error envelopes.
- Idempotency keys for unsafe operations.
- Explicit versioning with published deprecation timelines.

**Common Mistakes**
- Breaking changes shipped into an existing version.
- Inconsistent error and pagination shapes across endpoints.
- No rate limiting, exposing the system to abuse.

**Future Improvements**
- gRPC for internal, latency-sensitive service-to-service calls.
- Event-driven/webhook and streaming APIs for real-time consumers.
- Automated contract testing in CI.

---

## 6. AI Architecture

**Purpose**
Integrate AI/ML capabilities reliably, safely, and cost-effectively as a first-class, observable subsystem.

**Components**
- Model gateway abstracting providers/models behind one interface.
- Prompt/template and versioning registry.
- Retrieval layer (vector store + embeddings) for grounding.
- Guardrails: input sanitization, output validation, moderation.
- Evaluation, feedback, and cost/usage telemetry.

**Architecture**
A provider-agnostic model gateway routes inference requests, enabling fallback and A/B routing across models. Retrieval-augmented generation grounds outputs in tenant-scoped context retrieved from a vector store. Prompts are versioned artifacts. Inputs are sanitized against injection; outputs are schema-validated and moderated before use. All calls are traced with token, latency, and cost metrics; a feedback loop captures quality signals for evaluation.

**Best Practices**
- Abstract the provider so models are swappable.
- Ground outputs with retrieval; never trust free-form generation for facts.
- Validate and constrain model output to a schema before acting on it.
- Track token cost and latency per request; set budgets.
- Isolate tenant data in retrieval; never leak context across tenants.

**Common Mistakes**
- Passing unsanitized user input directly into prompts (prompt injection).
- Hard-coupling to a single vendor with no fallback.
- Treating model output as trusted/structured without validation.
- Ignoring per-request cost until the bill arrives.

**Future Improvements**
- Fine-tuned or distilled smaller models for cost/latency.
- Semantic caching of embeddings and responses.
- Automated eval harness gating prompt/model changes in CI.
- Agentic tool-use orchestration with human-in-the-loop checkpoints.

---

## 7. Storage Architecture

**Purpose**
Store and serve large binary and file objects durably and cost-efficiently, separate from the transactional database.

**Components**
- Object storage (S3-class) for blobs and files.
- CDN for edge delivery of public/cacheable assets.
- Signed-URL service for direct, time-boxed access.
- Lifecycle/tiering policies.

**Architecture**
Large objects live in object storage, never in the database; the database holds only metadata and references. Clients upload/download directly via short-lived signed URLs, keeping bytes off the application servers. A CDN fronts read-heavy public assets. Lifecycle policies transition cold data to cheaper tiers and expire temporary artifacts.

**Best Practices**
- Keep binaries out of the relational database.
- Use signed URLs with least-privilege, short expiry.
- Encrypt at rest; scope buckets per tenant/prefix.
- Set lifecycle rules for cost control and retention compliance.

**Common Mistakes**
- Proxying every file byte through app servers.
- Public buckets exposing tenant data.
- No expiration on temporary or orphaned objects.

**Future Improvements**
- Multi-region replication for locality and durability.
- Client-side/E2E encryption for sensitive documents.
- Deduplication and content-addressed storage.

---

## 8. Search Architecture

**Purpose**
Provide fast, relevant full-text and structured search over application data beyond what the primary database serves efficiently.

**Components**
- Dedicated search engine (Elasticsearch/OpenSearch-class).
- Indexing pipeline synchronizing source data to the index.
- Query/relevance layer (ranking, facets, filters).
- Optional vector index for semantic search.

**Architecture**
Source-of-truth data is projected into a search index via an event-driven or CDC pipeline, keeping the index eventually consistent with the database. Queries hit the search engine, not the primary DB. Tenant scoping is enforced as a mandatory filter on every query. Hybrid search combines keyword relevance with vector similarity where semantic recall matters.

**Best Practices**
- Treat the index as a derived, rebuildable projection.
- Enforce tenant filters at query construction, server-side.
- Version index mappings; support reindex without downtime.
- Tune relevance with real query analytics.

**Common Mistakes**
- Querying the search engine as if it were strongly consistent.
- Missing tenant filter leaking cross-tenant results.
- No reindex/backfill path when mappings change.

**Future Improvements**
- Learning-to-rank models for relevance.
- Unified hybrid keyword+semantic ranking.
- Personalized ranking from usage signals.

---

## 9. Caching

**Purpose**
Reduce latency and backend load by serving frequently accessed data from fast, ephemeral stores.

**Components**
- Distributed cache (Redis-class).
- Application/in-process cache for hot, small data.
- CDN/edge cache for HTTP responses and assets.
- Cache invalidation and TTL policy layer.

**Architecture**
Multi-layered: CDN at the edge, a shared distributed cache for cross-instance data, and short-lived in-process caches for the hottest keys. Cache-aside is the default read pattern. Keys are namespaced by tenant and version. Invalidation is event-driven where correctness matters, TTL-based where staleness is tolerable.

**Best Practices**
- Namespace cache keys by tenant and schema version.
- Prefer cache-aside; set explicit, deliberate TTLs.
- Design for cache misses; never make the cache a source of truth.
- Guard against stampedes (locks, request coalescing).

**Common Mistakes**
- Caching tenant-sensitive data under shared keys.
- No invalidation strategy, serving stale data indefinitely.
- Treating the cache as durable storage.

**Future Improvements**
- Semantic/predictive prefetch caching.
- Write-through caching for read-heavy, write-light entities.
- Tiered cache with automatic hot-key promotion.

---

## 10. Event Architecture

**Purpose**
Decouple producers and consumers via asynchronous messaging, enabling resilience and extensibility.

**Components**
- Message broker / event streaming platform (Kafka, SQS/SNS, NATS).
- Event schema registry.
- Producers, consumers, and dead-letter queues.
- Outbox for transactional event publishing.

**Architecture**
Services emit domain events to a broker; consumers subscribe independently. The transactional outbox pattern guarantees events are published atomically with state changes. Consumers are idempotent and process at-least-once, with dead-letter queues capturing poison messages. Event schemas are versioned in a registry to allow safe evolution.

**Best Practices**
- Use the outbox pattern to avoid dual-write inconsistency.
- Make consumers idempotent; assume at-least-once delivery.
- Version event schemas; evolve backward-compatibly.
- Route failures to dead-letter queues with alerting.

**Common Mistakes**
- Dual-writing to DB and broker without an outbox, losing events.
- Assuming exactly-once delivery.
- Unversioned events breaking consumers on change.

**Future Improvements**
- Event sourcing for auditable state reconstruction.
- Stream processing for real-time aggregation.
- Schema-registry-enforced compatibility gates in CI.

---

## 11. Integration Architecture

**Purpose**
Connect the system to third-party services and external consumers reliably and securely.

**Components**
- Outbound integration/connector layer with per-provider adapters.
- Inbound webhook receiver with verification.
- Secret and credential vault.
- Retry, circuit-breaker, and rate-limit handling.

**Architecture**
External providers are wrapped behind adapter interfaces so the core is provider-agnostic. Outbound calls flow through resilience middleware (timeouts, retries with backoff, circuit breakers). Inbound webhooks are signature-verified, deduplicated, and processed asynchronously. Credentials live in a secrets vault, never in code or config files.

**Best Practices**
- Isolate each provider behind an adapter; program to interfaces.
- Verify webhook signatures and enforce idempotency.
- Apply timeouts, retries with backoff, and circuit breakers.
- Store all secrets in a managed vault with rotation.

**Common Mistakes**
- Synchronous, unbounded calls to flaky third parties blocking requests.
- Trusting unverified inbound webhooks.
- Hard-coded credentials and API keys.

**Future Improvements**
- Integration marketplace/plugin framework.
- Self-healing connectors with automated key rotation.
- Unified anti-corruption layer normalizing provider models.

---

## 12. Security

**Purpose**
Protect confidentiality, integrity, and availability across the stack via defense in depth.

**Components**
- Encryption in transit (TLS) and at rest.
- Secrets management and key rotation (KMS/vault).
- WAF, DDoS protection, network segmentation.
- Vulnerability scanning, SAST/DAST, dependency auditing.
- Audit logging.

**Architecture**
Zero-trust posture: every request authenticated and authorized, networks segmented, least-privilege IAM everywhere. TLS terminates at the edge; data is encrypted at rest with managed keys. Secrets are vault-managed and rotated. A WAF and rate limiting sit in front of public endpoints. Security scanning runs in CI/CD; audit logs are immutable and centrally retained.

**Best Practices**
- Least privilege for every identity and service.
- Encrypt everywhere; rotate keys and secrets.
- Shift security left with automated scanning in CI.
- Maintain immutable, tamper-evident audit logs.

**Common Mistakes**
- Over-privileged service accounts.
- Secrets in source control or environment dumps.
- Security testing deferred to just before release.

**Future Improvements**
- Automated threat detection and response (SOAR).
- Confidential computing for data-in-use protection.
- Continuous compliance-as-code evidence collection.

---

## 13. Validation

**Purpose**
Guarantee that all data entering the system is well-formed, safe, and semantically valid before processing.

**Components**
- Schema validation library at the API boundary.
- Shared validation rules between client and server.
- Domain-invariant checks in the service layer.
- Sanitization/encoding for untrusted input.

**Architecture**
Validation is layered: syntactic schema validation at the edge (types, formats, ranges), then semantic/business-invariant validation in the domain layer. Validation schemas are shared or generated to keep client and server aligned. All external input is treated as untrusted and sanitized; the database enforces final constraints as a backstop.

**Best Practices**
- Validate at the boundary; re-check invariants in the domain.
- Never trust client-side validation for security.
- Centralize and reuse schemas to prevent drift.
- Fail closed with clear, structured validation errors.

**Common Mistakes**
- Relying solely on client-side validation.
- Duplicated, divergent rules across layers.
- Accepting partially valid input and correcting silently.

**Future Improvements**
- Contract-driven validation generated from API schemas.
- Property-based/fuzz testing of validators.
- Runtime schema evolution with compatibility checks.

---

## 14. Error Handling

**Purpose**
Handle failures predictably, surfacing actionable information without leaking internals or corrupting state.

**Components**
- Centralized error taxonomy (typed error classes).
- Consistent API error envelope.
- Retry/fallback and graceful-degradation policies.
- Correlation IDs linking errors across services.

**Architecture**
Errors are typed and classified (client vs. server, retryable vs. terminal). A central handler maps them to a consistent API error envelope with a correlation ID, safe message, and code — never a raw stack trace. Transient failures retry with backoff; dependent-service failures degrade gracefully. All errors are logged with context for tracing.

**Best Practices**
- Use a typed error taxonomy, not string matching.
- Return consistent, non-leaky error envelopes with correlation IDs.
- Distinguish retryable from terminal errors.
- Fail gracefully; degrade rather than crash whole flows.

**Common Mistakes**
- Leaking stack traces or internal details to clients.
- Swallowing errors silently.
- Blind retries on non-idempotent operations.

**Future Improvements**
- Automated error clustering and anomaly detection.
- Self-healing remediation for known failure classes.
- User-facing status/incident transparency automation.

---

## 15. Monitoring

**Purpose**
Provide full observability into system health, performance, and behavior to detect and diagnose issues quickly.

**Components**
- Metrics (time-series) with dashboards.
- Structured, centralized logging.
- Distributed tracing.
- Alerting on SLOs and anomalies.

**Architecture**
The three pillars — metrics, logs, traces — are correlated via shared trace/correlation IDs (OpenTelemetry). Services emit structured logs and RED/USE metrics; traces span requests across services. Dashboards track SLOs; alerts fire on error-budget burn and anomalies, routed to on-call. Synthetic checks probe critical user journeys.

**Best Practices**
- Instrument with OpenTelemetry; correlate all three pillars.
- Alert on symptoms/SLOs, not raw noise.
- Emit structured, queryable logs — never plain text only.
- Track error budgets, not just uptime.

**Common Mistakes**
- Alert fatigue from noisy, non-actionable alerts.
- Logs without correlation IDs, impossible to trace.
- Monitoring infrastructure but not user-facing SLOs.

**Future Improvements**
- AIOps-driven anomaly detection and root-cause hints.
- Continuous profiling in production.
- Predictive alerting ahead of threshold breaches.

---

## 16. Performance

**Purpose**
Meet latency and throughput targets efficiently under expected and peak load.

**Components**
- Performance budgets and SLO targets.
- Load/stress testing harness.
- Query and hot-path profiling.
- Async processing and pagination strategies.

**Architecture**
Performance is engineered against explicit budgets (p95/p99 latency, throughput). Hot paths are profiled and optimized; expensive work is made asynchronous. Reads are served from caches and replicas; large result sets are paginated and streamed. Load tests in CI catch regressions before release. N+1 queries and unbounded operations are prohibited by review.

**Best Practices**
- Define and enforce latency/throughput budgets.
- Profile before optimizing; target measured bottlenecks.
- Paginate and stream; never load unbounded sets.
- Offload heavy work to async paths.

**Common Mistakes**
- Optimizing without measurement.
- N+1 queries and unbounded result loads.
- Synchronous heavy computation on the request path.

**Future Improvements**
- Automated performance-regression gates in CI.
- Adaptive concurrency and load shedding.
- Edge computation for latency-critical paths.

---

## 17. Scalability

**Purpose**
Grow capacity smoothly with demand across compute, data, and traffic without redesign.

**Components**
- Stateless, horizontally scalable services.
- Autoscaling policies (CPU, queue depth, custom metrics).
- Load balancing.
- Data partitioning/sharding strategy.

**Architecture**
Stateless services scale horizontally behind load balancers with autoscaling driven by demand signals (queue depth, latency, CPU). State scales via read replicas, caching, partitioning, and eventual sharding by tenant. Async queues absorb spikes and smooth load. The design favors scaling out over up, with no single stateful bottleneck.

**Best Practices**
- Keep services stateless to scale horizontally.
- Autoscale on meaningful signals, not just CPU.
- Partition data along tenant/access boundaries early in design.
- Use queues as shock absorbers for bursts.

**Common Mistakes**
- Hidden stateful singletons blocking horizontal scale.
- No sharding plan until the primary DB is saturated.
- Scaling compute while the database remains the bottleneck.

**Future Improvements**
- Cell-based architecture for blast-radius isolation.
- Multi-region active-active topology.
- Serverless elasticity for spiky workloads.

---

## 18. Deployment

**Purpose**
Ship changes safely, repeatably, and frequently with fast rollback.

**Components**
- CI/CD pipeline with automated gates.
- Infrastructure as code.
- Containerization and orchestration.
- Progressive delivery (blue-green, canary) and feature flags.

**Architecture**
Every change flows through a CI/CD pipeline: build, test, scan, and deploy immutable, containerized artifacts to environment parity (dev/staging/prod). Infrastructure is declared as code and version-controlled. Releases use blue-green or canary rollouts with automated health gates and instant rollback. Feature flags decouple deploy from release.

**Best Practices**
- Immutable artifacts promoted through parity environments.
- Automate everything; no manual production changes.
- Progressive rollout with automated rollback triggers.
- Decouple deployment from release via feature flags.

**Common Mistakes**
- Manual, snowflake production changes.
- Big-bang deploys with no canary or rollback.
- Environment drift between staging and production.

**Future Improvements**
- GitOps-driven continuous deployment.
- Automated rollback on SLO breach.
- Progressive-delivery experimentation platform.

---

## 19. Disaster Recovery

**Purpose**
Restore service and data after catastrophic failure within defined RTO/RPO targets.

**Components**
- Automated, tested backups with point-in-time recovery.
- Cross-region replication.
- Documented, rehearsed runbooks.
- Defined RTO/RPO objectives.

**Architecture**
Backups are automated, encrypted, and stored cross-region with point-in-time recovery. Critical data replicates to a secondary region. Recovery procedures are codified as runbooks and validated through regular game-day drills. RTO/RPO targets are defined per data class and measured against actual restore tests, not assumed.

**Best Practices**
- Define and measure RTO/RPO explicitly.
- Test restores regularly — a backup is unproven until restored.
- Store backups cross-region and encrypted.
- Rehearse failover with game days.

**Common Mistakes**
- Backups that have never been test-restored.
- Single-region backups lost with the region.
- Untested runbooks that fail under real pressure.

**Future Improvements**
- Automated cross-region failover orchestration.
- Continuous DR validation in CI.
- Chaos engineering to surface latent recovery gaps.

---

## 20. Documentation

**Purpose**
Keep architecture, contracts, and operations discoverable and current so teams and consumers can build and operate confidently.

**Components**
- Architecture decision records (ADRs).
- Auto-generated API reference from contracts.
- Runbooks and operational playbooks.
- Onboarding and system-overview docs.

**Architecture**
Documentation lives as code alongside the system: ADRs capture decisions and trade-offs; API docs generate from OpenAPI/SDL so they never drift; runbooks cover on-call operations. Docs are versioned, reviewed in pull requests, and published through an automated pipeline. Diagrams are maintained as code for reproducibility.

**Best Practices**
- Docs-as-code, versioned and PR-reviewed.
- Generate API references from contracts to prevent drift.
- Record decisions and their trade-offs as ADRs.
- Keep runbooks executable and current.

**Common Mistakes**
- Stale, hand-maintained API docs.
- Undocumented decisions leading to repeated debates.
- Documentation siloed outside the codebase and forgotten.

**Future Improvements**
- AI-assisted doc generation and freshness checks.
- Interactive, executable API explorers.
- Automated drift detection between docs and implementation.

---

*End of Universal Technical Architecture. This standardized 20-section baseline is handed to solution-architect-app, which scopes these universal patterns down into the idea-specific System Architecture Document. Domain-specific budgeting logic, UI, pricing, and business rules are intentionally excluded here and remain owned by the respective downstream agents.*

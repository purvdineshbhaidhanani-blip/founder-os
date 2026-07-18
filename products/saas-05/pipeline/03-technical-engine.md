# Universal Technical Architecture

**SaaS:** Home Maintenance Contractor AI
**Document type:** Standardized technical-pattern baseline (domain-agnostic)
**Sections:** 20, fixed order, each with Purpose · Components · Architecture · Best Practices · Common Mistakes · Future Improvements

> Scope note: This document defines the universal, reusable technical patterns only. It contains no UI, pricing, business rules, domain entities, or per-project decisions. Downstream bespoke architects (via solution-architect-app) scope these patterns down into the idea-specific System Architecture Document.

---

## 1. Database Architecture

**Purpose**
Provide a durable, consistent, and evolvable system of record for all application state, with clear boundaries between transactional, analytical, and cache-backed data.

**Components**
- Primary relational store (OLTP) as the authoritative system of record.
- Read replicas for read-scaling and reporting isolation.
- Optional document/NoSQL store for schemaless or high-write-fan-out data.
- Schema migration tooling with versioned, forward-only migrations.
- Connection pooler and per-tenant data partitioning strategy.

**Architecture**
- Multi-tenant model chosen from shared-schema (tenant_id column), schema-per-tenant, or database-per-tenant based on isolation vs. density trade-offs.
- Writes route to the primary; reads route to replicas via a routing layer with replica-lag awareness.
- Normalized core with selective denormalization behind read models.
- Migrations run in CI/CD gates, expand-then-contract for zero-downtime schema changes.

**Best Practices**
- Enforce tenant isolation at the query layer and with row-level security.
- Use surrogate primary keys; index foreign keys and frequent filter/sort columns.
- Keep transactions short; use optimistic concurrency where contention is low.
- Back every schema change with a reversible or forward-fix migration plan.

**Common Mistakes**
- Leaking tenant data through missing tenant_id predicates.
- Unbounded table growth without partitioning or archival.
- Destructive migrations run in a single step, causing downtime.
- Treating read replicas as strongly consistent.

**Future Improvements**
- Introduce CQRS read models for hot query paths.
- Adopt automated partition/sharding as tenant count grows.
- Add change-data-capture (CDC) to feed downstream analytics and search.

---

## 2. Authentication Architecture

**Purpose**
Verify the identity of users, services, and machines reliably across all entry points.

**Components**
- Identity provider (self-hosted or managed) supporting OIDC/OAuth2.
- Token service issuing short-lived access tokens and rotating refresh tokens.
- Multi-factor authentication (MFA) and passwordless options.
- Session store for revocation and device management.
- Service-to-service credential mechanism (mTLS or signed JWTs).

**Architecture**
- Standards-based OIDC/OAuth2 flows (authorization code with PKCE for user apps, client credentials for services).
- Stateless access tokens (JWT) validated at the edge; refresh tokens tracked server-side for revocation.
- Federation via SAML/OIDC for enterprise SSO.

**Best Practices**
- Keep access-token lifetimes short; rotate refresh tokens on use.
- Hash and salt any stored secrets; never store plaintext credentials.
- Enforce MFA for privileged accounts.
- Validate token signature, issuer, audience, and expiry on every request.

**Common Mistakes**
- Long-lived, non-revocable tokens.
- Storing tokens in insecure client storage.
- Rolling custom crypto instead of vetted libraries.
- No account-lockout or rate limiting on auth endpoints.

**Future Improvements**
- Adopt passkeys/WebAuthn as primary factor.
- Add continuous/risk-based authentication signals.
- Support decentralized or verifiable-credential identity.

---

## 3. Authorization

**Purpose**
Determine what an authenticated principal is permitted to do, consistently and auditably.

**Components**
- Policy model (RBAC, ABAC, or ReBAC) and a policy decision point (PDP).
- Policy enforcement points (PEP) at API and service boundaries.
- Centralized policy store with versioning.
- Tenant- and resource-scoped permission definitions.

**Architecture**
- Externalized authorization: services call the PDP or evaluate a distributed policy bundle.
- Role and attribute assignments resolved per-tenant; deny-by-default posture.
- Fine-grained resource permissions expressed as relationships or attribute rules.

**Best Practices**
- Default deny; grant least privilege.
- Separate authentication from authorization concerns.
- Make authorization decisions auditable and reproducible.
- Cache policy decisions with correct invalidation.

**Common Mistakes**
- Hardcoding role checks scattered across the codebase.
- Confusing coarse roles with fine-grained resource access.
- Trusting client-supplied role claims without server verification.
- Missing tenant scoping in permission checks.

**Future Improvements**
- Move to fine-grained ReBAC for complex sharing graphs.
- Add just-in-time and time-boxed privilege elevation.
- Introduce policy-as-code with automated testing.

---

## 4. Backend Architecture

**Purpose**
Structure application logic for maintainability, testability, and independent evolution of capabilities.

**Components**
- Service boundaries (modular monolith or microservices) with clear contracts.
- Domain layer, application layer, and infrastructure adapters.
- Background job/worker subsystem.
- Shared platform libraries (logging, config, auth clients).

**Architecture**
- Layered/hexagonal architecture isolating domain from frameworks and I/O.
- Start as a modular monolith; extract services along stable seams as scale demands.
- Stateless service instances; state externalized to datastores and caches.
- Async work offloaded to workers via a queue.

**Best Practices**
- Keep services stateless and horizontally scalable.
- Define explicit, versioned contracts between modules/services.
- Depend on abstractions (ports) for external systems.
- Separate long-running work from request paths.

**Common Mistakes**
- Premature microservice fragmentation adding network complexity.
- Shared mutable state hidden in service instances.
- Business logic leaking into controllers or the database.
- Tight coupling to a single framework or vendor.

**Future Improvements**
- Extract high-load modules into independent services.
- Introduce a service mesh for traffic control and observability.
- Adopt domain-driven bounded contexts as the team scales.

---

## 5. API Architecture

**Purpose**
Expose backend capabilities through stable, discoverable, and versioned interfaces for internal and external consumers.

**Components**
- API gateway for routing, auth, rate limiting, and quotas.
- REST and/or GraphQL and/or gRPC interfaces per use case.
- Contract/schema registry (OpenAPI, GraphQL SDL, protobuf).
- Webhook delivery subsystem for outbound events.

**Architecture**
- Gateway fronts all external traffic; enforces authN/Z, throttling, and request validation.
- Resource-oriented REST for CRUD, GraphQL for aggregation, gRPC for internal low-latency calls.
- Versioning via URI or header; backward-compatible evolution preferred.

**Best Practices**
- Design contract-first; publish machine-readable schemas.
- Use consistent pagination, filtering, and error envelopes.
- Enforce idempotency for unsafe operations via idempotency keys.
- Rate-limit and quota per tenant and per client.

**Common Mistakes**
- Breaking changes shipped without versioning.
- Inconsistent error and pagination formats across endpoints.
- Over-fetching/under-fetching due to poor resource design.
- No idempotency, causing duplicate side effects on retries.

**Future Improvements**
- Add API monetization/usage metering.
- Provide GraphQL federation across services.
- Publish SDKs generated from contracts.

---

## 6. AI Architecture

**Purpose**
Integrate AI/ML capabilities as governed, observable, and swappable components rather than embedded ad-hoc calls.

**Components**
- Model gateway/abstraction over providers and self-hosted models.
- Retrieval-augmented generation (RAG) pipeline with a vector store.
- Prompt/version management and evaluation harness.
- Guardrails (input/output filtering, PII redaction) and safety layer.
- Feature store and inference caching.

**Architecture**
- All model calls route through an abstraction layer to enable provider swap and fallback.
- RAG: ingest → chunk → embed → index → retrieve → augment → generate.
- Asynchronous inference for long tasks; streaming for interactive responses.
- Human-in-the-loop checkpoints for high-risk outputs.

**Best Practices**
- Version prompts and models; evaluate before promotion.
- Ground responses with retrieval and cite sources where applicable.
- Enforce strict tenant isolation on embeddings and retrieved context.
- Cache deterministic results; set token/cost budgets and timeouts.

**Common Mistakes**
- Hardcoding a single provider with no fallback.
- No evaluation, so quality regressions ship silently.
- Sending sensitive data to models without redaction/controls.
- Ignoring latency and cost variance under load.

**Future Improvements**
- Add model routing by cost/quality/latency.
- Introduce fine-tuning or adapters on proprietary data.
- Automate continuous evaluation and drift detection.

---

## 7. Storage Architecture

**Purpose**
Store and serve unstructured and large binary objects durably and cost-effectively.

**Components**
- Object storage for blobs (files, media, exports).
- CDN for edge distribution of public/cacheable assets.
- Signed-URL service for scoped, time-limited access.
- Lifecycle and tiering policies (hot/cold/archive).

**Architecture**
- Application stores references (keys/URIs); binaries live in object storage.
- Direct-to-storage uploads/downloads via signed URLs to avoid proxying through app servers.
- Tenant-scoped prefixes/buckets; encryption at rest by default.

**Best Practices**
- Never proxy large files through application servers; use direct + signed URLs.
- Encrypt access; scope access per tenant/object.
- Validate file type/size server-side; scan untrusted uploads.
- Store immutable content-addressed keys where possible.

**Common Mistakes**
- Storing binaries in the relational database (BLOB bloat).
- Public buckets exposing private data.
- Trusting client-declared MIME types.
- No lifecycle policy, causing unbounded storage cost.

**Future Improvements**
- Multi-region replication for locality and durability.
- Automated cold-tiering and deduplication.
- Client-side encryption for zero-knowledge storage tiers.

---

## 8. Search Architecture

**Purpose**
Deliver fast, relevant full-text, faceted, and semantic search over application data without overloading the primary database.

**Components**
- Search engine (Elasticsearch/OpenSearch/Typesense) or managed search.
- Indexing pipeline fed by CDC or event stream.
- Vector index for semantic/similarity search.
- Query layer with ranking, faceting, and filtering.

**Architecture**
- The primary DB remains the source of truth; a denormalized search index is kept in sync asynchronously via change events. Queries hit the search engine, not the DB.
- Tenant_id is a mandatory filter on every query. Hybrid search combines lexical (BM25) and vector similarity for relevance.
- Reindexing runs as a background job with zero-downtime alias swaps.

**Best Practices**
- Always scope queries by tenant; never allow cross-tenant leakage via search.
- Keep the index eventually consistent and tolerate lag gracefully in the UI.
- Tune analyzers, synonyms, and ranking for the domain's query patterns.
- Use index aliases for zero-downtime reindexing.

**Common Mistakes**
- Using `LIKE %term%` on the primary DB as "search" at scale.
- Treating the search index as a system of record.
- Forgetting tenant filters, leaking results across tenants.
- Synchronous indexing on the write path, slowing writes.

**Future Improvements**
- Full hybrid semantic + lexical ranking with learned re-ranking.
- Personalized ranking from usage signals.
- Multi-language analyzers and typo-tolerance improvements.

---

## 9. Caching

**Purpose**
Reduce latency and backend load by serving frequently accessed data from fast, ephemeral storage.

**Components**
- In-memory distributed cache (Redis/Memcached).
- Application-local (in-process) cache for hot, small data.
- CDN edge cache for HTTP responses and assets.
- Cache invalidation / TTL management.

**Architecture**
- Layered caching: CDN (edge) → distributed cache (shared) → local (in-process). Cache-aside is the default read pattern; write-through/write-behind for specific hot paths.
- Each cache entry carries a TTL and, where correctness matters, is invalidated by write events.
- Keys are namespaced by tenant and version to prevent cross-tenant and stale reads.

**Best Practices**
- Set explicit TTLs; never cache without an expiry strategy.
- Namespace keys by tenant and schema version.
- Guard against stampedes (locking, request coalescing, jittered TTLs).
- Cache computed/expensive results, not trivially cheap lookups.

**Common Mistakes**
- Cache invalidation bugs serving stale or cross-tenant data.
- No TTL, leading to unbounded memory growth.
- Thundering-herd on expiry of a hot key.
- Caching per-user data under a shared key.

**Future Improvements**
- Adopt event-driven invalidation via CDC for near-real-time freshness.
- Add multi-tier/near-cache with automatic promotion.
- Predictive pre-warming of caches ahead of demand.

---

## 10. Event Architecture

**Purpose**
Enable asynchronous, decoupled communication between components via events, improving resilience and scalability.

**Components**
- Message broker / event streaming platform (Kafka, RabbitMQ, NATS, or cloud pub/sub).
- Producers and consumers with defined event schemas.
- Schema registry for event contracts.
- Dead-letter queues and retry policies.
- Outbox table for transactional event publishing.

**Architecture**
- Services publish domain events; consumers subscribe independently. The transactional outbox pattern guarantees an event is published if and only if the DB transaction commits.
- Consumers are idempotent and process at-least-once delivery. Failed messages route to a DLQ after bounded retries.
- Event schemas are versioned and validated against a registry.

**Best Practices**
- Make all consumers idempotent (dedupe by event ID).
- Use the outbox pattern to avoid dual-write inconsistency.
- Version event schemas; evolve them backward-compatibly.
- Monitor consumer lag and DLQ depth.

**Common Mistakes**
- Dual writes (DB + broker) without outbox, causing lost/ghost events.
- Assuming exactly-once delivery and skipping idempotency.
- No DLQ, so poison messages block the queue.
- Fat events carrying entire aggregates, coupling consumers tightly.

**Future Improvements**
- Event sourcing for auditability where it fits.
- Stream processing for real-time aggregations.
- Schema-driven code generation and contract testing across services.

---

## 11. Integration Architecture

**Purpose**
Connect the system to third-party services and external systems reliably, securely, and observably.

**Components**
- Outbound integration clients with the anti-corruption layer pattern.
- Inbound and outbound webhook infrastructure.
- Secrets/credential vault for third-party keys.
- iPaaS / connector framework for common integrations.
- Circuit breakers and retry/backoff wrappers.

**Architecture**
- An anti-corruption layer isolates external APIs so their models never leak into the domain. Outbound calls are wrapped with timeouts, retries with backoff, and circuit breakers.
- Inbound webhooks are verified (signature), queued, and processed async; outbound webhooks are delivered with retries, signing, and a DLQ.
- Third-party credentials live in a vault, scoped per tenant/integration.

**Best Practices**
- Verify webhook signatures and treat inbound payloads as untrusted.
- Wrap every external call in timeout + retry + circuit breaker.
- Store integration secrets in a vault, never in code or config files.
- Make outbound delivery idempotent and observable.

**Common Mistakes**
- Synchronous, unbounded calls to flaky third parties blocking user requests.
- Trusting webhook payloads without signature verification.
- Leaking external API models throughout the domain.
- Hard-failing when a non-critical integration is down.

**Future Improvements**
- Self-service connector marketplace.
- Automatic API-change detection and adapter versioning.
- Graceful degradation with cached/last-known-good integration data.

---

## 12. Security

**Purpose**
Protect the system, its data, and its users against threats across the stack, and satisfy compliance obligations.

**Components**
- Secrets manager / KMS for keys and credentials.
- WAF and DDoS protection at the edge.
- Encryption (TLS in transit, envelope encryption at rest).
- Vulnerability scanning (SAST, DAST, dependency/SCA, container scanning).
- Audit logging and intrusion detection.

**Architecture**
- Defense in depth: edge (WAF/DDoS) → gateway (auth, rate limit) → service (input validation, authz) → data (encryption, RLS). Zero-trust between services (mTLS, workload identity).
- Secrets are never in code; they are injected from a vault/KMS at runtime and rotated. All access to sensitive resources is audit-logged.
- Security scanning runs in CI and continuously in production.

**Best Practices**
- Least privilege everywhere (IAM, DB, network).
- Encrypt data in transit and at rest; rotate keys.
- Patch and scan dependencies continuously; pin and verify supply chain.
- Follow OWASP Top 10 mitigations; conduct periodic pen tests.

**Common Mistakes**
- Hard-coded secrets or secrets committed to version control.
- Trusting network perimeter alone (no zero-trust internally).
- Ignoring dependency/supply-chain vulnerabilities.
- Verbose error messages leaking internal details to attackers.

**Future Improvements**
- Full zero-trust with short-lived, attested workload identities.
- Runtime application self-protection (RASP) and anomaly detection.
- Confidential computing for sensitive workloads.

---

## 13. Validation

**Purpose**
Ensure all data entering the system is well-formed, correct, and safe before it is processed or persisted.

**Components**
- Schema validation library (JSON Schema, Zod, Pydantic, protobuf).
- Shared validation rules between layers.
- Sanitization for injection-prone inputs.
- Business-invariant validation in the domain layer.

**Architecture**
- Two-tier validation: structural/syntactic validation at the API boundary (types, formats, ranges) and semantic/business-invariant validation in the domain layer. Never trust client input.
- Validation schemas are the single source of truth, shared/generated across client and server where possible.
- The database enforces a final backstop via constraints.

**Best Practices**
- Validate at the boundary and enforce invariants in the domain.
- Use allow-lists over deny-lists.
- Return precise, field-level, machine-readable validation errors.
- Keep DB constraints as the last line of defense.

**Common Mistakes**
- Relying on client-side validation only.
- Deny-list sanitization that misses novel inputs.
- Duplicated, drifting validation logic across layers.
- Conflating validation errors with server errors (wrong status codes).

**Future Improvements**
- Fully shared schema/codegen for end-to-end type safety.
- Contract testing to keep client/server validation in lockstep.
- Property-based/fuzz testing of validation rules.

---

## 14. Error Handling

**Purpose**
Handle failures predictably, degrade gracefully, and give clients and operators clear, actionable signals.

**Components**
- Centralized error handler / middleware.
- Structured error taxonomy (client vs. server, retryable vs. terminal).
- Correlation/trace IDs on every request.
- Retry, timeout, circuit-breaker, and fallback primitives.

**Architecture**
- A global handler maps internal exceptions to a consistent external error envelope with a code, message, and correlation ID. Errors are classified (validation, auth, not-found, conflict, rate-limit, internal) and mapped to correct HTTP status.
- Transient failures are retried with backoff; persistent failures fail fast via circuit breakers. Fallbacks provide degraded-but-available behavior.
- Full detail is logged server-side; only safe detail is returned to clients.

**Best Practices**
- Distinguish expected (domain) errors from unexpected (system) errors.
- Never leak stack traces or internals to clients.
- Attach a correlation ID to every response and log line.
- Make retries idempotent and bounded.

**Common Mistakes**
- Swallowing exceptions silently.
- Catch-all handlers returning 500 for everything, including client errors.
- Leaking internal messages/stack traces to users.
- Retrying non-idempotent operations, causing duplicates.

**Future Improvements**
- Automated error-budget-driven alerting.
- Self-healing/auto-remediation for known failure classes.
- Chaos engineering to validate failure paths.

---

## 15. Monitoring

**Purpose**
Provide full observability into system health, performance, and behavior to detect, diagnose, and prevent incidents.

**Components**
- Metrics (Prometheus-class) with dashboards (Grafana).
- Centralized structured logging.
- Distributed tracing (OpenTelemetry).
- Alerting and on-call routing.
- Real-time and synthetic monitoring / uptime checks.

**Architecture**
- The three pillars — metrics, logs, traces — are correlated via a shared trace/correlation ID. OpenTelemetry instruments services; data flows to a metrics store, log aggregator, and trace backend.
- Alerts are defined on SLO-based symptoms (latency, error rate, saturation) rather than raw causes, and route to on-call.
- Dashboards cover the golden signals (latency, traffic, errors, saturation) per service and tenant tier.

**Best Practices**
- Instrument with structured logs and consistent trace IDs from day one.
- Alert on symptoms/SLOs, not noisy low-level causes.
- Define SLIs/SLOs and track error budgets.
- Keep dashboards actionable; avoid alert fatigue.

**Common Mistakes**
- Logging unstructured text that cannot be queried.
- Alerting on everything, causing fatigue and ignored pages.
- No tracing, making distributed debugging guesswork.
- Logging secrets or PII.

**Future Improvements**
- AIOps for anomaly detection and alert correlation.
- Automated root-cause analysis from correlated signals.
- Continuous profiling in production.

---

## 16. Performance

**Purpose**
Meet latency and throughput targets efficiently, ensuring responsive user experience under expected and peak load.

**Components**
- Load and stress testing tooling.
- Application and query profilers.
- Caching and CDN (see sections 9, 7).
- Async processing for heavy work.
- Performance budgets and SLIs.

**Architecture**
- Performance is engineered end-to-end: edge caching, efficient queries, connection pooling, async offloading, and pagination. Hot paths are profiled and optimized against explicit latency budgets.
- Heavy or slow work moves off the request path into workers. Backpressure and load shedding protect the system under overload.
- Regular load tests validate capacity against SLOs before release.

**Best Practices**
- Measure before optimizing; profile real bottlenecks.
- Eliminate N+1 queries; batch and paginate.
- Set and enforce per-endpoint latency budgets.
- Use connection pooling and keep-alives.

**Common Mistakes**
- Premature optimization of non-bottlenecks.
- N+1 query patterns via ORM lazy loading.
- Unbounded queries/responses.
- Synchronous heavy work on the request path.

**Future Improvements**
- Continuous performance regression testing in CI.
- Adaptive/auto-tuning of pools, caches, and concurrency.
- Edge compute for latency-sensitive logic.

---

## 17. Scalability

**Purpose**
Allow the system to grow with load — users, data, and traffic — without redesign, ideally automatically and cost-efficiently.

**Components**
- Horizontal autoscaling (stateless services).
- Load balancers and traffic distribution.
- Database scaling (read replicas, sharding, partitioning).
- Queue-based load leveling.
- Multi-region / multi-AZ topology.

**Architecture**
- Stateless services scale horizontally behind load balancers with autoscaling on CPU/latency/queue depth. State scales independently: replicas for reads, sharding/partitioning for writes, and object storage for blobs.
- Queues absorb spikes (load leveling) so downstream systems drain at a sustainable rate. Multi-AZ by default; multi-region for locality and resilience.
- Bottlenecks (DB, cache, single points) are identified and scaled first.

**Best Practices**
- Keep services stateless so scaling is trivial.
- Scale the data tier deliberately — it is the usual bottleneck.
- Use queues to decouple and level bursty load.
- Design for graceful degradation over hard failure at capacity.

**Common Mistakes**
- Stateful app servers preventing horizontal scaling.
- Scaling app tier while the database remains the bottleneck.
- No load shedding, so overload causes total collapse.
- Assuming vertical scaling alone will suffice indefinitely.

**Future Improvements**
- Cell-based / bulkhead architecture to limit blast radius.
- Global data distribution with locality-aware routing.
- Predictive autoscaling from traffic forecasts.

---

## 18. Deployment

**Purpose**
Ship changes to production frequently, safely, and reversibly with minimal risk and downtime.

**Components**
- CI/CD pipeline with automated build, test, and deploy stages.
- Containerization (Docker) and orchestration (Kubernetes) or serverless.
- Infrastructure as Code (Terraform/Pulumi).
- Progressive delivery (blue-green, canary, feature flags).
- Artifact registry.

**Architecture**
- Immutable, versioned artifacts are built once and promoted across environments (dev → staging → prod). IaC defines all infrastructure declaratively and reproducibly.
- Progressive rollout (canary/blue-green) exposes changes to a slice of traffic first, with automated rollback on SLO breach. Feature flags decouple deploy from release.
- Database migrations run backward-compatibly ahead of code (expand/contract).

**Best Practices**
- Build artifacts once; promote the same artifact across environments.
- Automate rollback; make every deploy reversible.
- Decouple deploy from release using feature flags.
- Keep environments as close to identical as possible via IaC.

**Common Mistakes**
- Manual, snowflake deployments that are not reproducible.
- Big-bang releases with no canary and no rollback.
- Coupling breaking DB migrations to code deploys.
- Configuration drift between environments.

**Future Improvements**
- GitOps-driven declarative deployments.
- Automated progressive delivery with SLO-based promotion/rollback.
- Ephemeral preview environments per pull request.

---

## 19. Disaster Recovery

**Purpose**
Restore service and data after catastrophic failure within defined objectives, and prevent permanent data loss.

**Components**
- Automated, tested backups with defined retention.
- Point-in-time recovery (PITR) for databases.
- Multi-region / cross-region replication.
- Documented, rehearsed runbooks.
- Defined RTO and RPO targets.

**Architecture**
- Backups are automated, encrypted, and stored off-region; databases support PITR. RTO (time to recover) and RPO (acceptable data loss) drive the topology: warm standby or active-active across regions for stringent targets.
- Failover is documented in runbooks and rehearsed via game days. Restores are tested regularly — a backup is not valid until a restore has succeeded.
- Critical state is replicated cross-region; infrastructure is reproducible from IaC.

**Best Practices**
- Define and agree RTO/RPO per data class.
- Test restores regularly, not just backups.
- Store backups in a separate region/account, immutable where possible.
- Rehearse failover with game days.

**Common Mistakes**
- Backups that are never test-restored.
- Backups in the same region/account as the primary.
- No documented or rehearsed failover procedure.
- Undefined RTO/RPO, so recovery expectations are ambiguous.

**Future Improvements**
- Automated failover and failback orchestration.
- Continuous DR validation and chaos/region-failure drills.
- Immutable, ransomware-resistant backup vaulting.

---

## 20. Documentation

**Purpose**
Capture architecture, APIs, and operational knowledge so the system remains understandable, maintainable, and onboardable.

**Components**
- API reference (generated from OpenAPI/GraphQL schema).
- Architecture Decision Records (ADRs).
- Runbooks and operational playbooks.
- Onboarding and developer guides.
- Diagrams (C4/architecture) kept alongside code.

**Architecture**
- Documentation is treated as code: versioned in the repository, reviewed in pull requests, and generated from source of truth where possible (schemas, IaC, code comments). ADRs record why decisions were made, not just what.
- Runbooks live next to services and are linked from alerts. Diagrams follow the C4 model and are updated with the changes they describe.
- A docs pipeline publishes and validates links/freshness automatically.

**Best Practices**
- Generate reference docs from the source of truth to prevent drift.
- Keep docs in-repo and review them like code.
- Record decisions and their rationale in ADRs.
- Link runbooks directly from alerts for fast incident response.

**Common Mistakes**
- Stale docs that contradict the running system.
- Documenting what without why (no decision context).
- Tribal knowledge locked in individuals' heads.
- Docs stored separately and never updated with code.

**Future Improvements**
- Automated freshness checks and doc coverage gates in CI.
- AI-assisted documentation generation and Q&A over the codebase.
- Living diagrams generated from infrastructure and traces.

---

## Handoff

This standardized 20-section technical-pattern baseline is complete and domain-agnostic. It is ready for **solution-architect-app**, where the bespoke architects scope these universal patterns down into the idea-specific System Architecture Document for *Home Maintenance Contractor AI*. Domain entities, UI, pricing, business rules, and operational checklists are intentionally excluded and remain owned by their respective agents (saas-foundation-agent, saas-business-engine-agent, qa-engineer-app, deployment-agent).

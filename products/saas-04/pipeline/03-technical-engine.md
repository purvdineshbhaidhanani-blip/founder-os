# Universal Technical Architecture

**SaaS:** Pet Health Management AI
**Pattern Library Version:** 1.0.0
**Scope:** Universal, domain-agnostic technical reference pattern. This document defines the reusable technical baseline only. Domain-specific implementation, UI, pricing, and business rules are owned by downstream agents and are intentionally excluded.

---

## 1. Database Architecture

**Purpose**
Provide a durable, consistent, and queryable system of record for all application state, supporting transactional integrity, multi-tenant isolation, and analytical access without coupling storage decisions to any single feature.

**Components**
- Primary relational store (PostgreSQL-class) for transactional, strongly-consistent data.
- Optional document/NoSQL store for flexible, schema-light aggregates.
- Read replicas for read scaling and reporting isolation.
- Connection pooler (e.g., PgBouncer) between services and database.
- Schema migration tool (versioned, forward-only migrations).
- Time-series/analytical store for high-volume metric or event data.

**Architecture**
- Multi-tenant model via one of: shared schema with tenant discriminator column, schema-per-tenant, or database-per-tenant — selected by isolation and scale requirements.
- Writes route to the primary; reads route to replicas via a routing layer with replica-lag awareness.
- Logical separation of transactional (OLTP) and analytical (OLAP) workloads.
- Foreign keys, constraints, and indexes enforced at the database layer as the last line of integrity defense.

**Best Practices**
- Every table carries a tenant identifier and audit columns (created_at, updated_at, created_by).
- Use surrogate keys (UUID/ULID) and avoid business-meaningful primary keys.
- Version all schema changes; migrations reviewed and reversible where possible.
- Enforce row-level security or tenant-scoped queries at the data-access layer.

**Common Mistakes**
- Mixing OLTP and heavy analytics on the same instance, causing lock contention.
- Missing tenant filters, leading to cross-tenant data leakage.
- Unbounded tables with no partitioning or archival strategy.
- Storing large blobs in the relational database instead of object storage.

**Future Improvements**
- Introduce automatic table partitioning and cold-data archival.
- Adopt change-data-capture (CDC) for downstream event propagation.
- Evaluate distributed SQL (e.g., CockroachDB/Spanner-class) as tenant scale grows.

---

## 2. Authentication Architecture

**Purpose**
Verify the identity of users and services reliably, supporting multiple credential types while centralizing identity as a single trusted concern.

**Components**
- Identity provider (self-hosted or managed, e.g., OIDC-compliant service).
- Token service issuing short-lived access tokens and rotating refresh tokens.
- Multi-factor authentication (TOTP, WebAuthn/passkeys, SMS as fallback).
- Social/enterprise federation (OAuth 2.0, SAML, SSO).
- Session and device registry.

**Architecture**
- Stateless authentication via signed JWT access tokens with short TTL.
- Refresh tokens stored server-side (or as rotating opaque tokens) with revocation support.
- Standard OIDC/OAuth 2.0 authorization-code-with-PKCE flow for interactive clients.
- Machine-to-machine auth via client-credentials grant or mTLS.

**Best Practices**
- Never store passwords in plaintext; use Argon2/bcrypt with per-user salt.
- Keep access tokens short-lived; rotate refresh tokens on use.
- Enforce MFA for privileged accounts by default.
- Centralize authentication; services trust tokens, not credentials.

**Common Mistakes**
- Long-lived tokens with no revocation path.
- Rolling custom crypto instead of vetted libraries and standards.
- Storing tokens in insecure client locations (localStorage without safeguards).
- Coupling authentication logic into each service instead of a shared boundary.

**Future Improvements**
- Passwordless-first with passkeys as the default.
- Continuous/adaptive authentication based on risk signals.
- Decentralized identity and verifiable-credential support.

---

## 3. Authorization

**Purpose**
Decide what an authenticated principal is permitted to do, enforcing least privilege consistently across every entry point.

**Components**
- Policy model: RBAC, ABAC, or ReBAC (relationship-based).
- Central policy decision point (PDP) and distributed policy enforcement points (PEP).
- Permission/role registry and tenant-scoped role bindings.
- Policy-as-code engine (e.g., OPA/Rego, Cedar).

**Architecture**
- Authorization evaluated at the API gateway and re-validated at the service/data layer (defense in depth).
- Tenant boundary enforced before any resource-level permission check.
- Policies externalized from application code and versioned.
- Fine-grained checks resolved via a permission service or embedded decision library with cached decisions.

**Best Practices**
- Default deny; grant explicitly.
- Combine coarse-grained (role) and fine-grained (resource/attribute) checks.
- Log every authorization decision for audit and forensics.
- Keep authorization decisions independent of UI-level hiding.

**Common Mistakes**
- Enforcing permissions only in the UI, leaving APIs open.
- Hardcoding roles into business logic, blocking policy evolution.
- Over-broad wildcard permissions granted for convenience.
- Ignoring the tenant scope in permission checks.

**Future Improvements**
- Move to relationship-based authorization for complex sharing graphs.
- Just-in-time, time-boxed privilege elevation.
- Automated least-privilege analysis from real access patterns.

---

## 4. Backend Architecture

**Purpose**
Organize server-side business logic into maintainable, independently evolvable units with clear boundaries and predictable operational behavior.

**Components**
- Service layer (modular monolith or microservices) with domain modules.
- Shared libraries for cross-cutting concerns (logging, auth, config).
- Asynchronous workers for background and long-running tasks.
- Service registry / service discovery (in distributed deployments).
- Configuration and secrets management integration.

**Architecture**
- Layered/hexagonal architecture: domain core isolated from transport and infrastructure adapters.
- Start as a modular monolith with strict internal boundaries; extract services along proven seams as scale demands.
- Stateless services behind a load balancer; state externalized to datastores and caches.
- Clear separation of synchronous request handling and asynchronous processing.

**Best Practices**
- Keep services stateless and horizontally scalable.
- Isolate the domain core from frameworks (dependency inversion).
- Enforce module boundaries with explicit interfaces.
- Externalize all configuration; never bake environment specifics into builds.

**Common Mistakes**
- Premature microservices creating distributed-monolith complexity.
- Shared mutable state hidden in service memory.
- Business logic leaking into controllers or ORM models.
- Tight coupling between modules via shared database tables.

**Future Improvements**
- Extract high-load domains into independently scalable services.
- Adopt a service mesh for traffic management and observability.
- Introduce workflow/orchestration engines for complex long-running processes.

---

## 5. API Architecture

**Purpose**
Expose backend capabilities through a stable, discoverable, and versioned contract that clients and integrators can depend on.

**Components**
- API gateway (routing, rate limiting, auth enforcement).
- REST and/or GraphQL interface layer; gRPC for internal service-to-service.
- Contract/schema definitions (OpenAPI, GraphQL SDL, protobuf).
- Versioning and deprecation management.
- Webhooks for outbound event delivery.

**Architecture**
- Gateway fronts all external traffic, applying auth, throttling, and request validation.
- Contract-first design: schema is the source of truth, code generated from it.
- Versioning via URI or header; backward-compatible changes preferred.
- Consistent envelope for responses, errors, and pagination.

**Best Practices**
- Design idempotent operations; support idempotency keys on writes.
- Paginate all list endpoints; never return unbounded collections.
- Publish and maintain an accurate machine-readable contract.
- Enforce consistent naming, status codes, and error shapes.

**Common Mistakes**
- Breaking changes shipped without versioning or deprecation notice.
- Chatty APIs forcing clients into N+1 request patterns.
- Leaking internal data models directly through the API.
- No rate limiting, exposing the backend to abuse.

**Future Improvements**
- Add GraphQL federation or BFF layers for tailored client needs.
- Automated contract testing between producers and consumers.
- API monetization, usage metering, and developer portal.

---

## 6. AI Architecture

**Purpose**
Provide a governed, reusable foundation for integrating machine-learning and generative-AI capabilities without embedding model concerns into business logic.

**Components**
- Model gateway/abstraction layer over hosted and self-hosted models.
- Inference services (real-time and batch).
- Vector store and embedding pipeline for retrieval-augmented generation.
- Prompt/template registry and versioning.
- Feature store and training/evaluation pipeline (for custom models).
- Guardrail and safety-filter layer.

**Architecture**
- AI capabilities exposed behind an internal abstraction so providers/models are swappable.
- RAG pattern: ingest → chunk → embed → store → retrieve → augment → generate.
- Asynchronous inference for heavy workloads; streaming responses for interactive use.
- Human-in-the-loop checkpoints for low-confidence or high-impact outputs.

**Best Practices**
- Version prompts, models, and datasets; log inputs/outputs for evaluation.
- Enforce input/output guardrails and PII redaction.
- Cache deterministic inference results; set token and cost budgets.
- Continuously evaluate against a golden dataset before promoting models.

**Common Mistakes**
- Hardcoding a single vendor with no abstraction, blocking migration.
- Sending sensitive data to models without redaction or consent.
- No evaluation harness, so quality regressions ship silently.
- Treating model output as trusted without validation.

**Future Improvements**
- Multi-model routing based on cost, latency, and quality.
- Fine-tuning and domain adaptation pipelines.
- Autonomous agent orchestration with tool-use and safety supervision.

---

## 7. Storage Architecture

**Purpose**
Store and serve unstructured and large binary assets durably and cost-effectively, separate from the transactional database.

**Components**
- Object storage (S3-class) for files, media, and documents.
- CDN for global, cached delivery.
- Signed-URL service for time-limited direct access.
- Lifecycle and tiering policies (hot/warm/cold/archive).
- Optional block/file storage for specialized workloads.

**Architecture**
- Clients upload/download directly to object storage via pre-signed URLs; the backend brokers permission, not bytes.
- Metadata stored in the database; the blob stored in object storage, linked by key.
- CDN fronts read-heavy public/semi-public assets.
- Immutable, versioned objects with server-side encryption at rest.

**Best Practices**
- Never proxy large files through application servers.
- Encrypt at rest; scope access with least-privilege bucket policies.
- Validate content type and size; scan uploads for malware.
- Apply lifecycle rules to archive or delete stale objects.

**Common Mistakes**
- Public buckets exposing private data.
- Storing binaries in the database, bloating backups.
- No virus/content scanning on user uploads.
- Unbounded storage growth with no lifecycle policy.

**Future Improvements**
- Intelligent tiering driven by access analytics.
- Client-side encryption for sensitive assets.
- Multi-region replication for locality and resilience.

---

## 8. Search Architecture

**Purpose**
Provide fast, relevant full-text and faceted search across large datasets without overloading the primary datastore.

**Components**
- Search engine (Elasticsearch/OpenSearch/Typesense-class).
- Indexing pipeline syncing source data to the search index.
- Query layer with ranking, faceting, and filtering.
- Optional vector/semantic search integration.

**Architecture**
- Source-of-truth data indexed asynchronously via events or CDC into the search cluster.
- Tenant-scoped indices or filters guarantee isolation.
- Hybrid search combines keyword (BM25) and semantic (vector) relevance.
- Read queries served from the search cluster, never the primary OLTP store.

**Best Practices**
- Keep the index eventually consistent via an idempotent, replayable pipeline.
- Design analyzers, synonyms, and ranking to match user intent.
- Enforce tenant isolation in every query.
- Monitor index size, query latency, and relevance metrics.

**Common Mistakes**
- Using the search index as a system of record.
- Synchronous indexing on the write path, slowing transactions.
- No reindexing strategy when mappings change.
- Ignoring tenant filters, leaking results across tenants.

**Future Improvements**
- Learning-to-rank and personalized relevance.
- Fully semantic/vector-native search.
- Real-time indexing with sub-second freshness guarantees.

---

## 9. Caching

**Purpose**
Reduce latency and backend load by serving frequently accessed data from fast, ephemeral storage.

**Components**
- In-memory distributed cache (Redis/Memcached-class).
- Application-level and HTTP/CDN caching layers.
- Cache-invalidation and TTL policy management.

**Architecture**
- Multi-tier caching: CDN edge → application cache → database.
- Patterns: cache-aside for reads, write-through/write-behind where consistency demands.
- Keys namespaced by tenant and version to avoid collisions and stale reads.
- TTLs sized to data volatility; explicit invalidation on writes.

**Best Practices**
- Set sensible TTLs; never cache without an expiry or invalidation path.
- Protect against thundering herds with request coalescing and jittered TTLs.
- Namespace keys by tenant; never share cache entries across tenants.
- Treat the cache as disposable; never as a source of truth.

**Common Mistakes**
- Cache stampedes on popular expired keys.
- Stale data from missing invalidation on writes.
- Caching per-tenant data under shared keys.
- Storing authoritative state only in the cache.

**Future Improvements**
- Adaptive TTLs based on access frequency.
- Near-cache (local + distributed) tiering for hot keys.
- Automated invalidation driven by change events.

---

## 10. Event Architecture

**Purpose**
Enable asynchronous, decoupled communication between components through durable, ordered event streams.

**Components**
- Message broker / event bus (Kafka, NATS, RabbitMQ, or cloud pub/sub).
- Producers and consumers with defined event schemas.
- Schema registry for event contracts.
- Dead-letter queues and retry policies.

**Architecture**
- Event-driven backbone: services publish domain events; consumers subscribe independently.
- Patterns: pub/sub, event sourcing (where applicable), and the outbox pattern for atomic publish-with-commit.
- At-least-once delivery with idempotent consumers.
- Partitioning/ordering keys preserve per-entity ordering.

**Best Practices**
- Version event schemas; evolve backward-compatibly.
- Make consumers idempotent; assume redelivery.
- Use the transactional outbox to avoid dual-write inconsistencies.
- Route failures to dead-letter queues with alerting and replay.

**Common Mistakes**
- Dual writes to database and broker without the outbox pattern.
- Non-idempotent consumers duplicating side effects.
- Unversioned events breaking downstream consumers.
- No dead-letter handling, silently losing failed messages.

**Future Improvements**
- Full event sourcing with replayable projections.
- Stream processing for real-time analytics.
- Exactly-once processing semantics where supported.

---

## 11. Integration Architecture

**Purpose**
Connect the platform to third-party systems reliably and securely, isolating external dependencies from the core domain.

**Components**
- Integration/adapter layer per external provider.
- Webhook ingress and outbound webhook dispatcher.
- API clients with retry, timeout, and circuit-breaker logic.
- Credential vault for third-party secrets.
- iPaaS or connector framework for common integrations.

**Architecture**
- Anti-corruption layer translates external models into internal domain models.
- Outbound calls wrapped with retries, timeouts, and circuit breakers.
- Inbound webhooks verified (signatures), queued, and processed asynchronously.
- Integration credentials isolated per tenant in a secrets manager.

**Best Practices**
- Never let an external outage cascade; fail gracefully and degrade.
- Verify webhook authenticity; process idempotently.
- Isolate external models behind an anti-corruption layer.
- Rate-limit and back off against partner APIs.

**Common Mistakes**
- Synchronous, unbounded calls to third parties blocking user requests.
- Leaking external API models into the core domain.
- Unverified webhooks trusted blindly.
- Hardcoded partner credentials in code or config.

**Future Improvements**
- Self-service connector marketplace.
- Declarative, config-driven integration definitions.
- Automated contract monitoring for partner API drift.

---

## 12. Security

**Purpose**
Protect the platform, its data, and its users against threats through defense-in-depth controls across every layer.

**Components**
- Secrets manager and key-management service (KMS).
- WAF, DDoS protection, and network segmentation.
- Encryption in transit (TLS) and at rest.
- Vulnerability scanning, SAST/DAST, and dependency auditing.
- Audit logging and intrusion detection.

**Architecture**
- Zero-trust posture: authenticate and authorize every request, internal and external.
- Layered controls: network, application, data, and identity.
- Secrets injected at runtime, never committed to source.
- Least-privilege IAM for all services and humans.

**Best Practices**
- Encrypt everywhere; rotate keys and secrets regularly.
- Patch and scan dependencies continuously.
- Apply least privilege and separation of duties.
- Maintain immutable, tamper-evident audit logs.

**Common Mistakes**
- Secrets in source control or environment dumps.
- Over-privileged service accounts.
- Trusting internal traffic implicitly.
- Ignoring dependency and container vulnerabilities.

**Future Improvements**
- Automated secret rotation and short-lived credentials.
- Runtime application self-protection (RASP).
- Continuous compliance and posture management.

---

## 13. Validation

**Purpose**
Ensure all data entering the system is well-formed, safe, and semantically correct before it reaches business logic or storage.

**Components**
- Schema validation library (JSON Schema, Zod, protobuf, Bean Validation).
- Input sanitization and normalization utilities.
- Business-rule/invariant validators in the domain layer.
- Shared validation contracts between client and server.

**Architecture**
- Validation at every boundary: transport (structural), application (semantic), and domain (invariants).
- Server-side validation is authoritative; client-side validation is UX only.
- Fail fast with structured, field-level error responses.
- Canonicalize and normalize inputs before persistence.

**Best Practices**
- Never trust client input; always re-validate server-side.
- Use declarative, reusable schemas as the single validation source.
- Return machine-readable, field-scoped validation errors.
- Validate at the edge and re-check invariants in the domain.

**Common Mistakes**
- Relying solely on client-side validation.
- Duplicated, divergent validation rules across layers.
- Vague error messages that don't identify the failing field.
- Persisting unnormalized data, causing downstream inconsistency.

**Future Improvements**
- Generate client and server validators from one shared schema.
- Contract-driven validation tied to the API schema registry.
- AI-assisted anomaly detection on inbound data.

---

## 14. Error Handling

**Purpose**
Handle failures predictably and safely, preserving system stability and giving clients actionable, non-leaky feedback.

**Components**
- Centralized error-handling middleware.
- Standardized error taxonomy and codes.
- Retry, timeout, circuit-breaker, and bulkhead utilities.
- Correlation/trace IDs propagated through requests.

**Architecture**
- Distinguish expected (domain) errors from unexpected (system) failures.
- Global handler maps internal errors to safe, consistent client responses.
- Transient failures retried with exponential backoff and jitter; persistent failures fail fast.
- Every error carries a correlation ID linking logs and traces.

**Best Practices**
- Never leak stack traces or internals to clients.
- Use consistent, documented error codes and shapes.
- Fail gracefully; degrade rather than crash.
- Log errors with context and correlation IDs.

**Common Mistakes**
- Swallowing exceptions silently.
- Exposing internal details in error responses.
- Infinite or un-jittered retries amplifying outages.
- Inconsistent error formats across endpoints.

**Future Improvements**
- Automated error clustering and root-cause hints.
- Self-healing retries and adaptive circuit breakers.
- User-facing status transparency for degraded modes.

---

## 15. Monitoring

**Purpose**
Provide full observability into system health, performance, and behavior to detect, diagnose, and prevent incidents.

**Components**
- Metrics (Prometheus-class), logs (centralized aggregation), and traces (OpenTelemetry).
- Dashboards and visualization (Grafana-class).
- Alerting and on-call routing.
- Uptime/synthetic monitoring and SLO tracking.

**Architecture**
- Three pillars — metrics, logs, traces — correlated by trace/correlation IDs.
- Instrumentation via a vendor-neutral standard (OpenTelemetry).
- SLOs and error budgets drive alerting thresholds.
- Structured, centralized logging with tenant and request context.

**Best Practices**
- Instrument first; measure the golden signals (latency, traffic, errors, saturation).
- Alert on symptoms and SLO burn, not raw noise.
- Use structured logs with consistent, queryable fields.
- Correlate logs, metrics, and traces for fast diagnosis.

**Common Mistakes**
- Alert fatigue from noisy, non-actionable alerts.
- Unstructured logs that can't be queried.
- No distributed tracing across service boundaries.
- Monitoring infrastructure but not user-facing SLOs.

**Future Improvements**
- AI-driven anomaly detection and predictive alerting.
- Automated root-cause analysis.
- Continuous profiling in production.

---

## 16. Performance

**Purpose**
Ensure the system meets latency and throughput targets efficiently under expected and peak load.

**Components**
- Load and stress testing harness.
- Application and database profiling tools.
- Caching, connection pooling, and query optimization.
- CDN and asset optimization.

**Architecture**
- Performance budgets defined per critical path and enforced in CI.
- Async and batching for expensive operations; keep the request path lean.
- N+1 query elimination via eager loading and query tuning.
- Backpressure and rate limiting protect against overload.

**Best Practices**
- Measure before optimizing; profile real bottlenecks.
- Set and track latency budgets (p95/p99).
- Optimize hot paths and database indexes.
- Cache expensive, stable computations.

**Common Mistakes**
- Premature optimization of non-bottleneck code.
- Unbounded queries and missing indexes.
- Blocking I/O on the request path.
- No load testing before launch.

**Future Improvements**
- Continuous performance regression testing in CI.
- Adaptive resource allocation under load.
- Edge computation for latency-sensitive paths.

---

## 17. Scalability

**Purpose**
Allow the system to grow with demand, scaling capacity horizontally and elastically without redesign.

**Components**
- Horizontal autoscaling (compute and workers).
- Load balancers and stateless services.
- Database sharding/partitioning and read replicas.
- Queue-based load leveling.

**Architecture**
- Stateless services scale horizontally behind load balancers.
- State partitioned by tenant or entity to enable sharding.
- Asynchronous queues decouple producers from consumer capacity.
- Autoscaling driven by utilization and queue-depth signals.

**Best Practices**
- Design stateless from day one; externalize all state.
- Partition data along natural boundaries (tenant, region).
- Use queues to absorb spikes and level load.
- Test scaling behavior, not just steady state.

**Common Mistakes**
- Sticky sessions preventing horizontal scaling.
- A single database becoming the global bottleneck.
- Scaling compute while the datastore saturates.
- No load-shedding strategy under extreme load.

**Future Improvements**
- Multi-region active-active architecture.
- Cell-based architecture for blast-radius isolation.
- Serverless elasticity for spiky workloads.

---

## 18. Deployment

**Purpose**
Deliver software to production safely, repeatably, and frequently with minimal risk and downtime.

**Components**
- CI/CD pipeline with automated build, test, and deploy stages.
- Containerization (Docker) and orchestration (Kubernetes-class).
- Infrastructure as code (Terraform/Pulumi-class).
- Artifact registry and environment promotion.

**Architecture**
- Immutable, versioned artifacts promoted through dev → staging → production.
- Progressive delivery: blue-green or canary releases with automated rollback.
- Infrastructure defined as code and provisioned reproducibly.
- Feature flags decouple deploy from release.

**Best Practices**
- Automate the full pipeline; no manual production changes.
- Deploy small, frequent, reversible changes.
- Use immutable infrastructure and IaC.
- Gate releases with automated tests and health checks.

**Common Mistakes**
- Manual, snowflake production environments.
- Big-bang releases with no rollback path.
- Config drift between environments.
- Coupling deployment to feature release without flags.

**Future Improvements**
- Progressive delivery driven by real-time SLO metrics.
- GitOps-based declarative deployment.
- Automated rollback on anomaly detection.

*(Note: deployment execution checklists remain owned by the deployment-agent; this section defines the universal pattern only.)*

---

## 19. Disaster Recovery

**Purpose**
Guarantee business continuity and data durability in the face of failures, corruption, or regional outages.

**Components**
- Automated, tested backups and point-in-time recovery.
- Multi-region/multi-AZ redundancy.
- Runbooks and defined RTO/RPO targets.
- Failover automation and replication.

**Architecture**
- Backups replicated across regions with defined retention.
- Recovery objectives (RTO/RPO) drive redundancy and replication design.
- Automated failover for critical stateful components.
- Regular, rehearsed recovery drills validate the plan.

**Best Practices**
- Test restores, not just backups.
- Define and measure RTO/RPO per service tier.
- Replicate across failure domains.
- Document and rehearse runbooks regularly.

**Common Mistakes**
- Backups that were never test-restored.
- Single-region deployment with no failover.
- Undefined or aspirational-only recovery objectives.
- Runbooks that are outdated or untested.

**Future Improvements**
- Continuous, automated recovery drills (chaos engineering).
- Active-active multi-region for near-zero RTO.
- Automated data-integrity verification on backups.

---

## 20. Documentation

**Purpose**
Capture system knowledge so teams can build, operate, and integrate reliably without tribal knowledge dependency.

**Components**
- Architecture decision records (ADRs).
- API reference (generated from contracts).
- Runbooks and operational playbooks.
- Onboarding and developer guides.
- System diagrams (C4-style) and data-flow docs.

**Architecture**
- Documentation-as-code, versioned alongside the source it describes.
- API docs generated automatically from the machine-readable contract.
- Living diagrams kept current with the architecture.
- Decisions recorded as immutable ADRs at the point of decision.

**Best Practices**
- Keep docs next to code; update them in the same change.
- Automate generation wherever possible to prevent drift.
- Record the "why" (ADRs), not just the "what".
- Maintain runbooks for every critical operational scenario.

**Common Mistakes**
- Stale docs that no longer match reality.
- Knowledge trapped in individuals' heads.
- Auto-generated docs with no human context.
- Missing operational runbooks for incidents.

**Future Improvements**
- AI-assisted documentation generation and drift detection.
- Interactive, executable documentation.
- Automated freshness checks tied to code changes.

---

**End of Universal Technical Architecture.**
This baseline is handed to solution-architect-app as the standardized technical-pattern reference. Domain-specific scoping, UI, business rules, pricing, and execution checklists are intentionally excluded and remain owned by their respective downstream agents.

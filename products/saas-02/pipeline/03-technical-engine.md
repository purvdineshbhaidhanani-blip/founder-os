# Universal Technical Architecture

**SaaS Idea:** Freelancer Tax Filing AI
**Document Type:** Universal Technical Architecture (locked 20-section pattern library)
**Scope:** Domain-agnostic, reusable technical reference patterns. Idea-specific implementation is intentionally excluded and belongs to the downstream bespoke architects and developer-agent.

---

## 1. Database Architecture

### Purpose
Provide a durable, consistent, and query-efficient system of record for all application state, supporting transactional integrity, analytical access, and multi-tenant isolation.

### Components
- Primary relational store (OLTP) for transactional, strongly-consistent data.
- Optional document/NoSQL store for flexible, schema-light aggregates.
- Read replicas for scaling read-heavy workloads.
- Connection pooler and query router.
- Schema migration framework with versioned, reversible migrations.
- Data catalog and schema registry.

### Architecture
- Tenant isolation via one of: shared schema with tenant discriminator, schema-per-tenant, or database-per-tenant, chosen against isolation vs. cost trade-offs.
- Primary-replica topology with synchronous commit for durability and asynchronous replicas for read scaling.
- Logical partitioning/sharding key defined at the tenant or entity boundary.
- Change Data Capture (CDC) stream feeding downstream search, cache, and analytics pipelines.
- Separation of OLTP from OLAP via an ETL/ELT path into a warehouse or lakehouse.

### Best Practices
- Normalize for write integrity; denormalize deliberately behind read models.
- Enforce constraints (foreign keys, unique, check) at the database, not only in code.
- Use surrogate keys plus immutable audit columns (created_at, updated_at, version).
- Apply least-privilege database roles per service.
- Index to match access patterns; review query plans regularly.

### Common Mistakes
- Choosing a tenancy model late, forcing costly re-platforming.
- Storing large blobs in relational rows instead of object storage.
- Missing migration rollbacks, blocking safe deploys.
- Unbounded table growth without partitioning or archival.
- Sharing one privileged DB user across all services.

### Future Improvements
- Introduce distributed SQL or automatic sharding as scale grows.
- Add temporal/bitemporal tables for full historical querying.
- Adopt a feature-store-backed read model for AI features.
- Automate index recommendation via query telemetry.

---

## 2. Authentication Architecture

### Purpose
Verify the identity of users, services, and machines reliably before any access decision is made.

### Components
- Identity provider (IdP) supporting OIDC/OAuth 2.1.
- Token service issuing short-lived access tokens and rotating refresh tokens.
- Multi-factor authentication (MFA) module.
- Session store for revocation and device tracking.
- Passwordless / social / enterprise SSO connectors (SAML, OIDC).

### Architecture
- Standards-based OIDC authorization code flow with PKCE for user-facing clients.
- Client-credentials flow for service-to-service authentication.
- JWTs signed with asymmetric keys (rotating JWKS); short TTL access tokens plus refresh rotation.
- Central session/revocation registry to invalidate compromised tokens.
- mTLS for internal service identity where zero-trust is required.

### Best Practices
- Never store passwords except as salted, adaptive-hash digests (Argon2/bcrypt).
- Keep access tokens short-lived; bind refresh tokens to device/session.
- Enforce MFA for privileged and administrative accounts.
- Rotate signing keys and publish via JWKS.
- Separate authentication (who) from authorization (what).

### Common Mistakes
- Long-lived, non-revocable JWTs.
- Storing tokens in insecure browser storage without protection.
- Mixing authentication and authorization logic into one opaque check.
- Rolling custom crypto instead of vetted libraries.

### Future Improvements
- Adopt passkeys/WebAuthn as primary factor.
- Add continuous/risk-based (adaptive) authentication.
- Introduce decentralized or federated identity where partners require it.

---

## 3. Authorization Architecture

### Purpose
Decide, consistently and auditable, what an authenticated principal is allowed to do on which resource.

### Components
- Policy decision point (PDP) and policy enforcement points (PEP).
- Role-based (RBAC) and attribute-based (ABAC) model definitions.
- Relationship-based (ReBAC) graph for fine-grained resource sharing.
- Central policy store and policy-as-code repository.
- Permission-check SDK/middleware.

### Architecture
- Enforcement at the API gateway (coarse) and service layer (fine-grained).
- Externalized authorization: policies evaluated by a dedicated engine, not scattered in code.
- Tenant scope injected into every authorization query to prevent cross-tenant access.
- Decision caching with short TTL and explicit invalidation on grant changes.

### Best Practices
- Default-deny; grant explicitly.
- Model permissions around resources and actions, not screens.
- Keep policies versioned, tested, and reviewable as code.
- Log every allow/deny decision for audit.

### Common Mistakes
- Hardcoding role checks throughout the codebase.
- Trusting client-supplied tenant/role claims without server validation.
- Coarse "admin can do everything" grants that violate least privilege.
- No audit trail of authorization decisions.

### Future Improvements
- Move to fully externalized policy engine with hot-reload.
- Add just-in-time, time-boxed privilege elevation.
- Introduce policy simulation/what-if tooling before rollout.

---

## 4. Backend Architecture

### Purpose
Provide the compute layer that executes business logic, orchestrates data and integrations, and exposes it safely to clients.

### Components
- Service runtime (modular monolith or services) with clear domain boundaries.
- Domain layer, application/use-case layer, and infrastructure adapters.
- Background job/worker subsystem.
- Configuration and secrets management.
- Service mesh or internal RPC layer.

### Architecture
- Layered/hexagonal architecture separating domain logic from I/O adapters.
- Start as a modular monolith with strict module boundaries; extract services along proven seams when scale demands.
- Stateless services behind a load balancer; state externalized to datastores.
- Asynchronous workers for long-running and retryable work.
- Idempotent handlers keyed by request/operation IDs.

### Best Practices
- Keep the domain core free of framework and I/O concerns.
- Design for statelessness and horizontal scale.
- Make all side-effecting operations idempotent.
- Centralize cross-cutting concerns (logging, tracing, auth) in middleware.

### Common Mistakes
- Premature microservice decomposition creating distributed monoliths.
- Business logic leaking into controllers or the database.
- Shared mutable in-process state breaking horizontal scaling.
- Long synchronous request chains across many services.

### Future Improvements
- Adopt CQRS where read/write patterns diverge sharply.
- Introduce workflow/orchestration engine for complex sagas.
- Move suitable endpoints to serverless for elastic bursty load.

---

## 5. API Architecture

### Purpose
Expose backend capabilities through stable, versioned, well-governed contracts for internal and external consumers.

### Components
- API gateway (routing, rate limiting, auth offload).
- REST and/or GraphQL and/or gRPC surfaces.
- Contract/schema definitions (OpenAPI, GraphQL SDL, protobuf).
- Developer portal and API key management.
- Webhook delivery subsystem for outbound events.

### Architecture
- Gateway front door enforcing authentication, throttling, and quota.
- Versioned contracts with backward-compatibility guarantees.
- Consistent resource modeling, pagination, filtering, and error envelopes.
- Contract-first design generating clients and server stubs.
- Rate limiting and quota per tenant/API key.

### Best Practices
- Design contract-first and validate requests/responses against schema.
- Use semantic versioning and deprecation policies with sunset headers.
- Standardize pagination, errors, and idempotency keys across all endpoints.
- Return consistent, machine-readable error structures.

### Common Mistakes
- Breaking changes shipped without versioning.
- Inconsistent naming, pagination, and error formats across endpoints.
- Chatty APIs forcing N+1 client calls.
- No rate limiting, enabling abuse and noisy-neighbor effects.

### Future Improvements
- Adopt GraphQL federation or BFF layers for diverse clients.
- Add automated contract testing in CI.
- Publish async/event API specs (AsyncAPI) alongside REST.

---

## 6. AI Architecture

### Purpose
Provide a governed, reliable, and cost-controlled layer for integrating machine learning and LLM capabilities into the product.

### Components
- Model gateway/router abstracting model providers.
- Prompt and context management (templates, versioning).
- Retrieval-augmented generation (RAG) pipeline with vector store.
- Feature store for structured ML features.
- Evaluation, guardrail, and safety filter layer.
- Inference cache and token/cost accounting.

### Architecture
- Abstraction layer decoupling application from specific model providers, enabling failover and A/B routing.
- RAG pattern: ingest to embeddings, store in vector index, retrieve relevant context at query time, ground the model response.
- Guardrails on both input (injection defense, PII scrubbing) and output (validation, content safety).
- Asynchronous inference for heavy jobs; streaming for interactive responses.
- Human-in-the-loop review path for low-confidence or high-risk outputs.

### Best Practices
- Version prompts, models, and datasets; make outputs reproducible/traceable.
- Ground responses in retrieved data to reduce hallucination.
- Never send secrets or unminimized sensitive data to external models.
- Track token cost, latency, and quality per feature.
- Evaluate models continuously against a golden dataset.

### Common Mistakes
- Hardcoding a single model provider with no fallback.
- No prompt-injection or output-validation defenses.
- Treating model output as trusted/executable without checks.
- Unbounded token spend with no budget controls.

### Future Improvements
- Add fine-tuning/adapter pipelines and self-hosted models where economical.
- Introduce agentic orchestration with tool-use governance.
- Adopt automated eval harness and drift detection.

---

## 7. Storage Architecture

### Purpose
Store, serve, and lifecycle-manage unstructured and binary content durably and cost-effectively.

### Components
- Object storage for blobs (documents, media, exports).
- CDN for global, low-latency delivery.
- Signed-URL service for direct, scoped client access.
- Lifecycle and tiering policies (hot/warm/cold/archive).
- Virus/malware scanning on ingest.

### Architecture
- Store large binaries in object storage; keep only references/metadata in the database.
- Direct-to-storage uploads/downloads via short-lived signed URLs to bypass app compute.
- CDN edge caching for public/cacheable assets.
- Server-side encryption at rest; per-tenant key scoping where required.
- Automated tiering and expiry to control cost.

### Best Practices
- Never proxy large files through application servers.
- Scan and validate uploads before making them accessible.
- Use content-addressable or immutable object naming to prevent overwrite races.
- Set explicit retention and deletion lifecycle rules.

### Common Mistakes
- Storing files as base64/blobs in the relational DB.
- Public buckets with no access scoping.
- No malware scanning on user-supplied files.
- Unbounded storage growth with no lifecycle policy.

### Future Improvements
- Add per-tenant customer-managed encryption keys (CMEK/BYOK).
- Introduce deduplication and compression at ingest.
- Multi-region replication for locality and resilience.

---

## 8. Search Architecture

### Purpose
Provide fast, relevant, and scalable full-text, faceted, and semantic search over application data.

### Components
- Search/index engine (inverted index).
- Vector index for semantic/similarity search.
- Indexing pipeline fed by CDC/events.
- Query parser, ranking, and relevance-tuning layer.
- Synonym, analyzer, and language configuration.

### Architecture
- Source of truth remains the primary database; the search index is a derived read model kept in sync via events/CDC.
- Hybrid search combining lexical (BM25) and vector (semantic) retrieval with re-ranking.
- Tenant filter enforced on every query for isolation.
- Asynchronous, idempotent reindexing with version stamps.

### Best Practices
- Treat the index as rebuildable and disposable; keep reindex tooling ready.
- Enforce tenant/permission filters inside the search query, not after.
- Tune analyzers and relevance with real query telemetry.
- Decouple indexing latency from write-path latency.

### Common Mistakes
- Using the search engine as the primary datastore.
- Synchronous indexing on the write path, coupling latencies.
- Ignoring permission filtering, leaking cross-tenant results.
- No reindex strategy when mappings change.

### Future Improvements
- Add learning-to-rank and personalized relevance.
- Introduce fully semantic/conversational search.
- Auto-generated synonyms and query understanding via models.

---

## 9. Caching Architecture

### Purpose
Reduce latency and load by serving frequently accessed data from fast, ephemeral stores.

### Components
- In-memory distributed cache (e.g., key-value cache cluster).
- Application-local (near) cache.
- CDN/edge cache for HTTP responses.
- Cache-invalidation and pub/sub layer.

### Architecture
- Layered caching: client/CDN, gateway, application, and data-access tiers.
- Cache-aside as default; write-through/write-behind where consistency needs dictate.
- Explicit TTLs plus event-driven invalidation on data change.
- Key namespacing includes tenant and version to avoid collisions and stampedes.

### Best Practices
- Set sensible TTLs; never cache without an expiry or invalidation path.
- Protect against cache stampedes (locking, jitter, request coalescing).
- Namespace keys by tenant and schema version.
- Cache derived/expensive computations, not just raw rows.

### Common Mistakes
- Cache invalidation ignored, serving stale data indefinitely.
- Caching sensitive data without access scoping.
- Unbounded cache growth causing evictions of hot keys.
- Treating the cache as a durable store.

### Future Improvements
- Add predictive/pre-warming based on usage patterns.
- Introduce edge compute for personalized cached responses.
- Adopt tiered cache with automatic promotion/demotion.

---

## 10. Event Architecture

### Purpose
Enable asynchronous, decoupled communication and reliable propagation of state changes across the system.

### Components
- Event broker/streaming platform (queue + log).
- Producer/consumer SDKs.
- Schema registry for event contracts.
- Dead-letter queues and retry policies.
- Outbox table for transactional publishing.

### Architecture
- Event-driven backbone with publish/subscribe and durable streams.
- Transactional outbox pattern to guarantee at-least-once publishing consistent with DB writes.
- Idempotent consumers keyed by event ID.
- Schema-versioned events with backward compatibility.
- Dead-letter handling with replay tooling.

### Best Practices
- Make consumers idempotent; assume at-least-once delivery.
- Version event schemas and evolve compatibly.
- Use the outbox pattern to avoid dual-write inconsistency.
- Keep events as facts (past tense), not commands to specific services.

### Common Mistakes
- Dual writes to DB and broker without an outbox, causing divergence.
- Non-idempotent consumers double-processing events.
- Unversioned event payloads breaking consumers.
- No dead-letter or replay path for poison messages.

### Future Improvements
- Adopt event sourcing for domains needing full history.
- Add stream processing for real-time aggregations.
- Introduce exactly-once processing semantics where supported.

---

## 11. Integration Architecture

### Purpose
Connect the system to third-party services and external systems reliably, securely, and observably.

### Components
- Integration/adapter layer per external provider.
- Outbound webhook dispatcher and inbound webhook receiver.
- Connector framework with credential vault.
- Anti-corruption layer translating external models to internal ones.
- Rate-limit and retry/circuit-breaker handling per provider.

### Architecture
- Anti-corruption layer isolates external contracts from the domain model.
- Resilient outbound calls with timeouts, retries with backoff, and circuit breakers.
- Inbound webhooks verified by signature and made idempotent.
- Credentials stored in a secrets vault, never in code or config.
- Asynchronous processing for non-critical-path integrations.

### Best Practices
- Wrap every external dependency in a timeout and circuit breaker.
- Verify inbound webhook signatures and dedupe by event ID.
- Isolate provider-specific logic behind stable internal interfaces.
- Monitor third-party health and degrade gracefully.

### Common Mistakes
- Direct coupling of domain logic to a vendor's data model.
- No timeout/retry, letting one slow provider cascade failures.
- Trusting unverified inbound webhooks.
- Hardcoded API credentials.

### Future Improvements
- Add an integration platform/iPaaS for low-code connectors.
- Introduce a provider abstraction with automatic failover.
- Publish a partner API + webhook catalog.

---

## 12. Security Architecture

### Purpose
Protect confidentiality, integrity, and availability across data, services, and infrastructure under a zero-trust posture.

### Components
- Secrets manager and key management service (KMS).
- WAF, DDoS protection, and network segmentation.
- Encryption (TLS in transit, encryption at rest).
- Vulnerability scanning and dependency/SCA tooling.
- Audit logging and SIEM integration.

### Architecture
- Zero-trust: authenticate and authorize every request; never trust the network.
- Defense in depth across network, host, application, and data layers.
- Secrets injected at runtime from a vault; automatic rotation.
- Envelope encryption with KMS-managed keys; per-tenant scoping where required.
- Continuous scanning in CI/CD (SAST, DAST, SCA, IaC scanning).

### Best Practices
- Enforce least privilege everywhere (users, services, infrastructure).
- Encrypt in transit and at rest by default.
- Centralize and immutably store audit logs.
- Shift security left with automated pipeline gates.

### Common Mistakes
- Secrets in source control or environment files.
- Flat networks with no segmentation.
- Logging sensitive data in plaintext.
- Treating security as a release-time checklist rather than continuous.

### Future Improvements
- Adopt confidential computing for sensitive workloads.
- Add runtime application self-protection (RASP).
- Introduce automated compliance-as-code evidence collection.

---

## 13. Validation Architecture

### Purpose
Ensure all data entering and moving through the system is well-formed, safe, and semantically valid.

### Components
- Schema validation library at API boundaries.
- Domain invariant/business-rule validators (generic, not domain-specific here).
- Input sanitization and encoding utilities.
- Shared validation contract shared between client and server.

### Architecture
- Validate at every trust boundary: API edge (syntactic), application layer (semantic), and database (constraints).
- Fail fast with structured, field-level error responses.
- Single source of truth for validation schemas, generating both client and server checks.
- Sanitize/encode to prevent injection (SQL, XSS, command).

### Best Practices
- Never trust client input; re-validate server-side.
- Use allowlists over denylists.
- Keep validation declarative and shared, not duplicated ad hoc.
- Return consistent, actionable validation errors.

### Common Mistakes
- Relying on client-side validation for security.
- Divergent validation rules between layers.
- Vague error messages that hinder debugging.
- Missing normalization leading to inconsistent stored data.

### Future Improvements
- Generate validators automatically from a single schema.
- Add contract-driven property-based testing.
- Introduce anomaly detection on inbound data quality.

---

## 14. Error Handling Architecture

### Purpose
Detect, classify, communicate, and recover from failures gracefully without exposing internals.

### Components
- Centralized error taxonomy and error-code registry.
- Global exception handler/middleware.
- Retry, backoff, and circuit-breaker utilities.
- Structured error response envelope.
- Correlation/trace ID propagation.

### Architecture
- Distinguish expected (domain) errors from unexpected (system) errors.
- Global handler maps internal errors to safe, consistent client responses.
- Transient failures retried with exponential backoff and jitter; permanent failures surfaced.
- Every error carries a correlation ID linking logs, traces, and user report.
- Graceful degradation and fallback paths for non-critical failures.

### Best Practices
- Never leak stack traces or internal detail to clients.
- Use a consistent error envelope with codes and correlation IDs.
- Fail fast on unrecoverable errors; retry only idempotent operations.
- Log errors with context, not just messages.

### Common Mistakes
- Swallowing exceptions silently.
- Retrying non-idempotent operations, causing duplicates.
- Exposing internal errors/stack traces to end users.
- Inconsistent error formats across services.

### Future Improvements
- Add automated error clustering and anomaly alerting.
- Introduce self-healing runbooks triggered by error signatures.
- Adopt chaos testing to validate failure handling.

---

## 15. Monitoring & Observability Architecture

### Purpose
Provide full visibility into system health, performance, and behavior to detect, diagnose, and prevent issues.

### Components
- Metrics collection and time-series store.
- Centralized structured logging.
- Distributed tracing.
- Dashboards and alerting.
- Synthetic monitoring and real-user monitoring.

### Architecture
- Three pillars: metrics, logs, traces, correlated by trace/correlation IDs.
- Instrumentation via open standards (e.g., OpenTelemetry).
- SLIs/SLOs defined per critical user journey with error budgets.
- Alerting on symptoms (SLO burn) rather than only causes.
- Centralized aggregation with tenant-aware context.

### Best Practices
- Emit structured, queryable logs; avoid free-text-only logs.
- Define SLOs and alert on error-budget burn.
- Correlate telemetry with a single trace ID end to end.
- Avoid alert fatigue; make alerts actionable.

### Common Mistakes
- Logging without structure or correlation.
- Monitoring infrastructure but not user-facing SLIs.
- Over-alerting on noise, causing responders to ignore alerts.
- No tracing across service boundaries.

### Future Improvements
- Add AI-assisted anomaly detection and root-cause analysis.
- Introduce continuous profiling.
- Adopt predictive capacity and reliability forecasting.

---

## 16. Performance Architecture

### Purpose
Meet latency and throughput targets efficiently under expected and peak load.

### Components
- Load and stress testing harness.
- Performance budgets and benchmarks.
- Profiling and APM tooling.
- Async processing and batching utilities.
- Connection pooling and resource governors.

### Architecture
- Performance budgets per endpoint/journey enforced in CI.
- Async and batch processing to keep the request path lean.
- Read scaling via caching and replicas; write scaling via partitioning/queues.
- Backpressure and rate limiting to protect resources under load.
- N+1 and hot-path query optimization guided by profiling.

### Best Practices
- Measure before optimizing; profile real workloads.
- Set and enforce performance budgets.
- Push slow, non-critical work off the request path.
- Optimize the critical path first; avoid premature micro-optimization.

### Common Mistakes
- Optimizing without measurement.
- N+1 queries and unbounded result sets.
- Synchronous heavy work in request handlers.
- No load testing before launch.

### Future Improvements
- Introduce edge compute for latency-sensitive paths.
- Add adaptive concurrency and auto-tuning.
- Continuous performance regression detection in CI.

---

## 17. Scalability Architecture

### Purpose
Grow capacity smoothly and cost-effectively across users, data, and traffic without redesign.

### Components
- Horizontal autoscaling groups.
- Load balancers and traffic distribution.
- Stateless services with externalized state.
- Partitioning/sharding strategy.
- Queue-based load leveling.

### Architecture
- Scale horizontally by default; keep services stateless.
- Autoscale on demand signals (CPU, queue depth, request rate).
- Partition data and workloads by tenant/entity to avoid hotspots.
- Decouple bursty workloads with queues (load leveling).
- Design for multi-region/multi-AZ distribution.

### Best Practices
- Externalize all state; avoid sticky sessions.
- Test scaling behavior, including scale-down.
- Avoid single points of contention (shared locks, hot partitions).
- Plan capacity headroom and cost guardrails.

### Common Mistakes
- Stateful services blocking horizontal scale.
- Hot partitions/keys concentrating load.
- Scaling compute while the database becomes the bottleneck.
- No autoscaling limits, risking runaway cost.

### Future Improvements
- Adopt cell-based architecture for blast-radius isolation.
- Introduce global data distribution with locality routing.
- Add predictive autoscaling from usage forecasts.

---

## 18. Deployment Architecture

### Purpose
Deliver changes to production safely, repeatably, and frequently with minimal risk. (Deployment checklists themselves remain owned by the deployment-agent.)

### Components
- CI/CD pipeline with automated gates.
- Infrastructure as Code (IaC).
- Containerization and orchestration.
- Artifact registry and environment promotion.
- Feature flags and progressive delivery tooling.

### Architecture
- Immutable, versioned artifacts promoted through environments.
- Infrastructure defined and provisioned as code, reviewed like application code.
- Progressive delivery: canary/blue-green/rolling with automated rollback.
- Feature flags to decouple deploy from release.
- Environment parity from development to production.

### Best Practices
- Automate the full path from commit to production.
- Keep deployments reversible with fast rollback.
- Separate deploy from release using flags.
- Maintain environment parity and reproducible builds.

### Common Mistakes
- Manual, snowflake deployment steps.
- No rollback plan for failed releases.
- Configuration drift between environments.
- Big-bang releases with wide blast radius.

### Future Improvements
- Adopt GitOps for declarative, auditable deployments.
- Introduce automated progressive delivery with SLO-based rollback.
- Add ephemeral preview environments per change.

---

## 19. Disaster Recovery Architecture

### Purpose
Restore service and data within defined objectives after major failures, corruption, or regional outages.

### Components
- Automated, tested backups with retention tiers.
- Cross-region replication.
- Runbooks and orchestration for failover.
- RPO/RTO targets and DR tiers.
- Point-in-time recovery capability.

### Architecture
- Defined RPO (data loss tolerance) and RTO (downtime tolerance) per system tier.
- Regular automated backups plus point-in-time recovery for datastores.
- Cross-region standby (active-passive or active-active) for critical services.
- Immutable, encrypted, offsite backup copies to survive ransomware/deletion.
- Regularly rehearsed failover and restore drills.

### Best Practices
- Test restores, not just backups; a backup is unproven until restored.
- Keep at least one immutable/offline backup copy.
- Document and rehearse runbooks; automate failover where possible.
- Match DR investment to each tier's RPO/RTO.

### Common Mistakes
- Backups never test-restored.
- Backups co-located with primary, sharing failure domain.
- Undefined or unrealistic RPO/RTO.
- Manual, undocumented recovery procedures.

### Future Improvements
- Move toward active-active multi-region for near-zero RTO.
- Automate continuous DR validation and game days.
- Add automated data-integrity/corruption detection.

---

## 20. Documentation Architecture

### Purpose
Ensure the system is understandable, maintainable, and onboardable through living, discoverable documentation.

### Components
- Architecture decision records (ADRs).
- Auto-generated API reference from contracts.
- System and data-flow diagrams (as code).
- Runbooks and operational playbooks.
- Onboarding and developer guides.

### Architecture
- Docs-as-code: documentation versioned alongside the codebase and reviewed in PRs.
- Contract-derived reference (API, events) generated automatically to prevent drift.
- Diagrams as code for reproducible, version-controlled visuals.
- ADRs capturing decisions and their trade-offs over time.
- Centralized, searchable knowledge base.

### Best Practices
- Keep documentation next to the code and update it in the same change.
- Record decisions and trade-offs, not just outcomes.
- Generate reference docs from source of truth.
- Write runbooks for every operational scenario.

### Common Mistakes
- Documentation that drifts out of sync with reality.
- Decisions made with no recorded rationale.
- Tribal knowledge locked in individuals.
- Reference docs maintained by hand, diverging from contracts.

### Future Improvements
- Add AI-assisted doc generation and drift detection.
- Introduce automated freshness checks in CI.
- Build an interactive, queryable knowledge assistant over the docs.

---

## Handoff Note

This is the universal, locked 20-section technical-pattern baseline for **Freelancer Tax Filing AI**. It is intentionally domain-agnostic: no tax rules, forms, jurisdictions, UI, pricing, or business logic are included, as those belong to solution-architect-app and the downstream bespoke architects, saas-foundation-agent, saas-business-engine-agent, and the developer-agent. Deliver to **solution-architect-app** as the standardized baseline to scope down into the idea-specific System Architecture Document.

**Primary trade-off to flag on handoff:** these patterns favor generality and long-term scalability over minimal upfront cost and speed. For an early-stage build, the bespoke architects should right-size each section (for example, deferring multi-region DR, service decomposition, and externalized policy engines) against the actual scale, latency, compliance, and team constraints of the project. Adopting the full pattern set prematurely risks over-engineering; omitting the wrong parts risks costly re-platforming, so each scope-down decision must name its own trade-off.

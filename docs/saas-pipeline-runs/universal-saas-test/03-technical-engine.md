# Universal Technical Architecture — Universal SaaS Test

> Module 3 of 4 — Technical Engine. Universal, domain-agnostic reference patterns. The 20 sections below appear in the locked order, each with Purpose, Components, Architecture, Best Practices, Common Mistakes, and Future Improvements. No UI, pricing, business rules, or per-project decisions are included; downstream architects scope these patterns to the idea.

---

## 1. Database Architecture

**Purpose**
Provide a durable, consistent, and queryable system of record for all application state, isolating tenant data and supporting transactional integrity at scale.

**Components**
- Primary relational store (PostgreSQL-class) for transactional data.
- Read replicas for read scaling and reporting isolation.
- Connection pooler (e.g., PgBouncer) between app and database.
- Schema migration tool with versioned, forward-only migrations.
- Optional purpose-built stores: document store for flexible schemas, time-series store for metrics, ledger tables for immutable history.

**Architecture**
- Multi-tenant isolation via one of three patterns: shared schema with tenant_id row-level scoping, schema-per-tenant, or database-per-tenant — chosen by isolation/compliance needs. Default: shared schema + row-level security (RLS).
- Primary handles writes; replicas serve reads via a routing layer. Writes propagate asynchronously; the app reads-its-own-writes from the primary when consistency is required.
- Migrations run as a gated deploy step, backward-compatible (expand/contract pattern) so old and new code coexist during rollout.

**Best Practices**
- Enforce tenant scoping at the database layer (RLS) so a missing WHERE clause cannot leak data.
- Use surrogate keys (UUIDv7/ULID) plus explicit foreign keys and constraints; let the DB enforce invariants.
- Index for actual query patterns; add covering and partial indexes; monitor slow queries.
- Keep transactions short; avoid long-held locks.

**Common Mistakes**
- Relying only on application code for tenant isolation.
- Destructive migrations (drop/rename in place) that break running instances during deploy.
- Unbounded result sets with no pagination.
- Over-normalizing hot paths, or over-indexing write-heavy tables.

**Future Improvements**
- Introduce sharding or Citus-style horizontal partitioning when a single primary saturates.
- Adopt CDC (change data capture) to feed search, cache, and analytics.
- Add automated index advisors and query-plan regression detection.

---

## 2. Authentication Architecture

**Purpose**
Verify the identity of users, services, and machines reliably, without exposing credentials or creating session-hijack risk.

**Components**
- Identity provider / auth service (self-hosted or managed, e.g., OIDC-compliant).
- Token issuer producing short-lived access tokens (JWT) and rotating refresh tokens.
- Credential store with strong password hashing (Argon2id/bcrypt).
- MFA/TOTP and WebAuthn/passkey support.
- Social/enterprise SSO federation (OIDC, SAML).

**Architecture**
- OIDC authorization-code flow with PKCE for user login; short-lived access tokens (5–15 min) + refresh-token rotation with reuse detection.
- Machine-to-machine uses client-credentials grant or signed service identities (mTLS/workload identity).
- Sessions are stateless (signed JWT) with a server-side revocation list for logout/compromise, or stateful sessions in a fast store when instant revocation is mandatory.

**Best Practices**
- Never store plaintext or reversibly-encrypted passwords; always salt+hash with a slow KDF.
- Rotate and scope tokens narrowly; keep access tokens short-lived.
- Enforce MFA for privileged accounts; prefer passkeys over SMS.
- Store tokens in httpOnly, Secure, SameSite cookies for browser clients.

**Common Mistakes**
- Long-lived access tokens with no revocation path.
- Putting sensitive claims or PII inside JWTs.
- Rolling custom crypto instead of vetted libraries/providers.
- Not detecting refresh-token reuse (replay).

**Future Improvements**
- Move fully to passwordless/passkey-first authentication.
- Adopt continuous/adaptive auth based on device and risk signals.
- Workload identity federation to eliminate long-lived service secrets.

---

## 3. Authorization

**Purpose**
Decide what an authenticated principal is allowed to do, consistently across every entry point, enforcing least privilege and tenant boundaries.

**Components**
- Policy model: RBAC for coarse roles, ABAC/ReBAC for fine-grained and relationship-based rules.
- Central policy engine / decision point (e.g., OPA, Cedar, or a relationship service like Zanzibar-style).
- Permission catalog and role definitions.
- Enforcement middleware at API and service boundaries.

**Architecture**
- Policy Decision Point (PDP) evaluates requests; Policy Enforcement Points (PEP) sit in API middleware and, where possible, the data layer (RLS).
- Combine RBAC (role → permission set) with resource-level checks (ownership, tenant, sharing relationships).
- Deny-by-default: absence of an explicit grant means no access.

**Best Practices**
- Enforce authorization server-side on every request; never trust client-provided roles.
- Centralize policy logic; avoid scattering `if role == admin` across the codebase.
- Log every allow/deny decision for audit.
- Check authorization at the object level, not just the route level (prevents IDOR/BOLA).

**Common Mistakes**
- Object-level authorization gaps (fetching by ID without ownership check).
- Confusing authentication with authorization.
- Over-broad roles that accumulate privilege over time.
- Client-enforced permissions with no server backstop.

**Future Improvements**
- Adopt fine-grained ReBAC for complex sharing graphs.
- Policy-as-code with automated policy testing in CI.
- Just-in-time elevation and time-boxed privileged access.

---

## 4. Backend Architecture

**Purpose**
Structure server-side business logic for maintainability, testability, and independent scaling of workloads.

**Components**
- Application services (modular monolith or microservices).
- Domain/business-logic layer separated from transport and persistence.
- Async workers / job runners for background processing.
- Service-to-service communication (sync RPC/HTTP, async messaging).
- Shared libraries for cross-cutting concerns (auth, logging, config).

**Architecture**
- Default to a modular monolith with clear bounded contexts (hexagonal/clean layering: transport → application → domain → infrastructure). Extract services only when scaling or team boundaries demand it.
- Stateless application instances behind a load balancer; all state in databases/caches/queues.
- Long-running or spiky work offloaded to async workers via a queue.

**Best Practices**
- Keep services stateless and horizontally scalable.
- Separate domain logic from frameworks so it is unit-testable in isolation.
- Use dependency injection and explicit interfaces for infrastructure.
- Design for idempotency in all handlers and jobs.

**Common Mistakes**
- Premature microservices creating a distributed monolith.
- Business logic embedded in controllers or ORM models.
- Shared mutable in-memory state that breaks under horizontal scaling.
- Synchronous chains that fail as a unit and amplify latency.

**Future Improvements**
- Extract high-load bounded contexts into independent services with their own datastores.
- Introduce a service mesh for traffic management and observability.
- Adopt event-driven choreography to reduce synchronous coupling.

---

## 5. API Architecture

**Purpose**
Expose backend capabilities through a stable, versioned, well-documented contract for internal and external consumers.

**Components**
- API gateway (routing, rate limiting, auth offload).
- REST and/or GraphQL surface; gRPC for internal high-throughput calls.
- Schema/contract definitions (OpenAPI, GraphQL SDL, protobuf).
- Versioning and deprecation policy.
- Rate limiter and quota manager.

**Architecture**
- Gateway terminates TLS, authenticates, applies rate limits, and routes to services. Public API is REST/GraphQL; internal is gRPC where latency matters.
- Contract-first: schema is the source of truth, generating clients and validation.
- Versioning via URI (`/v1`) or header negotiation; breaking changes ship as new versions with a deprecation window.

**Best Practices**
- Consistent resource naming, pagination, filtering, and error envelopes across all endpoints.
- Idempotency keys for unsafe operations (POST) to make retries safe.
- Enforce request/response validation against the schema at the boundary.
- Return correct HTTP semantics and structured, machine-readable errors.

**Common Mistakes**
- Breaking changes without versioning or deprecation notice.
- Inconsistent pagination/error shapes across endpoints.
- Chatty APIs forcing N+1 client round-trips.
- Exposing internal DB structure directly as the API contract.

**Future Improvements**
- Publish a developer portal with self-service keys and generated SDKs.
- Adopt GraphQL federation or BFF layers for diverse clients.
- Add API analytics and per-consumer usage insights.

---

## 6. AI Architecture

**Purpose**
Provide a safe, cost-controlled, observable layer for integrating AI/ML and LLM capabilities into the product.

**Components**
- Model gateway/abstraction over providers (hosted LLMs, self-hosted models).
- Prompt/template management and versioning.
- Vector store for embeddings and retrieval (RAG).
- Guardrails: input/output filtering, PII redaction, moderation.
- Evaluation harness and feedback capture.

**Architecture**
- A provider-agnostic gateway routes requests, handles retries/fallbacks, and enforces token/cost budgets. Retrieval-augmented generation grounds responses in tenant-scoped data via a vector index.
- Async pipelines handle embedding generation and batch inference; synchronous paths serve interactive requests with streaming.
- Guardrails wrap every call: validate inputs, redact sensitive data, moderate and validate outputs before returning them.

**Best Practices**
- Abstract providers so models can be swapped without app changes.
- Version prompts and evaluate changes against a fixed test set before release.
- Enforce strict tenant isolation on embeddings and retrieved context.
- Cache deterministic results; set token/cost budgets and timeouts.

**Common Mistakes**
- Trusting model output without validation or grounding (hallucination risk).
- Leaking one tenant's data into another's retrieval context.
- No cost controls, leading to runaway spend.
- Hard-coding a single provider with no fallback.

**Future Improvements**
- Add automated eval/regression gates in CI for prompts and models.
- Introduce fine-tuning or adapters on proprietary data.
- Multi-model routing by cost/quality; on-device or edge inference for latency.

---

## 7. Storage Architecture

**Purpose**
Store and serve unstructured and binary assets (files, media, exports) durably and efficiently, separate from the transactional database.

**Components**
- Object storage (S3-compatible) as the durable backend.
- CDN for edge delivery of public/cacheable assets.
- Signed-URL service for direct, time-limited client access.
- Media processing pipeline (transcode, resize, virus scan).

**Architecture**
- Blobs live in object storage; the database stores only metadata and references. Clients upload/download directly via pre-signed URLs to avoid proxying through app servers.
- Uploads trigger async processing (validation, scanning, thumbnailing) via events. Public assets are fronted by a CDN; private assets require signed, expiring URLs.
- Lifecycle policies tier or expire stale objects automatically.

**Best Practices**
- Never proxy large files through application servers; use direct + signed URLs.
- Encrypt at rest and in transit; scope access per tenant/object.
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

*End of Technical Engine output (Module 3 of 4). All 20 sections present, in locked order, domain-agnostic and self-contained. Ready for consumption by the Production Engine stage and hand-off to solution-architect-app as the standardized technical-pattern baseline.*

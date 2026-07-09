# Global Standards

These documents apply to **every** SaaS product in this portfolio. A
product spec (`products/<name>/docs/`) never redefines these rules — it
only adds product-specific identity, features, and business detail on top.
If a product genuinely needs to deviate, the deviation is called out
explicitly in that product's `ARCHITECTURE.md` under "Deviations from
global standards," not silently done differently.

Authority order: [`MASTER_PROJECT_CONTEXT.md`](../MASTER_PROJECT_CONTEXT.md)
→ these standards → [frameworks](../frameworks/README.md) → individual
product specs.

**Standards vs frameworks:** `standards/` defines **how** to build well
(the binding engineering, security, and design rules).
[`frameworks/`](../frameworks/README.md) — the Common SaaS Foundation —
defines **what** every product contains and the business work around it.
Where they overlap (security, technical foundation), these standards are
authoritative and the framework is a checklist/lens over them.

| Standard | Covers |
|---|---|
| [`engineering.md`](./engineering.md) | TypeScript, React/Next.js, backend, naming, folder structure, logging, validation, error handling, code quality, refactoring |
| [`design-system.md`](./design-system.md) | Design tokens (color/type/spacing/radius/motion), component library, accessibility, responsive design, dark/light mode, loading/empty/error states |
| [`security.md`](./security.md) | Authentication, authorization/RBAC, secrets, rate limiting, CSRF/XSS/SQLi, CSP, secure headers, audit logs, encryption, backups |
| [`ai.md`](./ai.md) | Provider abstraction, model routing, prompts, retries/fallbacks, streaming, token/cost management, caching, hallucination controls, structured output |
| [`database.md`](./database.md) | Naming, timestamps, soft delete/auditing, migrations, constraints, indexes, multi-tenancy |
| [`api.md`](./api.md) | REST conventions, error format, pagination, filtering, auth, validation, versioning, idempotency, documentation |
| [`testing.md`](./testing.md) | Test pyramid, coverage rules, test quality, CI requirements |
| [`devops.md`](./devops.md) | Environments, git workflow, deployment flow, releases, monitoring, backups/rollback, performance budgets |
| [`documentation.md`](./documentation.md) | Required docs per product, writing standards, ADRs, keeping docs current |

## How a new product uses these

1. Copy `templates/product-scaffold/` to `products/<name>/`.
2. Fill in the product's own identity docs (name, problem, target
   customer, features, pricing, brand) — everything else is inherited from
   this directory by default.
3. Build Phase 1 per `MASTER_PROJECT_CONTEXT.md`: complete architecture,
   no required external credentials, integrations wired but disabled.
4. When credentials arrive, execute Phase 2 against these same standards
   (nothing architectural should need to change — only configuration).

## Changing a global standard

A change here affects every current and future product. Treat edits to
this directory with the same care as a breaking API change: state what's
changing and why, and check whether any existing product needs a follow-up
change to stay compliant.

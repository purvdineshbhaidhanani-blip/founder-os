# 14 · Compliance Framework

**Type:** Shared blueprint. Every product is built **compliance-ready** —
architected so that formal certification is a matter of process and
evidence, not a re-architecture. The technical controls are authoritative
in [`standards/security.md`](../standards/security.md); this framework maps
those controls to the compliance obligations they satisfy.

Phase 1 builds the controls. Formal certification/attestation (which
requires real infrastructure, auditors, and time in production) is a
business activity for later — but nothing in Phase 1 should make it
harder.

## Standard obligations & how they're met

| Obligation | What it requires | Where it's satisfied |
|---|---|---|
| **GDPR / privacy** | Lawful basis, data minimization, right to access/erasure/portability, breach notification, data-processing records | Soft-delete + documented hard-delete/anonymization for erasure (`standards/database.md`); export for portability ([`11`](./11-reporting.md), [`12`](./12-integrations.md)); PII redaction in logs (`standards/engineering.md`) |
| **SOC 2 (readiness)** | Security, availability, confidentiality controls with evidence: access control, change management, monitoring, incident response | RBAC ([`09`](./09-roles-permissions.md)); audit logs; CI/change-management (`standards/devops.md`); monitoring/alerting (`standards/devops.md`) |
| **ISO 27001 (readiness)** | An information security management system: risk assessment, documented controls, continual review | This standards + frameworks corpus *is* the documented control set; `PLATFORM_AUDIT.md` is the recurring risk review |
| **Audit logs** | Tamper-evident record of security-relevant events | Append-only audit log ([`07`](./07-admin-panel-framework.md), `standards/security.md`) |
| **Encryption** | In transit and at rest for sensitive data | TLS/HSTS everywhere; at-rest encryption for sensitive fields (`standards/security.md`) |
| **RBAC / access control** | Least-privilege, enforced, reviewable access | Role model + centralized policy layer ([`09`](./09-roles-permissions.md)) |

## Rules

- **Data map exists.** Each product documents what personal/sensitive data
  it stores, where, why, and for how long (retention) — the prerequisite
  for every privacy obligation.
- **Erasure is real.** Soft delete alone does not satisfy right-to-erasure;
  a documented hard-delete/anonymization procedure exists per product
  (`standards/database.md`).
- **Consent & disclosure.** Where required, consent is captured and
  versioned; privacy policy and terms are linked from auth flows.
- **Data residency** is configurable in the settings module
  ([`07`](./07-admin-panel-framework.md)) for products targeting regulated
  or non-US markets.
- **Sub-processors tracked.** Every third-party integration
  ([`12`](./12-integrations.md)) that touches customer data is recorded so
  a sub-processor list can be produced on demand.

## Validation checklist

- [ ] Data map (what/where/why/retention) documented for the product.
- [ ] Erasure and portability procedures exist and are tested.
- [ ] Audit logging covers all security-relevant events.
- [ ] Encryption in transit and at rest for sensitive data.
- [ ] RBAC enforced and reviewable.
- [ ] Sub-processor list derivable from the integration registry.

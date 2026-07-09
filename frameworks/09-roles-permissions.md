# 09 · Roles & Permissions Framework

**Type:** Shared blueprint. The standard role model every product starts
from. Enforcement rules (server-side checks, tenant scoping, centralized
policy functions) are authoritative in
[`standards/security.md`](../standards/security.md); this framework defines
the standard **roles and the permission matrix** so authorization is
consistent across the portfolio.

## Standard roles

Every product ships with these five roles unless its spec justifies a
different model in an ADR:

| Role | Scope | Typical capabilities |
|---|---|---|
| **Super Admin** | Platform-wide (the operator of the SaaS itself) | Everything, across all tenants. Cross-tenant access is always audited. Not assignable to customers. |
| **Admin** | A single organization/tenant | Full control of their org: members, roles, billing, integrations, settings, all data. |
| **Manager** | A team or scope within an org | Manage their team's members and data; no billing or org-wide settings. |
| **Member** | Individual contributor | Create and manage their own work and shared data per grants; no user/role management. |
| **Viewer** | Read-only | See permitted data and reports; no create/edit/delete; no settings. |

Products may add domain-specific roles, but map every one onto this
hierarchy so shared components (admin panel, invitations) behave
predictably.

## Permission model (RBAC)

- Permissions are expressed as `action` on `resource`
  (`invoice:create`, `member:remove`, `report:export`), grouped into
  roles — not scattered as inline role-name checks.
- Authorization is centralized in a policy layer
  (`can(user, action, resource)` per `standards/engineering.md`) so the
  full rule set is auditable in one place.
- Checks run **server-side on every request**. Hidden UI is UX, not
  security — a Viewer who forges a request still cannot write.
- **Tenant isolation is part of every check.** `can()` verifies not just
  the role's action but that the resource belongs to the actor's tenant.

## Reference permission matrix

A starting matrix every product refines (✓ = allowed):

| Capability | Super Admin | Admin | Manager | Member | Viewer |
|---|:--:|:--:|:--:|:--:|:--:|
| View permitted data | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create / edit own data | ✓ | ✓ | ✓ | ✓ | — |
| Manage team members | ✓ | ✓ | ✓ | — | — |
| Manage org members & roles | ✓ | ✓ | — | — | — |
| Billing & plan | ✓ | ✓ | — | — | — |
| Integrations & API keys | ✓ | ✓ | — | — | — |
| Org settings | ✓ | ✓ | — | — | — |
| View audit log | ✓ | ✓ | — | — | — |
| Cross-tenant / platform ops | ✓ | — | — | — | — |

## Validation checklist

- [ ] All five standard roles present; any custom role maps onto them.
- [ ] Permissions defined as action-on-resource, not role-name checks.
- [ ] `can(user, action, resource)` is the single enforcement point.
- [ ] Every check is server-side and includes tenant scoping.
- [ ] Super Admin cross-tenant access is audited.
- [ ] The product's matrix is documented and tested per role
      (`standards/testing.md`).

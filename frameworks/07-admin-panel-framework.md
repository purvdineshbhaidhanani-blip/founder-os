# 07 · Admin Panel Framework

**Type:** Shared blueprint. Every product ships an admin panel with these
standard modules. Auth/RBAC/audit rules come from
[`standards/security.md`](../standards/security.md); this framework defines
the standard **modules** so every product's admin surface is complete and
consistent.

The admin panel is where account owners and operators manage the account
itself — distinct from the end-user dashboard. It is role-gated
(`Admin`+ per [`09`](./09-roles-permissions.md)) and every mutating action
in it is written to the audit log.

## Standard modules

| Module | Responsibility |
|---|---|
| **Users** | List, invite, deactivate, and manage members; view last-active, status, role. Impersonation (if offered) is audit-logged and consent-gated. |
| **Organizations** | For multi-tenant products: manage the org/workspace — name, slug, plan, ownership transfer. |
| **Teams** | Sub-groupings within an org; membership and team-scoped access. |
| **Roles** | View and assign the standard roles ([`09`](./09-roles-permissions.md)); manage any product-specific roles. |
| **Permissions** | Inspect what each role can do; manage custom permission grants where the product supports them. |
| **Billing** | Plan, seats, usage vs. limits, invoices, payment method. Built and wired to the pricing framework ([`13`](./13-pricing.md)); **disabled until Phase 2 payment credentials** — shows a clear "billing not configured" state, never crashes. |
| **Integrations** | Connect/disconnect third-party services, manage API keys and webhooks ([`12`](./12-integrations.md)). Each integration disabled until its credentials exist. |
| **Audit Logs** | Read-only, filterable view of security-relevant events (`standards/security.md`) — who did what, when, from where. Not editable from the UI. |
| **Settings** | Account-level configuration: branding, defaults, data residency/retention, feature flags the admin controls. |
| **Notifications** | Configure which events notify whom, over which channels ([`10`](./10-notifications.md)). |

## Rules

- **Role-gated end to end.** Access to the admin panel and to each module
  is enforced server-side, not by hiding UI. A `Member` cannot reach admin
  routes by typing the URL.
- **Every mutation is audited.** Creating/changing/removing users, roles,
  permissions, billing, and integrations all write to the audit log with
  actor, action, target, timestamp.
- **Tenant-scoped.** In multi-tenant products, an org admin manages only
  their own org — never another tenant's data. Cross-tenant visibility is
  reserved for a platform `Super Admin` and is itself audited.
- **Destructive actions confirm.** Deactivating a user, transferring
  ownership, deleting data — all require explicit confirmation and are
  reversible or soft-deleted where possible (`standards/database.md`).

## Validation checklist

- [ ] All ten standard modules present (or explicitly N/A with reason).
- [ ] Every admin route enforced server-side by role.
- [ ] Every mutating admin action writes an audit entry.
- [ ] Billing + integrations render a clean disabled state without
      credentials (Phase 1), not an error.
- [ ] Admin actions are tenant-scoped; cross-tenant is Super-Admin-only.

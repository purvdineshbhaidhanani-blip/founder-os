# 08 · User Management Framework

**Type:** Shared blueprint. The standard identity and account flows every
product implements. Security mechanics (hashing, sessions, MFA, lockout)
are specified and authoritative in
[`standards/security.md`](../standards/security.md); this framework defines
the standard **flows and screens** so every product's account experience
is complete and consistent.

## Standard flows

| Flow | Requirements |
|---|---|
| **Signup** | Email + password (validated per `standards/engineering.md`), or social sign-in where enabled. Clear errors, no leaking whether an email is already registered beyond what's necessary. Email verification built and wired; the sending step is disabled until Phase 2 email credentials. |
| **Login** | Email/password + optional social. Rate-limited and lockout-protected per `standards/security.md`. Generic failure message (never "wrong password" vs "no such user"). |
| **Forgot / Reset Password** | Token-based reset with expiring, single-use tokens. Reset invalidates existing sessions. Email delivery disabled until Phase 2 creds — flow is complete, the send is the only gap. |
| **Profile** | View/edit name, avatar, email (with re-verification), locale/timezone, theme preference. |
| **Team Invitations** | Invite by email with a pre-assigned role ([`09`](./09-roles-permissions.md)); expiring invite tokens; accept flow that provisions the member into the correct org/team. |
| **Session Management** | List active sessions/devices, revoke individually or all; sessions revoked on logout, password change, and role downgrade. |
| **MFA-Ready** | TOTP enrollment/verification designed into the schema and flows from day one so it can be enabled without a migration. Recovery codes generated at enrollment. |

## Rules

- **Social login is built but fails closed.** OAuth buttons can be present;
  with no provider credentials the flow returns a clean "not configured"
  state and never breaks email/password login (`standards/security.md`).
- **Email/password is the always-available baseline.** No product depends
  on an external provider to let a user in during Phase 1.
- **Every account state change is secure and logged.** Password changes,
  email changes, MFA enrollment, and session revocations are audited.
- **Accessible auth.** Every auth screen is keyboard-navigable, labeled,
  and screen-reader-tested (`standards/design-system.md`) — these are the
  first screens every user meets.

## Phase 1 vs Phase 2

- **Phase 1:** all flows fully functional with local credentials; email
  sending and OAuth wired but disabled; MFA scaffolded and toggleable.
- **Phase 2:** real email provider and OAuth credentials configured;
  verification/reset emails actually send; MFA enabled; everything tested
  end to end.

## Validation checklist

- [ ] Signup, login, reset, profile, invitations, sessions all functional
      with local credentials in Phase 1.
- [ ] Login is rate-limited and lockout-protected; failures are generic.
- [ ] Password reset expires tokens and invalidates sessions.
- [ ] MFA is schema-ready without a future migration.
- [ ] Social login degrades cleanly when unconfigured.
- [ ] Every auth screen is accessible.

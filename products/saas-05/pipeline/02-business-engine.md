# Universal SaaS Business Engine

**SaaS:** Home Maintenance Contractor AI
**Layer:** Standardized business-rules baseline (domain-agnostic) — to be layered under the idea-specific System Architecture Document

> Scope note: This document defines how the business itself runs — pricing, billing, entitlements, roles, revenue and reporting. It deliberately contains no domain-specific logic (contractor scheduling, job dispatch, home-maintenance workflows) and no implementation-layer concerns (database, API, backend, security, testing, deployment). Those belong to downstream architects and the developer agent.

---

## 1. Pricing Strategy

### Purpose
Define how the product converts value into money: the plan structure, price points, packaging tiers and the logic that decides what a customer pays before any charge is ever attempted.

### Features
- Multiple named plan tiers (e.g., Free/Trial, Starter, Professional, Business, Enterprise).
- Monthly and annual billing intervals with an annual-commitment discount.
- Per-seat, flat-rate, usage-based, and hybrid pricing models selectable per plan.
- Currency and regional price-book support with per-market list prices.
- Promotional pricing: coupons, percentage/fixed discounts, time-boxed offers, referral credits.
- Add-ons and metered overage packages sold on top of a base plan.
- Custom/negotiated pricing container for Enterprise quotes.

### Business Rules
- Every account must map to exactly one active plan at any moment; no account exists without a plan (Free counts as a plan).
- Published list prices are versioned; changing a list price never silently re-prices existing subscribers — grandfathering is explicit.
- A discount cannot reduce an invoice below zero; excess becomes account credit, never a payout.
- Annual discount only applies while the annual commitment is active; downgrading to monthly forfeits the discounted rate at renewal.
- Only one primary plan per account; add-ons stack, base plans do not.
- Price changes take effect at the next billing boundary unless an explicit proration rule applies.

### User Flow
1. Prospect views the pricing page and compares tiers.
2. Selects a plan and billing interval.
3. Optionally applies a coupon or referral code (validated against active-promo rules).
4. System resolves final price from price-book + interval + discounts.
5. Confirmed price is passed to Subscription Rules to instantiate the subscription.

### Best Practices
- Anchor tiers around value metrics the customer already understands, not internal cost.
- Keep the number of visible tiers small (3–4) to reduce decision paralysis.
- Always show annual savings explicitly to steer toward longer commitments.
- Version and archive every price change for auditability and grandfathering.

### Common Mistakes
- Hard-coding prices in the product instead of a versioned price-book.
- Letting discounts stack without a cap, producing negative invoices.
- Re-pricing existing customers automatically when list prices change.
- Offering so many tiers/add-ons that buyers cannot self-select.

### Future Improvements
- Experimentation framework for A/B price testing per cohort.
- AI-assisted plan recommendation based on projected usage.
- Localized purchasing-power pricing per region.
- Dynamic packaging that bundles add-ons into suggested tiers automatically.

---

## 2. Subscription Rules

### Purpose
Govern the full lifecycle of a subscription — creation, trials, upgrades, downgrades, renewals, pauses and cancellations — and the state transitions between them.

### Features
- Free trials (time-based and/or usage-based) with or without a card on file.
- Upgrade/downgrade with proration handling.
- Auto-renewal with configurable renewal windows.
- Pause/resume and scheduled cancellation.
- Grace periods and dunning states for failed renewals.
- Plan-change scheduling effective at period boundaries.

### Business Rules
- A subscription is always in exactly one state: trialing, active, past_due, paused, canceled, or expired.
- Trials convert to paid automatically only if a valid payment method exists; otherwise they expire to Free or lock.
- Upgrades take effect immediately with proration; downgrades take effect at the next renewal to prevent value clawback.
- Cancellation stops future renewals but preserves access until the end of the paid period (no mid-period refund by default).
- A past_due subscription enters a defined grace period before downgrade/suspension; access rules during grace are explicit.
- Only one state transition may be in flight at a time; conflicting requests are rejected, not queued silently.

### User Flow
1. User starts a trial or subscribes to a paid plan.
2. System sets the subscription state and entitlement window.
3. User requests a change (upgrade/downgrade/pause/cancel).
4. System validates the transition against current state and applies proration/scheduling.
5. At the renewal boundary, the system attempts renewal and transitions state based on payment outcome.

### Best Practices
- Make cancellation self-serve and low-friction while capturing a reason.
- Default downgrades to period-end to avoid disputes over lost value.
- Communicate every state change and upcoming renewal in advance.
- Keep a clean, auditable state machine with explicit allowed transitions.

### Common Mistakes
- Immediate downgrade that strips paid-for access mid-period.
- Silent auto-renew with no advance notice, driving chargebacks.
- Ambiguous trial-end behavior (lock vs. downgrade vs. charge).
- Allowing overlapping/duplicate subscriptions on one account.

### Future Improvements
- Win-back offers presented in the cancellation flow.
- Predictive churn scoring to trigger retention actions before renewal.
- Flexible pause tiers (partial-access pause vs. full freeze).
- Self-serve plan-change simulator showing proration preview.

---

## 3. Payment System

### Purpose
Handle the mechanics of collecting money: payment methods, charging, invoicing, retries, refunds and credits — the money-movement layer of the business.

### Features
- Multiple payment methods per account (card, bank/ACH, wallet) with one default.
- One-time and recurring charges.
- Automated invoicing and receipts.
- Dunning: automatic retry schedule for failed payments.
- Refunds (full/partial) and account credits.
- Tax and surcharge calculation hooks at invoice time.
- Payment provider abstraction (provider-agnostic).

### Business Rules
- No charge occurs without an authorized payment method and a corresponding invoice line.
- Every charge, refund and credit produces an immutable ledger entry.
- Failed charges follow a fixed retry cadence; after the final retry the subscription moves to past_due (owned by Subscription Rules).
- Refunds can never exceed the originally captured amount for that transaction.
- Credits apply before new charges on the next invoice and never convert to cash.
- Currency of an invoice is fixed at issuance and cannot change retroactively.

### User Flow
1. User adds/updates a payment method and sets a default.
2. At a billing event, the system generates an invoice with applicable tax.
3. System charges the default method.
4. On success, a receipt is issued; on failure, dunning retries begin.
5. Refunds/credits, when authorized, post as new ledger entries against the original invoice.

### Best Practices
- Keep an immutable financial ledger as the single source of truth.
- Use smart retry timing (spread over days) to recover soft declines.
- Always issue itemized invoices and receipts automatically.
- Abstract the payment provider so it can be swapped without business-logic changes.

### Common Mistakes
- Treating provider webhooks as the source of truth instead of an internal ledger.
- Retrying failed charges too aggressively, triggering fraud flags.
- Allowing refunds larger than the captured amount.
- Mixing currencies on a single invoice.

### Future Improvements
- Machine-learned optimal retry timing per card issuer.
- Multi-provider routing/failover for higher authorization rates.
- Automated tax-compliance updates by jurisdiction.
- In-app payment-health dashboard for finance owners.

---

## 4. Usage Limits

### Purpose
Enforce what each plan is entitled to: quotas, rate limits, feature gates and metering that translate the plan a customer bought into concrete allowances.

### Features
- Quotas per value metric (seats, projects, actions, storage, API calls).
- Feature flags/entitlements per tier.
- Soft limits (warn/allow) vs. hard limits (block).
- Metered usage tracking with overage accrual.
- Reset cadence aligned to billing period.
- Real-time entitlement checks before gated actions.

### Business Rules
- Every gated action checks entitlement before executing; no action bypasses the limit check.
- Hard limits block; soft limits warn and optionally accrue overage per Pricing Strategy.
- Usage counters reset at the billing-period boundary, not at arbitrary calendar dates.
- Downgrades that put usage above the new plan's quota trigger a defined remediation state (read-only/over-limit), never silent data loss.
- Entitlements are derived from the active plan + add-ons only; no ad-hoc grants outside that model.

### User Flow
1. User attempts a gated action.
2. System resolves current entitlement from plan + add-ons.
3. Usage is checked against quota.
4. Under limit: action proceeds and the counter increments. At soft limit: proceed with warning/overage. At hard limit: block with an upgrade prompt.
5. At period boundary, counters reset and overage is handed to billing.

### Best Practices
- Warn early (e.g., 80%/100%) before hard-blocking to preserve trust.
- Keep entitlement resolution centralized and consistent across the product.
- Make the upgrade path from a limit block one click away.
- Meter idempotently so retries don't double-count usage.

### Common Mistakes
- Enforcing limits inconsistently across different entry points.
- Silent data deletion on downgrade instead of a read-only state.
- Counter resets misaligned with the billing period.
- No pre-limit warnings, causing surprise blocks.

### Future Improvements
- Predictive quota alerts based on usage velocity.
- Self-serve overage packs purchasable at the moment of block.
- Granular per-feature metering dashboards for admins.
- Auto-upgrade suggestions when usage consistently nears the cap.

---

## 5. Revenue Model

### Purpose
Define how the business recognizes, tracks and grows revenue: the streams, recurring-revenue mechanics and monetization levers, distinct from raw payment mechanics.

### Features
- Recurring revenue streams (subscriptions) and non-recurring (one-time, services).
- Expansion revenue via upsells, add-ons and seat growth.
- MRR/ARR tracking with movement categorization (new, expansion, contraction, churn).
- Referral, affiliate and partner-revenue channels.
- Deferred vs. recognized revenue distinction.
- Credit and refund impact on recognized revenue.

### Business Rules
- Recurring revenue is recognized over the service period, not at charge time (deferred until earned).
- Every revenue movement is categorized (new/expansion/contraction/churn) exactly once.
- Refunds and credits reduce recognized revenue in the period they occur.
- One-time revenue is recognized when the obligation is fulfilled, separate from subscription revenue.
- Revenue metrics are derived from the financial ledger, never entered manually.

### User Flow
1. A billing event (new sub, upgrade, add-on, cancellation) occurs.
2. System classifies its revenue impact (new/expansion/contraction/churn).
3. Recurring amounts are deferred and recognized across the period.
4. Metrics (MRR/ARR and movements) update from ledger-derived data.
5. Finance owners review revenue movement in Business Reports.

### Best Practices
- Separate cash collected from revenue recognized to avoid overstating growth.
- Categorize every MRR movement so churn and expansion are visible.
- Tie all revenue figures back to immutable ledger entries.
- Track expansion revenue as a first-class growth lever, not an afterthought.

### Common Mistakes
- Recognizing annual prepayments as revenue immediately.
- Conflating cash flow with recognized revenue.
- Not isolating expansion vs. new revenue, hiding true growth drivers.
- Ignoring refund/credit impact on reported MRR.

### Future Improvements
- Automated revenue-recognition schedules by contract type.
- Cohort-based LTV and payback-period modeling.
- Scenario forecasting for pricing/packaging changes.
- Partner-revenue attribution and settlement automation.

---

## 6. User Roles

### Purpose
Define the account-level identity and permission model: who can do what within a subscribing account, independent of any domain-specific persona.

### Features
- Predefined roles (Owner, Admin, Member, Billing, Viewer) plus optional custom roles.
- Permission sets mapping roles to allowed actions.
- Role assignment and revocation by authorized roles.
- Single Owner per account with transfer capability.
- Invitation-based membership with pending/accepted states.

### Business Rules
- Every account has exactly one Owner at all times; ownership can be transferred but never left empty.
- Billing-sensitive actions (plan change, payment methods) are restricted to Owner/Billing roles.
- A user cannot elevate their own privileges; role changes require an equal-or-higher role.
- Removing a user immediately revokes all their entitlements within that account.
- Roles are account-scoped; the same user may hold different roles in different accounts.

### User Flow
1. Owner/Admin invites a user and assigns a role.
2. Invitee accepts and is bound to the account with that role's permissions.
3. Each action is authorized against the user's role permission set.
4. Admins adjust roles as responsibilities change.
5. On removal, access and entitlements are revoked immediately.

### Best Practices
- Follow least-privilege: default new members to the lowest useful role.
- Keep a clear, documented role-to-permission matrix.
- Require ownership transfer before an Owner can leave.
- Log all role changes for accountability.

### Common Mistakes
- Allowing multiple or zero Owners on an account.
- Letting non-billing roles alter payment/plan settings.
- Self-service privilege escalation.
- Orphaned access after a member is "removed" in name only.

### Future Improvements
- Fully custom role builder with granular permissions.
- Time-boxed/just-in-time elevated access.
- Approval workflows for sensitive role changes.
- Role templates by organization size.

---

## 7. Team & Workspace

### Purpose
Define the container model that groups users, entitlements and data — how workspaces/teams are created, structured and isolated at the business level.

### Features
- Workspace/team creation under an account.
- Membership management within a workspace.
- Per-workspace plan/entitlement association (or shared account-level plan).
- Data and access isolation between workspaces.
- Workspace-level settings and defaults.
- Multi-workspace accounts for larger customers.

### Business Rules
- Every user acts within the context of exactly one workspace at a time.
- Entitlements and usage limits are enforced at the workspace or account scope as defined by the plan — never ambiguously.
- Data in one workspace is isolated from other workspaces unless explicitly shared.
- Deleting a workspace follows a defined retention/grace policy before irreversible removal.
- A workspace always belongs to exactly one billing account.

### User Flow
1. Owner/Admin creates a workspace under the account.
2. Members are invited into the workspace with roles.
3. Users operate within the workspace's isolated context.
4. Admins configure workspace settings and defaults.
5. Workspaces can be archived/deleted per the retention policy.

### Best Practices
- Make workspace boundaries and isolation explicit to users.
- Define clearly whether limits are account-wide or per-workspace.
- Provide a grace/restore window before permanent workspace deletion.
- Keep workspace switching frictionless for multi-workspace users.

### Common Mistakes
- Blurring data isolation between workspaces.
- Ambiguity over whether quotas are shared or per-workspace.
- Irreversible workspace deletion with no grace period.
- Tying a workspace to more than one billing account.

### Future Improvements
- Cross-workspace sharing and federation controls.
- Workspace-level usage analytics and cost allocation.
- Hierarchical org > workspace > team structures.
- Bulk workspace provisioning for enterprise onboarding.

---

## 8. Integrations

### Purpose
Define how the business connects to external systems as a commercial capability — which integrations are gated to which plans and how connections are governed, not how they are technically built.

### Features
- Catalog of available integrations with per-plan gating.
- Connection lifecycle (connect, authorize, disconnect).
- Per-integration configuration and scopes.
- Integration-level usage/quota where applicable.
- Marketplace/partner integration listings.

### Business Rules
- Integration availability is gated by plan entitlement; premium integrations require the appropriate tier.
- A connection is bound to a workspace/account, not to an individual user, so it survives member changes.
- Disconnecting an integration revokes its access immediately and stops associated data flow.
- Integration usage that consumes metered resources counts against the relevant quota.
- Connections require explicit authorization; no integration activates silently.

### User Flow
1. Admin browses the integration catalog (filtered by plan entitlement).
2. Selects and authorizes a connection.
3. Configures scope/settings for the workspace.
4. Integration operates within its granted scope and quota.
5. Admin can disconnect, immediately revoking access.

### Best Practices
- Gate integrations by value tier to strengthen upgrade incentives.
- Bind connections to the account/workspace to avoid breakage when members leave.
- Surface integration status and last-sync health to admins.
- Require explicit, scoped authorization for every connection.

### Common Mistakes
- Binding integrations to a personal user who later departs.
- Offering premium integrations without plan gating, eroding tier value.
- Leaving disconnected integrations with lingering access.
- No visibility into integration health or quota consumption.

### Future Improvements
- Self-serve partner marketplace with revenue share.
- Granular per-integration permission scoping.
- Integration usage analytics tied to Business Reports.
- Templated multi-integration setup bundles.

---

## 9. Notifications

### Purpose
Define the business-critical communication layer: how the system informs users of billing, lifecycle, limit and account events — the messaging that keeps the business relationship transparent.

### Features
- Multi-channel delivery (in-app, email, and optional SMS/push/webhook).
- Event-triggered notifications (trial ending, payment failed, limit reached, renewal upcoming).
- User and admin notification preferences.
- Transactional vs. marketing separation.
- Digest/batching options to reduce noise.
- Delivery status tracking.

### Business Rules
- Business-critical notifications (payment failure, trial end, security-relevant account changes) are transactional and cannot be unsubscribed from.
- Marketing notifications require opt-in/opt-out honoring consent.
- Every billing/lifecycle state change emits a corresponding notification.
- Notifications reflect the actual system state at send time; stale/contradictory notices are prevented.
- Delivery is attempted with retry on transient failure and logged.

### User Flow
1. A business event occurs (e.g., payment failed, quota reached).
2. System resolves recipients and their channel preferences.
3. The appropriate transactional or marketing notification is composed.
4. It is delivered across enabled channels and status is recorded.
5. Users manage preferences for non-critical categories.

### Best Practices
- Never let users opt out of critical billing/security notices.
- Batch low-priority notifications into digests to avoid fatigue.
- Keep transactional and marketing streams and consent strictly separate.
- Make every notification actionable with a clear next step.

### Common Mistakes
- Allowing opt-out of payment-failure or security notices.
- Notification overload driving users to mute everything.
- Sending stale notifications that contradict current state.
- Mixing marketing into transactional channels, risking compliance.

### Future Improvements
- Preference center with per-event, per-channel granularity.
- Intelligent send-time and channel optimization.
- Localization and timezone-aware delivery.
- Escalation chains for unacknowledged critical alerts.

---

## 10. Business Reports

### Purpose
Provide the reporting and analytics layer that turns business activity into decision-ready insight: revenue, usage, retention and account health surfaced to the right roles.

### Features
- Financial dashboards (MRR/ARR, revenue movements, collections).
- Subscription analytics (trials, conversions, churn, upgrades).
- Usage and adoption reports per plan/workspace.
- Role-scoped report access.
- Exportable reports and scheduled delivery.
- Date-range and cohort filtering.

### Business Rules
- All reported figures derive from the immutable financial ledger and usage records — no manually keyed numbers.
- Report access is role-scoped; financial reports are restricted to Owner/Billing/Admin roles.
- Reports reflect a defined, consistent point-in-time snapshot; the calculation basis for each metric is documented.
- Exports respect the same access controls as in-app views.
- Metric definitions (e.g., churn, MRR) are fixed and consistent across every report.

### User Flow
1. An authorized user opens the reports area.
2. Selects a report, date range and cohort filters.
3. System computes metrics from ledger and usage data.
4. User reviews dashboards and drills into movements.
5. User exports or schedules recurring delivery of the report.

### Best Practices
- Use single, documented definitions for each metric to prevent conflicting numbers.
- Restrict financial reporting to appropriate roles.
- Always source reports from immutable underlying records.
- Offer cohort and time-range slicing for meaningful trend analysis.

### Common Mistakes
- Multiple conflicting definitions of the same metric (e.g., churn).
- Exposing financial data to under-privileged roles.
- Reports computed from mutable or cached data that drifts from truth.
- Numbers that can't be traced back to source ledger entries.

### Future Improvements
- Custom report builder with saved views.
- Anomaly detection and automated insight callouts.
- Benchmarking against anonymized cohort norms.
- Real-time streaming dashboards with alert thresholds.

---

*End of Universal SaaS Business Engine. Hand-off: this standardized business-rules baseline is delivered to solution-architect-app to be layered under the idea-specific System Architecture Document for Home Maintenance Contractor AI. Domain-specific business logic and all implementation-layer concerns (database, API, backend, security, testing, deployment) remain owned by the respective downstream architects and agents.*

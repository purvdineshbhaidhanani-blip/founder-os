# Universal SaaS Business Engine

**SaaS Name:** Universal SaaS Test
**Pipeline Stage:** Module 2 of 4 — Business Engine
**Document Type:** Standardized Business-Rules Baseline (domain-agnostic)

> This document defines *how the business itself runs*, not how the product looks or what its domain-specific logic does. All 10 sections appear in the locked order. Each section carries Purpose, Features, Business Rules, User Flow, Best Practices, Common Mistakes, and Future Improvements. Domain-specific business logic, database, API, backend, security, testing, and deployment concerns are intentionally excluded and belong to downstream architects.

---

## 1. Pricing Strategy

### Purpose
Define how the SaaS packages, positions, and prices its value so that offers are legible to prospects, aligned to willingness-to-pay, and structurally able to expand revenue over a customer's lifetime.

### Features
- Tiered plan catalog (e.g., Free/Starter, Pro, Business, Enterprise) with clearly differentiated value.
- Multiple billing intervals (monthly, annual, multi-year) with configurable discounts for longer commitments.
- Plan feature matrix mapping capabilities and quotas to each tier.
- Support for flat-rate, per-seat, usage-based, and hybrid pricing models.
- Promotional constructs: coupons, percentage/fixed discounts, time-boxed offers, and introductory pricing.
- Currency and regional price-book support with per-market list prices.
- Custom/negotiated pricing path for enterprise deals.

### Business Rules
- Every active plan must have exactly one canonical list price per currency and interval.
- A customer may hold only one primary subscription plan at a time per workspace (add-ons excepted).
- Annual pricing must never exceed the equivalent monthly run-rate; discounts are enforced as a business invariant.
- Price changes apply to new subscriptions immediately and to existing subscriptions only at renewal, unless explicitly grandfathered.
- Grandfathered pricing persists until the customer changes plans or the grandfather policy is retired with notice.
- Discount stacking is disallowed by default; only one promotional discount applies per subscription unless a rule explicitly permits combination.

### User Flow
1. Prospect views the pricing page and compares tiers.
2. Prospect selects a plan and billing interval.
3. Optional discount/coupon is entered and validated.
4. Effective price is computed and presented for confirmation.
5. Prospect proceeds to checkout (handoff to Payment System).
6. Enterprise prospects instead enter a "contact sales" flow for custom pricing.

### Best Practices
- Anchor tiers around value metrics customers already understand, not internal cost.
- Keep the number of tiers small enough to decide quickly (typically 3–4 public tiers).
- Make annual commitment visibly cheaper to steer toward longer contracts.
- Always show the "most popular" or recommended tier to guide selection.
- Version price books so historical pricing is auditable.

### Common Mistakes
- Overloading tiers with too many differentiators, causing decision paralysis.
- Silently changing prices for existing customers without grandfathering or notice.
- Letting discounts stack unintentionally and eroding margin.
- Pricing on a metric customers cannot predict or control.
- Failing to define a clear enterprise/custom path, forcing large deals through self-serve.

### Future Improvements
- Dynamic, segment-based pricing experiments (A/B price testing).
- Willingness-to-pay modeling to auto-suggest tier boundaries.
- Localized purchasing-power pricing per region.
- Packaging simulator to preview revenue impact of plan changes before rollout.

---

## 2. Subscription Rules

### Purpose
Govern the full subscription lifecycle — signup, upgrade, downgrade, renewal, pause, and cancellation — so entitlements and billing stay consistent as customers move between states.

### Features
- Trial support (time-limited and/or usage-limited), with and without payment method upfront.
- Upgrade, downgrade, and plan-switch flows with proration.
- Auto-renewal with configurable renewal windows.
- Pause/resume and scheduled cancellation.
- Grace periods and dunning states for failed payments.
- Subscription add-ons and quantity changes (seats).
- Lifecycle state machine: trialing, active, past_due, paused, canceled, expired.

### Business Rules
- A subscription occupies exactly one lifecycle state at any moment.
- Upgrades take effect immediately with prorated charges; downgrades take effect at the next renewal unless explicitly immediate.
- Trials convert to paid automatically at expiry only when a valid payment method exists; otherwise the subscription moves to a limited/expired state.
- Cancellation preserves access until the end of the paid period (cancel-at-period-end) unless immediate cancellation is explicitly chosen.
- Entitlements always reflect the current active plan; no access is granted beyond what the current state permits.
- A subscription entering past_due follows the dunning sequence before any downgrade or termination.

### User Flow
1. User starts a trial or subscribes directly.
2. System provisions entitlements for the chosen plan.
3. User may upgrade/downgrade; proration and effective dates are shown and confirmed.
4. At renewal, the system attempts billing (handoff to Payment System).
5. On success, the period extends; on failure, dunning begins.
6. User may pause or cancel; access adjusts per the cancellation rule.

### Best Practices
- Make the current plan, next renewal date, and next charge always visible to the customer.
- Offer downgrade-at-period-end to avoid punitive immediate loss of paid value.
- Use grace periods and dunning before revoking access to reduce involuntary churn.
- Confirm proration amounts explicitly before applying plan changes.
- Keep a full, immutable history of subscription state transitions for support and audit.

### Common Mistakes
- Revoking access instantly on a single failed payment.
- Charging full proration on downgrades or failing to credit unused time.
- Auto-converting trials without clear advance notice.
- Allowing conflicting states (e.g., paused yet billing) due to a loose state machine.
- Not preserving entitlements through the end of an already-paid period after cancellation.

### Future Improvements
- Predictive churn signals feeding proactive retention offers at cancellation.
- Flexible "pause instead of cancel" save flows.
- Self-serve seat and add-on management with real-time proration preview.
- Configurable renewal reminder cadences per plan or segment.

---

## 3. Payment System

### Purpose
Define how the business collects money reliably — capturing payment methods, charging on schedule, handling failures, and issuing refunds — as a domain-agnostic billing engine (not a payment-gateway integration spec).

### Features
- Multiple payment methods (card, bank transfer/ACH, wallet, invoice for enterprise).
- One-time charges, recurring billing, and metered/usage charges.
- Automated dunning and retry logic for failed payments.
- Invoices, receipts, and credit notes.
- Refunds (full and partial) and credits/wallet balances.
- Tax and surcharge handling at the business-rule level (rates applied per region).
- Payment method update and self-serve billing portal.

### Business Rules
- No service beyond the free tier is granted without a successful charge or a valid enterprise invoice agreement.
- Failed charges trigger the dunning sequence with a bounded number of retries over a defined window before the subscription is marked past_due then downgraded.
- Every charge, refund, and credit produces an immutable financial record (invoice/receipt).
- Refunds cannot exceed the original captured amount.
- Currency is fixed at subscription creation and does not change mid-term.
- Taxes are calculated per the customer's billing region at time of invoice and shown as separate line items.

### User Flow
1. Customer enters or selects a payment method at checkout.
2. System validates and stores a payment token (never raw sensitive data at this layer).
3. On each billing cycle, the system charges the method.
4. On success, an invoice/receipt is issued.
5. On failure, dunning notifications and retries run.
6. Customer may update the payment method or request a refund via the billing portal.

### Best Practices
- Retry failed charges on an escalating schedule aligned to card-decline patterns.
- Send pre-dunning and dunning notifications so customers can self-cure.
- Always issue itemized invoices with taxes and discounts broken out.
- Support smart method updates (e.g., prompt before card expiry).
- Keep financial records immutable and reconcilable.

### Common Mistakes
- Treating a single decline as a hard cancellation instead of retrying.
- Storing sensitive payment data at the business layer instead of tokenizing.
- Emitting inconsistent invoices when discounts or proration apply.
- Refunding without generating a corresponding credit note.
- Ignoring regional tax obligations in the price shown.

### Future Improvements
- Account-updater services to auto-refresh expiring cards.
- Machine-learned optimal retry timing to maximize recovery.
- Multi-currency wallets and credit balances.
- Consolidated invoicing for multi-workspace enterprise accounts.

---

## 4. Usage Limits

### Purpose
Define how the business meters, enforces, and communicates consumption limits so that plan value is protected, overage is handled fairly, and upgrades are naturally prompted.

### Features
- Quota definitions per plan (seats, records, actions, storage, API calls, or any metered unit).
- Soft limits (warn) and hard limits (block) with configurable thresholds.
- Overage handling: block, throttle, or bill-for-overage.
- Real-time usage tracking and per-period reset (monthly/billing-aligned).
- Usage dashboards and threshold alerts.
- Fair-use and rate-limit policies at the business level.

### Business Rules
- Every metered resource maps to a plan-defined quota; unmetered resources are explicitly unlimited.
- Usage counters reset at the start of each billing period unless the metric is defined as cumulative.
- Crossing a soft limit triggers notification but does not interrupt service.
- Crossing a hard limit blocks further consumption or triggers overage billing per the plan's policy.
- Downgrades that place usage above the new plan's quota trigger a defined remediation path (grace period, block-new, or overage), never silent data loss.
- Usage measurement is authoritative from a single source of truth per metric.

### User Flow
1. Customer consumes a metered resource.
2. System increments the usage counter in near-real-time.
3. At the soft threshold, the customer is warned and offered an upgrade.
4. At the hard threshold, the plan's overage policy applies (block/throttle/bill).
5. At period reset, applicable counters return to zero.
6. Customer can view current usage against limits at any time.

### Best Practices
- Warn well before the hard limit so customers can act.
- Tie limit-reached moments to a frictionless upgrade path.
- Make usage transparent with live dashboards, not just end-of-period surprises.
- Choose overage policies that match customer expectations per metric.
- Align counter resets with the billing period to avoid confusion.

### Common Mistakes
- Hard-blocking with no prior warning, causing outages for the customer.
- Ambiguous reset timing that desyncs from billing.
- Silently deleting or hiding data on downgrade instead of remediating.
- Metering the same unit inconsistently across the product.
- Overage charges applied without clear prior disclosure.

### Future Improvements
- Predictive limit forecasting ("you'll hit your cap in ~5 days").
- Auto-upgrade suggestions or one-click quota top-ups.
- Burst/credit pooling across a billing period.
- Configurable per-workspace fair-use policies.

---

## 5. Revenue Model

### Purpose
Define how the business converts subscriptions and usage into sustainable, growing revenue, and how that revenue is measured, recognized, and expanded.

### Features
- Recurring revenue streams (MRR/ARR) across plans.
- Expansion revenue (upsell, cross-sell, seat growth, add-ons, overage).
- One-time revenue (setup fees, professional services, one-off purchases).
- Revenue recognition rules aligned to service delivery periods.
- Churn and contraction tracking.
- Referral, affiliate, and partner/reseller revenue channels.
- Discounting and its margin impact tracking.

### Business Rules
- Revenue is recognized over the service period it covers, not fully at time of charge (deferred revenue for prepaid terms).
- Expansion and contraction are tracked distinctly from new and churned revenue.
- Refunds and credits reduce recognized revenue in the corresponding period.
- Every revenue event ties back to a subscription, invoice, or one-time charge.
- Discounts reduce recognized revenue and are reported at net, with gross and discount separately visible.
- Partner/reseller revenue applies its agreed share split as a business invariant.

### User Flow
1. A subscription, upgrade, add-on, or one-time purchase generates a revenue event.
2. The event is classified (new, expansion, contraction, churn, one-time).
3. Revenue is recognized across the appropriate period(s).
4. Metrics (MRR, ARR, ARPU, churn) update accordingly.
5. Partner/referral splits are applied where relevant.
6. Results feed Business Reports.

### Best Practices
- Separate bookings, billings, and recognized revenue conceptually.
- Track net revenue retention as a core health metric.
- Attribute expansion revenue to its driver (seats vs. usage vs. upsell).
- Keep deferred revenue accurate for prepaid annual plans.
- Model the margin impact of every discount program.

### Common Mistakes
- Recognizing prepaid annual revenue all at once.
- Blending expansion and new revenue, hiding true acquisition performance.
- Ignoring contraction and treating all churn as binary.
- Not netting refunds/credits against the right period.
- Failing to account for partner splits before reporting revenue.

### Future Improvements
- Automated net-revenue-retention cohort analysis.
- Scenario modeling for pricing/packaging changes.
- Multi-stream attribution (which channel drove which revenue).
- Forecasting of deferred revenue burndown.

---

## 6. User Roles

### Purpose
Define the universal permission model that governs *who can do what* in the business — a role/permission baseline, not domain-specific feature logic.

### Features
- Predefined roles (Owner, Admin, Member, Billing Manager, Viewer/Read-only, Guest).
- Granular permission sets grouped into roles.
- Role assignment and revocation per user.
- Ownership transfer.
- Least-privilege defaults for new members.
- Optional custom roles on higher tiers.

### Business Rules
- Every account has exactly one Owner at all times; ownership can be transferred but never left empty.
- Billing actions require the Owner or Billing Manager role.
- A user's effective permissions are the union of their assigned role(s) within a given workspace.
- New members default to the least-privileged functional role unless explicitly elevated.
- Only Owners/Admins can invite, remove, or change the roles of other members.
- A user cannot elevate their own privileges.

### User Flow
1. Owner/Admin invites a user and assigns a role.
2. The invited user accepts and receives role-scoped permissions.
3. Admins adjust roles as responsibilities change.
4. Billing-scoped actions are gated to billing-capable roles.
5. Ownership can be transferred to another member.
6. Removing a user revokes all associated permissions immediately.

### Best Practices
- Follow least-privilege by default.
- Keep a small set of well-understood standard roles; add custom roles only when needed.
- Always require an explicit ownership transfer rather than deletion of the last owner.
- Log all role changes for auditability.
- Separate billing permissions from general admin where possible.

### Common Mistakes
- Allowing an account to exist with no Owner.
- Granting Admin by default to all new members.
- Coupling billing access to every admin action.
- Letting users change their own roles.
- No audit trail for permission changes.

### Future Improvements
- Fine-grained custom permission builder.
- Time-boxed / just-in-time elevated access.
- Role templates per team function.
- Delegated administration for large organizations.

---

## 7. Team & Workspace

### Purpose
Define how multiple users collaborate under shared, isolated business containers (workspaces/organizations), and how membership, boundaries, and shared billing operate.

### Features
- Workspaces/organizations as isolation and billing boundaries.
- Member invitations, onboarding, and offboarding.
- Multiple workspaces per user and switching between them.
- Per-workspace settings, roles, and subscription.
- Seat management tied to Usage Limits and Subscription Rules.
- Optional sub-teams/groups within a workspace.

### Business Rules
- Each workspace is an isolated boundary; data and entitlements never leak across workspaces.
- A subscription belongs to a workspace, not to an individual user.
- Seat count is enforced against the workspace's plan quota.
- A user may belong to many workspaces, each with independent roles.
- Removing a user from a workspace revokes access to that workspace only.
- Deleting a workspace requires Owner authority and follows a defined data-retention/cancellation path.

### User Flow
1. A user creates a workspace and becomes its Owner.
2. Owner invites members and assigns roles.
3. Members accept and join, consuming seats.
4. Users switch between workspaces they belong to.
5. Seat/plan limits gate further invitations.
6. Owner can archive or delete the workspace per policy.

### Best Practices
- Treat the workspace as the unit of billing and isolation from day one.
- Make workspace switching fast and unambiguous.
- Enforce seat limits at invitation time, not after the fact.
- Provide clean offboarding that reassigns or preserves shared assets.
- Keep per-workspace settings independent to support diverse teams.

### Common Mistakes
- Tying subscriptions to individual users instead of workspaces.
- Leaking data or entitlements across workspace boundaries.
- Allowing invitations that exceed seat quotas.
- No clear handling of shared assets when a member leaves.
- Ambiguous UX when a user belongs to many workspaces.

### Future Improvements
- Nested organizations and hierarchical billing.
- Cross-workspace shared resources with explicit consent.
- Bulk member provisioning (SCIM-style, at the business-rule level).
- Workspace-level usage and cost centers.

---

## 8. Integrations

### Purpose
Define how the business connects to external services and exposes its own connection points as a revenue and retention lever — the business-level integration model, not backend API implementation.

### Features
- Third-party integration catalog/marketplace.
- Inbound and outbound data connectors.
- Webhooks and event subscriptions (as a business capability).
- OAuth-style connection management (connect/disconnect).
- Per-plan integration entitlements (some integrations gated to higher tiers).
- Integration usage tracked against Usage Limits where applicable.

### Business Rules
- Integration availability is governed by the workspace's plan tier.
- Connecting or disconnecting an integration requires appropriate role permissions.
- Each integration connection is scoped to a single workspace.
- Disconnecting an integration immediately revokes the associated data flow.
- Premium integrations may count toward usage limits or carry their own add-on charge.
- A failed integration must degrade gracefully without breaking core subscription function.

### User Flow
1. Admin browses the integration catalog.
2. Admin connects an integration (authorizes access).
3. The integration is scoped to the current workspace.
4. Data flows inbound/outbound per the integration's purpose.
5. Usage is metered where applicable.
6. Admin can disconnect, revoking access immediately.

### Best Practices
- Gate advanced integrations to higher tiers to drive upgrades.
- Make connect/disconnect self-serve and reversible.
- Fail integrations gracefully so core service is unaffected.
- Clearly show which integrations consume quota or add cost.
- Require appropriate roles for connection changes.

### Common Mistakes
- Letting a broken integration take down core functionality.
- No clear entitlement gating, giving all tiers everything.
- Leaving stale connections active after disconnect.
- Scoping integrations to users instead of workspaces.
- Hiding the cost/quota impact of premium integrations.

### Future Improvements
- Partner/developer marketplace with revenue share.
- Low-code integration builder for customers.
- Integration health monitoring surfaced to admins.
- Usage-based integration pricing.

---

## 9. Notifications

### Purpose
Define how the business communicates with users across the lifecycle — transactional, lifecycle, billing, and engagement messages — as a channel-agnostic business capability.

### Features
- Multi-channel delivery (email, in-app, push, SMS, webhook).
- Notification categories: transactional, billing/dunning, lifecycle, usage/limit alerts, product/marketing.
- Per-user notification preferences and opt-in/opt-out.
- Templated, event-triggered messages.
- Digest/batching options.
- Delivery status tracking.

### Business Rules
- Transactional and billing-critical notifications (e.g., payment failure, security) cannot be fully opted out of.
- Marketing/engagement notifications require explicit opt-in consent and honor opt-out.
- Every notification maps to a defined triggering business event.
- Notification preferences are respected per user, per channel.
- Failed critical notifications are retried and, if undeliverable, surfaced through an alternate channel.
- Frequency caps prevent notification flooding for a single event class.

### User Flow
1. A business event occurs (payment failed, limit reached, invite sent).
2. The system selects the relevant notification and channel(s).
3. User preferences and consent are applied.
4. The message is delivered and delivery status recorded.
5. Non-critical messages respect opt-out; critical ones always send.
6. User manages preferences in settings.

### Best Practices
- Separate must-send transactional messages from optional marketing.
- Respect consent and provide granular per-channel controls.
- Batch low-urgency notifications into digests to reduce noise.
- Always tie a notification to a real, meaningful event.
- Track deliverability and retry critical messages.

### Common Mistakes
- Allowing users to opt out of critical billing/security alerts.
- Sending marketing without explicit consent.
- Flooding users with redundant, un-batched notifications.
- No delivery tracking, so failed critical alerts go unnoticed.
- One-size-fits-all preferences with no channel granularity.

### Future Improvements
- Intelligent send-time optimization per user.
- Preference learning from engagement behavior.
- Unified notification center across channels.
- Localization and timezone-aware delivery.

---

## 10. Business Reports

### Purpose
Define the reporting and analytics layer that turns business activity into decision-ready insight for operators and customers — universal SaaS business metrics, not domain-specific analytics.

### Features
- Revenue dashboards (MRR, ARR, ARPU, LTV).
- Growth and retention reports (churn, net revenue retention, cohort analysis).
- Subscription and plan-distribution reports.
- Usage and adoption analytics.
- Financial reports (invoices, refunds, taxes, deferred revenue).
- Exportable reports and scheduled delivery.
- Role-scoped report access (operators vs. customers).

### Business Rules
- Financial reports must reconcile with the immutable records from the Payment System and Revenue Model.
- Report access is gated by user role (e.g., billing/revenue reports limited to Owner/Billing Manager).
- Metrics are computed from a single authoritative source per measure to avoid conflicting numbers.
- Historical reports are immutable snapshots; recomputation produces a new version, not an in-place edit.
- Customer-facing reports are scoped strictly to that customer's workspace.
- Currency and time-period boundaries in reports must be explicit and consistent.

### User Flow
1. Operator or customer opens the reports area.
2. Role determines which reports and scopes are visible.
3. User selects metric, period, and segmentation.
4. The system computes from authoritative sources.
5. User views, exports, or schedules the report.
6. Snapshots are retained for historical comparison.

### Best Practices
- Reconcile all financial reporting to source-of-truth records.
- Define each metric once and reuse it everywhere.
- Make time periods and currency explicit on every report.
- Scope customer reports strictly to their own workspace.
- Offer exports and scheduled delivery for operational workflows.

### Common Mistakes
- Conflicting metric definitions producing different numbers in different views.
- Reports that don't reconcile with billing records.
- Exposing cross-workspace or role-inappropriate data.
- Mutating historical reports instead of versioning.
- Ambiguous or inconsistent period/currency handling.

### Future Improvements
- Self-serve custom report builder.
- Anomaly detection and automated insights.
- Benchmarking against anonymized cohorts.
- Real-time streaming dashboards and forecasting.

---

**End of Universal SaaS Business Engine — 10 of 10 sections complete.**
This document is the standardized, domain-agnostic business-rules baseline. It is ready to be layered under the idea-specific System Architecture Document by solution-architect-app and consumed by the next pipeline stage (Technical Engine).

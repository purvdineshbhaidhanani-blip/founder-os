# Universal SaaS Business Engine

**SaaS:** Freelancer Tax Filing AI

> This document defines how the business itself runs. It is the standardized, domain-agnostic business-rules baseline — not the domain-specific tax logic, and not database, API, backend, security, testing, or deployment concerns. Domain-specific behavior is owned downstream by the solution architect and developer agents.

---

## 1. Pricing Strategy

**Purpose**
Define how the product converts value into revenue through clearly structured, comparable pricing options that map cost to willingness-to-pay across customer segments.

**Features**
- Multiple named plan tiers (e.g., Free, Starter, Pro, Business) with distinct value ceilings.
- Monthly and annual billing options with an annual-discount incentive.
- Free tier or time-boxed trial as an acquisition entry point.
- Add-ons and metered overage pricing layered on top of base plans.
- Regional currency display and localized price points.
- Coupon, promo-code, and volume/seat-based discount support.

**Business Rules**
- Every paid plan must have exactly one active price per billing interval per currency.
- A customer may hold only one active base subscription plan at a time.
- Annual price must represent a non-negative discount versus 12x the monthly price.
- Published prices are immutable for existing subscribers until their renewal boundary (price grandfathering).
- A free tier, if offered, must never require payment credentials to activate.

**User Flow**
1. Visitor views the pricing page with tiers compared side by side.
2. Visitor selects a plan and billing interval.
3. System displays final price with any applicable discount or tax placeholder.
4. Visitor proceeds to checkout or starts the free tier/trial.
5. Selected plan is recorded as the intended subscription.

**Best Practices**
- Anchor tiers around value metrics customers understand, not internal cost.
- Keep the tier count small (3–4) to reduce decision paralysis.
- Make the recommended plan visually distinct.
- Show annual savings explicitly in both percentage and absolute terms.

**Common Mistakes**
- Too many tiers or overlapping value propositions.
- Hiding the total price until the final checkout step.
- Changing prices on existing subscribers without grandfathering.
- Coupling the free tier to a mandatory credit card.

**Future Improvements**
- Usage-based and hybrid pricing experiments.
- Automated price localization by purchasing-power parity.
- A/B testing framework for plan packaging.
- Personalized plan recommendation based on projected usage.

---

## 2. Subscription Rules

**Purpose**
Govern the full lifecycle of a subscription — activation, renewal, upgrade, downgrade, pause, and cancellation — so billing state is always predictable and consistent.

**Features**
- Trial-to-paid conversion handling.
- Upgrade, downgrade, and plan-switch flows with proration.
- Auto-renewal at the end of each billing cycle.
- Cancellation with end-of-period access retention.
- Pause/resume and grace-period handling.
- Dunning sequence for failed renewals.

**Business Rules**
- A subscription exists in exactly one state at any time: trialing, active, past_due, paused, canceled, or expired.
- Upgrades take effect immediately with prorated charges; downgrades take effect at the next renewal boundary.
- Cancellation retains access until the end of the paid period; no partial-period refund by default.
- A failed renewal enters a grace period before downgrade to the free tier or suspension.
- Trials convert to paid only after a successful charge; expired unconverted trials revert to free or locked state.

**User Flow**
1. Customer activates a plan (via trial or direct purchase).
2. System schedules the renewal date and billing interval.
3. Customer may upgrade, downgrade, pause, or cancel from account settings.
4. At renewal, system attempts charge and updates state accordingly.
5. On failure, dunning begins; on success, the cycle renews.

**Best Practices**
- Communicate every state change by notification immediately.
- Offer a self-service cancellation flow with a save/offer step.
- Preserve data during downgrade rather than deleting it.
- Make proration math transparent to the customer.

**Common Mistakes**
- Revoking access instantly on cancellation instead of at period end.
- Silent auto-renewal without advance reminder.
- Losing customer data on downgrade.
- No grace period, causing churn on transient payment failures.

**Future Improvements**
- Win-back and reactivation campaigns.
- Flexible seat/quantity mid-cycle adjustments.
- Predictive churn scoring tied to lifecycle events.
- Configurable pause durations for seasonal customers.

---

## 3. Payment System

**Purpose**
Handle the secure collection, processing, and reconciliation of money across payment methods, currencies, and tax jurisdictions.

**Features**
- Multiple payment methods (card, wallet, bank debit).
- Recurring billing and stored payment instruments.
- Invoice and receipt generation.
- Tax/VAT/GST calculation placeholder at checkout.
- Refunds, partial refunds, and credits.
- Retry logic and payment-method update prompts.

**Business Rules**
- No feature access is granted on a paid plan until payment is confirmed or a trial is explicitly active.
- Every successful charge must produce an immutable invoice record.
- Refunds must reference the original transaction and cannot exceed the amount captured.
- A subscription with no valid payment method cannot auto-renew.
- All monetary amounts are stored and computed in minor units to avoid rounding drift.

**User Flow**
1. Customer enters or selects a payment method at checkout.
2. System validates and authorizes the payment.
3. On success, an invoice/receipt is generated and delivered.
4. For recurring cycles, the stored method is charged automatically.
5. On failure, the customer is prompted to update the method and retry.

**Best Practices**
- Delegate card handling to a compliant payment processor (never store raw card data).
- Support automatic retries with intelligent backoff.
- Send receipts immediately after each charge.
- Surface clear, specific decline reasons.

**Common Mistakes**
- Granting access before payment confirmation.
- Poor handling of failed payments leading to involuntary churn.
- Rounding errors from using floating-point currency math.
- No clear refund or dispute pathway.

**Future Improvements**
- Multi-processor failover routing.
- Account-credit and wallet balance system.
- Automated tax remittance integration.
- Smart retry timing based on issuer success patterns.

---

## 4. Usage Limits

**Purpose**
Enforce the quantitative boundaries of each plan so consumption aligns with entitlements and higher usage is monetized.

**Features**
- Per-plan quotas and feature entitlements.
- Metered counters for consumable resources.
- Soft (warning) and hard (block) limit thresholds.
- Overage handling and upgrade prompts.
- Quota reset aligned to the billing cycle.
- Real-time usage visibility for the customer.

**Business Rules**
- Every plan defines explicit limits for each metered dimension; unlimited must be stated deliberately.
- Usage counters reset at the start of each billing period unless defined as cumulative.
- Reaching a hard limit blocks further consumption of that resource until upgrade or reset.
- Soft-limit thresholds trigger a warning but do not block.
- Entitlement checks are evaluated at the moment of resource consumption.

**User Flow**
1. Customer consumes a metered resource.
2. System increments the corresponding counter and checks entitlement.
3. At a soft threshold, a warning is surfaced.
4. At a hard limit, the action is blocked with an upgrade path offered.
5. At cycle reset, counters return to zero (unless cumulative).

**Best Practices**
- Show usage progress before limits are reached, not after.
- Make upgrade the frictionless response to hitting a limit.
- Keep entitlement checks fast and consistent across surfaces.
- Define limits in units customers understand.

**Common Mistakes**
- Hard-blocking with no warning or upgrade path.
- Inconsistent limit enforcement across features.
- Resetting counters at the wrong boundary.
- Ambiguous or undocumented "unlimited" claims.

**Future Improvements**
- Prepaid usage bundles and rollover credits.
- Predictive limit-breach alerts.
- Dynamic per-customer limit tuning.
- Cross-resource pooled quotas for teams.

---

## 5. Revenue Model

**Purpose**
Define how the business generates, recognizes, and grows revenue across streams and over the customer lifetime.

**Features**
- Recurring subscription revenue (MRR/ARR).
- Expansion revenue via upsell, add-ons, and overages.
- One-time and usage-based charges.
- Referral, affiliate, or partner revenue channels.
- Discount and promotion impact tracking.
- Revenue recognition aligned to service delivery.

**Business Rules**
- Recurring revenue is recognized across the service period, not fully at charge time.
- Expansion, contraction, and churn must be tracked as distinct revenue movements.
- Discounts reduce recognized revenue and must be attributed to their source campaign.
- Refunds and credits reduce recognized revenue in the period they occur.
- Each revenue stream is categorized independently for reporting.

**User Flow**
1. Customer generates revenue through subscription, add-on, or usage.
2. System classifies the revenue by stream and recognition schedule.
3. Expansion or contraction events adjust the recurring base.
4. Recognized revenue accrues over the delivery period.
5. Aggregated figures feed downstream business reports.

**Best Practices**
- Separate bookings, billings, and recognized revenue conceptually.
- Track net revenue retention as a core health metric.
- Attribute every discount to a measurable campaign.
- Recognize revenue in line with service delivery, not cash timing.

**Common Mistakes**
- Conflating cash collected with recognized revenue.
- Ignoring expansion/contraction in growth accounting.
- Untracked discount leakage.
- Treating one-time and recurring revenue as interchangeable.

**Future Improvements**
- Cohort-based lifetime-value modeling.
- Automated deferred-revenue scheduling.
- Multi-stream revenue forecasting.
- Partner/affiliate revenue-share automation.

---

## 6. User Roles

**Purpose**
Define who can do what through a role and permission model that governs access to business capabilities.

**Features**
- Predefined roles (e.g., Owner, Admin, Member, Viewer/Billing).
- Granular permission sets per role.
- Role assignment and revocation.
- Billing-specific and read-only role variants.
- Delegation of administrative rights.
- Audit trail of role changes.

**Business Rules**
- Every account has exactly one Owner at all times; ownership can be transferred but not vacated.
- Permissions are additive per role; the most permissive assigned role governs.
- Only Owner or Admin roles may manage billing and subscriptions.
- Role changes take effect immediately on the next authenticated action.
- A user cannot elevate their own role beyond what their granter holds.

**User Flow**
1. Owner or Admin invites a user and assigns a role.
2. Invited user accepts and inherits the role's permissions.
3. System enforces permissions on each protected action.
4. Admins may adjust or revoke roles as needed.
5. Role changes are recorded for audit.

**Best Practices**
- Apply least-privilege by default.
- Separate billing permissions from operational ones.
- Always retain a recoverable Owner.
- Make permission boundaries visible to admins.

**Common Mistakes**
- Only one super-admin with no recovery path.
- Over-broad default permissions.
- No audit trail for privilege changes.
- Mixing billing and operational access indiscriminately.

**Future Improvements**
- Custom role builder with fine-grained scopes.
- Time-bound and just-in-time access grants.
- SSO/SCIM-driven role provisioning.
- Approval workflows for sensitive role elevation.

---

## 7. Team & Workspace

**Purpose**
Structure how multiple users collaborate within shared, isolated business containers (workspaces) tied to billing and membership.

**Features**
- Workspace creation and multi-workspace membership.
- Member invitations and seat management.
- Per-workspace billing and plan association.
- Data isolation between workspaces.
- Workspace-level settings and ownership.
- Member removal and offboarding.

**Business Rules**
- Each workspace is an independent billing and entitlement boundary.
- A subscription and its usage limits apply at the workspace level, not the individual user.
- Seat count must not exceed the plan's licensed seats; adding beyond triggers an upgrade or overage.
- Data in one workspace is never accessible from another.
- Removing a member frees a seat but preserves the workspace's data.

**User Flow**
1. Owner creates a workspace and selects a plan.
2. Owner invites members, consuming seats.
3. Members collaborate within the isolated workspace.
4. Seat and plan limits are enforced on invitation.
5. Members can be removed, freeing seats.

**Best Practices**
- Bind entitlements to the workspace, not scattered per user.
- Make seat usage and limits visible to admins.
- Preserve data ownership on member offboarding.
- Support clean workspace transfer of ownership.

**Common Mistakes**
- Leaking data across workspace boundaries.
- Tying the subscription to a user instead of the workspace.
- No clear seat-limit enforcement at invite time.
- Orphaned data when the owning member leaves.

**Future Improvements**
- Nested teams/sub-workspaces and groups.
- Cross-workspace shared resources with explicit scoping.
- Bulk member provisioning.
- Workspace-level usage analytics.

---

## 8. Integrations

**Purpose**
Define how the product connects to external services to extend value, without owning the domain-specific integration logic itself.

**Features**
- Third-party app connections via OAuth or API keys.
- Inbound and outbound webhooks.
- A public API surface for programmatic access.
- Integration marketplace/directory.
- Connection health monitoring and reconnection.
- Import/export connectors.

**Business Rules**
- Every integration connection is scoped to a single workspace and its permissions.
- Integration access respects the connecting user's role and entitlements.
- A revoked or expired credential disables the integration until reconnected.
- Certain integrations may be gated behind specific plan tiers.
- Outbound data sharing requires an explicit connection grant.

**User Flow**
1. Admin browses available integrations.
2. Admin authorizes a connection scoped to the workspace.
3. System establishes and validates the connection.
4. Data flows per the integration's configured direction.
5. Admin can monitor, reconfigure, or revoke the connection.

**Best Practices**
- Scope credentials narrowly and store them securely.
- Monitor connection health and prompt reconnection proactively.
- Gate premium integrations by plan intentionally.
- Provide clear connect/disconnect controls.

**Common Mistakes**
- Over-scoped integration permissions.
- No visibility into broken connections.
- Hard-coupling core features to a single external provider.
- Leaking data through unrevoked stale connections.

**Future Improvements**
- Self-serve integration/plugin SDK.
- Granular field-level sync controls.
- Marketplace with third-party publishers.
- Automated failure alerting and retry.

---

## 9. Notifications

**Purpose**
Keep users informed of business-relevant events across channels to drive engagement, retention, and timely action.

**Features**
- Multi-channel delivery (email, in-app, push, SMS).
- Transactional and lifecycle notifications.
- User notification preferences and opt-out.
- Templated, localized messaging.
- Digest and batching options.
- Delivery status tracking.

**Business Rules**
- Transactional notifications (billing, security, account state) are always sent regardless of marketing opt-out.
- Marketing/engagement notifications require explicit opt-in and honor unsubscribe immediately.
- Each notifiable event maps to a defined template and channel policy.
- Notification preferences are respected per user, per channel.
- Critical billing events (failed payment, renewal) must be delivered on at least one reliable channel.

**User Flow**
1. A business event occurs (e.g., renewal, limit reached).
2. System resolves the recipient, channel, and template.
3. Preferences and opt-in status are checked.
4. The notification is dispatched and delivery is tracked.
5. The user acts or adjusts preferences.

**Best Practices**
- Separate transactional from marketing streams cleanly.
- Respect preferences and make opt-out one click.
- Batch low-priority notifications to avoid fatigue.
- Always confirm critical events on a reliable channel.

**Common Mistakes**
- Sending marketing messages under a transactional guise.
- Notification overload causing disengagement.
- Ignoring per-channel preferences.
- Missing alerts for critical billing failures.

**Future Improvements**
- Send-time and channel optimization per user.
- Rich in-app notification center with history.
- Preference center with granular categories.
- Event-driven notification workflows.

---

## 10. Business Reports

**Purpose**
Provide the analytical view of business health — revenue, growth, usage, and retention — so operators can make informed decisions.

**Features**
- Revenue dashboards (MRR, ARR, growth).
- Subscription metrics (churn, retention, conversion).
- Usage and adoption analytics.
- Cohort and segmentation views.
- Exportable reports and scheduled delivery.
- Role-scoped access to reports.

**Business Rules**
- Report data reflects a defined, consistent time window and refresh cadence.
- Financial figures in reports derive from recognized revenue rules, not raw cash.
- Access to business reports is restricted by role (billing/admin scope).
- Metrics use consistent, documented definitions across all reports.
- Historical figures are immutable once a reporting period closes.

**User Flow**
1. Admin opens the reporting dashboard.
2. Admin selects metrics, time range, and segments.
3. System aggregates and renders the data.
4. Admin exports or schedules the report.
5. Insights inform pricing, retention, and growth decisions.

**Best Practices**
- Standardize metric definitions across the organization.
- Tie reports to the same revenue-recognition rules as accounting.
- Restrict sensitive financial reports by role.
- Favor cohort and trend views over point-in-time snapshots.

**Common Mistakes**
- Inconsistent metric definitions across dashboards.
- Mixing cash and recognized revenue in the same figure.
- Exposing financial reports to unauthorized roles.
- Vanity metrics without actionable segmentation.

**Future Improvements**
- Predictive and forecasting analytics.
- Custom report builder with saved views.
- Anomaly detection and automated insights.
- Real-time streaming dashboards.

---

*End of Universal SaaS Business Engine. This baseline is handed to solution-architect-app to be layered under the idea-specific System Architecture Document for Freelancer Tax Filing AI.*

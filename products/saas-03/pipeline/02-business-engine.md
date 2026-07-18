# Universal SaaS Business Engine — AI Meal Planning

> The standardized, locked business-rules baseline. Ten universal SaaS business systems, in fixed order, each domain-agnostic. This document governs how the business runs — not what the product looks like, nor the meal-planning domain logic itself, which belongs to the downstream architects.

---

## 1. Pricing Strategy

**Purpose**
Define how the SaaS captures monetary value in exchange for the service, establishing the packaging, tiers, and price points that map customer willingness-to-pay to sustainable revenue.

**Features**
- Multiple pricing tiers (e.g., Free/Starter, Pro, Business, Enterprise)
- Monthly and annual billing intervals with annual-discount incentive
- Per-seat, flat-rate, usage-based, and hybrid pricing models
- Free trial and/or freemium entry paths
- Currency localization and regional price adjustment
- Promotional codes, coupons, and time-boxed discounts
- Grandfathering of legacy prices for existing customers

**Business Rules**
- Every paid tier must map to a defined entitlement set (features + limits).
- Annual billing must offer a discount relative to 12× the monthly price.
- A price change never applies retroactively to an active billing period.
- Grandfathered customers retain their price until they voluntarily change plans.
- A promotional discount cannot reduce the effective price below the configured floor.
- Only one active promotional code may apply per subscription at a time.

**User Flow**
1. Prospect views the pricing page comparing tiers.
2. Prospect selects a tier and billing interval.
3. System displays final price with any applied discount and taxes.
4. Prospect confirms and proceeds to checkout.
5. Entitlements for the chosen tier activate on successful payment.

**Best Practices**
- Anchor tiers so the middle plan is the intended default.
- Express value in outcomes the buyer recognizes, not internal metrics.
- Keep tier count small (typically 3–4) to reduce decision paralysis.
- Test price points with cohorts before global rollout.

**Common Mistakes**
- Too many tiers or overlapping entitlements that confuse buyers.
- Changing prices without grandfathering, causing churn and distrust.
- Hiding the true cost behind unclear usage metrics.
- Pricing on a metric the customer cannot predict or control.

**Future Improvements**
- Dynamic, segment-based pricing experiments.
- AI-assisted price-sensitivity modeling per cohort.
- Self-serve custom-quote builder for mid-market buyers.

---

## 2. Subscription Rules

**Purpose**
Govern the lifecycle of a customer's ongoing commitment — how subscriptions start, renew, upgrade, downgrade, pause, and cancel — so recurring access stays consistent with recurring payment.

**Features**
- Trial-to-paid conversion
- Automatic renewal at interval end
- Upgrade, downgrade, and plan-switch flows
- Proration on mid-cycle changes
- Pause/resume and cancellation with end-of-period access
- Dunning and grace periods for failed renewals
- Reactivation of lapsed subscriptions

**Business Rules**
- A subscription renews automatically unless canceled before the renewal date.
- Upgrades take effect immediately with prorated charge; downgrades take effect at the next cycle.
- Canceled subscriptions retain access until the end of the paid period.
- A trial converts to paid only after explicit or pre-authorized consent per jurisdiction.
- Failed renewals enter a defined grace period before entitlement suspension.
- One active subscription per account per product unless multi-subscription is explicitly enabled.

**User Flow**
1. Customer starts a trial or subscribes.
2. System schedules the renewal date.
3. Customer optionally upgrades/downgrades; system applies proration timing rules.
4. At renewal, system attempts payment.
5. On success, access continues; on failure, dunning begins.
6. On cancellation, access persists until period end, then downgrades to free/expired.

**Best Practices**
- Make cancellation self-serve and transparent to build trust.
- Send renewal reminders before annual charges.
- Preserve customer data during pause so resume is frictionless.
- Offer a downgrade path as an alternative to full cancellation.

**Common Mistakes**
- Immediate access removal on cancellation, breaching the paid period.
- No grace period, causing avoidable involuntary churn.
- Confusing proration that produces surprise charges.
- Trapping users in hard-to-find cancellation flows.

**Future Improvements**
- Predictive churn signals triggering retention offers.
- Flexible plan pausing tied to seasonality.
- Win-back automation for lapsed subscribers.

---

## 3. Payment System

**Purpose**
Handle the secure collection, processing, and reconciliation of funds, connecting the subscription lifecycle to actual money movement through payment providers.

**Features**
- Multiple payment methods (cards, wallets, bank debit, invoicing)
- Recurring billing and stored payment credentials
- Invoicing, receipts, and billing history
- Tax and VAT/GST calculation and compliance
- Refunds, credits, and chargeback handling
- Multi-currency settlement
- Retry logic (dunning) for failed charges

**Business Rules**
- Every successful charge must generate an invoice/receipt record.
- Refunds cannot exceed the original captured amount.
- Applicable taxes are calculated per the customer's billing jurisdiction.
- A failed charge triggers the retry schedule before subscription suspension.
- Stored payment credentials are tokenized via the provider, never stored raw.
- Chargebacks immediately flag the account for review.

**User Flow**
1. Customer enters or selects a payment method at checkout.
2. System validates and tokenizes the method via the provider.
3. Charge is authorized and captured.
4. Invoice/receipt is issued and stored in billing history.
5. On failure, retry sequence runs; on repeated failure, subscription is flagged.

**Best Practices**
- Delegate card handling to a compliant provider to minimize scope.
- Offer localized payment methods to reduce checkout drop-off.
- Use smart retries timed to likely-fund availability.
- Make invoices clear, downloadable, and self-serve.

**Common Mistakes**
- Single payment method, excluding whole markets.
- Naive retry logic that annoys customers or misses recoverable charges.
- Ignoring tax compliance until it becomes a liability.
- Poor refund UX that drives support load and disputes.

**Future Improvements**
- Account-level updater to refresh expired cards automatically.
- AI-optimized retry timing to maximize recovery.
- Real-time revenue reconciliation with the ledger.

---

## 4. Usage Limits

**Purpose**
Enforce the quantitative boundaries of each plan — the metered or capped consumption that separates tiers and protects infrastructure and margin.

**Features**
- Per-plan quotas (seats, actions, storage, generations, API calls)
- Soft limits (warnings) and hard limits (blocks)
- Real-time usage metering and counters
- Overage handling (block, throttle, or pay-as-you-go)
- Quota reset cadence aligned to billing cycle
- Usage dashboards for customers

**Business Rules**
- Each plan defines explicit limits for every metered resource.
- Usage counters reset at the start of each billing cycle unless defined as cumulative.
- A hard limit blocks further consumption until upgrade or reset.
- Soft-limit thresholds trigger proactive notifications before the hard limit.
- Overage is only billable when the plan explicitly permits pay-as-you-go.
- Limit changes on upgrade take effect immediately.

**User Flow**
1. Customer consumes a metered resource.
2. System increments the counter and checks against the plan limit.
3. At the soft threshold, a warning notification is sent.
4. At the hard limit, further use is blocked or throttled per policy.
5. Upgrade or cycle reset restores availability.

**Best Practices**
- Warn early and clearly before blocking.
- Make current usage visible at all times.
- Align limits to a metric customers can understand and forecast.
- Fail gracefully — degrade rather than hard-stop core workflows where possible.

**Common Mistakes**
- Silent hard blocks with no forewarning.
- Metering on a metric users cannot see or predict.
- Counters that reset inconsistently with the billing cycle.
- No upgrade path at the moment of hitting a limit.

**Future Improvements**
- Predictive usage forecasting with proactive upgrade nudges.
- Flexible burst allowances for occasional spikes.
- Granular per-feature metering controls.

---

## 5. Revenue Model

**Purpose**
Define the overall structure through which the business generates and grows recurring revenue, unifying pricing, subscriptions, and expansion into a coherent monetization strategy.

**Features**
- Recurring subscription revenue (MRR/ARR)
- Expansion revenue (upsell, cross-sell, seat growth)
- Usage-based/consumption revenue streams
- Add-ons and one-time purchases
- Partner/affiliate/referral revenue
- Discounting and contract-based deals

**Business Rules**
- Recurring revenue is recognized over the service period, not at collection.
- Expansion revenue is attributed to the account's existing subscription.
- Each revenue stream maps to a distinct, reportable category.
- Discounts and credits reduce recognized revenue proportionally.
- Referral payouts are only issued on qualified, retained conversions.

**User Flow**
1. Customer enters via a primary subscription (base revenue).
2. Growth in usage or seats triggers expansion revenue.
3. Add-ons and upgrades layer additional recurring or one-time revenue.
4. Referrals generate new subscriptions and payouts.
5. System categorizes each stream for reporting.

**Best Practices**
- Design for expansion — make growing within the product natural.
- Track net revenue retention as the core health metric.
- Keep revenue streams distinct and measurable.
- Balance acquisition and expansion investment.

**Common Mistakes**
- Relying solely on new-logo acquisition, ignoring expansion.
- Recognizing revenue on collection rather than delivery.
- Discount-driven growth that erodes unit economics.
- Untracked or commingled revenue streams.

**Future Improvements**
- AI-driven upsell targeting based on usage signals.
- Marketplace or ecosystem revenue sharing.
- Outcome- or value-based pricing tied to realized customer results.

---

## 6. User Roles

**Purpose**
Define the permission structure that governs what each type of user can see and do, ensuring access aligns with responsibility and subscription entitlement.

**Features**
- Predefined roles (Owner, Admin, Member, Billing, Viewer/Guest)
- Role-based access control over features and data
- Role assignment and reassignment
- Ownership transfer
- Custom roles/permission sets (higher tiers)
- Invitation and provisioning of new users

**Business Rules**
- Every account has exactly one Owner at any time.
- Only Owners/Admins can manage roles and billing.
- A user's effective permissions are the intersection of role and plan entitlements.
- Ownership can be transferred but never duplicated.
- Removing a user immediately revokes their access.
- Billing actions are restricted to Owner and Billing roles.

**User Flow**
1. Owner/Admin invites a user and assigns a role.
2. Invitee accepts and is provisioned with role permissions.
3. System enforces permissions on every action.
4. Admin adjusts roles as responsibilities change.
5. Removal or ownership transfer updates access immediately.

**Best Practices**
- Default to least privilege.
- Keep the standard role set small and understandable.
- Make role capabilities transparent to admins.
- Require confirmation for irreversible role/ownership changes.

**Common Mistakes**
- Over-privileged default roles.
- No clear ownership transfer path, stranding accounts.
- Permissions that ignore plan entitlements.
- Orphaned access after a user leaves.

**Future Improvements**
- Fine-grained custom permission builder.
- Just-in-time and time-boxed elevated access.
- Automated role recommendations based on activity.

---

## 7. Team & Workspace

**Purpose**
Provide the organizational container within which users collaborate, isolating data, billing, and settings per team while enabling multi-tenant structure.

**Features**
- Workspace/organization creation and management
- Multiple workspaces per account
- Per-workspace membership and roles
- Workspace-level settings and billing
- Data isolation between workspaces
- Workspace switching and cross-workspace membership

**Business Rules**
- Each workspace has isolated data, members, and billing context.
- A user may belong to multiple workspaces with distinct roles in each.
- Workspace deletion removes or archives its scoped data per retention policy.
- Billing and limits are enforced at the workspace level unless account-wide is defined.
- Only workspace Owners/Admins can modify workspace-level settings.

**User Flow**
1. User creates a workspace and becomes its Owner.
2. Owner invites members and configures settings.
3. Members collaborate within the isolated workspace.
4. Users switch between workspaces they belong to.
5. Owner manages or deletes the workspace under retention rules.

**Best Practices**
- Enforce strict data isolation between workspaces.
- Make workspace switching fast and unambiguous.
- Scope billing and limits clearly to avoid cross-workspace confusion.
- Provide clear archival before destructive deletion.

**Common Mistakes**
- Data leakage across workspace boundaries.
- Ambiguous billing when a user spans multiple workspaces.
- No archival option before deletion.
- Confusing workspace-switching UX.

**Future Improvements**
- Cross-workspace analytics for parent organizations.
- Nested teams/sub-workspaces for large orgs.
- Workspace-level templates and cloning.

---

## 8. Integrations

**Purpose**
Connect the SaaS to external tools and services so it fits the customer's existing workflow, increasing stickiness and expanding utility.

**Features**
- Third-party app connections (calendar, storage, communication, commerce)
- Public API and webhooks
- OAuth-based authorization
- Import/export and data sync
- Integration marketplace/directory
- Per-workspace integration configuration

**Business Rules**
- Integrations authorize via the provider's approved auth flow (e.g., OAuth), never stored raw credentials.
- Integration access is scoped to the workspace that configures it.
- Availability of certain integrations may be gated by plan tier.
- Disconnecting an integration immediately revokes its access token.
- Webhook deliveries must be verifiable and retried on transient failure.

**User Flow**
1. Admin browses available integrations.
2. Admin authorizes a connection via the provider's flow.
3. System stores the scoped, revocable authorization.
4. Data syncs or events flow per the integration contract.
5. Admin can review or disconnect the integration at any time.

**Best Practices**
- Gate premium integrations to drive tier upgrades.
- Make authorization scopes explicit and minimal.
- Provide clear connection health and error visibility.
- Version the public API to avoid breaking consumers.

**Common Mistakes**
- Requesting excessive permission scopes.
- No visibility into failed syncs or webhooks.
- Breaking API changes without versioning.
- Integrations that leak across workspace boundaries.

**Future Improvements**
- No-code integration/workflow builder.
- Marketplace with third-party developer ecosystem.
- Bi-directional real-time sync with conflict resolution.

---

## 9. Notifications

**Purpose**
Keep users and admins informed of relevant business and account events across channels, driving engagement, retention, and timely action.

**Features**
- Multi-channel delivery (in-app, email, push, SMS)
- Transactional notifications (billing, limits, security)
- Lifecycle and engagement notifications
- User notification preferences and opt-outs
- Digest and batching options
- Admin/team broadcast notifications

**Business Rules**
- Transactional notifications (billing, security) are always delivered regardless of marketing opt-out.
- Users can control preferences for non-essential notifications.
- Every notification maps to a defined triggering event.
- Opt-out preferences are honored per channel and per category.
- Critical alerts (payment failure, limit reached) are prioritized for delivery.

**User Flow**
1. A business event occurs (renewal, limit, invite).
2. System evaluates the recipient's preferences and channel rules.
3. Notification is dispatched on permitted channels.
4. User acts on or dismisses the notification.
5. Preference changes update future delivery.

**Best Practices**
- Separate essential transactional from optional marketing messages.
- Respect preferences and provide granular controls.
- Batch low-priority events into digests to reduce fatigue.
- Make critical alerts unmissable and actionable.

**Common Mistakes**
- Over-notifying and causing fatigue and opt-outs.
- Suppressing critical transactional alerts by mistake.
- Ignoring per-channel preferences.
- Notifications with no clear action.

**Future Improvements**
- AI-timed delivery for optimal engagement.
- Smart bundling based on user behavior.
- Unified cross-channel preference center.

---

## 10. Business Reports

**Purpose**
Give operators and customers visibility into the health and performance of the business through metrics, dashboards, and exports that inform decisions.

**Features**
- Revenue metrics (MRR, ARR, churn, LTV, ARPU)
- Subscription and usage analytics
- Customer/account activity reports
- Exportable reports (CSV, PDF) and scheduled delivery
- Role-scoped dashboards (operator vs. customer)
- Filtering, date ranges, and cohort views

**Business Rules**
- Report visibility is scoped by role and workspace.
- Financial metrics are derived from reconciled billing data.
- Customers see only their own workspace's data.
- Exports respect the same access scope as the on-screen view.
- Metrics definitions are consistent across all reports.

**User Flow**
1. User opens the reports/dashboard area.
2. System loads role- and workspace-scoped metrics.
3. User filters by date range, cohort, or segment.
4. User views trends and drills into detail.
5. User exports or schedules recurring report delivery.

**Best Practices**
- Standardize metric definitions to avoid conflicting numbers.
- Scope every report to the viewer's permissions.
- Surface a few key metrics prominently over dense tables.
- Base financial reporting on reconciled, not raw, data.

**Common Mistakes**
- Inconsistent metric definitions across views.
- Exposing data beyond the viewer's scope.
- Overloading dashboards with vanity metrics.
- Reports built on unreconciled billing data.

**Future Improvements**
- AI-generated narrative insights and anomaly detection.
- Predictive forecasting for revenue and churn.
- Custom report builder with saved views.

---

*End of Universal SaaS Business Engine. This baseline is domain-agnostic and ready to be layered under the AI Meal Planning idea-specific System Architecture Document by solution-architect-app. Domain-specific meal-planning business logic, and all database/API/backend/security/testing/deployment concerns, are intentionally out of scope and owned by the respective downstream agents.*

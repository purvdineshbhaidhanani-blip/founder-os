# Universal SaaS Business Engine — Freelancer Budgeting AI

> The standardized, domain-agnostic business-rules baseline. This document defines how the business itself runs — pricing, billing, access, and reporting — never the domain-specific budgeting logic (which belongs to downstream architects) and never implementation-layer concerns (database, API, backend, security, testing, deployment).

---

## 1. Pricing Strategy

**Purpose**
Define how the SaaS packages and prices access to value so that plans map cleanly to willingness-to-pay, remain simple to communicate, and give the business predictable, expandable revenue.

**Features**
- Tiered plan catalog (e.g., Free, Starter, Pro, Business/Enterprise).
- Monthly and annual billing intervals with an annual-commitment discount.
- Per-seat, flat-rate, and usage-based pricing components that can be combined.
- Free trial and/or freemium entry tier with defined conversion path.
- Add-ons and metered overages priced independently of base plans.
- Regional/currency-aware price books and promotional coupon support.

**Business Rules**
- Every paid plan must define its billing interval, currency, and included entitlements.
- Exactly one plan is active per customer account at any time; add-ons attach to that plan.
- A plan change takes effect at a defined boundary: upgrades immediately, downgrades at the next renewal.
- Published prices are versioned; existing subscribers stay on their agreed price until an explicit migration (price grandfathering).
- Discounts and coupons carry an eligibility scope, an expiry, and a stacking rule (default: non-stacking).
- A Free tier, if offered, must never require payment details to activate.

**User Flow**
1. Prospect views the pricing page and compares tiers and intervals.
2. They select a plan and billing interval (and optional add-ons).
3. The system computes price with any applicable coupon and currency.
4. The prospect confirms and proceeds to checkout / trial activation.
5. Entitlements for the chosen plan are provisioned to the account.

**Best Practices**
- Keep the tier count small (3–4) with one clearly recommended plan.
- Anchor annual pricing against monthly to make savings obvious.
- Express each tier by the value/outcome it unlocks, not raw feature counts.
- Grandfather existing customers when raising prices and give advance notice.

**Common Mistakes**
- Too many tiers or overlapping plans that paralyze the buyer.
- Hiding the real cost behind mandatory add-ons or unclear overage rates.
- Changing prices for active subscribers without notice or grandfathering.
- Coupling pricing tightly to a single feature that later becomes commoditized.

**Future Improvements**
- Experiment-driven pricing (A/B price tests by cohort).
- Localized purchasing-power pricing per region.
- Usage-based "pay-as-you-grow" hybrid tiers.
- Self-serve custom-quote flow for larger accounts.

---

## 2. Subscription Rules

**Purpose**
Govern the full lifecycle of a customer's paid relationship — activation, renewal, upgrade, downgrade, pause, and cancellation — so state transitions are predictable and revenue is recognized correctly.

**Features**
- Subscription lifecycle states: trialing, active, past_due, paused, canceled, expired.
- Automatic renewal at interval boundaries.
- Proration on mid-cycle upgrades and plan changes.
- Trial-to-paid conversion with grace handling.
- Pause/resume and scheduled cancellation.
- Dunning windows for failed renewals before downgrade.

**Business Rules**
- A subscription has exactly one lifecycle state at a time; transitions follow a defined state machine.
- Trials convert to paid automatically at trial end unless canceled beforehand.
- Upgrades are immediate with prorated charges; downgrades apply at the next renewal to avoid mid-cycle credit abuse.
- A failed renewal moves the subscription to past_due and enters dunning, not immediate cancellation.
- Cancellation preserves access until the end of the paid period (cancel-at-period-end by default).
- Reactivation before expiry restores the prior plan and entitlements.

**User Flow**
1. Customer activates a trial or paid subscription.
2. The system tracks the current period and renewal date.
3. At the boundary, it renews, upgrades, downgrades, or cancels per the customer's standing instruction.
4. On failed payment, the account enters dunning and the customer is prompted to update billing.
5. On cancellation, access continues until period end, then the account downgrades or expires.

**Best Practices**
- Make cancellation self-serve and low-friction to build trust and reduce chargebacks.
- Clearly show renewal date and next charge amount before each cycle.
- Offer pause as a retention alternative to cancellation.
- Send pre-renewal reminders, especially for annual plans.

**Common Mistakes**
- Cutting off access instantly on a single failed payment.
- Silent auto-renewal with no advance notice.
- Applying downgrades immediately and granting refund credit that invites gaming.
- Making cancellation require contacting support.

**Future Improvements**
- Predictive churn scoring to trigger targeted retention offers.
- Flexible mid-cycle plan swapping with smart proration previews.
- Win-back campaigns for expired subscriptions.
- Configurable pause durations with auto-resume.

---

## 3. Payment System

**Purpose**
Define how the business collects money reliably — capturing payment methods, charging on schedule, handling failures, and issuing refunds — independent of any specific payment provider.

**Features**
- Multiple payment methods (card, wallet, bank debit, invoice for larger accounts).
- Secure vaulting of payment tokens (provider-managed).
- Automated recurring charges tied to subscription renewals.
- Retry/dunning logic for failed charges.
- Refunds, partial refunds, and credit notes.
- Invoices and receipts with tax/VAT handling.

**Business Rules**
- The business never stores raw payment credentials; only provider-issued tokens are referenced.
- Every charge maps to an invoice with a unique identifier and an auditable status.
- Failed charges follow a fixed retry schedule before the subscription is marked past_due.
- Refunds require a reason code and cannot exceed the original captured amount.
- Taxes are calculated per the customer's billing jurisdiction at charge time.
- A successful payment must provision or extend entitlements atomically with invoice settlement.

**User Flow**
1. Customer enters a payment method at checkout.
2. The provider tokenizes and validates it.
3. On each renewal, the system charges the stored method.
4. On success, an invoice/receipt is issued and access continues.
5. On failure, retries run; if unresolved, the account enters dunning.

**Best Practices**
- Delegate compliance-sensitive handling to a certified payment provider.
- Support account-level tax IDs and generate compliant invoices.
- Use smart retries timed to payday cycles to recover failed charges.
- Notify customers before cards expire.

**Common Mistakes**
- Treating a payment failure as a customer intent to cancel.
- Not issuing proper invoices/receipts for business customers.
- Ignoring currency and tax localization.
- Making refunds manual and slow, harming trust.

**Future Improvements**
- Multi-provider routing for higher authorization rates.
- Account-balance/credit wallet for prepaid usage.
- Automated tax compliance across more jurisdictions.
- In-app payment-method health checks and proactive updates.

---

## 4. Usage Limits

**Purpose**
Define the quotas and entitlements that separate plan tiers and protect infrastructure, so value scales with price and heavy users are guided toward upgrades.

**Features**
- Per-plan quotas (seats, records, actions, storage, API/AI credits).
- Soft limits (warn) and hard limits (block) with configurable thresholds.
- Metered counters that reset per billing period.
- Overage handling: block, throttle, or bill-per-unit.
- Real-time usage visibility for the customer.
- Fair-use / rate protections against abuse.

**Business Rules**
- Every plan declares its quota set; consumption is measured against the active plan's entitlements.
- Metered counters reset at the start of each billing period unless defined as lifetime caps.
- Reaching a hard limit blocks the gated action until upgrade, overage purchase, or reset.
- Soft-limit thresholds trigger warnings (e.g., at 80% and 100%) but do not block.
- Downgrades that place usage above the new plan's limits must define an enforcement rule (grace period or read-only).
- Overage billing, when enabled, uses the plan's published per-unit rate.

**User Flow**
1. Customer consumes a metered resource.
2. The system increments the counter and compares it to the plan quota.
3. At soft thresholds, it warns; at hard limits, it blocks or bills overage.
4. Counters reset at the next billing period.
5. Upgrading raises the quota immediately.

**Best Practices**
- Make current usage and remaining quota visible at all times.
- Warn before blocking; never surprise a user at a hard wall.
- Align the primary metered unit with the customer's perceived value.
- Offer a graceful path (upgrade or overage) at every limit.

**Common Mistakes**
- Hidden limits discovered only when work is blocked.
- Metering on a dimension that doesn't correlate with value or cost.
- Hard-blocking without any warning or upgrade path.
- Not defining what happens to over-quota data after a downgrade.

**Future Improvements**
- Predictive quota alerts based on usage trend.
- Rollover of unused credits within limits.
- Dynamic, self-optimizing fair-use thresholds.
- One-click in-context upgrade at the moment a limit is hit.

---

## 5. Revenue Model

**Purpose**
Define how the business converts product usage into sustainable, growing revenue and how that revenue is structured, expanded, and measured.

**Features**
- Recurring subscription revenue (MRR/ARR) as the core stream.
- Expansion revenue via upsell, cross-sell, and seat growth.
- Usage/overage and add-on revenue streams.
- One-time revenue (setup, professional services) where applicable.
- Partner/referral or marketplace revenue share.
- Revenue metrics: MRR, ARR, ARPU, LTV, churn, expansion rate.

**Business Rules**
- Recurring revenue is recognized over the service period, not fully at charge time.
- Each revenue stream is categorized (recurring, expansion, one-time, usage) for reporting.
- Expansion is tracked separately from new-business revenue.
- Refunds and credits reduce recognized revenue in the appropriate period.
- Discounts are recorded so gross and net revenue are both visible.
- Every revenue event traces back to a subscription, invoice, or add-on.

**User Flow**
1. A customer subscribes, generating recurring revenue.
2. Usage growth and upgrades generate expansion revenue.
3. Add-ons and overages contribute incremental revenue.
4. Cancellations and refunds reduce revenue (churn/contraction).
5. The business aggregates all streams into revenue metrics.

**Best Practices**
- Prioritize net revenue retention; expansion should offset churn.
- Separate new, expansion, and churned revenue in all analysis.
- Favor recurring over one-time revenue for predictability.
- Model LTV against acquisition cost before scaling spend.

**Common Mistakes**
- Recognizing annual revenue up front instead of over the period.
- Optimizing new logos while ignoring churn and contraction.
- Blending discounts into gross revenue and losing net visibility.
- Over-relying on one-time services that don't compound.

**Future Improvements**
- Automated revenue-recognition schedules.
- Cohort-based LTV and payback modeling.
- Marketplace/partner revenue-share automation.
- Scenario forecasting for pricing and packaging changes.

---

## 6. User Roles

**Purpose**
Define who can do what inside an account so access is scoped to responsibility, sensitive actions are protected, and accountability is clear.

**Features**
- Predefined roles (Owner, Admin, Member, Billing, Viewer/Guest).
- Role-based permission sets covering data, settings, and billing.
- Invitation and role assignment on onboarding.
- Role changes and revocation.
- Ownership transfer.
- Audit trail of who did what (business-level, not security-implementation).

**Business Rules**
- Every account has exactly one Owner at all times; ownership can be transferred but not left empty.
- Billing actions are restricted to Owner and Billing roles.
- A user's effective permissions are the union of their assigned role(s) within an account.
- Only Admins/Owners can invite, change roles, or remove members.
- A user cannot elevate their own role.
- Removing a user immediately revokes their access to the account's resources.

**User Flow**
1. Owner/Admin invites a user and assigns a role.
2. The invitee accepts and receives role-scoped access.
3. The user performs only actions their role permits.
4. Admins adjust roles as responsibilities change.
5. On removal or transfer, access is updated immediately.

**Best Practices**
- Default new members to least-privilege roles.
- Keep the role set small and understandable.
- Require at least one Admin besides the Owner for continuity.
- Log role changes for accountability.

**Common Mistakes**
- Too many custom roles that no one understands.
- Giving everyone Admin by default.
- No clear ownership-transfer path when the Owner leaves.
- Allowing self-elevation of privileges.

**Future Improvements**
- Custom, granular role builder.
- Time-boxed and just-in-time access grants.
- Role templates per team function.
- Approval workflows for sensitive role changes.

---

## 7. Team & Workspace

**Purpose**
Define how multiple users collaborate within isolated organizational containers so data, billing, and membership are cleanly separated across customers and teams.

**Features**
- Workspaces/organizations as the top-level tenant boundary.
- Team membership and invitations scoped to a workspace.
- Per-workspace settings, billing, and entitlements.
- Multi-workspace membership for a single user.
- Workspace-level resource ownership and sharing.
- Workspace creation, renaming, and deletion.

**Business Rules**
- A workspace is the unit of billing and entitlement; subscriptions attach to workspaces, not individual users.
- Data is isolated per workspace; members of one workspace cannot access another's resources.
- A user may belong to multiple workspaces with independent roles in each.
- Seat quotas are enforced at the workspace level.
- Deleting a workspace removes its members' access and follows a defined retention/grace policy.
- Each workspace has an Owner responsible for its billing.

**User Flow**
1. A user creates a workspace and becomes its Owner.
2. They invite members and assign roles within it.
3. The workspace's plan governs shared entitlements and seat count.
4. Members collaborate on workspace-scoped resources.
5. Users switch between workspaces they belong to.

**Best Practices**
- Make the workspace the clear billing and isolation boundary.
- Support easy switching for users in multiple workspaces.
- Enforce seat limits at invite time, not after the fact.
- Define a clear grace period before permanent workspace deletion.

**Common Mistakes**
- Tying billing to individual users instead of the workspace.
- Leaking data across tenant boundaries.
- No graceful handling when seat limits are exceeded.
- Immediate, irreversible workspace deletion with no recovery window.

**Future Improvements**
- Nested teams/sub-workspaces within an organization.
- Cross-workspace resource sharing with governance.
- Workspace-level usage analytics.
- Bulk member management and directory sync.

---

## 8. Integrations

**Purpose**
Define how the business connects to external tools and platforms as part of its commercial value so customers can extend the product and the business can grow through ecosystems.

**Features**
- Connectable third-party integrations (import/export, sync, automation).
- Integration marketplace/directory.
- Per-workspace connection management.
- Plan-gated integration availability.
- Connection health status and re-authorization.
- Webhooks/outbound events for automation (as a business capability).

**Business Rules**
- Integrations connect at the workspace level and respect the workspace's entitlements.
- Availability of premium integrations may be gated by plan tier.
- Only Admins/Owners can add or remove integrations for a workspace.
- A disconnected or expired integration must not silently fail; it surfaces a status.
- Each integration declares the data scope it accesses within the workspace.
- Disabling an integration revokes its access immediately.

**User Flow**
1. Admin browses the integration directory.
2. They connect and authorize an integration for the workspace.
3. Data flows per the integration's declared scope.
4. Connection health is monitored and surfaced.
5. Admins re-authorize or disconnect as needed.

**Best Practices**
- Gate premium integrations to differentiate higher tiers.
- Surface clear connection status and error recovery steps.
- Scope each integration to the minimum data it needs.
- Provide a directory so customers can discover value.

**Common Mistakes**
- Silent integration failures that erode trust.
- Over-broad data access scopes.
- Letting any member connect integrations without oversight.
- Treating integrations as an afterthought rather than a growth lever.

**Future Improvements**
- Public developer platform and partner program.
- No-code automation builder across connected tools.
- Usage analytics per integration.
- Certified-partner marketplace with revenue share.

---

## 9. Notifications

**Purpose**
Define how the business communicates with customers around commercial and lifecycle events so users stay informed, act on time, and remain engaged and retained.

**Features**
- Transactional notifications (billing, renewals, receipts, limits).
- Lifecycle notifications (trial ending, onboarding, re-engagement).
- Multi-channel delivery (email, in-app, optional push/SMS).
- User notification preferences and opt-outs.
- Admin/workspace alerts (seat limits, member changes).
- Digest and frequency controls.

**Business Rules**
- Critical billing and account notifications (payment failure, renewal, cancellation) are always sent regardless of marketing preferences.
- Marketing/engagement messages require opt-in consent and honor opt-outs.
- Each notification maps to a defined business event.
- Usage-limit warnings fire at defined thresholds before a hard block.
- Notification preferences are respected per user, per channel.
- Duplicate notifications for the same event are suppressed.

**User Flow**
1. A business event occurs (renewal, limit reached, invite).
2. The system determines eligible recipients and channels.
3. It checks preferences and consent.
4. It delivers the notification on the allowed channels.
5. The user acts, adjusts preferences, or dismisses.

**Best Practices**
- Separate transactional from marketing messages clearly.
- Give granular, easy preference controls.
- Time renewal and trial-ending notices with enough lead time.
- Prefer actionable notifications over noise.

**Common Mistakes**
- Burying critical billing alerts among marketing emails.
- No opt-out or ignoring preferences.
- Over-notifying until users disengage entirely.
- Sending limit warnings only after the user is already blocked.

**Future Improvements**
- Smart send-time and channel optimization.
- Personalized lifecycle journeys.
- In-context nudges tied to usage milestones.
- Consolidated digests to reduce fatigue.

---

## 10. Business Reports

**Purpose**
Define the reporting the business needs to understand its own health — revenue, retention, usage, and growth — so operators and customers can make informed decisions.

**Features**
- Revenue dashboards (MRR/ARR, expansion, churn).
- Subscription and lifecycle reports (trials, conversions, cancellations).
- Usage and adoption reports.
- Customer/account-level summaries.
- Workspace/team activity reports for account admins.
- Exportable reports and scheduled summaries.

**Business Rules**
- Reports reflect the same revenue-recognition and metric definitions used across the engine (single source of truth).
- Account admins see reports scoped to their own workspace only.
- Business-wide reports (all customers) are restricted to internal operator roles.
- Report time periods are clearly bounded and consistently defined.
- Metrics like MRR, churn, and LTV use documented, consistent formulas.
- Exports respect the requesting user's access scope.

**User Flow**
1. An operator or admin opens the reporting view.
2. They select the metric, scope, and time period.
3. The system aggregates data per the standard definitions.
4. Results are displayed and can be exported or scheduled.
5. Decisions are made from consistent, scoped figures.

**Best Practices**
- Standardize metric definitions so numbers reconcile everywhere.
- Scope customer-facing reports strictly to their own workspace.
- Show trends over time, not just point-in-time snapshots.
- Offer both summary dashboards and exportable detail.

**Common Mistakes**
- Inconsistent metric definitions across dashboards.
- Exposing cross-tenant data in customer-facing reports.
- Vanity metrics that don't drive decisions.
- Snapshot-only views with no trend context.

**Future Improvements**
- Custom report builder with saved views.
- Benchmarking against anonymized cohorts.
- Predictive/forecast reporting.
- Scheduled, auto-delivered executive summaries.

---

*This document is the universal business-rules baseline for Freelancer Budgeting AI. Domain-specific budgeting logic and the idea-specific System Architecture Document are layered on top by solution-architect-app; implementation-layer concerns (database, API, backend, security, testing, deployment) remain owned by their respective architects and agents.*

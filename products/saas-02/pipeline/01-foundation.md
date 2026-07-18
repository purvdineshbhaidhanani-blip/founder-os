# Universal SaaS Foundation — Freelancer Tax Filing AI

> This document defines the standardized, domain-agnostic 13-module SaaS foundation for **Freelancer Tax Filing AI**. It contains only the universal SaaS baseline every product needs. It deliberately contains **no tax-specific, filing-specific, or accounting-specific logic** — that domain layer belongs to the downstream solution-architect-app and developer-agent, who layer the idea-specific System Architecture Document on top of this baseline.

---

## Module 1 — Authentication

**Purpose**
Establish secure, frictionless identity verification and session management so a user can create an account, prove who they are, and access the product safely across devices.

**Features**
- Email/password sign-up and sign-in with strong password policy and breach-password checks.
- Social/SSO providers (Google, Apple, Microsoft) and enterprise SSO (SAML/OIDC) for later tiers.
- Passwordless options: magic link and one-time passcode (OTP).
- Multi-factor authentication (TOTP app, SMS fallback, backup codes).
- Email verification and secure password reset with expiring tokens.
- Session management: device list, "log out everywhere," refresh-token rotation.
- Rate limiting, bot protection (CAPTCHA on risk), and account lockout on repeated failures.

**Screens**
- Sign-up
- Sign-in
- Forgot password / reset password
- Email verification / confirmation
- MFA setup and MFA challenge
- Active sessions & devices
- Account locked / recovery

**User Flow**
User lands on sign-in and chooses email, social, or passwordless → new users complete sign-up, then verify email → if MFA is enabled, the user completes the second factor → a session is issued; tokens refresh silently in the background → user can review active sessions and revoke any device from settings.

**UX Best Practices**
- Single primary auth action per screen; put social buttons above the fold.
- Inline, specific validation ("Password needs 8+ characters"), never a generic "invalid."
- Show/hide password toggle; support password managers and autofill.
- Mobile: large tap targets, numeric keypad for OTP, auto-read SMS codes where supported.
- Desktop: keyboard navigation, Enter-to-submit, visible focus states.
- Preserve intended destination and return the user there after login (deep-link continuity).

**Common Mistakes**
- Forcing account creation before showing any value.
- Vague errors that don't say which field failed.
- Blocking paste in password/OTP fields.
- Making MFA impossible to recover (no backup codes).
- Logging users out too aggressively or too rarely.

**Future Improvements**
- Passkeys / WebAuthn as the default passwordless method.
- Adaptive/risk-based authentication using device and location signals.
- Organization-level SSO enforcement and SCIM user provisioning.
- Step-up authentication for sensitive actions.

---

## Module 2 — User Profile

**Purpose**
Give each user a single place to view and manage their identity, personal details, and account-level preferences that other modules read from.

**Features**
- Editable profile: name, avatar, display name, contact email, phone, locale, timezone.
- Avatar upload with crop and fallback initials/gradient.
- Account status, member-since date, and unique account ID.
- Connected accounts (social/SSO) linking and unlinking.
- Language, timezone, and regional formatting preferences.
- Personal security shortcuts (change password, manage MFA — deep links into Auth).
- Data export request and account deletion entry point (privacy compliance).

**Screens**
- Profile overview
- Edit profile
- Avatar upload/crop
- Connected accounts
- Preferences (language/timezone/format)
- Data & privacy (export/delete)

**User Flow**
User opens profile from the global avatar menu → reviews current details, clicks edit on a field or section → makes changes; inline validation confirms format → saves; a toast confirms success and changes propagate to other modules → sensitive changes (email) trigger a re-verification step.

**UX Best Practices**
- Autosave or clearly-scoped Save/Cancel per section — never lose edits on navigation.
- Optimistic UI with rollback on failure.
- Mobile: full-width form fields, sticky Save bar; Desktop: two-column layout with live preview of avatar/name.
- Sensible defaults for timezone/locale detected from the browser/device.
- Clear, reversible-where-possible destructive actions with confirmation.

**Common Mistakes**
- Mixing account settings and app settings into one unstructured page.
- Silent save failures with no feedback.
- No fallback avatar, causing broken images.
- Allowing email change without re-verification.

**Future Improvements**
- Profile completeness meter with contextual nudges.
- Multiple profiles/personas under one login.
- Public/shareable profile card where relevant.
- Richer accessibility preferences (contrast, motion, font size) synced across devices.

---

## Module 3 — Subscription & Billing

**Purpose**
Let users choose, view, upgrade, downgrade, and manage recurring plans, and give them full transparency into what they pay and why.

**Features**
- Plan catalog with monthly/annual toggle and clear feature comparison.
- Free trial, freemium tier, and paid tiers with proration on changes.
- Upgrade/downgrade/cancel with mid-cycle proration and effective-date clarity.
- Usage-based / metered add-ons and seat management for teams.
- Invoices and receipts history with downloadable PDFs.
- Tax/VAT handling at the billing layer (rates, IDs) — generic billing concern, not product tax logic.
- Coupons, promo codes, and referral credits.
- Dunning: failed-payment retries, grace periods, and reminder emails.

**Screens**
- Pricing / plan selection
- Current plan & usage overview
- Change plan (upgrade/downgrade)
- Billing history & invoices
- Payment method management (links to Payments)
- Cancel/pause flow with retention offer

**User Flow**
User views current plan and usage against limits → selects a new plan; sees a clear proration preview and next charge → confirms; billing updates immediately and entitlements change → invoices are generated and emailed; history updates → on cancel, user sees what they'll lose and when access ends.

**UX Best Practices**
- Always show the exact next charge amount and date before confirmation.
- Annual savings shown as a concrete percentage/amount.
- Make downgrade and cancel as findable as upgrade — no dark patterns.
- Mobile: stacked plan cards with a highlighted recommended tier; Desktop: side-by-side comparison table.
- Never surprise users: proactive renewal and price-change notifications.

**Common Mistakes**
- Hiding cancellation or requiring contacting support to cancel.
- Unclear proration causing bill-shock and chargebacks.
- No grace period on failed payments, causing instant lockout.
- Feature limits that aren't visible until hit.

**Future Improvements**
- In-app plan recommendations based on actual usage.
- Self-serve pause/snooze subscriptions.
- Team/enterprise quoting and PO-based billing.
- Real-time usage dashboards with overage forecasting.

---

## Module 4 — Payments

**Purpose**
Securely capture and process payment instruments and transactions, powering the billing module while meeting PCI and regional payment standards.

**Features**
- Multiple payment methods: cards, digital wallets (Apple/Google Pay), ACH/bank debit, regional methods.
- Tokenized, PCI-compliant storage via a payment processor (Stripe-class) — no raw card data stored.
- Add/update/remove and set-default payment method.
- 3-D Secure / SCA support and strong customer authentication flows.
- Automatic retries and smart routing on failures.
- Refunds and partial refunds with audit trail.
- Payment receipts and status (succeeded, pending, failed, refunded).

**Screens**
- Payment methods list
- Add/edit payment method
- Checkout / confirm payment
- 3-D Secure challenge
- Payment status / receipt
- Refund status

**User Flow**
At checkout or in settings, user adds a payment method → processor tokenizes the instrument; SCA challenge runs if required → payment is authorized and captured; status is shown immediately → on failure, a clear reason and retry/alternative method is offered → receipts are generated and stored in billing history.

**UX Best Practices**
- Use the processor's hosted/embedded fields to minimize PCI scope.
- Real-time card validation, card-type detection, and formatting.
- Never blame the user for generic failures — offer next steps.
- Mobile: wallet buttons first, autofill card scan; Desktop: minimal, single-column checkout.
- Show security signals (lock icon, processor name) to build trust.

**Common Mistakes**
- Storing or logging raw card/CVV data.
- Opaque decline messages with no recovery path.
- Not supporting wallets, hurting mobile conversion.
- Ignoring SCA/3DS, causing hard declines in some regions.

**Future Improvements**
- Network tokenization and account updater for expiring cards.
- Localized payment methods per region auto-detected.
- One-click and biometric-confirmed payments.
- Fraud-scoring integration with adaptive friction.

---

## Module 5 — Dashboard

**Purpose**
Provide the authenticated home base — an at-a-glance overview of status, key metrics, recent activity, and the primary next actions — without embedding any domain-specific business logic.

**Features**
- Personalized greeting and account state summary.
- Configurable metric/summary cards (widgets) with empty, loading, and populated states.
- Recent activity feed and quick actions / shortcuts.
- Getting-started/onboarding checklist surfaced until complete.
- Filters and time-range controls for overview data.
- Responsive widget grid the user can reorder/customize.

**Screens**
- Main dashboard (default view)
- Empty/first-run state
- Customize widgets/layout
- Widget detail / drill-in

**User Flow**
After login, the user lands on the dashboard → first-time users see an empty state with guided setup steps → returning users see live summary cards and recent activity → user clicks a card to drill into detail or a quick action to start a task → user can rearrange or hide widgets to fit their workflow.

**UX Best Practices**
- Design meaningful empty states that teach, not blank screens.
- Skeleton loaders over spinners for perceived speed.
- Progressive disclosure: summary first, detail on demand.
- Mobile: single-column prioritized cards; Desktop: multi-column grid.
- Keep the primary next action obvious and above the fold.

**Common Mistakes**
- Cramming every metric in with no hierarchy.
- No empty/first-run guidance for new users.
- Slow, blocking loads instead of progressive rendering.
- Non-responsive widgets that break on small screens.

**Future Improvements**
- AI-generated summary and "what changed since last visit."
- Saved/custom dashboard views per role.
- Real-time live-updating widgets.
- Exportable/shareable dashboard snapshots.

---

## Module 6 — Notifications

**Purpose**
Keep users informed of relevant events across channels, with full control over what they receive and where, without overwhelming them.

**Features**
- Multi-channel delivery: in-app, email, push (web/mobile), and optional SMS.
- Notification center with read/unread, grouping, and history.
- Granular per-category preferences and channel selection.
- Real-time in-app toasts and a badge/indicator for unread counts.
- Digest/batching options (instant, daily, weekly).
- Do-not-disturb / quiet hours and mute controls.
- Transactional vs. marketing separation with clear opt-outs.

**Screens**
- Notification center / inbox
- Notification preferences
- Toast/snackbar (transient)
- Push permission prompt
- Digest settings

**User Flow**
An event triggers a notification routed by user preferences → user sees an in-app toast and/or badge; email/push sent per settings → user opens the notification center to review and act → clicking a notification deep-links to the relevant context → user tunes categories, channels, and quiet hours anytime.

**UX Best Practices**
- Ask for push permission contextually, after showing value — never on first load.
- Group and collapse related notifications to reduce noise.
- Every notification should be actionable or clearly informational.
- Mobile: respect OS notification settings and quiet hours; Desktop: subtle, non-blocking toasts.
- Make unsubscribe/mute one tap away and honor it immediately.

**Common Mistakes**
- Requesting push permission immediately on load.
- No way to mute or granularly control categories.
- Mixing marketing into transactional channels.
- Notifications that link nowhere useful.

**Future Improvements**
- AI-prioritized "important first" notification ranking.
- Smart bundling and send-time optimization.
- Cross-device read-state sync.
- Snooze and follow-up reminders on notifications.

---

## Module 7 — AI Features

**Purpose**
Provide the universal AI interaction layer — assistant, generation, and suggestions — as reusable infrastructure. Domain-specific AI outputs are defined downstream; this module covers the generic AI UX, controls, and safety scaffolding.

**Features**
- Conversational assistant panel with streaming responses.
- Prompt input with suggestions, history, and re-run/regenerate.
- Context awareness of the user's current view (generic context passing).
- Feedback controls (thumbs up/down, report) to improve quality.
- Transparency: model/version indicator, "AI-generated" labeling, and confidence/citations where applicable.
- Usage metering and rate limits tied to plan (links to Billing).
- Guardrails: content filtering, PII handling, and human-in-the-loop confirmation for consequential actions.

**Screens**
- AI assistant panel / chat
- Prompt/command bar
- AI results with actions (accept/edit/regenerate)
- AI feedback modal
- AI usage & limits

**User Flow**
User opens the assistant or invokes an AI action inline → user enters a prompt or selects a suggested action → the system streams a response with clear "AI-generated" labeling → user accepts, edits, regenerates, or rejects the output → user leaves feedback; usage is metered against their plan.

**UX Best Practices**
- Stream tokens for responsiveness; show a clear thinking/loading state.
- Always let users edit and undo AI output — AI proposes, user disposes.
- Be transparent about limitations and never present AI output as guaranteed fact.
- Mobile: collapsible assistant sheet; Desktop: docked side panel.
- Require explicit confirmation before AI performs irreversible actions.

**Common Mistakes**
- Presenting AI output as authoritative with no disclaimer or review step.
- No feedback loop to catch bad outputs.
- Blocking UI while waiting for a full response.
- Ignoring cost/rate limits, leading to abuse or bill surprises.

**Future Improvements**
- Personalized assistant memory (with explicit user consent).
- Multi-modal input (voice, image, document).
- Agentic workflows with reviewable, step-by-step actions.
- Model selection and fine-tuned domain adapters supplied by downstream layer.

---

## Module 8 — File Manager

**Purpose**
Let users upload, organize, preview, and manage files and documents securely — a generic storage layer any SaaS needs, independent of what the files contain.

**Features**
- Drag-and-drop and picker uploads with multi-file and folder support.
- Upload progress, pause/resume, and retry on failure.
- Folder hierarchy, tags, rename, move, and bulk actions.
- Previews for common types (images, PDFs, docs) and thumbnails.
- Versioning and restore of previous versions.
- Sharing with permission levels (view/edit) and expiring links.
- Storage quota display tied to plan; trash/recycle bin with restore.
- Virus/malware scanning and encryption at rest and in transit.

**Screens**
- File browser (grid/list)
- Upload / drag-drop overlay
- File preview
- File/folder detail & permissions
- Share dialog
- Trash / restore
- Storage usage

**User Flow**
User uploads via drag-drop or picker; progress shows per file → files land in a folder; user organizes with move/tag/rename → user previews a file inline without downloading → user shares with a permissioned link or teammate → deleted files go to trash and can be restored within a window.

**UX Best Practices**
- Show real upload progress and handle large files gracefully (chunked/resumable).
- Non-blocking uploads that continue during navigation.
- Clear quota indicators before the user hits the limit.
- Mobile: camera/photo library capture, single-column list; Desktop: dense grid with multi-select.
- Confirm destructive actions and keep a recoverable trash.

**Common Mistakes**
- No progress or feedback on large/slow uploads.
- Losing files on network interruption (no resume).
- Permanent deletes with no trash/recovery.
- Ignoring file-type/size validation and security scanning.

**Future Improvements**
- Full-text/OCR content indexing feeding Search.
- Real-time collaborative file annotation.
- Automated organization and smart folders.
- Offline access with background sync.

---

## Module 9 — Search

**Purpose**
Provide fast, unified discovery across the product's content and navigation, so users find anything quickly regardless of where it lives.

**Features**
- Global search bar with keyboard shortcut (e.g., Cmd/Ctrl-K).
- Instant, typeahead results with grouping by type.
- Filters, facets, and sorting (date, type, owner).
- Recent searches, saved searches, and suggestions.
- Fuzzy matching, typo tolerance, and synonyms.
- Deep-link results that jump directly to context.
- Scoped search (within a folder/section) and global scope.

**Screens**
- Global search / command palette
- Search results (with filters)
- Empty / no-results state
- Recent & saved searches

**User Flow**
User invokes search via bar or shortcut → typeahead surfaces grouped results instantly → user refines with filters/facets → user selects a result and is deep-linked to it → query is saved to recent searches for reuse.

**UX Best Practices**
- Sub-200ms perceived response with debounced, incremental results.
- Helpful no-results state with suggestions and spelling correction.
- Keyboard-first navigation of results; highlight matched terms.
- Mobile: full-screen search overlay; Desktop: command-palette modal.
- Preserve and restore filters and recent queries.

**Common Mistakes**
- Requiring exact matches with no typo tolerance.
- Slow, blocking search with no incremental feedback.
- Dead-end no-results screens.
- Losing the user's query/filters on back navigation.

**Future Improvements**
- Natural-language / semantic search powered by embeddings.
- Personalized ranking based on usage.
- Search analytics to surface content gaps.
- Voice search on mobile.

---

## Module 10 — Settings

**Purpose**
Centralize account, workspace, security, and application preferences in a structured, discoverable place — the control center for everything not covered by Profile.

**Features**
- Account settings (email, password, MFA — deep links to Auth).
- Workspace/organization settings and member management (for teams).
- Appearance: theme (light/dark/system), density, language.
- Notification preferences entry point (links to Notifications).
- Privacy & data: export, deletion, consent, and cookie preferences.
- Security: sessions, connected apps, API keys/tokens.
- Roles and permissions management for teams.

**Screens**
- Settings home / navigation
- Account
- Appearance
- Security & sessions
- Team / members & roles
- Privacy & data
- API keys / developer

**User Flow**
User opens settings from the global menu → navigates a clear sidebar/section list to the target area → edits a setting with immediate or explicitly-saved feedback → sensitive changes require re-authentication → changes apply across devices and sessions.

**UX Best Practices**
- Logical grouping with search within settings.
- Autosave with confirmation, or clear Save/Cancel — be consistent.
- Show current values and sensible defaults; explain non-obvious options.
- Mobile: collapsible accordion sections; Desktop: two-pane (nav + detail).
- Gate destructive/sensitive settings behind confirmation and re-auth.

**Common Mistakes**
- One giant unstructured settings page.
- Duplicating/contradicting Profile and Notifications controls.
- No search, making options hard to find.
- Applying dangerous changes without confirmation.

**Future Improvements**
- Settings search and recently-changed history/audit.
- Role-based visibility of settings.
- Import/export of settings profiles.
- Contextual, inline settings surfaced where relevant.

---

## Module 11 — Integrations

**Purpose**
Connect the product to external tools and services through a governed marketplace and connection layer, without embedding any specific third-party's domain logic here.

**Features**
- Integration directory/marketplace with categories and search.
- OAuth-based connect/disconnect flows with scoped permissions.
- Connection status, health, and reconnect on token expiry.
- Webhooks (inbound/outbound) and event subscriptions.
- API keys and developer credentials management.
- Per-integration configuration and field mapping (generic).
- Audit log of integration activity and data sync status.

**Screens**
- Integration directory
- Integration detail / permissions
- Connect (OAuth consent) flow
- Connected integrations list & status
- Integration configuration
- Webhooks & API keys

**User Flow**
User browses the directory and selects an integration → reviews requested scopes and authorizes via OAuth → configures options/mapping for the connection → connection status shows healthy; data syncs → user can reconfigure, reconnect, or disconnect anytime.

**UX Best Practices**
- Show exactly what data/scopes each integration accesses before connecting.
- Clear connection health with actionable reconnect prompts.
- Graceful handling of expired tokens and revoked access.
- Mobile: simple connect/disconnect cards; Desktop: detailed config panels.
- Make disconnect and data-removal straightforward and honest.

**Common Mistakes**
- Requesting broad scopes without explanation.
- Silent integration failures with no health signal.
- No way to see or revoke connected apps.
- Hard-coding a single integration instead of an extensible layer.

**Future Improvements**
- Public API and developer portal with docs and sandbox.
- No-code workflow/automation builder across integrations.
- Marketplace with third-party-built integrations and reviews.
- Granular, per-field sync controls and conflict resolution.

---

## Module 12 — Support

**Purpose**
Help users get unblocked through self-service and human assistance, and give the team a channel to resolve issues — a universal help layer.

**Features**
- Help center / knowledge base with searchable articles.
- Contextual in-app help and tooltips.
- Ticket submission and status tracking.
- Live chat / chatbot with human handoff.
- Feedback and feature-request capture.
- System status page and incident notices.
- Contact options with SLA/response-time expectations by plan.

**Screens**
- Help center / knowledge base
- Article view
- Contact / submit ticket
- Ticket status & history
- Live chat widget
- Feedback form
- System status

**User Flow**
User opens help and searches the knowledge base → if unresolved, they start a chat or submit a ticket with context attached → they receive a confirmation and tracking reference → support responds; the user follows the thread in-app and via email → on resolution, the user can rate the interaction.

**UX Best Practices**
- Surface self-service first; deflect with relevant articles before the contact form.
- Auto-attach context (page, version, account) to reduce back-and-forth.
- Set and honor response-time expectations transparently.
- Mobile: persistent but unobtrusive help launcher; Desktop: docked widget.
- Keep tone human; make escalation to a person always possible.

**Common Mistakes**
- Hiding support or offering only email with no tracking.
- Chatbot with no human escape hatch.
- Outdated knowledge base articles.
- No status page during incidents, driving ticket floods.

**Future Improvements**
- AI support assistant grounded in the knowledge base.
- Proactive support triggered by detected user friction.
- Community forum and peer support.
- In-context guided walkthroughs for common issues.

---

## Module 13 — Onboarding

**Purpose**
Guide new users from sign-up to first value as quickly as possible, driving activation without teaching any domain-specific workflow here (that layer is added downstream).

**Features**
- Welcome flow and initial setup wizard.
- Progressive onboarding checklist with progress indicator.
- Contextual product tours, tooltips, and coach marks.
- Sample/demo data or templates to explore safely.
- Personalization survey (role, goals) to tailor the experience.
- Milestone celebrations and empty-state guidance.
- Invite-teammates and connect-first-integration prompts.

**Screens**
- Welcome / get started
- Setup wizard (multi-step)
- Personalization questionnaire
- Product tour / coach marks
- Onboarding checklist
- Success / activation confirmation

**User Flow**
After first login, the user enters a short welcome flow → a few personalization questions tailor the setup → a guided tour highlights key areas contextually → a checklist tracks steps toward first value → completing key milestones triggers confirmation and hands off to the dashboard.

**UX Best Practices**
- Keep it short; show value fast and let users skip.
- Progressive disclosure — teach features when they're first needed, not all at once.
- Persist progress so users can resume onboarding later.
- Mobile: full-screen focused steps; Desktop: modal or side-panel guidance.
- Celebrate small wins to build momentum; always allow "skip for now."

**Common Mistakes**
- Long, mandatory, unskippable tours.
- Front-loading every feature before the user does anything.
- No sample data, leaving users staring at empty screens.
- Losing onboarding progress on refresh or across devices.

**Future Improvements**
- Adaptive onboarding paths by role and behavior.
- AI-guided setup that configures the workspace for the user.
- Re-engagement onboarding for returning/lapsed users.
- In-context "what's new" onboarding for feature releases.

---

*End of Universal SaaS Foundation. This baseline is handed to solution-architect-app to be layered beneath the idea-specific System Architecture Document for Freelancer Tax Filing AI.*

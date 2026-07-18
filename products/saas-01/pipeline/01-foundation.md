# Universal SaaS Foundation — Freelancer Budgeting AI

> Standardized baseline foundation. Domain-agnostic by design: this document defines the universal SaaS scaffolding only. Any budgeting-, invoicing-, or tax-specific functionality is intentionally out of scope and belongs to the downstream solution-architect-app and developer-agent. The 13 modules below appear in their locked order, every time, with zero modules skipped, merged, reordered, or invented.

---

## 1. Authentication

**Purpose**
Establish secure, frictionless identity verification and session management so users can create accounts, sign in, and stay signed in across mobile and desktop with confidence in the safety of their data.

**Features**
- Email/password sign-up and sign-in with strong password policy and breach-checked passwords
- Social/SSO login (Google, Apple, Microsoft) and enterprise SSO (SAML/OIDC) for higher tiers
- Passwordless options: magic link and one-time codes
- Multi-factor authentication (TOTP authenticator apps, SMS fallback, backup codes)
- Email verification and secure password reset flows
- Session management with device list, "sign out everywhere," and refresh-token rotation
- Rate limiting, bot protection (CAPTCHA on risk signals), and account lockout after repeated failures

**Screens**
- Sign Up
- Log In
- Forgot Password / Reset Password
- Email Verification / Confirmation
- MFA Setup and MFA Challenge
- Active Sessions & Devices

**User Flow**
New user lands on Sign Up → enters credentials or picks a social provider → receives verification email → confirms → optionally sets up MFA → routed into Onboarding. Returning user opens Log In → authenticates → passes MFA challenge if enabled → lands on Dashboard. Forgot-password users request a reset link → set a new password → are signed in.

**UX Best Practices**
- Single primary action per screen; show/hide password toggle; inline, specific validation
- Persist "remember me" sessions sensibly; never force re-login mid-task
- Mobile: large tap targets, autofill and passkey support, numeric keypad for OTP
- Desktop: keyboard navigation, visible focus states, autofocus first field
- Clear, non-technical error messages that never reveal whether an email exists

**Common Mistakes**
- Vague errors ("something went wrong") that block recovery
- Blocking social login users behind a redundant password step
- Losing form input on validation failure
- Making MFA setup mandatory before the user sees any value
- Exposing account-existence via distinct error copy

**Future Improvements**
- Passkeys/WebAuthn as the default primary method
- Risk-based adaptive authentication using device and location signals
- Progressive MFA prompts only on sensitive actions
- Organization-level SSO enforcement policies

---

## 2. User Profile

**Purpose**
Give each user a single, editable representation of who they are within the product — identity, preferences, and account-level personalization — without touching business-domain data.

**Features**
- Editable display name, avatar (upload/crop), and pronouns
- Contact details (email, phone) with verification on change
- Locale, language, timezone, and date/number formatting preferences
- Public vs. private profile fields where collaboration exists
- Linked identities (connected social/SSO accounts)
- Account activity summary and last-login metadata

**Screens**
- Profile Overview
- Edit Profile
- Avatar Upload & Crop
- Linked Accounts
- Change Email / Change Phone (with verification)

**User Flow**
User opens Profile from the account menu → views current details → clicks Edit → updates fields → sensitive changes (email/phone) trigger verification → saves → sees confirmation toast and updated profile.

**UX Best Practices**
- Auto-save or clearly reversible save with explicit success feedback
- Show avatar and name changes instantly across the app
- Mobile: full-width forms, native image picker, sticky save bar
- Desktop: two-column layout with live preview
- Group related fields; keep sensitive changes gated and clearly labeled

**Common Mistakes**
- Mixing profile settings with unrelated app configuration
- Silent failures on avatar upload (size/format limits unstated)
- Allowing email change without re-verification
- No indication of which fields are visible to others

**Future Improvements**
- Profile completeness meter tied to onboarding
- Multiple profiles/workspaces under one identity
- Rich presence and status indicators for collaborative contexts

---

## 3. Subscription & Billing

**Purpose**
Let users understand, choose, and manage their plan and recurring billing relationship with the product — pricing tiers, upgrades, downgrades, invoices — independent of any domain feature the plans unlock.

**Features**
- Plan catalog with monthly/annual toggle and clear feature comparison
- Free trial, freemium tier, and paid plan management
- Upgrade, downgrade, and cancellation with proration
- Billing history, downloadable invoices/receipts, and tax/VAT fields
- Payment method management (delegated to Payments module) and billing contact
- Usage/seat metering display and plan-limit indicators
- Dunning: failed-payment notices and grace periods
- Coupons, promo codes, and referral credits

**Screens**
- Pricing / Plans
- Current Plan & Usage
- Upgrade / Downgrade / Change Plan
- Billing History & Invoices
- Cancel Subscription (with retention offer)

**User Flow**
User opens Billing → sees current plan and usage → selects Change Plan → reviews prorated cost and confirms → payment is processed via the Payments module → confirmation and updated entitlements apply immediately. Cancellation routes through a retention step, confirms end-of-period access, and schedules downgrade.

**UX Best Practices**
- Transparent, all-in pricing with taxes/fees shown before confirmation
- Make the recommended plan visually distinct without dark patterns
- Show exactly what changes on upgrade/downgrade before confirming
- Mobile: stacked plan cards with clear CTAs; desktop: side-by-side comparison table
- Never hide the cancel path; confirm end date explicitly

**Common Mistakes**
- Hiding cancellation or requiring support contact to cancel
- Surprise charges from unclear proration or trial-to-paid transitions
- No warning before a plan downgrade removes access to data
- Inconsistent entitlements between billing state and app state

**Future Improvements**
- Self-serve seat management and team billing
- Usage-based/hybrid pricing with real-time cost forecasting
- In-app plan recommendations based on usage patterns
- Multi-currency and regional pricing

---

## 4. Payments

**Purpose**
Securely capture and process payment instruments and transactions that underpin subscriptions and any paid actions — handling the money-movement mechanics, not the pricing logic.

**Features**
- PCI-compliant payment capture via a provider (cards, wallets: Apple Pay/Google Pay, ACH/SEPA where relevant)
- Stored payment methods with set-default and delete
- Secure Customer Authentication (3-D Secure/SCA) support
- Transaction receipts, refunds, and chargeback handling hooks
- Retry logic for failed charges and clear failure states
- Tokenization; no raw card data touches app servers

**Screens**
- Add Payment Method
- Payment Methods List
- Checkout / Payment Confirmation
- Transaction Receipt
- Refund Status

**User Flow**
User adds a payment method → provider tokenizes it securely → method stored and shown as default → at checkout, charge is authorized (with SCA if required) → success shows receipt; failure shows a specific reason and retry option.

**UX Best Practices**
- Use the provider's hosted/embedded elements for trust and compliance
- Show accepted methods and security badges near the form
- Mobile: enable native wallet buttons prominently; autofill card scanning
- Desktop: real-time field validation and card-type detection
- Communicate exactly why a payment failed and how to fix it

**Common Mistakes**
- Rolling your own card fields and breaking PCI scope
- Generic "payment failed" with no actionable cause
- No handling for SCA/3-D Secure interruptions
- Charging before authorization succeeds; double-charging on retries

**Future Improvements**
- Broader local payment methods and buy-now-pay-later options
- Smart retry timing to recover involuntary churn
- Stored-credential network tokens for higher auth rates
- Automated tax calculation at checkout

---

## 5. Dashboard

**Purpose**
Provide the authenticated home surface — an at-a-glance overview and primary navigation hub — that orients users and routes them to key areas. Structure only; domain widgets are populated downstream.

**Features**
- Configurable overview with summary cards and empty/loading/error states
- Primary navigation (sidebar/top bar) and quick actions
- Recent activity and shortcuts to frequent tasks
- Personalized greeting and contextual next-step prompts
- Responsive grid that reflows across breakpoints
- Global search and notification entry points

**Screens**
- Main Dashboard
- Empty State (new user)
- Widget/Layout Customization
- Loading & Error States

**User Flow**
After login/onboarding, user lands on the Dashboard → sees a personalized overview → uses nav or quick actions to move into a workflow → returns to Dashboard as the central hub between tasks.

**UX Best Practices**
- Meaningful empty states that teach the first action, not blank screens
- Progressive disclosure; surface the most important 3–5 items first
- Skeleton loaders over spinners; graceful error recovery
- Mobile: bottom nav or hamburger, single-column card stack
- Desktop: persistent sidebar, multi-column grid, keyboard shortcuts

**Common Mistakes**
- Overloading the first view with every metric at once
- Blank empty state with no guidance for new users
- Non-responsive layouts that break on small screens
- Slow initial load with no skeleton feedback

**Future Improvements**
- Drag-and-drop customizable widgets and saved layouts
- Role- and usage-based default dashboards
- Contextual AI-suggested next actions on the home surface
- Cross-device layout sync

---

## 6. Notifications

**Purpose**
Keep users informed of relevant events across channels — in-app, email, push — with control over what they receive, without prescribing which domain events trigger them.

**Features**
- In-app notification center with read/unread and grouping
- Email notifications with digest options
- Web/mobile push notifications
- Granular per-category, per-channel preferences
- Real-time delivery and badge counts
- Quiet hours / do-not-disturb and snooze
- Mark all read, archive, and deep links to source

**Screens**
- Notification Center / Inbox
- Notification Preferences
- Toast/snackbar (transient)
- Push permission prompt
- Digest settings

**User Flow**
Event occurs → notification is routed to the user's enabled channels → appears in the in-app center with a badge → user clicks to deep-link into context → item marks as read. User can open Preferences to tune categories and channels.

**UX Best Practices**
- Sensible defaults; let users reduce noise easily
- Group related notifications; avoid duplicate cross-channel spam
- Mobile: respect OS notification permissions, request at the right moment
- Desktop: subtle badges, non-blocking toasts with actions
- Always provide a one-tap path to relevant preferences

**Common Mistakes**
- Requesting push permission on first launch before earning trust
- No granularity — all-or-nothing settings
- Notifications that don't deep-link to their source
- Duplicate alerts across email, push, and in-app

**Future Improvements**
- Smart batching and priority ranking to cut noise
- AI-summarized digests of low-priority items
- Cross-device read-state sync
- User-defined custom notification rules

---

## 7. AI Features

**Purpose**
Provide the universal AI interaction scaffolding — assistant surfaces, prompt/response patterns, and trust controls — that any product capability can plug into. The generic AI framework only; domain-specific intelligence is defined downstream.

**Features**
- Conversational assistant panel (chat/command surface)
- Contextual suggestions and inline AI actions
- Prompt input with history, editing, and regeneration
- Streaming responses with stop/continue controls
- Feedback capture (thumbs up/down, corrections)
- Transparency: sources/citations, confidence cues, and "AI may be wrong" disclaimers
- Usage limits tied to plan, with graceful throttling
- Privacy controls: opt-in/out of data use for improvement

**Screens**
- AI Assistant Panel / Chat
- Prompt Input & History
- AI Suggestions Inline
- AI Settings & Data Controls
- Feedback / Report Response

**User Flow**
User opens the assistant or triggers an inline AI action → enters or confirms a prompt → sees a streaming response → accepts, edits, regenerates, or gives feedback → optionally reviews sources → adjusts AI data-use settings anytime.

**UX Best Practices**
- Set expectations: label AI content and its limitations clearly
- Keep humans in control — always allow edit, undo, and dismiss
- Show progress via streaming; never a frozen wait
- Mobile: collapsible assistant, voice input option; desktop: side panel plus keyboard invocation
- Make feedback effortless and visibly acted upon

**Common Mistakes**
- Presenting AI output as authoritative with no caveats
- No way to correct, undo, or override suggestions
- Hiding how user data is used for training
- Blocking the UI during generation with no cancel option

**Future Improvements**
- Personalization from user context with explicit consent
- Multi-modal input (voice, image, file) and outputs
- Agentic multi-step actions with confirmation checkpoints
- Model/setting choice for power users

---

## 8. File Manager

**Purpose**
Let users upload, organize, preview, and manage files and attachments within the product — a generic storage and document layer, agnostic to what the files contain.

**Features**
- Upload (drag-and-drop, picker, mobile camera/scan) with progress and resumable uploads
- Folders, tags, rename, move, and bulk actions
- Previews for common types (images, PDFs, docs) and thumbnails
- Versioning and restore of previous versions
- Sharing with permission levels (view/edit) and expiring links
- Storage quota display tied to plan; trash/recycle bin with restore
- Virus/malware scanning and file-type/size validation

**Screens**
- File Browser (grid/list)
- Upload / drag-drop overlay
- File Preview
- File/folder detail & permissions
- Share dialog
- Trash / restore
- Storage usage

**User Flow**
User drags files → upload with progress → files appear in browser → organize into folders/tags → open preview → share with permissioned link → deleted items go to Trash and can be restored within a retention window.

**UX Best Practices**
- Show upload progress, allow background uploads and cancel/retry
- Grid and list toggle; inline rename; keyboard multi-select on desktop
- Mobile: native file/camera picker, swipe actions, tap-to-preview
- Clear quota and over-limit messaging with upgrade path
- Never lose an upload on navigation — persist in-flight state

**Common Mistakes**
- No progress or resumability; large uploads fail silently
- Missing file-type/size validation and malware scanning
- Sharing without granular permissions or link expiry
- Permanent deletes with no trash/recovery

**Future Improvements**
- AI auto-tagging, dedup, and content search inside files (OCR)
- Real-time collaborative annotation
- Cloud-storage sync (Drive/Dropbox) and offline caching
- Automated organization and duplicate detection

---

## 9. Search

**Purpose**
Provide fast, unified discovery across the product's content and navigation, so users find anything quickly regardless of where it lives.

**Features**
- Global search bar with keyboard shortcut (e.g., Cmd/Ctrl-K)
- Instant, typeahead results with grouping by type
- Filters, facets, and sorting (date, type, owner)
- Recent searches, saved searches, and suggestions
- Fuzzy matching, typo tolerance, and synonyms
- Deep-link results that jump directly to context
- Scoped search (within a folder/section) and global scope

**Screens**
- Global search / command palette
- Search results (with filters)
- Empty / no-results state
- Recent & saved searches

**User Flow**
User invokes search via bar or shortcut → typeahead surfaces grouped results instantly → user refines with filters/facets → selects a result and is deep-linked to it → query is saved to recent searches for reuse.

**UX Best Practices**
- Sub-200ms perceived response with debounced, incremental results
- Helpful no-results state with suggestions and spelling correction
- Keyboard-first navigation of results; highlight matched terms
- Mobile: full-screen search overlay; desktop: command-palette modal
- Preserve and restore filters and recent queries

**Common Mistakes**
- Requiring exact matches with no typo tolerance
- Slow, blocking search with no incremental feedback
- Dead-end no-results screens
- Losing the user's query/filters on back navigation

**Future Improvements**
- Natural-language / semantic search powered by embeddings
- Personalized ranking based on usage
- Search analytics to surface content gaps
- Voice search on mobile

---

## 10. Settings

**Purpose**
Centralize account, workspace, security, and application preferences in a structured, discoverable place — the control center for everything not covered by Profile.

**Features**
- Account settings (email, password, MFA — deep links to Auth)
- Workspace/organization settings and member management (for teams)
- Appearance: theme (light/dark/system), density, language
- Notification preferences entry point (links to Notifications)
- Privacy & data: export, deletion, consent, and cookie preferences
- Security: sessions, connected apps, API keys/tokens
- Roles and permissions management for teams

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
- Logical grouping with search within settings
- Autosave with confirmation, or clear Save/Cancel — be consistent
- Show current values and sensible defaults; explain non-obvious options
- Mobile: collapsible accordion sections; desktop: two-pane (nav + detail)
- Gate destructive/sensitive settings behind confirmation and re-auth

**Common Mistakes**
- One giant unstructured settings page
- Duplicating/contradicting Profile and Notifications controls
- No search, making options hard to find
- Applying dangerous changes without confirmation

**Future Improvements**
- Settings search and recently-changed history/audit
- Role-based visibility of settings
- Import/export of settings profiles
- Contextual, inline settings surfaced where relevant

---

## 11. Integrations

**Purpose**
Connect the product to external tools and services through a governed marketplace and connection layer, without embedding any specific third-party's domain logic here.

**Features**
- Integration directory/marketplace with categories and search
- OAuth-based connect/disconnect flows with scoped permissions
- Connection status, health, and reconnect on token expiry
- Webhooks (inbound/outbound) and event subscriptions
- API keys and developer credentials management
- Per-integration configuration and field mapping (generic)
- Audit log of integration activity and data sync status

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
- Show exactly what data/scopes each integration accesses before connecting
- Clear connection health with actionable reconnect prompts
- Graceful handling of expired tokens and revoked access
- Mobile: simple connect/disconnect cards; desktop: detailed config panels
- Make disconnect and data-removal straightforward and honest

**Common Mistakes**
- Requesting broad scopes without explanation
- Silent integration failures with no health signal
- No way to see or revoke connected apps
- Hard-coding a single integration instead of an extensible layer

**Future Improvements**
- Public API and developer portal with docs and sandbox
- No-code workflow/automation builder across integrations
- Marketplace with third-party-built integrations and reviews
- Granular, per-field sync controls and conflict resolution

---

## 12. Support

**Purpose**
Help users get unblocked through self-service and human assistance, and give the team a channel to resolve issues — a universal help layer.

**Features**
- Help center / knowledge base with searchable articles
- Contextual in-app help and tooltips
- Ticket submission and status tracking
- Live chat / chatbot with human handoff
- Feedback and feature-request capture
- System status page and incident notices
- Contact options with SLA/response-time expectations by plan

**Screens**
- Help center / knowledge base
- Article view
- Contact / submit ticket
- Ticket status & history
- Live chat widget
- Feedback form
- System status

**User Flow**
User opens help and searches the knowledge base → if unresolved, starts a chat or submits a ticket with context attached → receives a confirmation and tracking reference → support responds and the user follows the thread in-app and via email → on resolution, the user can rate the interaction.

**UX Best Practices**
- Surface self-service first; deflect with relevant articles before the contact form
- Auto-attach context (page, version, account) to reduce back-and-forth
- Set and honor response-time expectations transparently
- Mobile: persistent but unobtrusive help launcher; desktop: docked widget
- Keep tone human; make escalation to a person always possible

**Common Mistakes**
- Hiding support or offering only email with no tracking
- Chatbot with no human escape hatch
- Outdated knowledge base articles
- No status page during incidents, driving ticket floods

**Future Improvements**
- AI support assistant grounded in the knowledge base
- Proactive support triggered by detected user friction
- Community forum and peer support
- In-context guided walkthroughs for common issues

---

## 13. Onboarding

**Purpose**
Guide new users from sign-up to first value as quickly as possible, driving activation without teaching any domain-specific workflow here (that layer is added downstream).

**Features**
- Welcome flow and initial setup wizard
- Progressive onboarding checklist with progress indicator
- Contextual product tours, tooltips, and coach marks
- Sample/demo data or templates to explore safely
- Personalization survey (role, goals) to tailor the experience
- Milestone celebrations and empty-state guidance
- Invite-teammates and connect-first-integration prompts

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
- Keep it short; show value fast and let users skip
- Progressive disclosure — teach features when they're first needed, not all at once
- Persist progress so users can resume onboarding later
- Mobile: full-screen focused steps; desktop: modal or side-panel guidance
- Celebrate small wins to build momentum; always allow "skip for now"

**Common Mistakes**
- Long, mandatory, unskippable tours
- Front-loading every feature before the user does anything
- No sample data, leaving users staring at empty screens
- Losing onboarding progress on refresh or across devices

**Future Improvements**
- Adaptive onboarding paths by role and behavior
- AI-guided setup that configures the workspace for the user
- Re-engagement onboarding for returning/lapsed users
- In-context "what's new" onboarding for feature releases

---

*End of Universal SaaS Foundation. This baseline is handed to solution-architect-app to be layered beneath the idea-specific System Architecture Document for Freelancer Budgeting AI.*

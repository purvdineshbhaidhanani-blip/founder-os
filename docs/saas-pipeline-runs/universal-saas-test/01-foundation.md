# Universal SaaS Foundation — Universal SaaS Test

> Stage 1 of 4 (Foundation → Business Engine → Technical Engine → Production Engine)
> Domain-agnostic baseline. Contains only the universal 13-module SaaS foundation. No idea-specific business functionality is included here by design — that is layered on by downstream stages.

---

## Module 1 — Authentication

**Purpose**
Establish secure, frictionless identity for every user and gate access to the product. Authentication is the front door: it must be trustworthy, fast, and recoverable, working identically on mobile and desktop.

**Features**
- Email/password sign-up and sign-in with strong password rules and breach-check.
- Social/SSO login (Google, Apple, Microsoft) and enterprise SSO (SAML/OIDC) for teams.
- Passwordless options: magic link and one-time code (email/SMS).
- Multi-factor authentication (TOTP app, SMS fallback, WebAuthn/passkeys).
- Email verification, secure password reset, and session/device management.
- Rate limiting, lockout, and suspicious-login alerts.

**Screens**
- Sign-up, Sign-in, Forgot Password, Reset Password.
- Email Verification / Check-your-inbox.
- MFA Setup and MFA Challenge.
- Active Sessions & Devices.

**User Flow**
1. User lands on Sign-in → chooses email, social, or SSO.
2. New user → Sign-up → email verification → optional MFA prompt.
3. Returning user → credentials/passkey → MFA challenge if enabled → authenticated session.
4. Forgot password → email link → reset → auto sign-in.

**UX Best Practices**
- Single primary CTA per screen; show social/SSO above the fold.
- Inline, specific validation; reveal-password toggle; autofill and passkey support.
- Preserve intended destination and restore it after login (deep-link continuity).
- Mobile: large tap targets, numeric keypad for OTP, OTP autofill; desktop: keyboard nav and Enter-to-submit.

**Common Mistakes**
- Vague errors ("something went wrong") that block recovery.
- Forcing MFA before the user sees any value.
- Losing the user's original destination after login.
- Over-strict password rules that push users to reuse.

**Future Improvements**
- Passkey-first (passwordless by default) with device sync.
- Adaptive/risk-based auth (step-up only when anomalous).
- Continuous session risk scoring and silent re-auth.

---

## Module 2 — User Profile

**Purpose**
Give each user a clear, editable identity and personal context within the product, and let teams recognize one another.

**Features**
- Editable name, avatar, headline/bio, timezone, language, contact info.
- Avatar upload with crop; initials fallback.
- Public vs. private profile fields and visibility controls.
- Linked accounts and connected identities.
- Account activity summary and profile completeness indicator.

**Screens**
- Profile View, Profile Edit.
- Avatar Upload/Crop modal.
- Public Profile (as seen by others).

**User Flow**
1. User opens Profile → sees current details and completeness.
2. Edits fields → inline save or explicit Save with confirmation.
3. Uploads/crops avatar → preview → apply.
4. Adjusts visibility → changes reflected instantly.

**UX Best Practices**
- Autosave with clear saved-state indicator; optimistic UI with rollback on error.
- Sensible defaults (detected timezone/locale) to reduce setup effort.
- Show how the profile appears to others.
- Mobile: single-column, sticky Save; desktop: two-column with live preview.

**Common Mistakes**
- Mixing account security settings into the profile (keep them in Settings).
- No avatar fallback, producing broken images.
- Unclear which fields are public.

**Future Improvements**
- Profile strength suggestions and gamified completion.
- Rich presence/status and pronouns.
- Import profile data from connected accounts.

---

## Module 3 — Subscription & Billing

**Purpose**
Let users choose, understand, and manage their plan, and give the business predictable recurring revenue with transparent lifecycle management.

**Features**
- Plan tiers (free/trial/paid), monthly/annual toggle with savings callout.
- Upgrade, downgrade, cancel, pause, and reactivate flows with proration.
- Seat/quantity management for teams.
- Invoices, receipts, billing history, and tax/VAT handling.
- Trial countdown, dunning, and failed-payment recovery.
- Usage metering display for usage-based plans.

**Screens**
- Pricing/Plans, Current Plan/Subscription overview.
- Change Plan, Cancel/Downgrade confirmation.
- Billing History & Invoices, Payment failure/dunning banner.

**User Flow**
1. User views Plans → compares tiers → selects plan and interval.
2. Confirms → enters/uses payment method → subscription active.
3. Manages later: upgrade/downgrade (proration shown), cancel with retention offer.
4. On failed payment → dunning notice → update method → auto-retry.

**UX Best Practices**
- Show exact charge, proration, and next billing date before confirming.
- Make cancellation honest and reachable; offer pause/downgrade as alternatives.
- Clear trial-remaining indicator and pre-charge reminder.
- Mobile: sticky plan summary; desktop: side-by-side comparison table.

**Common Mistakes**
- Hiding cancellation or using dark patterns (harms trust and compliance).
- Surprise charges from unclear proration.
- No warning before trial converts to paid.

**Future Improvements**
- Self-serve add-ons and usage-based upgrades.
- Predictive dunning and smart retry timing.
- In-context upgrade nudges tied to feature limits.

---

## Module 4 — Payments

**Purpose**
Securely capture and manage payment methods and process transactions with minimal friction and maximal trust. (Distinct from Subscription & Billing: this is the payment-instrument and transaction layer.)

**Features**
- Add/update/remove cards, wallets (Apple/Google Pay), and regional methods.
- PCI-compliant tokenized card entry (hosted fields) and 3D Secure/SCA.
- Default payment method selection and backup method.
- Transaction receipts, refunds, and dispute references.
- Multi-currency support and clear currency display.

**Screens**
- Payment Methods list, Add/Edit Payment Method.
- Checkout/Confirm Payment, 3DS challenge.
- Receipt/Transaction detail.

**User Flow**
1. User adds a payment method → tokenized → verified.
2. At checkout → selects method → SCA challenge if required → success/failure state.
3. Manages methods → set default, remove, add backup.
4. Views receipts and requests refund where eligible.

**UX Best Practices**
- Use hosted/tokenized fields; never handle raw card data.
- Real-time card validation and card-type detection.
- Clear success/failure states with actionable next steps.
- Mobile: wallet buttons first, autofill; desktop: single-row card entry.

**Common Mistakes**
- Blocking checkout with no clear failure reason.
- No backup method, causing avoidable churn on card expiry.
- Ambiguous currency/amount at the moment of charge.

**Future Improvements**
- Network tokenization and auto-updater for expired cards.
- One-click and saved-wallet checkout.
- Localized alternative payment methods by region.

---

## Module 5 — Dashboard

**Purpose**
Provide the user's home base: an at-a-glance overview of status, activity, and the next best actions after login.

**Features**
- Personalized overview with key metrics/cards and recent activity.
- Quick actions and shortcuts to core tasks.
- Empty, loading, and populated states.
- Customizable layout/widgets and time-range filters.
- Contextual tips and announcements area.

**Screens**
- Main Dashboard (empty state, loading state, populated).
- Widget/Layout customization.

**User Flow**
1. User logs in → lands on Dashboard.
2. Scans key cards → clicks a quick action or recent item.
3. Optionally customizes widgets and filters.
4. Returns as the recurring home surface.

**UX Best Practices**
- Lead with the most important metric and a clear primary action.
- Design a genuinely helpful empty state that teaches first steps.
- Skeleton loaders over spinners; progressive load.
- Mobile: stacked prioritized cards; desktop: responsive grid.

**Common Mistakes**
- Data overload with no hierarchy.
- Blank or dead-end empty states.
- Vanity metrics that don't drive action.

**Future Improvements**
- AI-generated summaries and anomaly highlights.
- Saved/personalized dashboard views per role.
- Drag-and-drop widget marketplace.

---

## Module 6 — Notifications

**Purpose**
Keep users informed and re-engaged with timely, relevant, controllable messages across channels — without becoming noise.

**Features**
- In-app notification center with read/unread and grouping.
- Email, push (web/mobile), and optional SMS channels.
- Per-category preferences and quiet hours.
- Real-time toasts for immediate events.
- Digest/batching to reduce frequency.

**Screens**
- Notification Center/inbox, Notification Preferences.
- Toast/snackbar patterns, Empty state.

**User Flow**
1. Event occurs → routed by user's channel preferences.
2. User sees toast and/or badge → opens notification center.
3. Reads, marks read, or acts directly from the item.
4. Adjusts preferences and quiet hours anytime.

**UX Best Practices**
- Granular, easy opt-out per category; never all-or-nothing.
- Deep-link every notification to the relevant context.
- Batch low-priority items; reserve push for high-value events.
- Mobile: respect OS permission priming; desktop: non-intrusive toasts.

**Common Mistakes**
- Over-notifying, training users to ignore or disable everything.
- Notifications that don't link to their source.
- Asking for push permission before showing value.

**Future Improvements**
- Smart send-time optimization and priority scoring.
- Cross-device read-state sync.
- AI summarized daily digest.

---

## Module 7 — AI Features

**Purpose**
Provide a universal, domain-agnostic AI layer (assistant, generation, and smart suggestions) that augments user productivity. Idea-specific AI use cases are added by downstream stages; this defines the baseline AI surface and controls.

**Features**
- Conversational assistant (help, guidance, in-context Q&A).
- Content generation/summarization and smart suggestions/autocomplete.
- Prompt input with history and re-run/edit.
- Feedback (thumbs up/down), regenerate, and citations/sources where applicable.
- Usage limits, transparency, and safety guardrails.

**Screens**
- AI Assistant panel/drawer, Prompt & Response view.
- Suggestion inline UI, AI usage/limits indicator.

**User Flow**
1. User opens the assistant or triggers an inline suggestion.
2. Enters a prompt/accepts a suggestion → sees streaming response.
3. Refines, regenerates, or accepts output → applies it.
4. Provides feedback; views remaining AI usage.

**UX Best Practices**
- Stream responses; show clear loading and stop controls.
- Set expectations: label AI content and note it can be wrong.
- Keep the human in control — always allow edit/undo of AI output.
- Mobile: full-screen assistant; desktop: side panel with context.

**Common Mistakes**
- Presenting AI output as authoritative with no way to verify or edit.
- Hidden usage costs/limits causing surprise throttling.
- Blocking UI during generation with no cancel.

**Future Improvements**
- Context-aware, memory-enabled assistant across sessions.
- Multi-modal input (voice, image) and agentic actions.
- Per-workspace tuning and grounding on user data.

---

## Module 8 — File Manager

**Purpose**
Let users upload, organize, preview, and manage files and attachments reliably across devices.

**Features**
- Upload (drag-and-drop, picker, mobile camera/gallery), multi-file and resumable.
- Folders, tags, rename, move, copy, delete, and restore (trash).
- Preview for common types (image, PDF, doc, video).
- Sharing links with permissions and expiry.
- Storage quota display and file versioning.

**Screens**
- File Browser (grid/list), Upload progress.
- File Preview, Share dialog, Trash.

**User Flow**
1. User uploads files → sees progress → files appear in browser.
2. Organizes into folders/tags → renames/moves as needed.
3. Previews or shares with permissions.
4. Deletes → recoverable from trash within retention window.

**UX Best Practices**
- Show upload progress, allow background upload and retry on failure.
- Bulk selection and keyboard shortcuts on desktop; swipe actions on mobile.
- Clear quota and file-size/type limits before upload.
- Thumbnails and fast previews without full download.

**Common Mistakes**
- No feedback on large/slow uploads or partial failures.
- Permanent deletion with no trash/undo.
- Ignoring file-type/size limits until after upload.

**Future Improvements**
- Smart search inside file contents (OCR/semantic).
- Auto-organization and duplicate detection.
- Real-time collaborative file annotations.

---

## Module 9 — Search

**Purpose**
Enable users to instantly find anything across the product with fast, forgiving, and relevant results.

**Features**
- Global search with typeahead and recent/suggested queries.
- Filters, facets, and scoped search (by type, date, owner).
- Fuzzy matching, synonyms, and keyboard-driven command palette.
- Result grouping and deep-linking to items.
- Empty and no-results states with suggestions.

**Screens**
- Global Search bar/command palette, Results page.
- Filtered results, No-results state.

**User Flow**
1. User invokes search (bar or shortcut).
2. Types → sees instant typeahead results.
3. Applies filters/scopes → refines.
4. Selects a result → deep-links to the item.

**UX Best Practices**
- Sub-100ms perceived responsiveness; debounce and cache.
- Keyboard-first command palette (Cmd/Ctrl-K) on desktop; prominent search on mobile.
- Helpful no-results: suggest spelling fixes and broaden scope.
- Highlight matched terms in results.

**Common Mistakes**
- Exact-match-only search that fails on typos.
- No filters, forcing users to scroll long result lists.
- Dead-end no-results with no guidance.

**Future Improvements**
- Semantic/natural-language search and ranking personalization.
- Saved searches and search-based alerts.
- AI answer-with-citations on top of results.

---

## Module 10 — Settings

**Purpose**
Centralize control over account, preferences, security, team, and workspace configuration in a discoverable, organized way.

**Features**
- Account settings, security (password, MFA, sessions), and privacy controls.
- Preferences (theme, language, timezone, accessibility).
- Team/workspace management, roles, and permissions.
- Data export and account deletion.
- API keys/developer settings (baseline).

**Screens**
- Settings home with sections, Account, Security.
- Preferences, Team & Roles, Privacy & Data, Danger Zone.

**User Flow**
1. User opens Settings → navigates categorized sections.
2. Edits a setting → immediate or explicit save with confirmation.
3. Performs sensitive action (delete, key rotation) → re-auth/confirm.
4. Exports data or manages team as needed.

**UX Best Practices**
- Group logically with clear navigation; search within settings.
- Confirm and re-authenticate for destructive/sensitive actions.
- Show clear saved state; avoid ambiguous toggles.
- Mobile: collapsible sections; desktop: persistent sidebar.

**Common Mistakes**
- Flat, unsearchable wall of options.
- Destructive actions without confirmation or undo.
- Mixing unrelated settings, hurting findability.

**Future Improvements**
- Settings search and inline explanations.
- Role-based conditional settings visibility.
- Configuration history/audit and rollback.

---

## Module 11 — Integrations

**Purpose**
Let users connect the product to their existing tools and extend functionality via a governed integrations layer.

**Features**
- Integrations catalog/marketplace with categories and search.
- OAuth connect/disconnect and connection health status.
- Webhooks and API key management.
- Per-integration configuration and scopes/permissions.
- Import/export and sync controls.

**Screens**
- Integrations Directory, Integration Detail/Configure.
- Connected Integrations list, Webhook/API key management.

**User Flow**
1. User browses catalog → selects an integration.
2. Connects via OAuth → grants scopes → connection verified.
3. Configures sync/behavior → sees health status.
4. Disconnects or reauthorizes when needed.

**UX Best Practices**
- Show clearly what data each integration accesses (scopes).
- Surface connection health and actionable error states.
- One-click connect with graceful re-auth on token expiry.
- Consistent cards; searchable, categorized directory.

**Common Mistakes**
- Opaque permissions that erode trust.
- No visibility when a connection breaks or tokens expire.
- Hard-to-find disconnect/revoke controls.

**Future Improvements**
- Self-serve integration builder and no-code workflows.
- Marketplace with third-party/partner apps.
- Bi-directional real-time sync with conflict resolution.

---

## Module 12 — Support

**Purpose**
Help users resolve problems and get answers quickly through self-serve and assisted channels, reducing friction and churn.

**Features**
- Help center/knowledge base with articles and search.
- Contact support (ticket, email, chat) and status tracking.
- In-app contextual help and tooltips.
- Feedback/bug report capture and system status page.
- SLA/priority indication for paid tiers.

**Screens**
- Help Center, Article view.
- Contact/Ticket form, Ticket status, Live chat, Feedback widget.

**User Flow**
1. User hits a question → opens in-app help or help center.
2. Searches articles → self-resolves, or
3. Contacts support → submits ticket/chat → receives updates.
4. Tracks status to resolution and rates the outcome.

**UX Best Practices**
- Surface contextual help where problems occur, not just a distant page.
- Search-first knowledge base; suggest articles before contact form.
- Set response-time expectations and confirm ticket receipt.
- Mobile: accessible chat/launcher; desktop: persistent help widget.

**Common Mistakes**
- Burying support behind many clicks.
- No confirmation or status after a ticket is submitted.
- Knowledge base that isn't searchable or kept current.

**Future Improvements**
- AI support assistant deflecting common questions with cited answers.
- Proactive support triggered by detected errors.
- Community forum and in-product changelog.

---

## Module 13 — Onboarding

**Purpose**
Guide new users from sign-up to first value (activation) quickly, and set them up for long-term success.

**Features**
- Welcome flow, setup checklist, and progress indicator.
- Personalization questions to tailor the experience.
- Product tour, tooltips, and contextual coach marks.
- Sample/template data and guided first action.
- Team invites and re-engagement nudges for incomplete onboarding.

**Screens**
- Welcome, Setup Wizard/steps.
- Checklist, Product Tour overlay, Invite Team, Completion/Success.

**User Flow**
1. New user completes sign-up → welcome + brief personalization.
2. Guided setup steps → reaches first meaningful action (activation).
3. Checklist tracks remaining steps; tour explains key surfaces.
4. Invites teammates → completes onboarding → transitions to Dashboard.

**UX Best Practices**
- Get to first value fast; allow skip and resume later.
- Show progress and celebrate completion.
- Reduce steps with smart defaults and pre-filled data.
- Mobile: focused one-step-per-screen; desktop: side checklist with inline tour.

**Common Mistakes**
- Long forced tours before any value.
- No way to skip or return to onboarding.
- Onboarding that ends without a clear next action.

**Future Improvements**
- Adaptive onboarding by role/use case and behavior.
- AI-guided setup that configures the workspace automatically.
- Milestone-based lifecycle onboarding beyond day one.

---

### Foundation Summary & Handoff Note

This document delivers all 13 universal modules in the locked order — Authentication, User Profile, Subscription & Billing, Payments, Dashboard, Notifications, AI Features, File Manager, Search, Settings, Integrations, Support, Onboarding — each complete with Purpose, Features, Screens, User Flow, UX Best Practices, Common Mistakes, and Future Improvements.

**Trade-off explicitly named:** This foundation is deliberately domain-agnostic and identical across every SaaS idea. The benefit is a consistent, production-grade, standardized baseline; the cost is that it contains none of "Universal SaaS Test's" own business-specific functionality. That idea-specific layer must be added downstream (Business Engine → Technical Engine → Production Engine) on top of this baseline. Consuming stages should treat these 13 modules as fixed scaffolding to build upon, not replace.

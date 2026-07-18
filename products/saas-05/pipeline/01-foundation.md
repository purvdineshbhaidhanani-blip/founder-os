# Universal SaaS Foundation — Home Maintenance Contractor AI

> **Scope note:** This document defines the universal, locked 13-module SaaS baseline that underlies every SaaS product. It is intentionally domain-agnostic — it contains no home-maintenance-specific logic, contractor-scheduling rules, or job-costing functionality. Those idea-specific capabilities are owned by the downstream solution-architect-app and developer-agent, and are layered on top of this foundation.

---

## Module 1 — Authentication

**Purpose**
Establish secure, frictionless identity verification and session management so users can safely enter and stay in the product, while protecting accounts and organizational data.

**Features**
- Email/password sign-up and login with strong password policy and breach-password detection.
- Social / SSO login (Google, Apple, Microsoft) and enterprise SSO (SAML, OIDC) for higher tiers.
- Passwordless options: magic links and one-time codes.
- Multi-factor authentication (TOTP authenticator app, SMS fallback, backup codes).
- Email verification, secure password reset, and forced re-authentication for sensitive actions.
- Session management: device list, "sign out everywhere," idle and absolute session timeouts, refresh-token rotation.
- Account lockout, rate limiting, and suspicious-login detection.

**Screens**
- Sign-up, Login, Forgot Password, Reset Password.
- Email Verification / Confirmation.
- MFA Setup, MFA Challenge, Backup Codes.
- Active Sessions & Devices.
- SSO redirect / organization-select screen.

**User Flow**
New user → Sign-up → email verification → optional MFA setup → lands in Onboarding. Returning user → Login → (MFA challenge if enabled) → Dashboard. Locked-out user → Forgot Password → reset link → new password → Login.

**UX Best Practices**
- Single primary action per screen; social login above the fold.
- Inline, specific validation, not "invalid credentials" for everything the user can safely be told.
- Mobile: large tap targets, autofill/passkey support, numeric keypad for OTP, show/hide password toggle.
- Desktop: keyboard-navigable, Enter submits, remember-device option.
- Preserve entered email across error states; never wipe the form.

**Common Mistakes**
- Blocking on mandatory MFA before the user sees value.
- Leaking whether an email exists via inconsistent error messages/timing.
- Storing passwords weakly or not rotating refresh tokens.
- No resend/backoff on verification emails; OTP with no expiry.

**Future Improvements**
- Passkeys / WebAuthn as the default, phishing-resistant path.
- Risk-based adaptive authentication (step-up only on anomaly).
- Progressive account creation (use before full sign-up).

---

## Module 2 — User Profile

**Purpose**
Let users manage their identity, personal preferences, and account-level presentation independent of billing and app settings.

**Features**
- Editable profile: name, avatar, display name, pronouns, timezone, language, contact info.
- Avatar upload with crop; auto-generated initials fallback.
- Public vs. private field visibility controls.
- Linked accounts / connected identities (from SSO providers).
- Activity summary and account creation metadata.
- Account deactivation and deletion (GDPR/CCPA data-export and erasure requests).

**Screens**
- Profile Overview (view mode).
- Edit Profile.
- Avatar Upload / Crop.
- Connected Accounts.
- Data Export & Delete Account.

**User Flow**
User opens Profile → edits fields → inline save or explicit Save → confirmation toast. Delete path → Delete Account → typed confirmation + re-auth → grace-period notice → deletion.

**UX Best Practices**
- Autosave with clear saved/failed indicators; optimistic UI with rollback.
- Mobile: single-column, sticky save bar; native image picker for avatar.
- Desktop: two-column layout with live preview of avatar/name.
- Make destructive actions (delete) high-friction and reversible within a grace window.

**Common Mistakes**
- Mixing profile, billing, and app settings into one confusing page.
- No timezone/locale handling, causing wrong timestamps everywhere downstream.
- Irreversible instant deletion with no export option.

**Future Improvements**
- Profile completeness meter tied to onboarding.
- Multiple profiles/personas per account.
- Verified-identity badges for trust-sensitive contexts.

---

## Module 3 — Subscription & Billing

**Purpose**
Manage plans, entitlements, and the recurring commercial relationship — what a user is allowed to do and how much they pay over time.

**Features**
- Plan catalog with tiers, monthly/annual toggle, and feature matrix.
- Free trial, freemium, and grace periods; proration on upgrade/downgrade.
- Seat/usage-based billing, add-ons, coupons, and promo codes.
- Invoice history, downloadable receipts, and tax/VAT handling.
- Dunning: failed-payment retries, payment-update prompts, and cancellation flows with save offers.
- Entitlement enforcement (feature gating and usage limits).

**Screens**
- Pricing / Plan Comparison.
- Current Plan & Usage.
- Upgrade / Downgrade.
- Billing History / Invoices.
- Cancel / Pause Subscription.
- Coupon / Promo entry.

**User Flow**
User views Pricing → selects plan → checkout (see Payments) → entitlement activated → confirmation + receipt. Downgrade/cancel → impact summary → confirm → effective-date notice.

**UX Best Practices**
- Show current plan clearly and what changes on upgrade/downgrade before confirming.
- Transparent proration and next-charge preview; no surprise charges.
- Mobile: comparison as horizontally scannable cards, not a wide table.
- Desktop: sticky feature-comparison table with highlighted recommended plan.

**Common Mistakes**
- Hiding the cancel path (dark patterns) — erodes trust and invites chargebacks.
- Not communicating what happens to data/features after downgrade.
- Ignoring failed-payment dunning, causing silent churn.

**Future Improvements**
- Usage-based/hybrid pricing with real-time meters and spend alerts.
- Self-serve plan customization and quote-to-cash for enterprise.
- Predictive churn signals feeding save offers.

---

## Module 4 — Payments

**Purpose**
Securely capture and process funds and manage payment instruments, decoupled from the plan/entitlement logic in Billing.

**Features**
- Multiple methods: cards, wallets (Apple/Google Pay), ACH/bank debit, regional methods.
- PCI-compliant tokenization via a processor (e.g., Stripe/Adyen); no raw card data stored.
- Strong Customer Authentication / 3-D Secure support.
- Saved payment methods, default selection, and retry on failure.
- Refunds, partial refunds, and payment receipts.
- Multi-currency and localized payment method rendering.

**Screens**
- Checkout / Payment.
- Add / Edit Payment Method.
- Payment Methods Wallet.
- Payment Confirmation / Failure.
- Refund status.

**User Flow**
User confirms plan → Checkout → enter/select method → 3-D Secure if required → success screen + receipt email. Failure → clear reason + retry or alternate method.

**UX Best Practices**
- Use the processor's hosted/embedded elements; wallet buttons first for speed.
- Real-time field validation, card-type detection, and auto-formatting.
- Mobile: wallet-native flows, autofill, minimal typing.
- Desktop: single-page checkout, trust signals (secure badge, supported cards).
- Never blame the user for declines; give actionable next steps.

**Common Mistakes**
- Handling raw card data or rolling your own PCI scope.
- No idempotency, causing double charges on retries.
- Poor decline messaging and no fallback method.

**Future Improvements**
- Network tokenization and account-updater for reduced involuntary churn.
- One-click and biometric-confirmed payments.
- Smart retry timing based on issuer patterns.

---

## Module 5 — Dashboard

**Purpose**
Provide the authenticated home base — an at-a-glance overview of status, key metrics, and the primary next actions — that orients the user every session.

**Features**
- Personalized overview with key metrics/KPIs and recent activity.
- Quick actions and shortcuts to core workflows.
- Widgets/cards (some rearrangeable); empty, loading, and error states.
- Time-range and segment filters.
- Role-aware content (admin vs. member views).

**Screens**
- Main Dashboard.
- Empty / First-run Dashboard.
- Widget Detail / Drill-down.
- Customize Layout.

**User Flow**
Login → Dashboard loads with skeletons → data populates → user scans metrics → clicks a card to drill down or uses a quick action to start a task.

**UX Best Practices**
- Lead with the single most important metric; progressive disclosure for the rest.
- Skeleton loaders, not spinners; meaningful empty states with a CTA.
- Mobile: prioritized single-column stack, collapsible sections.
- Desktop: responsive grid, drag-to-rearrange, density controls.
- Keep it glanceable — a dashboard is a starting point, not a report.

**Common Mistakes**
- Overloading with vanity metrics and no clear hierarchy.
- Blank screen while loading; no empty-state guidance for new users.
- Non-actionable numbers with nowhere to drill in.

**Future Improvements**
- AI-generated summaries and anomaly callouts ("what changed since last visit").
- Saved views and shareable dashboard snapshots.
- Personalized widget recommendations by role/usage.

---

## Module 6 — Notifications

**Purpose**
Keep users informed of relevant events across channels, respecting attention and preferences.

**Features**
- Channels: in-app notification center, email, push (web/mobile), and optional SMS.
- Categorized notifications with per-category, per-channel preferences.
- Real-time delivery, unread badges, mark-as-read, and bulk actions.
- Digest/batching (instant, daily, weekly) and quiet hours.
- Deep links from notification to the relevant screen.

**Screens**
- Notification Center / Inbox.
- Notification Preferences.
- Toast / In-app banner.
- Push permission prompt.

**User Flow**
Event occurs → routed per user preferences → in-app badge + optional email/push → user clicks → deep-linked to context → auto-marked read.

**UX Best Practices**
- Ask for push permission contextually, after demonstrating value — never on first load.
- Granular controls with sane defaults; group by category.
- Mobile: respect OS notification settings; actionable push (reply/approve inline).
- Desktop: non-intrusive toasts with undo where relevant.
- Never send the same event redundantly across every channel.

**Common Mistakes**
- Notification overload leading to opt-out or muting entirely.
- No preference center, or one that's all-or-nothing.
- Broken/deep-link-less notifications that dead-end the user.

**Future Improvements**
- AI-prioritized "important first" inbox and smart bundling.
- Snooze and follow-up reminders.
- Cross-device read-state sync and send-time optimization.

---

## Module 7 — AI Features

**Purpose**
Provide the universal, reusable AI scaffolding — assistant, generation, and automation surfaces — that any SaaS can expose, without encoding domain-specific intelligence.

**Features**
- Conversational assistant / command bar with context awareness.
- Generative actions (summarize, draft, rewrite, extract) on user content.
- Suggestions and smart defaults surfaced inline.
- Prompt history, regenerate, and feedback (thumbs up/down).
- Guardrails: content filtering, rate limits, usage metering tied to Billing, and transparency about AI-generated output.
- Human-in-the-loop review/confirmation for consequential actions.

**Screens**
- AI Assistant panel / Chat.
- Command Palette (AI-enabled).
- Inline suggestion / generation UI.
- AI Settings & Usage.
- Feedback / Report output.

**User Flow**
User invokes assistant (button or shortcut) → enters/selects intent → AI streams response → user accepts, edits, regenerates, or dismisses → optional feedback captured.

**UX Best Practices**
- Stream responses token-by-token; show a clear "AI is thinking" state.
- Always allow edit/undo of AI output; make AI actions non-destructive by default.
- Label AI content and cite sources/context where possible.
- Mobile: collapsible assistant sheet; voice input option.
- Desktop: side panel + keyboard-invoked command bar.
- Set expectations about limitations; fail gracefully with retry.

**Common Mistakes**
- Auto-applying AI output without user confirmation.
- Hiding AI usage costs/limits until the user hits a wall.
- No feedback loop, so quality never improves.
- Over-promising accuracy; no transparency about hallucination risk.

**Future Improvements**
- Personalized, memory-aware assistant respecting privacy controls.
- Multi-step agentic workflows with visible, approvable plans.
- Bring-your-own-model / configurable providers for enterprise.

---

## Module 8 — File Manager

**Purpose**
Let users upload, organize, preview, and share files and attachments with reliable storage and access control.

**Features**
- Drag-and-drop and multi-file upload with progress and resumable/chunked transfer.
- Folders, tags, move/rename, and bulk actions.
- Previews for images, PDFs, docs, video; thumbnails.
- Versioning, trash/restore, and storage-quota display.
- Sharing with permissions (view/edit), expiring links, and access logs.
- Virus/malware scanning and file-type/size validation.

**Screens**
- File Browser (grid/list).
- Upload Modal / Drop Zone.
- File Preview.
- Share & Permissions.
- Trash / Version History.

**User Flow**
User drags files → upload with progress → files appear in browser → organize into folders/tags → open preview → share with permissioned link.

**UX Best Practices**
- Show upload progress, allow background uploads and cancel/retry.
- Grid and list toggle; inline rename; keyboard multi-select on desktop.
- Mobile: native file/camera picker, swipe actions, tap-to-preview.
- Clear quota and over-limit messaging with upgrade path.
- Never lose an upload on navigation — persist in-flight state.

**Common Mistakes**
- No progress or resumability; large uploads fail silently.
- Missing file-type/size validation and malware scanning.
- Sharing without granular permissions or link expiry.

**Future Improvements**
- AI auto-tagging, dedup, and content search inside files (OCR).
- Real-time collaborative annotation.
- Cloud-storage sync (Drive/Dropbox) and offline caching.

---

## Module 9 — Search

**Purpose**
Enable fast, relevant discovery of content, records, and actions across the product from a single, predictable surface.

**Features**
- Global search with typeahead/autocomplete and recent searches.
- Filters, facets, and scoped search (by type, date, owner).
- Fuzzy matching, typo tolerance, and synonyms.
- Keyboard-driven command palette combining search + actions.
- Result ranking, highlighting, and grouped results by category.
- Saved searches and search history.

**Screens**
- Global Search bar / Overlay.
- Search Results (grouped, filterable).
- Command Palette.
- Empty / No-results state.

**User Flow**
User invokes search (icon or shortcut) → types query → sees instant grouped suggestions → applies filters → selects result → navigates directly, or runs an action from the palette.

**UX Best Practices**
- Debounced instant results; show recent and suggested before typing.
- Keyboard-first (Cmd/Ctrl-K) on desktop; prominent search on mobile.
- Helpful no-results state: spelling suggestions, broaden filters, create-new CTA.
- Highlight matched terms; keep latency perceptibly instant.

**Common Mistakes**
- Exact-match-only search with no typo tolerance.
- No empty/no-results guidance — dead end.
- Unscoped results dumping everything with no grouping or ranking.

**Future Improvements**
- Semantic / natural-language and AI-answered search.
- Personalized ranking by usage and role.
- Federated search across integrated third-party tools.

---

## Module 10 — Settings

**Purpose**
Give users and admins centralized control over account, workspace, security, and preference configuration.

**Features**
- Account and workspace/organization settings.
- Team & roles: invite, remove, role assignment, permissions (RBAC).
- Security: password, MFA, active sessions, API keys/tokens.
- Preferences: language, timezone, theme (light/dark), density, accessibility.
- Data & privacy: export, retention, consent management.
- Danger zone: transfer ownership, delete workspace.

**Screens**
- Settings Home (navigation).
- Account Settings.
- Team & Members / Roles.
- Security & Sessions.
- Preferences / Appearance.
- API Keys / Developer.
- Danger Zone.

**User Flow**
User opens Settings → picks a section → edits → autosave or explicit save + confirmation. Admin invites member → member receives email → joins with assigned role.

**UX Best Practices**
- Clear left-nav/sectioned IA; search within settings.
- Separate personal vs. workspace scope explicitly to avoid confusion.
- Mobile: collapsible accordion sections; sticky save.
- Desktop: persistent side nav with active-section highlight.
- Confirm and gate destructive/admin actions behind re-auth.

**Common Mistakes**
- One giant undifferentiated settings page.
- Mixing personal and org settings so users change the wrong scope.
- Destructive actions without confirmation or role checks.

**Future Improvements**
- Setting search and "recently changed" audit log.
- Policy templates and bulk role management.
- Config import/export across workspaces.

---

## Module 11 — Integrations

**Purpose**
Connect the product to third-party tools and expose extensibility, so it fits into users' existing stacks.

**Features**
- Integrations directory/marketplace with categories and search.
- OAuth-based connect/disconnect and connection health status.
- Webhooks (inbound/outbound) and event subscriptions.
- Public API with keys, scopes, and rate limits.
- Per-integration configuration and field mapping.
- Audit of data shared with each integration.

**Screens**
- Integrations Directory.
- Integration Detail / Connect.
- Connected Integrations & Status.
- Configuration / Mapping.
- API Keys & Webhooks (developer).

**User Flow**
User browses directory → selects integration → OAuth consent → configure options → connection active with status indicator → data flows; user can reconfigure or disconnect anytime.

**UX Best Practices**
- Show connection status and last-sync clearly; surface errors with fixes.
- Explain exactly what data each integration accesses before connecting.
- Mobile: connect flows work in-app browser; keep config simple.
- Desktop: rich configuration with test/verify buttons.
- Make disconnect and re-auth painless.

**Common Mistakes**
- Silent integration failures with no health indicator or alerting.
- Over-broad OAuth scopes and unclear data-sharing.
- No sandbox/test mode for developers.

**Future Improvements**
- No-code workflow builder / Zapier-style automations.
- Integration usage analytics and versioned APIs.
- Marketplace with third-party-published apps and reviews.

---

## Module 12 — Support

**Purpose**
Help users resolve problems and find answers quickly, through self-service and assisted channels, reducing friction and churn.

**Features**
- Help center / knowledge base with articles and search.
- In-app contextual help, tooltips, and guided walkthroughs.
- Support ticket / contact form with attachments.
- Live chat / chatbot with human handoff.
- Status page and incident notifications.
- Feedback and feature-request capture.

**Screens**
- Help Center / KB.
- Article View.
- Contact / New Ticket.
- Ticket Status / History.
- Chat Widget.
- System Status.

**User Flow**
User hits an issue → opens help widget → searches KB → self-serves, or escalates to ticket/chat → receives response and resolution → optional satisfaction rating.

**UX Best Practices**
- Contextual help tied to the current screen; search-first KB.
- Set response-time expectations; confirm ticket receipt.
- Mobile: persistent but unobtrusive help launcher; attach screenshots from camera.
- Desktop: side-panel help without losing context.
- Deflect with good docs, but always offer a human path.

**Common Mistakes**
- Burying or hiding contact options behind endless KB loops.
- No confirmation or status visibility after submitting a ticket.
- Outdated KB that erodes trust.

**Future Improvements**
- AI support agent answering from KB with cited sources and safe escalation.
- Proactive support triggered by detected errors/struggle signals.
- Community forum and in-product changelog.

---

## Module 13 — Onboarding

**Purpose**
Guide new users from sign-up to first value ("aha moment") as quickly as possible, driving activation and retention.

**Features**
- Welcome flow and progressive setup wizard.
- Personalization survey (role, goals, use case) to tailor the experience.
- Checklists, progress indicators, and milestone celebrations.
- Product tours, tooltips, and interactive walkthroughs.
- Sample/template data and empty-state guidance.
- Invite-teammates and connect-integrations prompts at the right moment.

**Screens**
- Welcome.
- Setup Wizard / Personalization steps.
- Getting-Started Checklist.
- Product Tour overlays.
- Completion / Success.

**User Flow**
First login → welcome → short personalization → guided setup of first key action → checklist tracks progress → user reaches first value → celebration + next-step suggestions.

**UX Best Practices**
- Optimize for time-to-value; let users skip and return later.
- Show progress and keep steps short; personalize by stated goal.
- Mobile: bite-sized full-screen steps; avoid dense forms.
- Desktop: contextual coach marks over the real UI, not a separate sandbox.
- Persist onboarding state so it resumes across sessions/devices.

**Common Mistakes**
- Long mandatory tours before the user can touch the product.
- Generic onboarding ignoring the user's stated role/goal.
- Empty product with no starter data or clear first action.

**Future Improvements**
- Adaptive onboarding that branches by behavior and role.
- AI-guided setup that configures the workspace from a described goal.
- Re-onboarding for new features and re-activation of dormant users.

---

*End of Universal SaaS Foundation. This baseline is handed to solution-architect-app to be layered beneath the idea-specific System Architecture Document for Home Maintenance Contractor AI.*

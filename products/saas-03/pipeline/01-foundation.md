# Universal SaaS Foundation — AI Meal Planning

> Standardized, domain-agnostic 13-module SaaS baseline. This document defines only the universal SaaS scaffolding that every product shares. It deliberately excludes AI Meal Planning's own nutrition, recipe, or meal-logic functionality — those belong to the downstream solution-architect-app and developer-agent. Every module below is production-ready and covers both mobile and desktop.

---

## Module 1 — Authentication

**Purpose**
Establish secure, frictionless identity for every user, protecting accounts while removing barriers to first entry and return visits.

**Features**
- Email/password sign-up and sign-in with strong-password enforcement.
- Social/SSO providers (Google, Apple, Microsoft) and enterprise SAML/OIDC.
- Passwordless options: magic links and one-time codes.
- Multi-factor authentication (TOTP, SMS, authenticator apps, passkeys/WebAuthn).
- Session management with refresh tokens, device list, and remote sign-out.
- Password reset, email verification, and account recovery flows.
- Rate limiting, bot/abuse protection, and suspicious-login detection.

**Screens**
- Sign-up, Sign-in, Forgot Password, Reset Password.
- Email Verification, MFA Setup, MFA Challenge.
- SSO redirect/callback, Active Sessions & Devices.

**User Flow**
1. User lands on sign-in/sign-up.
2. Chooses email or provider.
3. Verifies email (if new) and optionally enrolls MFA.
4. Session established; token issued.
5. Returning users authenticate, pass MFA if enabled, and resume.

**UX Best Practices**
- Single-field-focus forms with inline, real-time validation.
- Show/hide password toggle; never truncate error reasons.
- Persist the intended destination and deep-link back after auth.
- Mobile: large tap targets, autofill/passkey support, numeric keypad for codes.
- Desktop: keyboard navigation, visible focus states, paste support for codes.

**Common Mistakes**
- Vague errors ("invalid credentials" without recovery path).
- Forcing MFA before any value is experienced.
- Losing the user's original destination after redirect.
- No rate limiting, enabling credential-stuffing.

**Future Improvements**
- Passkey-first, fully passwordless default.
- Adaptive/risk-based authentication.
- Organization-level SCIM provisioning and directory sync.

---

## Module 2 — User Profile

**Purpose**
Give each user an editable identity and preference center that personalizes the product and centralizes account-level data.

**Features**
- Editable name, avatar, display name, contact info, timezone, locale.
- Profile completeness indicator.
- Linked accounts/identities and connected providers.
- Public vs. private field visibility controls.
- Activity summary and account metadata (created date, last active).
- Data export and account deletion entry points (privacy compliance).

**Screens**
- Profile Overview, Edit Profile, Avatar Upload/Crop.
- Linked Accounts, Privacy Controls, Data Export/Delete.

**User Flow**
1. User opens profile.
2. Edits a field; sees inline validation.
3. Uploads/crops avatar.
4. Saves; receives confirmation and optimistic UI update.

**UX Best Practices**
- Autosave or clearly-labeled save with unsaved-change warnings.
- Optimistic updates with graceful rollback on failure.
- Mobile: sectioned, collapsible layout; native image picker.
- Desktop: two-column layout with live preview.

**Common Mistakes**
- Mixing account settings with app settings, confusing scope.
- No feedback after save; silent failures.
- Avatar uploads without size/format limits or cropping.

**Future Improvements**
- Profile personalization suggestions.
- Multiple profiles/workspaces per identity.
- Gravatar/identity-provider avatar sync.

---

## Module 3 — Subscription & Billing

**Purpose**
Manage plans, tiers, upgrades/downgrades, invoices, and the commercial relationship between user and product.

**Features**
- Tiered plans (free, pro, team, enterprise) with monthly/annual toggle.
- Upgrade, downgrade, and cancellation with proration.
- Trials, promo codes, and discounts.
- Seat/usage-based billing and metering.
- Invoice history, receipts, and tax/VAT handling.
- Dunning for failed payments and grace periods.
- Plan comparison and current-plan status.

**Screens**
- Plans & Pricing, Current Subscription, Change Plan.
- Billing History/Invoices, Promo Code, Cancel/Downgrade flow.

**User Flow**
1. User views plans and comparison.
2. Selects plan and billing cadence.
3. Confirms proration/summary.
4. Completes checkout (handoff to Payments).
5. Subscription active; invoice generated.

**UX Best Practices**
- Transparent pricing: show total, taxes, and renewal date before commit.
- Make cancellation reachable; offer downgrade/pause as alternatives.
- Mobile: sticky plan-select CTA, comparison as swipeable cards.
- Desktop: side-by-side plan matrix with highlighted recommended tier.

**Common Mistakes**
- Hiding cancellation (dark patterns) — erodes trust and risks compliance.
- Surprise charges from unclear proration.
- No dunning flow, causing silent involuntary churn.

**Future Improvements**
- Self-serve usage forecasting and budget alerts.
- Flexible add-ons and metered credits.
- Localized pricing and currency.

---

## Module 4 — Payments

**Purpose**
Securely capture and process payment methods and transactions, decoupled from plan logic, with PCI-compliant handling.

**Features**
- Card, wallet (Apple/Google Pay), and regional methods (ACH, SEPA, iDEAL).
- Tokenized payment methods via provider (e.g., Stripe) — no raw card storage.
- Add/remove/set-default payment method.
- 3-D Secure/SCA support and retry on decline.
- Refunds, partial refunds, and transaction receipts.
- Billing address and tax-ID capture.

**Screens**
- Checkout, Payment Methods list, Add Payment Method.
- 3DS Challenge, Payment Success, Payment Failed/Retry.

**User Flow**
1. User enters or selects a payment method.
2. Passes SCA/3DS if required.
3. Transaction processed via provider.
4. Success or failure with clear retry path.
5. Receipt issued and method saved.

**UX Best Practices**
- Use provider-hosted fields/elements to minimize PCI scope.
- Inline card validation, network detection, and clear decline reasons.
- Mobile: native wallet buttons first; autofill for cards.
- Desktop: single-page checkout, minimal fields, trust signals visible.

**Common Mistakes**
- Storing raw card data or expanding PCI scope needlessly.
- Generic "payment failed" with no reason or retry.
- Blocking checkout on non-essential fields.

**Future Improvements**
- One-click and saved-wallet checkout.
- Smart retry/recovery for soft declines.
- Multi-currency and local payment-method expansion.

---

## Module 5 — Dashboard

**Purpose**
Provide the authenticated home surface — an at-a-glance overview and launchpad into the product's core work.

**Features**
- Personalized overview with key metrics and status cards.
- Recent activity, quick actions, and primary CTAs.
- Empty, loading, and populated states.
- Customizable/rearrangeable widgets.
- Contextual entry points to core workflows.
- Responsive grid layout.

**Screens**
- Dashboard Home, Empty State, Widget Customization, Activity Feed.

**User Flow**
1. User signs in and lands on dashboard.
2. Scans overview cards and recent activity.
3. Triggers a quick action or navigates into a workflow.

**UX Best Practices**
- Progressive disclosure — surface the most important actions first.
- Meaningful empty states that guide the first action.
- Skeleton loaders over spinners for perceived speed.
- Mobile: single-column priority stack; desktop: multi-column grid.

**Common Mistakes**
- Data overload with no hierarchy.
- Blank empty states with no guidance.
- Non-responsive widgets that break on small screens.

**Future Improvements**
- AI-surfaced insights and recommended next actions.
- Saved/custom dashboard views per role.
- Real-time live-updating widgets.

---

## Module 6 — Notifications

**Purpose**
Keep users informed and re-engaged across channels without overwhelming them, respecting preferences and consent.

**Features**
- In-app notification center with read/unread state.
- Email, push (web/mobile), and optional SMS channels.
- Per-category and per-channel preference controls.
- Real-time updates and batching/digest options.
- Mark all read, mute, and snooze.
- Deep-linking from notification to relevant screen.

**Screens**
- Notification Center, Notification Preferences, Digest Settings.

**User Flow**
1. Event occurs; notification generated per user preferences.
2. Delivered to enabled channels.
3. User views in center or channel.
4. Clicks through to the relevant context; item marked read.

**UX Best Practices**
- Sensible defaults with easy, granular opt-out.
- Group and batch to avoid notification fatigue.
- Clear unread indicators and one-tap "mark all read."
- Mobile: respect OS push permissions and quiet hours; desktop: toast + center.

**Common Mistakes**
- Over-notifying, driving disablement of all notifications.
- No preference granularity (all-or-nothing).
- Notifications that don't deep-link to the relevant item.

**Future Improvements**
- Smart prioritization and digest bundling.
- Quiet hours and timezone-aware delivery.
- Cross-device read-state sync.

---

## Module 7 — AI Features

**Purpose**
Provide the universal AI interaction layer — assistant, generation, and suggestion scaffolding — without encoding any domain-specific logic.

**Features**
- Conversational assistant interface (chat/prompt UI).
- Streaming responses with stop/regenerate controls.
- Prompt history and saved prompts.
- Suggestion chips and quick-action prompts.
- Feedback controls (thumbs up/down, report).
- Model/tone/length controls where applicable.
- Transparent loading, token/usage indication, and error states.

**Screens**
- AI Assistant/Chat, Prompt History, AI Suggestions Panel, Feedback Modal.

**User Flow**
1. User opens assistant or triggers a suggestion.
2. Submits a prompt.
3. Response streams in; user can stop/regenerate.
4. User gives feedback or acts on the output.

**UX Best Practices**
- Stream output for perceived speed; always offer stop/regenerate.
- Set expectations about AI limits and possible errors.
- Make outputs editable and never trap the user in AI-only paths.
- Mobile: full-screen chat with sticky input; desktop: side-panel or modal.

**Common Mistakes**
- No loading/streaming feedback, appearing frozen.
- Hiding AI limitations, eroding trust on errors.
- No feedback loop to improve quality.

**Future Improvements**
- Personalized, context-aware suggestions.
- Multi-modal input (voice, image).
- User-configurable AI preferences and memory controls.

---

## Module 8 — File Manager

**Purpose**
Let users upload, organize, preview, and manage files and attachments across the product.

**Features**
- Drag-and-drop and picker uploads with progress.
- Folder/tag organization and move/rename.
- Preview for images, documents, and media.
- Versioning, trash/restore, and permanent delete.
- Sharing links with permission scopes.
- Storage quota display and file-type/size limits.

**Screens**
- File Browser (grid/list), Upload, File Preview, Share Settings, Trash.

**User Flow**
1. User uploads via drag-drop or picker.
2. Sees progress and completion.
3. Organizes into folders/tags.
4. Previews, shares, or deletes as needed.

**UX Best Practices**
- Show upload progress, allow cancel/retry, support bulk actions.
- Non-destructive delete (trash) with restore window.
- Clear file-type and size-limit messaging before upload.
- Mobile: native picker + camera; desktop: drag-drop zones and multi-select.

**Common Mistakes**
- No progress or error handling on large uploads.
- Permanent delete without confirmation or recovery.
- Missing file-type/size validation.

**Future Improvements**
- AI-assisted tagging and content search.
- Real-time collaborative file states.
- External storage integrations (Drive, Dropbox).

---

## Module 9 — Search

**Purpose**
Enable users to quickly find content, records, and actions across the entire product.

**Features**
- Global search with instant/typeahead results.
- Filters, facets, and scoped search.
- Recent and saved searches.
- Keyboard-driven command palette.
- Fuzzy matching, synonyms, and highlighting.
- Empty and no-results states with suggestions.

**Screens**
- Global Search, Search Results, Command Palette, No-Results State.

**User Flow**
1. User invokes search (bar or shortcut).
2. Types a query; sees instant results.
3. Refines with filters.
4. Selects a result and navigates to it.

**UX Best Practices**
- Debounced, instant results with clear loading state.
- Highlight matched terms; group results by type.
- Helpful no-results state with suggestions/corrections.
- Mobile: full-screen overlay; desktop: command palette (Cmd/Ctrl+K).

**Common Mistakes**
- Slow, non-debounced search causing jank.
- Dead-end no-results with no suggestions.
- No keyboard support for power users.

**Future Improvements**
- Semantic/natural-language search.
- Personalized ranking based on activity.
- Search analytics to surface content gaps.

---

## Module 10 — Settings

**Purpose**
Centralize account, workspace, security, and application preferences in a clear, discoverable structure.

**Features**
- Account, security (password/MFA/sessions), and privacy settings.
- Appearance (theme, language, density) and accessibility options.
- Workspace/team settings and member roles.
- Notification preference links, data export, and account deletion.
- API keys/developer settings where relevant.

**Screens**
- Settings Home, Account, Security.
- Appearance, Team & Roles, Privacy & Data, Danger Zone.

**User Flow**
1. User opens Settings; navigates categorized sections.
2. Changes a setting; sees immediate or explicit save with confirmation.
3. Performs sensitive action (delete, key rotation); re-auth/confirm.
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
1. User browses catalog; selects an integration.
2. Connects via OAuth; grants scopes; connection verified.
3. Configures sync/behavior; sees health status.
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
1. User hits a question; opens in-app help or help center.
2. Searches articles; self-resolves, or
3. Contacts support; submits ticket/chat; receives updates.
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
1. New user completes sign-up; brief welcome + personalization.
2. Guided setup steps; reaches first meaningful action (activation).
3. Checklist tracks remaining steps; tour explains key surfaces.
4. Invites teammates; completes onboarding; transitions to Dashboard.

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

*End of Universal SaaS Foundation. This baseline is handed to solution-architect-app to be layered beneath the idea-specific System Architecture Document for AI Meal Planning.*

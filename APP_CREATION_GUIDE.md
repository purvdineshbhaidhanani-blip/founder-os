# App Creation Guide — Founder Intelligence OS

Founder Intelligence OS turns a single idea into a production-ready application through three departments, each generated entirely through the Agent Factory:

```
Idea
  ↓
Foundation Department      (16 agents — orchestration, generation, registry, workflow, memory)
  ↓
Product Discovery Dept     (16 agents — research, strategy, MVP scope, metrics)
  ↓
App Generation Department  (8 agents  — architecture, implementation, QA, deployment)
  ↓
Production-Ready Application
```

This guide is the standard way to request a new application. Follow it and the OS runs autonomously from idea to deployment package.

---

## 1. Required Input Format

Every app request must supply the following. Missing required fields cause `idea-validator` and `requirement-analyzer` to pause and request clarification rather than guess.

| Field | Description | Example |
|---|---|---|
| **App Name** | Working name for the product | "StudyBudget" |
| **Goal** | One-sentence outcome the app exists to achieve | "Help students make aid refunds last the term" |
| **Problem** | The specific pain being solved, not a feature list | "Students overspend lump-sum aid refunds and run out of money mid-term" |
| **Target Users** | Who has this problem — as specific as possible | "US undergraduates receiving Pell-eligible aid refunds" |
| **Platforms** | Where it must run | "iOS, Android, Web" |
| **Core Features** | The must-have capabilities (not a wishlist — Feature Planning will prioritize, but needs a starting list) | "Runway pacing, spend logging, ambient balance view" |
| **AI Features** | Any capability that requires model inference | "Auto-categorize transactions, predictive shortfall alerts" |
| **Authentication** | Required auth model, if known | "Email + OAuth (Google)" or "Not sure — recommend one" |
| **Payments** | Whether the app charges money and how | "None at MVP" or "Stripe subscription" |
| **Notifications** | Push/email/SMS requirements | "Push notification when balance is low" |
| **Integrations** | Third-party systems the app must connect to | "Plaid for bank data" |
| **Admin Panel** | Whether an internal/admin interface is needed | "Yes — view user cohort health" |
| **Languages** | Localization requirements | "English only at MVP" |
| **Theme** | Visual tone | "Calm, low-stimulation, not gamified" |
| **Branding** | Any existing brand constraints | "None yet — propose one" or link to brand guide |
| **Budget** | Order-of-magnitude budget ceiling | "$0 — solo founder, minimize infra cost" |
| **Timeline** | Desired delivery window | "MVP in 8-12 weeks" |
| **Deployment Targets** | Where it will run in production | "Vercel + Supabase" or "Not sure — recommend one" |

If a field is genuinely unknown, write "not sure — recommend one." Do not leave fields blank — a blank field is treated as "not yet provided" and blocks pipeline start; "not sure" is treated as "founder wants a recommendation" and lets the pipeline proceed with the relevant agent proposing an option.

---

## 2. Optional Inputs

These are never required, but every one supplied raises confidence scores and shortens the discovery phase because agents skip re-deriving what you already know.

| Field | Why it helps |
|---|---|
| **Reference apps** | Anchors architecture and UX decisions to something concrete |
| **Competitors** | Skips redundant competitor-intelligence-agent discovery work |
| **Screenshots** | Grounds application-architect's screen map in real precedent |
| **Wireframes** | Reduces application-architect's design ambiguity |
| **Business rules** | Prevents backend-architect from inventing rules that don't match reality |
| **API documentation** (for integrations) | Removes guesswork from backend-architect's integration design |
| **Existing database** | Lets database-architect design a migration path instead of greenfield schema |
| **Brand guidelines** | Feeds directly into application-architect's UI spec |
| **Color palette / Logo** | Same as above — visual identity input |
| **Pricing** | Sharpens pricing-strategy-agent and business-model-agent output |
| **Security requirements** | Feeds backend-architect's auth model and qa-engineer-app's security pass |
| **Performance requirements** | Bounds solution-architect-app's technology choices |
| **Legal requirements** (e.g. FERPA, GDPR, HIPAA) | Directly shapes database-architect's compliance design and qa-engineer-app's compliance pass |
| **Analytics requirements** | Feeds directly into success-metrics-agent's instrumentation plan |

---

## 3. Recommended Prompt Template

Copy this template, fill in every bracket, and submit it as the founder request. Fields marked *(optional)* may be deleted if not applicable.

```
BUILD REQUEST

App Name: [name]
Goal: [one sentence — what outcome this app achieves]
Problem: [the specific pain point, not a feature list]
Target Users: [as specific as possible — demographic, behavior, context]
Platforms: [iOS / Android / Web / Desktop — list all that apply]

Core Features:
- [feature 1]
- [feature 2]
- [feature 3]

AI Features: [list any AI-powered capability, or "none"]
Authentication: [required auth model, or "not sure — recommend one"]
Payments: [payment model, or "none at MVP"]
Notifications: [push / email / SMS requirements, or "none"]
Integrations: [third-party systems required, or "none"]
Admin Panel: [yes/no — what it needs to show]
Languages: [localization requirements, or "English only"]
Theme: [visual tone / brand feeling]
Branding: [existing brand constraints, or "propose one"]
Budget: [ceiling, or "minimize cost"]
Timeline: [desired delivery window]
Deployment Targets: [hosting/infra targets, or "not sure — recommend one"]

--- OPTIONAL (delete any not applicable) ---
Reference Apps: [...]
Competitors: [...]
Screenshots/Wireframes: [links or descriptions]
Business Rules: [...]
Existing Database: [schema or description]
Brand Guidelines: [link or description]
Pricing: [tiers/model if already decided]
Security Requirements: [...]
Performance Requirements: [...]
Legal Requirements: [FERPA / GDPR / HIPAA / etc.]
Analytics Requirements: [...]
```

---

## 4. Example Requests

### Example 1 — AI Habit Tracker

```
BUILD REQUEST

App Name: Habitloop
Goal: Help people build one habit at a time without losing motivation after week two.
Problem: Habit apps overwhelm users with streak pressure; most abandon within 3 weeks when a streak breaks.
Target Users: Adults 25-40 trying to build a single new habit (exercise, reading, meditation).
Platforms: iOS, Android

Core Features:
- Single active habit at a time (no multi-habit dashboard)
- Daily check-in with photo or note
- Streak-recovery framing (missed day doesn't reset progress, it "pauses" it)

AI Features: Personalized nudge timing based on when user historically checks in.
Authentication: Email + Apple/Google sign-in
Payments: Freemium — $2.99/mo for habit-history insights
Notifications: One daily reminder, adaptive timing
Integrations: None at MVP
Admin Panel: No
Languages: English only
Theme: Calm, encouraging, not gamified/competitive
Branding: Propose one
Budget: Minimize cost — solo founder
Timeline: MVP in 6-8 weeks
Deployment Targets: Not sure — recommend one
```

### Example 2 — AI CRM

```
BUILD REQUEST

App Name: PipelineIQ
Goal: Give solo consultants a CRM that writes their follow-up emails for them.
Problem: Solo consultants lose deals because they forget to follow up, not because they lack pipeline visibility.
Target Users: Independent consultants and freelancers with 10-50 active client relationships.
Platforms: Web (desktop-first)

Core Features:
- Contact and deal pipeline (kanban)
- Follow-up reminders tied to last-contact date
- AI-drafted follow-up email based on deal notes

AI Features: Follow-up email drafting; deal-risk scoring (flags deals going cold).
Authentication: Email + Google OAuth
Payments: $19/mo subscription, no free tier
Notifications: Email reminder for overdue follow-ups
Integrations: Gmail (send drafted emails), Google Calendar (log meetings)
Admin Panel: No
Languages: English only
Theme: Professional, minimal, fast
Branding: Propose one
Budget: $500/mo infra ceiling
Timeline: MVP in 10 weeks
Deployment Targets: Vercel + Supabase

--- OPTIONAL ---
Reference Apps: Folk, Attio (but simpler, single-user focused)
Competitors: HubSpot (too complex), Streak (Gmail-only, less AI)
```

### Example 3 — AI Expense Tracker

```
BUILD REQUEST

App Name: RunwayApp
Goal: Help students make a lump-sum financial-aid refund last the whole academic term.
Problem: 68% of students run out of money before their next aid disbursement because refunds arrive as one lump sum with no pacing guidance.
Target Users: US undergraduates receiving Pell-eligible lump-sum aid refunds.
Platforms: iOS, Android, Web (widget support required)

Core Features:
- Term/disbursement setup (guided, manual entry)
- Weekly safe-to-spend runway number, self-correcting from actual spend
- Ambient home-screen widget — no daily app-open required

AI Features: Spend auto-categorization from linked transactions (v1.1, not MVP).
Authentication: Email + OAuth
Payments: Free for students (institutional B2B2C revenue, not consumer-facing charge)
Notifications: Low-frequency — only when runway pacing needs attention
Integrations: Plaid (deferred to v1.1 per MVP scope — v1 is manual entry)
Admin Panel: Yes — financial-aid office view of aggregate (anonymized) cohort outcomes
Languages: English only at MVP
Theme: Calm, low-stimulation — explicitly NOT gamified (target users are anxiety-avoidant)
Branding: Propose one
Budget: Minimize cost at MVP; SOC2 budgeted before institutional sales
Timeline: MVP in 8-12 weeks (per Product Discovery Package estimate — requires founder approval)
Deployment Targets: Not sure — recommend one

--- OPTIONAL ---
Security Requirements: SOC2 Type II required before any institutional pilot
Legal Requirements: FERPA (student data via institutional contracts), GLBA (financial data)
Analytics Requirements: Setup-completion rate, per-term retention, runway-lasting outcome rate
```

*(This example reuses the actual Product Discovery Package generated in Loop 2 — see `artifacts/product-discovery/ai-expense-tracker-for-students/PRODUCT_DISCOVERY_PACKAGE.json` for the full research this request would be built from.)*

### Example 4 — AI Creator Platform

```
BUILD REQUEST

App Name: CreatorDesk
Goal: Give independent creators one place to manage brand deals from pitch to payment.
Problem: Creators track sponsorships across DMs, spreadsheets, and email — deals fall through the cracks and payment terms get lost.
Target Users: Independent content creators (10k-500k followers) doing 2+ sponsorships/month.
Platforms: Web, iOS

Core Features:
- Deal pipeline (pitched → negotiating → signed → delivered → paid)
- Rate-card generator based on platform/follower count
- Contract template library with e-signature

AI Features: Draft pitch responses; flag underpriced deals vs. rate-card.
Authentication: Email + Instagram/TikTok OAuth (for follower-count verification)
Payments: $29/mo subscription
Notifications: Deal-stage reminders, payment-overdue alerts
Integrations: Instagram Graph API, Stripe (for e-signature + invoicing)
Admin Panel: No
Languages: English only
Theme: Bold, creator-friendly, not corporate
Branding: Propose one
Budget: $1,000/mo infra ceiling
Timeline: MVP in 12 weeks
Deployment Targets: Not sure — recommend one
```

### Example 5 — Food Delivery App

```
BUILD REQUEST

App Name: LocalEats
Goal: Connect small independent restaurants (no delivery infra) with a low-commission delivery option.
Problem: Independent restaurants pay 25-30% commission to major delivery platforms, making delivery unprofitable.
Target Users: Independent restaurant owners in a single metro area; local diners who want to support them.
Platforms: iOS, Android (customer app), Web (restaurant dashboard)

Core Features:
- Restaurant menu management dashboard
- Customer ordering flow with live order tracking
- Driver dispatch and routing

AI Features: Delivery-time prediction; demand forecasting for restaurant prep.
Authentication: Email + phone OTP (customers), email (restaurants/drivers)
Payments: Stripe Connect (split payments: restaurant, driver, platform commission)
Notifications: Order status push notifications
Integrations: Stripe Connect, Google Maps/routing API
Admin Panel: Yes — platform ops dashboard (restaurants, drivers, disputes)
Languages: English only at MVP
Theme: Warm, local, community-feel
Branding: Propose one
Budget: $2,000/mo infra ceiling
Timeline: MVP in 16 weeks
Deployment Targets: Not sure — recommend one (three-sided marketplace, needs real infra planning)

--- OPTIONAL ---
Security Requirements: PCI compliance (via Stripe Connect, not custom card handling)
Performance Requirements: Order status updates must propagate in <5s
```

### Example 6 — E-commerce App

```
BUILD REQUEST

App Name: MadeByHand
Goal: Give independent craft makers a storefront cheaper and simpler than Shopify.
Problem: Solo craft sellers find Shopify overkill and Etsy fee structures unfavorable at scale.
Target Users: Independent craft/handmade-goods sellers doing $1k-20k/mo in sales.
Platforms: Web (storefront + seller dashboard)

Core Features:
- Storefront builder (templates, no-code customization)
- Inventory and order management
- Seller payout dashboard

AI Features: Auto-generate product descriptions from photos; suggested pricing based on category comps.
Authentication: Email (sellers), guest checkout + optional account (buyers)
Payments: Stripe (buyer checkout), Stripe Connect (seller payout)
Notifications: Order confirmation, low-inventory alerts
Integrations: Stripe, Stripe Connect, shipping-rate API (e.g. EasyPost)
Admin Panel: Yes — platform-level seller/dispute management
Languages: English only at MVP
Theme: Warm, handcrafted, minimal
Branding: Propose one
Budget: $500/mo infra ceiling at MVP
Timeline: MVP in 12-14 weeks
Deployment Targets: Not sure — recommend one
```

### Example 7 — SaaS Platform

```
BUILD REQUEST

App Name: MetricFlow
Goal: Give small SaaS founders one dashboard for MRR, churn, and cohort retention without wiring up Stripe + a BI tool.
Problem: Sub-$1M ARR SaaS founders either build a fragile internal Stripe-webhook dashboard or pay for enterprise BI tools built for much larger teams.
Target Users: Solo/small-team SaaS founders on Stripe Billing, $0-$1M ARR.
Platforms: Web

Core Features:
- Stripe webhook ingestion → MRR/churn/cohort dashboards
- Automated weekly investor-update email draft
- Alerting on churn spikes

AI Features: Anomaly detection on churn/MRR trends; draft investor-update copy.
Authentication: Email + Google OAuth
Payments: $49/mo subscription (self-referential — this IS a SaaS product)
Notifications: Email alert on churn-spike anomaly
Integrations: Stripe (read-only via webhooks + API)
Admin Panel: No (single-tenant dashboard per customer)
Languages: English only
Theme: Clean, data-dense, founder-friendly
Branding: Propose one
Budget: $500/mo infra ceiling
Timeline: MVP in 10 weeks
Deployment Targets: Not sure — recommend one
```

### Example 8 — Social Network

```
BUILD REQUEST

App Name: Neighborloop
Goal: Give small residential neighborhoods (200-2000 households) a private social feed instead of using public Nextdoor/Facebook groups.
Problem: Existing neighborhood platforms are ad-supported, public-adjacent, and full of noise; residents want a smaller, verified, private space.
Target Users: Residents of a single defined neighborhood/HOA, verified by address.
Platforms: iOS, Android, Web

Core Features:
- Address-verified sign-up (private to one neighborhood)
- Feed: posts, local events, lost & found, recommendations
- Direct messaging between verified neighbors

AI Features: Content moderation (flag hostile/spam posts before they post); local-event summarization digest.
Authentication: Email + address verification (mail-code or manual review)
Payments: None at MVP (future: HOA-tier paid features)
Notifications: New post in your neighborhood, DM received
Integrations: None at MVP (future: local business directory API)
Admin Panel: Yes — per-neighborhood moderator tools
Languages: English only at MVP
Theme: Warm, trustworthy, small-community feel — explicitly not ad-driven or engagement-maximizing
Branding: Propose one
Budget: Minimize cost at MVP
Timeline: MVP in 12 weeks
Deployment Targets: Not sure — recommend one

--- OPTIONAL ---
Security Requirements: Address-verification fraud prevention; per-neighborhood data isolation
Legal Requirements: Review moderation-liability exposure (UGC platform)
```

---

## 5. Agent Execution Map

A single build request executes 24 agents across two departments, coordinated by the Foundation Department's `orchestrator-agent`. Nothing in this chain is hand-written — every agent was generated through `AgentSpec → Blueprint → Validation → Registration → Scaffold → Registry`.

### Phase A — Product Discovery Department (16 agents, sequential)

| # | Agent | Receives | Returns | Artifact |
|---|---|---|---|---|
| 1 | `idea-validator` | Founder build request | Feasibility verdict, market-viability verdict, confidence, recommendation | `idea-validator.json` |
| 2 | `problem-discovery-agent` | Idea Validator output | Problem statement, segments, underserved gaps | `problem-discovery-agent.json` |
| 3 | `target-audience-agent` | Problem Discovery output | Personas, ICP, primary/secondary audience sizing | `target-audience-agent.json` |
| 4 | `market-research-agent` | Target Audience output | TAM, SAM, SOM, market trend, acquisition economics | `market-research-agent.json` |
| 5 | `competitor-intelligence-agent` | Market Research output | Direct/indirect competitors, gap analysis, SWOT | `competitor-intelligence-agent.json` |
| 6 | `trend-intelligence-agent` | Competitor Intelligence output | Regulatory/tech/cultural/macro trends, tailwind/headwind | `trend-intelligence-agent.json` |
| 7 | `user-research-agent` | Problem Discovery + Trend Intelligence | JTBD, pain points, assumption checks (confirmed/contradicted/unconfirmed) | `user-research-agent.json` |
| 8 | `opportunity-discovery-agent` | User Research + Market Research + Competitor Intelligence | Opportunity statement, UVP, positioning, risk-addressed design decisions | `opportunity-discovery-agent.json` |
| 9 | `pricing-strategy-agent` | Opportunity Discovery output | Pricing model, tiers, institutional-channel viability, unit economics | `pricing-strategy-agent.json` |
| 10 | `business-model-agent` | Pricing Strategy + Opportunity Discovery | Revenue streams, cost structure, partnerships, financial milestones | `business-model-agent.json` |
| 11 | `product-strategy-agent` | Business Model output | Product vision, positioning statement, RICE framework, v2 roadmap direction | `product-strategy-agent.json` |
| 12 | `feature-planning-agent` | Product Strategy output | Scored feature list (RICE), P0/P1/P2 priority | `feature-planning-agent.json` |
| 13 | `mvp-planning-agent` | Feature Planning output | MVP scope (included/excluded), launch criteria, learning experiments | `mvp-planning-agent.json` |
| 14 | `user-story-generator` | MVP Planning output | Sequenced user stories with acceptance criteria, complexity estimates | `user-story-generator.json` |
| 15 | `success-metrics-agent` | User Story output | Activation/retention/outcome/business metrics, leading indicators | `success-metrics-agent.json` |
| 16 | `product-discovery-report-generator` | All 15 prior outputs | **Product Discovery Package** — problem, audience, market sizing, competition, opportunity, pricing, business model, MVP scope, risk report, metrics, open questions | `PRODUCT_DISCOVERY_PACKAGE.json` + `.md` |

### Phase B — App Generation Department (8 agents)

| # | Agent | Receives | Returns | Artifact |
|---|---|---|---|---|
| 17 | `solution-architect-app` | Product Discovery Package | System Architecture Document — topology, stack, build-vs-buy decisions | System Architecture Spec |
| 18 | `application-architect` | System Architecture Document | Frontend Architecture Spec — screen map, navigation, state management | Frontend Architecture Spec |
| 19 | `backend-architect` | System Architecture Document + Frontend spec | Backend Architecture Spec — API contracts, auth model, payments architecture | Backend Architecture Spec |
| 20 | `database-architect` | Backend Architecture Spec | Database Architecture Spec — schema, storage engine, migrations, compliance | Database Architecture Spec |
| 21 | `ai-architect` | System Architecture Document + Backend Architecture Spec | AI Integration Spec — model selection, prompts, guardrails, cost controls | AI Integration Spec |
| 22 | `developer-agent` | Frontend + Backend + Database + AI specs, MVP user stories | Implemented application code + unit/integration tests | Code + Test Suite |
| 23 | `qa-engineer-app` | Developer Agent's code + tests | Pass/fail verdict against every MVP acceptance criterion and launch criterion; security/compliance pass | QA Report |
| 24 | `deployment-agent` | QA-approved build | Deployment Package + Production Build, smoke-tested, rollback documented | Deployment Package + Production Build |

### Final Output

The pipeline's terminal artifacts, handed back to the founder:

1. **Product Discovery Package** (`PRODUCT_DISCOVERY_PACKAGE.json` / `.md`)
2. **System Architecture Document**
3. **Frontend / Backend / Database / AI Architecture Specs**
4. **Implemented application code + test suite**
5. **QA Report** (acceptance-criteria verification, security/compliance pass)
6. **Deployment Package + Production Build** (smoke-tested, rollback-documented)

Every artifact is machine-readable (JSON/structured Markdown) and registered in the Artifact Manager with a content hash and traceability chain back to the original founder request.

---

## 6. Extensibility Rules

1. **Reuse before creation.** Every request must first be checked against the existing 40 agents (16 Foundation + 16 Product Discovery + 8 App Generation) before any new agent is proposed. Most new app categories are handled entirely by the existing chain — a food-delivery app and a SaaS dashboard both flow through the same 24 agents; only the content differs, not the agent roster.
2. **Extend before duplicating.** If an existing agent almost fits but needs a new capability (e.g. `backend-architect` needing to design a three-sided marketplace payment split), extend that agent's spec/responsibilities rather than creating a near-duplicate agent.
3. **Temporary agents only when extension is impossible.** If a capability genuinely cannot be added to any existing agent (e.g. a domain so specialized — say, medical-device regulatory review — that it doesn't fit any of the 8 App Generation architects), create a temporary, task-scoped agent for that single workflow run. Document explicitly why none of the 40 existing agents could perform the task.
4. **Permanent registration is the exception, not the default.** A temporary agent is only promoted to a permanent, registered agent if it is broadly reusable across many future, unrelated app requests — not just useful for the one app that triggered its creation. Otherwise, discard it once the workflow completes; do not let one-off agents accumulate in the registry.

This keeps the Agent Factory's registry lean: every permanent agent earns its place by being genuinely cross-application infrastructure, exactly like the 40 agents already registered.

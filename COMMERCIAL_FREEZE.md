# COMMERCIAL FREEZE — LOOP 2 (FINAL)

> Generated: 2026-07-12
> Scope: All 12 Founder OS SaaS products
> Purpose: Lock the final commercial model (plans, pricing, limits, AI credits, API, billing, integrations)
> Input: `PRODUCT_FREEZE.md` (Loop 1) — only KEEP-classified features are commercialized here
> Authority: Documentation only. No code, UI, backend, or database changes made in this loop.

This loop defines the commercial container around the features Loop 1 already froze. It does not
add, remove, or re-scope any feature — every feature referenced below is either KEEP or a Hero/Core
Feature from `PRODUCT_FREEZE.md`. Where a feature's plan-gate below differs from the entitlement
gate currently hardcoded in a product's billing service (e.g. an AI feature moving from a hard
Pro-only gate to a credit-metered Starter+ gate), that is a **pricing-model decision requiring a
follow-up engineering loop** to update the entitlement code — it is not a Loop 1 feature-scope
change. Every such case is called out explicitly in each product's Step 11 Change Log.

---

## GLOBAL COMMERCIAL FRAMEWORK

### Plans (locked, identical set across all 12 products)

`Free` → `Starter` → `Pro` → `Business` → `Enterprise`

No Lifetime, Credit Pack, Founder, or Agency plans. No per-product plan-name variation.

### AI Credit system (shared definition)

- **1 AI Credit = 1 generated AI output** (one Copilot brief, one fix suggestion, one DNA spec,
  one root-cause analysis, etc. — the single LLM-backed action each product already exposes).
- Credits reset monthly, do not roll over, and are pooled per organization (not per user).
- Every AI-labeled feature in every product consumes credits. No AI feature is credit-exempt.
- Enterprise credits are "Unlimited (fair-use)" — metered internally, never rate-limited at the
  product layer, backed by a custom contract.

### Unit economics methodology (applied identically in every Step 10)

| Cost component | Assumption |
|---|---|
| AI cost per credit | $0.02 (blended Claude/OpenAI structured-output call, ~1.5–3K tokens) |
| Infra cost / org / month | Free & Starter $3 · Pro $5 · Business $8 · Enterprise $15 (dedicated headroom) |
| Payment processing | 3% of price (Stripe), Enterprise assumed ~0.5% (invoiced/ACH) |
| Target gross margin | ≥ 75% on Starter/Pro/Business; ≥ 70% on Enterprise (higher support cost) |

A plan is **REJECTED** if projected margin falls under target at standard usage (full credit
allotment consumed). All 12 products' Free/Starter/Pro/Business tiers were computed and **none are
rejected** — see each product's Step 10.

### Billing rules (shared — applies to all 12 products, see each Step 6 for confirmation)

| Rule | Policy |
|---|---|
| Monthly billing | Default; live today via existing Stripe monthly price IDs |
| Yearly billing | Locked policy: 2 months free (≈17% discount) vs. monthly — **requires new annual Stripe price IDs to be created; not yet live in code, tracked as a billing-engineering follow-up** |
| Free trial | 14 days, full Pro-tier feature access, no credit card required (already implemented) |
| Upgrade | Immediate, prorated via Stripe Checkout, entitlements unlock instantly |
| Downgrade | Takes effect at end of current billing period; credits/limits reduce at renewal, no mid-cycle feature removal |
| Cancellation | Self-serve via Stripe billing portal; access continues until period end, then reverts to Free (data retained, not deleted) |
| Grace period | 7 days after a failed payment before auto-downgrade to Free (Stripe dunning) |
| Refunds | No prorated refunds on monthly plans; annual plans refundable within 14 days of purchase; Enterprise refunds governed by contract |

### Integration policy (shared)

Per Loop 1 audits, the **only integration actually implemented in any product is Stripe** (billing
rails, shared platform). Every other integration named in product docs or pricing copy — Slack,
Zapier, GitHub, GitLab, Google, Microsoft, generic Webhooks, CSV import/export beyond the existing
report exports — has **no corresponding code** in any product and is therefore **not V1**. Per the
global rule "use ONLY approved V1 features," every non-Stripe integration is deferred to V2 for
all 12 products. This is called out per product in Step 7 rather than repeated as a hero feature.

### API policy (shared)

Per Loop 1 audits, no product exposes a generic public REST API — the `use_api` entitlement flag
exists in several products' billing definitions but has no route implementation. The single
exception is **AuthStartup**, whose product *is* an API (the public end-user auth endpoints are
its core deliverable, not an add-on). Consequently:

- **11 of 12 products**: API access is **not available in V1** at any plan. Business/Enterprise
  reserve the entitlement flag for when a public API is engineering-built (V2); no plan currently
  grants a working API.
- **AuthStartup**: the end-user auth API is core and tiered by MAU/rate limit starting at Free.

---

# 1. SPENDGOV

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | Subscription inventory (view/add, capped), Spend dashboard (KPI cards + category breakdown) |
| **Starter** | + Renewal calendar, Duplicate tool detection, CSV spend report export, **AI CFO Copilot (first AI value, credit-metered)** |
| **Pro** | + Waste identification, Vendor consolidation analysis, License utilization analysis, **AI CFO Copilot (full usage)**, **AI contract term extraction** |
| **Business** | + Multi-user team seats & roles, higher tracked-app/tool ceilings, AI credit pool scaled for teams |
| **Enterprise** | + SSO, SCIM, audit-log export/retention, private deployment option, unlimited AI credits, dedicated support |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Organizations | 1 | 1 | 3 | 10 | Unlimited |
| SaaS apps tracked | 10 | 50 | 250 | 1,000 | Unlimited |
| AI tools tracked | 5 | 25 | 100 | 500 | Unlimited |
| History retention (days) | 30 | 90 | 365 | 730 | Unlimited |
| CSV exports / month | 0 | 10 | Unlimited | Unlimited | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access (basic value only) |
| Starter | 10 | AI CFO Copilot only |
| Pro | 100 | AI CFO Copilot + AI contract extraction |
| Business | 300 | Same features, team-scale pool |
| Enterprise | Unlimited (fair-use) | All AI features, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy). `use_api` entitlement reserved on Business/Enterprise for future V2 implementation.

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented (`startTrialSubscription`).

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: Slack alerts, email budget alerts, CSV bulk import (schema already exists, unwired).

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI CFO Copilot | Starter+ (credit-metered) |
| AI contract extraction | Pro+ |
| Duplicate/waste/vendor detection | Starter+ / Pro+ (per Step 2) |
| CSV export | Starter+ |
| Admin panel | All paid plans (owner/admin roles) |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | Renewal calendar, duplicate detection, and first AI CFO Copilot brief |
| Starter → Pro | Full AI CFO Copilot usage + AI contract extraction + waste/vendor analysis |
| Pro → Business | Multi-user team seats, higher tracked-app ceilings |
| Business → Enterprise | SSO/SCIM compliance, private deployment, unlimited AI |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $29 | 10 | $0.20 | $3 | $0.87 | $4.07 | 86.0% | ✅ PASS |
| Pro | $99 | 100 | $2.00 | $5 | $2.97 | $9.97 | 89.9% | ✅ PASS |
| Business | $249 | 300 | $6.00 | $8 | $7.47 | $21.47 | 91.4% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business (new 5th tier between Pro and Enterprise)
- **Pricing**: Free/Starter/Pro carried over unchanged from Loop 1 ($0/$29/$99); Business new at $249; Enterprise remains custom
- **Limits changed**: Business-tier limits newly defined (3 orgs, 1,000 apps, 500 AI tools, 730-day history)
- **Features moved**: AI CFO Copilot moves from a hard Pro-only code gate to a credit-metered gate starting at Starter (engineering follow-up required)
- **AI credits**: New metering system introduced, replacing binary `can()` entitlement check
- **API**: Confirmed not available in V1; reserved for Business/Enterprise in future V2

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 2. SECCORRELATE

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | Log event ingestion (capped), Dashboard KPIs, **AI Investigate (tiny credit allotment — matches existing "every plan" access)** |
| **Starter** | + Correlation rule builder, Alert triage workflow, CSV alert report, **AI Investigate (first real AI value)** |
| **Pro** | + Full batch correlation engine usage, **AI Investigate (full usage)** |
| **Business** | + Team seats, higher log retention, AI credit pool scaled for teams |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, dedicated log retention, private deployment |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Log events / day | 500 | 5,000 | 50,000 | 250,000 | Unlimited |
| Correlation rules | 1 | 10 | 50 | 200 | Unlimited |
| Alerts / month | 50 | 500 | 5,000 | 25,000 | Unlimited |
| Log retention (days) | 7 | 30 | 90 | 365 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 5 | AI Investigate (matches Loop 1's every-plan access, capped small) |
| Starter | 10 | AI Investigate |
| Pro | 100 | AI Investigate |
| Business | 300 | AI Investigate, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Investigate, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: PagerDuty/Slack alert routing, rule templates, AI Incident Graph visualization.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Investigate | All plans (credit-metered, tiny on Free) |
| Correlation rule creation | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | Correlation rule builder unlocks real detection + more AI credits |
| Starter → Pro | Full-volume correlation engine + full AI Investigate usage |
| Pro → Business | Team seats, higher log retention and ingestion ceilings |
| Business → Enterprise | SSO/SCIM, unlimited AI, dedicated retention/private deployment |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $49 | 10 | $0.20 | $3 | $1.47 | $4.67 | 90.5% | ✅ PASS |
| Pro | $199 | 100 | $2.00 | $5 | $5.97 | $12.97 | 93.5% | ✅ PASS |
| Business | $449 | 300 | $6.00 | $8 | $13.47 | $27.47 | 93.9% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$49/$199); Business new at $449; Enterprise custom
- **Limits changed**: Business-tier limits newly defined
- **Features moved**: None — AI Investigate was already available on every plan in Loop 1; now formally credit-metered instead of unmetered
- **AI credits**: New metering introduced on a previously-unmetered feature
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 3. CODEAUDIT

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

*(Pricing is per-developer-seat, per Loop 1's existing $/dev model.)*

| Plan | Features |
|---|---|
| **Free** | 1 repository, manual code scan, regex SAST engine, code health score (no AI) |
| **Starter** | + More repositories, findings status workflow, CSV report, **AI Fix Engine (first AI value)** |
| **Pro** | + Higher scan ceilings, **AI Fix Engine (full usage)** |
| **Business** | + Team seats, AI credit pool scaled for teams, higher repo/scan ceilings |
| **Enterprise** | + SSO, SCIM, private deployment, unlimited AI credits, dedicated scanning capacity |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Private repos | 1 | 5 | 25 | 100 | Unlimited |
| Public repos | 3 | 15 | 75 | 300 | Unlimited |
| Files scanned / month | 100 | 1,000 | 10,000 | 50,000 | Unlimited |
| PR scans / month | 0 | 100 | 1,000 | 5,000 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Fix Engine |
| Pro | 100 | AI Fix Engine |
| Business | 300 | AI Fix Engine, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Fix Engine, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy). `use_api`/`use_ci_cd` entitlement flags reserved for future V2.

## Step 6 — Billing Freeze
Inherits Global Billing Rules, per-seat proration on upgrade/downgrade. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: GitHub PR webhook, CI/CD integration, dedicated secret/dependency/container scanning, custom rules.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Fix Engine | Starter+ (credit-metered) |
| Findings status workflow | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | More repos + findings workflow + first AI Fix Engine credits |
| Starter → Pro | Full AI Fix Engine usage across all findings |
| Pro → Business | Team seats, higher scan ceilings |
| Business → Enterprise | SSO/SCIM, private deployment, unlimited AI |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $19 | 10 | $0.20 | $3 | $0.57 | $3.77 | 80.2% | ✅ PASS |
| Pro | $49 | 100 | $2.00 | $5 | $1.47 | $8.47 | 82.7% | ✅ PASS |
| Business | $89 | 300 | $6.00 | $8 | $2.67 | $16.67 | 81.3% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$19/$49 per dev); Business new at $89/dev; Enterprise custom
- **Limits changed**: Business-tier repo/scan ceilings newly defined
- **Features moved**: AI Fix Engine moves from hard Pro-only gate to credit-metered Starter+ gate (engineering follow-up required)
- **AI credits**: New metering system introduced
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 4. CRMCAPTURE

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

*(Pricing is per-user-seat, per Loop 1's existing $/user model.)*

| Plan | Features |
|---|---|
| **Free** | Contact management (capped), deterministic lead scoring, dashboard |
| **Starter** | + Duplicate detection, lead status workflow, CSV leads report, **AI Lead Extraction (first AI value)** |
| **Pro** | + Lead assignment, **AI Sales Assistant (main AI feature)** |
| **Business** | + Team seats/pooled AI credits, higher contact/lead ceilings |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, dedicated support |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Contacts | 100 | 2,500 | 25,000 | 100,000 | Unlimited |
| Leads | 100 | 2,500 | 25,000 | 100,000 | Unlimited |
| AI extractions (paste-to-contact) / month | 0 | Included in credits | Included in credits | Included in credits | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Lead Extraction |
| Pro | 100 | AI Lead Extraction + AI Sales Assistant |
| Business | 300 | Both features, team-scale pool |
| Enterprise | Unlimited (fair-use) | Both features, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy). `use_api` entitlement reserved for future V2.

## Step 6 — Billing Freeze
Inherits Global Billing Rules, per-seat proration. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: CRM sync (Salesforce/HubSpot/Pipedrive), LinkedIn import, CSV bulk import, lead routing, contact enrichment.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Lead Extraction | Starter+ (credit-metered) |
| AI Sales Assistant | Pro+ (credit-metered) |
| Duplicate detection | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | Duplicate detection + first AI Lead Extraction credits |
| Starter → Pro | AI Sales Assistant (summary, next step, draft email, opportunity flag) |
| Pro → Business | Team seats, pooled AI credits, higher contact/lead ceilings |
| Business → Enterprise | SSO/SCIM, unlimited AI, dedicated support |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $29 | 10 | $0.20 | $3 | $0.87 | $4.07 | 86.0% | ✅ PASS |
| Pro | $79 | 100 | $2.00 | $5 | $2.37 | $9.37 | 88.1% | ✅ PASS |
| Business | $149 | 300 | $6.00 | $8 | $4.47 | $18.47 | 87.6% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$29/$79 per user); Business new at $149/user; Enterprise custom
- **Limits changed**: Business-tier contact/lead ceilings newly defined
- **Features moved**: None — AI Lead Extraction (Starter+) and AI Sales Assistant (Pro+) gating carried over from Loop 1, now credit-metered instead of binary
- **AI credits**: New metering system introduced across both AI features
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 5. INCIDENTTRIAGE

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | Service registry (capped), alert ingestion, incident status workflow, **AI Root Cause Copilot (tiny allotment — matches existing 5/mo Free access)** |
| **Starter** | + Service health computation, CSV incident report, **AI Root Cause Copilot (first real AI value)** |
| **Pro** | + **AI Root Cause Copilot (full usage)** |
| **Business** | + Team seats, AI credit pool scaled for teams, higher incident ceilings |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, dedicated on-call readiness |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Services (projects) | 3 | 15 | 75 | 300 | Unlimited |
| Incidents / month | 20 | 200 | 2,000 | 10,000 | Unlimited |
| AI root-cause analyses / month | Included in credits | Included in credits | Included in credits | Included in credits | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 5 | AI Root Cause Copilot (matches Loop 1's existing 5/mo Free cap) |
| Starter | 10 | AI Root Cause Copilot |
| Pro | 100 | AI Root Cause Copilot |
| Business | 300 | AI Root Cause Copilot, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Root Cause Copilot, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: PagerDuty/Opsgenie webhook receiver, Jira integration, Slack notifications, AI Postmortem Generator.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Root Cause Copilot | All plans (credit-metered, tiny on Free) |
| Service health computation | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | Service health computation + more AI Root Cause credits |
| Starter → Pro | Full AI Root Cause Copilot usage |
| Pro → Business | Team seats, higher incident ceilings |
| Business → Enterprise | SSO/SCIM, unlimited AI, dedicated on-call readiness |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $39 | 10 | $0.20 | $3 | $1.17 | $4.37 | 88.8% | ✅ PASS |
| Pro | $149 | 100 | $2.00 | $5 | $4.47 | $11.47 | 92.3% | ✅ PASS |
| Business | $349 | 300 | $6.00 | $8 | $10.47 | $24.47 | 93.0% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$39/$149); Business new at $349; Enterprise custom
- **Limits changed**: Business-tier limits newly defined
- **Features moved**: None — AI Root Cause Copilot's existing Free 5/mo cap is preserved, now formalized as a credit allotment
- **AI credits**: New metering system introduced
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 6. AUTHSTARTUP

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | 1 project, public end-user auth API (email/password, capped MAU), security posture engine (rule-based, manual run) |
| **Starter** | + More projects, API key management (create/list/revoke), **AI Security Advisor (first AI value)** |
| **Pro** | + Higher MAU ceiling, **AI Security Advisor (full usage)** |
| **Business** | + Team seats, higher MAU/project ceilings, AI credit pool scaled for teams |
| **Enterprise** | + SAML/SSO/SCIM (marketing-tier — flagged V2, see Step 11), custom domains, dedicated cluster, unlimited MAU/credits |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Projects | 1 | 3 | 10 | 50 | Unlimited |
| Monthly active end-users (MAU) | 500 | 5,000 | 50,000 | 250,000 | Unlimited |
| API keys / project | 1 | 3 | 10 | 25 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Security Advisor |
| Pro | 100 | AI Security Advisor |
| Business | 300 | AI Security Advisor, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Security Advisor, custom contract |

## Step 5 — API Freeze

AuthStartup is the one exception to the Global API Policy — its public end-user auth API (`/api/v1/auth/register`, `/api/v1/auth/login`) is the core product, live from Free.

| Plan | API | Rate limit | Endpoints | Restrictions |
|---|---|---|---|---|
| Free | Live | 60 req/min | register, login | MAU-capped |
| Starter | Live | 300 req/min | register, login | MAU-capped |
| Pro | Live | 1,000 req/min | register, login | MAU-capped |
| Business | Live | 5,000 req/min | register, login | MAU-capped |
| Enterprise | Live | Unlimited / dedicated | register, login | Private/dedicated cluster available |

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: OAuth/social login, magic links, MFA enrollment/verification, password reset UI, session listing/revocation UI — all have shared-platform library code already but are not yet wired into AuthStartup's routes (per Loop 1 audit).

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Security Advisor | Starter+ (credit-metered) |
| API key management | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | More projects, API key management, first AI Security Advisor credits |
| Starter → Pro | Higher MAU ceiling, full AI Security Advisor usage |
| Pro → Business | Team seats, higher MAU/project ceilings |
| Business → Enterprise | SSO/SCIM (pending V2 wiring), custom domains, dedicated cluster |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $25 | 10 | $0.20 | $3 | $0.75 | $3.95 | 84.2% | ✅ PASS |
| Pro | $79 | 100 | $2.00 | $5 | $2.37 | $9.37 | 88.1% | ✅ PASS |
| Business | $199 | 300 | $6.00 | $8 | $5.97 | $19.97 | 90.0% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$25/$79); Business new at $199; Enterprise custom
- **Limits changed**: Business-tier MAU/project ceilings newly defined
- **Features moved**: AI Security Advisor moves from hard Pro-only gate to credit-metered Starter+ gate (engineering follow-up required)
- **AI credits**: New metering system introduced
- **API**: Confirmed live from Free (sole exception among the 12 products) — note SAML/SSO/SCIM marketed at Enterprise are NOT implemented in code per Loop 1 and require a V2 engineering loop before they can be sold

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 7. ERPAUDIT

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | 1 ERP instance, configuration scan intake (capped), SoD violation detection, config rule engine, compliance score |
| **Starter** | + More instances, findings status workflow, CSV findings report, **AI ERP Auditor (first AI value)** |
| **Pro** | + Higher scan ceilings, **AI ERP Auditor (full usage)** |
| **Business** | + Team seats, AI credit pool scaled for teams, higher instance/scan ceilings |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, dedicated compliance retention |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| ERP instances | 1 | 3 | 10 | 40 | Unlimited |
| Configuration scans / month | 2 | 20 | 200 | 1,000 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI ERP Auditor |
| Pro | 100 | AI ERP Auditor |
| Business | 300 | AI ERP Auditor, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI ERP Auditor, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: live SAP/Oracle/Dynamics read-only connectors, change-diff view.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI ERP Auditor | Starter+ (credit-metered) |
| Findings status workflow | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | More instances + findings workflow + first AI ERP Auditor credits |
| Starter → Pro | Full AI ERP Auditor usage across all findings |
| Pro → Business | Team seats, higher instance/scan ceilings |
| Business → Enterprise | SSO/SCIM, unlimited AI, dedicated compliance retention |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $49 | 10 | $0.20 | $3 | $1.47 | $4.67 | 90.5% | ✅ PASS |
| Pro | $149 | 100 | $2.00 | $5 | $4.47 | $11.47 | 92.3% | ✅ PASS |
| Business | $349 | 300 | $6.00 | $8 | $10.47 | $24.47 | 93.0% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$49/$149); Business new at $349; Enterprise custom
- **Limits changed**: Business-tier instance/scan ceilings newly defined
- **Features moved**: AI ERP Auditor moves from `use_ai_summary` binary gate to credit-metered Starter+ gate (engineering follow-up required)
- **AI credits**: New metering system introduced
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 8. CONTACTVERIFY

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | Contact creation (capped), email/phone validation, deterministic health score |
| **Starter** | + Duplicate detection, CSV contacts report, **AI Contact Health Engine (first AI value)** |
| **Pro** | + Higher contact ceiling, **AI Contact Health Engine (full usage)** |
| **Business** | + Team seats, AI credit pool scaled for teams, higher verification ceilings |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, dedicated support |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Contacts | 250 | 5,000 | 50,000 | 250,000 | Unlimited |
| Verifications / month | 250 | 5,000 | 50,000 | 250,000 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Contact Health Engine |
| Pro | 100 | AI Contact Health Engine |
| Business | 300 | AI Contact Health Engine, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Contact Health Engine, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: CRM sync (HubSpot/Salesforce), contact enrichment, bulk verification/import, live MX/carrier lookups.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Contact Health Engine | Starter+ (credit-metered) |
| Duplicate detection | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | Duplicate detection + first AI Contact Health Engine credits |
| Starter → Pro | Full AI Contact Health Engine usage (lead quality, enrichment suggestions) |
| Pro → Business | Team seats, higher contact/verification ceilings |
| Business → Enterprise | SSO/SCIM, unlimited AI, dedicated support |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $29 | 10 | $0.20 | $3 | $0.87 | $4.07 | 86.0% | ✅ PASS |
| Pro | $99 | 100 | $2.00 | $5 | $2.97 | $9.97 | 89.9% | ✅ PASS |
| Business | $229 | 300 | $6.00 | $8 | $6.87 | $20.87 | 90.9% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$29/$99); Business new at $229; Enterprise custom
- **Limits changed**: Business-tier contact/verification ceilings newly defined
- **Features moved**: AI Contact Health Engine moves from hard Pro-only gate to credit-metered Starter+ gate (engineering follow-up required)
- **AI credits**: New metering system introduced
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 9. CHARACTERCONSISTENCY

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | 1 character, limited generations, consistency/drift scoring |
| **Starter** | + More characters/generations, CSV generation history export, **AI Character DNA (first AI value)** |
| **Pro** | + Style references, **AI Character DNA (full usage)** |
| **Business** | + Team workspace, higher generation ceilings, AI credit pool scaled for teams |
| **Enterprise** | + White-label, private models, unlimited AI credits |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Characters | 1 | 10 | 50 | 250 | Unlimited |
| Generations / month | 10 | 100 | 1,000 | 5,000 | Unlimited |
| Style references | 1 | 5 | 20 | 100 | Unlimited |

## Step 4 — AI Credit Freeze

*(Distinct from the Generations limit above — Generations are the deterministic prompt-assembly feature; AI Credits fund the AI Character DNA LLM call only.)*

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Character DNA |
| Pro | 100 | AI Character DNA |
| Business | 300 | AI Character DNA, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Character DNA, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: image generation provider (Stability/DALL-E), AI Prompt Optimizer, Multi-Character Scenes, Comic Panel Generator.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Character DNA | Starter+ (credit-metered) |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | More characters/generations + first AI Character DNA credits |
| Starter → Pro | Style references + full AI Character DNA usage |
| Pro → Business | Team workspace, higher generation ceilings |
| Business → Enterprise | White-label, private models, unlimited AI |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $19 | 10 | $0.20 | $3 | $0.57 | $3.77 | 80.2% | ✅ PASS |
| Pro | $59 | 100 | $2.00 | $5 | $1.77 | $8.77 | 85.1% | ✅ PASS |
| Business | $129 | 300 | $6.00 | $8 | $3.87 | $17.87 | 86.1% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$19/$59); Business new at $129; Enterprise custom
- **Limits changed**: Business-tier character/generation/style-reference ceilings newly defined
- **Features moved**: AI Character DNA moves from `use_story_memory` hard Pro-only gate to credit-metered Starter+ gate (engineering follow-up required)
- **AI credits**: New metering system introduced, separated from the existing Generations limit
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 10. PAYROLLAUDIT

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | 1 company, capped employees, 1 payroll run/mo, payroll validation engine, compliance score |
| **Starter** | + More employees/runs, findings management, CSV findings report, **AI Payroll Copilot (first AI value — basic)** |
| **Pro** | + **AI Payroll Copilot (full usage)** |
| **Business** | + Multi-company support, team seats, AI credit pool scaled for teams |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, dedicated compliance retention |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Companies | 1 | 2 | 5 | 25 | Unlimited |
| Employees | 10 | 100 | 1,000 | 5,000 | Unlimited |
| Payroll runs / month | 1 | 4 | 12 | 50 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Payroll Copilot (basic) |
| Pro | 100 | AI Payroll Copilot (full) |
| Business | 300 | AI Payroll Copilot, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Payroll Copilot, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented (auto-creates first company).

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: spreadsheet/CSV bulk payroll import, AI Fraud Detection, AI Salary Forecasting, Automated Audit Reports.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Payroll Copilot | Starter+ (credit-metered) |
| Findings management | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | More employees/runs + findings management + first AI Payroll Copilot credits |
| Starter → Pro | Full AI Payroll Copilot usage |
| Pro → Business | Multi-company support, team seats |
| Business → Enterprise | SSO/SCIM, unlimited AI, dedicated compliance retention |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $39 | 10 | $0.20 | $3 | $1.17 | $4.37 | 88.8% | ✅ PASS |
| Pro | $129 | 100 | $2.00 | $5 | $3.87 | $10.87 | 91.6% | ✅ PASS |
| Business | $299 | 300 | $6.00 | $8 | $8.97 | $22.97 | 92.3% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$39/$129); Business new at $299; Enterprise custom
- **Limits changed**: Business-tier company/employee/run ceilings newly defined
- **Features moved**: AI Payroll Copilot's existing basic-Starter/full-Pro split carried over, now formalized as credit tiers (10/mo vs 100/mo)
- **AI credits**: New metering system introduced
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 11. TRANSCRIPTIONQA

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | Transcript ingestion (capped), speaker attribution anomaly detection, accuracy score |
| **Starter** | + Domain terminology validation, plain-text export, CSV findings report, **AI Accuracy Copilot (first AI value)** |
| **Pro** | + **AI Accuracy Copilot (full usage)** |
| **Business** | + Team seats, higher processing-minute ceilings, AI credit pool scaled for teams |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, dedicated processing capacity |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Transcripts (audio uploads) / month | 5 | 50 | 500 | 2,500 | Unlimited |
| Processing minutes / month | 30 | 300 | 3,000 | 15,000 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Accuracy Copilot |
| Pro | 100 | AI Accuracy Copilot |
| Business | 300 | AI Accuracy Copilot, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Accuracy Copilot, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: audio upload/ASR integration (currently text-paste only), AI Grammar Check, AI Translation, AI Compliance Detection.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| Domain terminology validation | Starter+ |
| AI Accuracy Copilot | Starter+ (credit-metered) |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | Domain terminology validation + first AI Accuracy Copilot credits |
| Starter → Pro | Full AI Accuracy Copilot usage |
| Pro → Business | Team seats, higher processing-minute ceilings |
| Business → Enterprise | SSO/SCIM, unlimited AI, dedicated processing capacity |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $29 | 10 | $0.20 | $3 | $0.87 | $4.07 | 86.0% | ✅ PASS |
| Pro | $99 | 100 | $2.00 | $5 | $2.97 | $9.97 | 89.9% | ✅ PASS |
| Business | $229 | 300 | $6.00 | $8 | $6.87 | $20.87 | 90.9% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$29/$99); Business new at $229; Enterprise custom
- **Limits changed**: Business-tier upload/processing-minute ceilings newly defined
- **Features moved**: AI Accuracy Copilot moves from `use_accuracy_score` hard Pro-only gate to credit-metered Starter+ gate (engineering follow-up required)
- **AI credits**: New metering system introduced
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

# 12. SCHEMALINT

## Step 1 — Plan Freeze
Free · Starter · Pro · Business · Enterprise

## Step 2 — Feature Allocation

| Plan | Features |
|---|---|
| **Free** | 1 schema, deterministic lint engine (4 rules), health score |
| **Starter** | + More schemas, findings status management, CSV findings report, **AI Database Architect (first AI value)** |
| **Pro** | + **AI Database Architect (full usage)** |
| **Business** | + Team seats, higher schema ceilings, AI credit pool scaled for teams |
| **Enterprise** | + SSO, SCIM, unlimited AI credits, private deployment |

## Step 3 — Limit Freeze

| Limit | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Schemas | 1 | 10 | 50 | 250 | Unlimited |
| Tables tracked / schema | 20 | 100 | 500 | 2,000 | Unlimited |

## Step 4 — AI Credit Freeze

| Plan | AI Credits / mo | Covers |
|---|---|---|
| Free | 0 | No AI access |
| Starter | 10 | AI Database Architect |
| Pro | 100 | AI Database Architect |
| Business | 300 | AI Database Architect, team-scale pool |
| Enterprise | Unlimited (fair-use) | AI Database Architect, custom contract |

## Step 5 — API Freeze
No public API in V1 (see Global API Policy).

## Step 6 — Billing Freeze
Inherits Global Billing Rules. 14-day Pro-level trial already implemented.

## Step 7 — Integration Freeze
V1: Stripe only. V2 backlog: live read-only database connection (currently paste-JSON only), AI Migration Generator, AI Query Optimization, AI Security Audit.

## Step 8 — Feature Gating

| Feature | Gate |
|---|---|
| AI Database Architect | Starter+ (credit-metered) |
| Findings status management | Starter+ |
| CSV export | Starter+ |
| Admin panel | All paid plans |

## Step 9 — Upgrade Path

| Transition | Reason |
|---|---|
| Free → Starter | More schemas + findings management + first AI Database Architect credits |
| Starter → Pro | Full AI Database Architect usage |
| Pro → Business | Team seats, higher schema ceilings |
| Business → Enterprise | SSO/SCIM, unlimited AI, private deployment |

## Step 10 — Unit Economics Check

| Plan | Price | Credits | AI Cost | Infra | Stripe Fee | COGS | Margin | Verdict |
|---|---|---|---|---|---|---|---|---|
| Starter | $19 | 10 | $0.20 | $3 | $0.57 | $3.77 | 80.2% | ✅ PASS |
| Pro | $59 | 100 | $2.00 | $5 | $1.77 | $8.77 | 85.1% | ✅ PASS |
| Business | $129 | 300 | $6.00 | $8 | $3.87 | $17.87 | 86.1% | ✅ PASS |

## Step 11 — Commercial Change Log
- **Plans added**: Business
- **Pricing**: Free/Starter/Pro unchanged ($0/$19/$59); Business new at $129; Enterprise custom
- **Limits changed**: Business-tier schema/table ceilings newly defined
- **Features moved**: AI Database Architect moves from `use_performance_advisor` hard Pro-only gate to credit-metered Starter+ gate (engineering follow-up required)
- **AI credits**: New metering system introduced
- **API**: Confirmed not available in V1

## Step 12 — Commercial Freeze
**STATUS: ✅ COMMERCIAL MODEL LOCKED**

---

## PORTFOLIO-WIDE UNIT ECONOMICS SUMMARY

All 60 paid-tier price points (12 products × Starter/Pro/Business) were checked against the ≥75%
target gross margin. **Zero rejections.** Margin range: 80.2% (lowest — CodeAudit/SchemaLint
Starter) to 93.9% (highest — SecCorrelate Business). Enterprise tiers are custom-quoted and must
individually clear ≥70% margin at contract signature (sales-desk responsibility, not pre-computed
here).

| Product | Starter Margin | Pro Margin | Business Margin |
|---|---|---|---|
| SpendGov | 86.0% | 89.9% | 91.4% |
| SecCorrelate | 90.5% | 93.5% | 93.9% |
| CodeAudit | 80.2% | 82.7% | 81.3% |
| CRMCapture | 86.0% | 88.1% | 87.6% |
| IncidentTriage | 88.8% | 92.3% | 93.0% |
| AuthStartup | 84.2% | 88.1% | 90.0% |
| ERPAudit | 90.5% | 92.3% | 93.0% |
| ContactVerify | 86.0% | 89.9% | 90.9% |
| CharacterConsistency | 80.2% | 85.1% | 86.1% |
| PayrollAudit | 88.8% | 91.6% | 92.3% |
| TranscriptionQA | 86.0% | 89.9% | 90.9% |
| SchemaLint | 80.2% | 85.1% | 86.1% |

## PORTFOLIO-WIDE ENGINEERING FOLLOW-UPS (out of scope for this loop)

This loop is documentation only — nothing below was implemented. Flagged here so the next
engineering loop has a clean punch list:

1. **AI entitlement re-gating** (11 of 12 products): move each primary AI feature from a hard
   Pro-only `can()` check to a credit-metered check available from Starter, per Step 2/Step 8 of
   each product above.
2. **AI credit ledger**: no credit-tracking table/service exists yet in `@founder-os/platform` —
   needs a new shared module (increment on AI call, reset monthly, expose remaining balance to UI).
3. **Yearly billing SKUs**: only monthly Stripe price IDs exist today; annual price IDs need to be
   created in Stripe and wired into `stripe-price-map.ts` for all 12 products.
4. **Business-tier Stripe price IDs**: none exist yet for any product; checkout currently only
   accepts `starter`/`pro` plan codes.
5. **API access** (11 of 12 products): no public REST API exists; Business/Enterprise API
   entitlements are commercial placeholders until built.
6. **AuthStartup OAuth/magic-links/MFA/SSO**: shared-platform library functions exist but are not
   wired into any AuthStartup route — required before Enterprise SSO/SCIM can be sold truthfully.

---

---

# LOOP 2 COMPLETION — MISSING SECTIONS

> These five sections supersede the generic placeholder AI-credit and limit tables used inside
> each product's Step 3/Step 4 above. Every price point ($ figures) from the original 12 product
> sections is unchanged — nothing here alters locked pricing. All numbers below are the ones to
> be implemented in Loop 3.

## SECTION 1 — PRODUCT-SPECIFIC AI CREDIT SYSTEM

**Shared definition (unchanged across products):** 1 AI Credit = 1 generated AI output (one
Copilot brief, one fix suggestion, one DNA spec, etc.). What differs per product is the **cost of
that one output** (driven by how much context the LLM call needs) and the **expected usage
cadence** of that product's single AI feature — so the credit allotments are tuned per product
against the *already-locked* Free/Starter/Pro/Business prices, not copied from a shared table.

**Reset Period:** Monthly, aligned to the org's Stripe billing period (not calendar month) — this
already exists for free via `shared/platform`'s `incrementUsage`/`getCurrentUsage`, which key
usage counters off `subscription.currentPeriodStart`, not the 1st of the month.

**Overage Policy (shared across all 12 products):** Hard stop, not billed overage. When an org's
`ai_credits_monthly` counter reaches its plan limit, the AI route returns `403 UNAUTHORIZED` with
an upgrade prompt (matches the existing `withinLimit()` rejection pattern already used for every
other metered feature — e.g. SpendGov's `saas_apps_tracked`). No pay-per-credit top-ups in V1 —
Founder OS is not selling metered overage billing this loop; upgrading plan is the only path to
more credits. (V2 candidate: a Stripe metered-billing add-on for overage — explicitly out of
scope here.)

**Fair Usage Policy (shared, Enterprise-specific):** Enterprise credits are "Unlimited" in the
plan card but enforced server-side as a generous fair-use ceiling (10x the Business allotment)
to prevent a single misconfigured integration from generating unbounded AI spend; exceeding it
triggers an internal alert to the account team, not a customer-facing block.

| Product | AI cost / credit | Reasoning | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|---|---|
| SpendGov | $0.025 | CFO Copilot reasons over multiple findings (duplicates+waste+vendor+renewals) — 2–3K token context | 0 | 15 | 80 | 240 | Unlimited (fair-use ≈2,400) |
| SecCorrelate | $0.020 | AI Investigate reasons over 2 correlated events + 1 rule — smaller, ~2K token context | 5 (matches existing every-plan access) | 20 | 150 | 450 | Unlimited (fair-use ≈4,500) |
| CodeAudit | $0.030 | Fix Engine ingests a code snippet + finding and must emit a working patch — largest single-call token footprint in the portfolio, ~3K tokens | 0 | 25 | 150 | 320 | Unlimited (fair-use ≈3,200) |
| CRMCapture | $0.015 | Lead Extraction is short text→JSON (~800 tokens); Sales Assistant is a compact lead-context call (~2K) — cheapest AI in the portfolio | 0 | 30 | 150 | 450 | Unlimited (fair-use ≈4,500) |
| IncidentTriage | $0.020 | Root Cause Copilot reasons over an alert timeline — incidents are episodic, so usage cadence is naturally low even though cost/call is mid-range | 5 (matches existing Free 5/mo cap) | 8 | 60 | 180 | Unlimited (fair-use ≈1,800) |
| AuthStartup | $0.015 | Security Advisor explains a single rule-engine finding — smallest, most templated AI call in the portfolio | 0 | 5 | 40 | 120 | Unlimited (fair-use ≈1,200) |
| ERPAudit | $0.025 | ERP Auditor must produce a 4-part narrative (explanation + compliance impact + fix + business impact) per finding — wider output, ~2.5K tokens | 0 | 10 | 80 | 240 | Unlimited (fair-use ≈2,400) |
| ContactVerify | $0.012 | Health Engine reasons over one contact's fields — smallest structured-output schema in the portfolio | 0 | 20 | 150 | 450 | Unlimited (fair-use ≈4,500) |
| CharacterConsistency | $0.025 | Character DNA expands a short description into a full spec (prompt template + negative prompt + attribute map + features) — but runs once per character, not per generation, so cadence is low | 0 | 5 | 30 | 90 | Unlimited (fair-use ≈900) |
| PayrollAudit | $0.028 | Payroll Copilot reasons over a full run's findings list, which can be long — but payroll runs are inherently periodic (weekly/biweekly/monthly), so cadence is the lowest in the portfolio | 0 | 4 | 15 | 45 | Unlimited (fair-use ≈450) |
| TranscriptionQA | $0.030 | Accuracy Copilot ingests full transcript text alongside findings — variable but often the longest raw-text context in the portfolio | 0 | 15 | 100 | 300 | Unlimited (fair-use ≈3,000) |
| SchemaLint | $0.035 | Database Architect ingests an entire schema (every table/column/index) plus findings — largest and most variable context size in the portfolio, scales with customer's DB size | 0 | 5 | 40 | 120 | Unlimited (fair-use ≈1,200) |

**AI Usage (what consumes 1 credit, per product):**

| Product | Credit-consuming action(s) |
|---|---|
| SpendGov | 1 credit = 1 AI CFO Copilot brief **or** 1 AI contract term extraction |
| SecCorrelate | 1 credit = 1 AI Investigate incident summary |
| CodeAudit | 1 credit = 1 AI Fix Engine suggestion (explanation + patch + risk score) |
| CRMCapture | 1 credit = 1 AI Lead Extraction **or** 1 AI Sales Assistant suggestion |
| IncidentTriage | 1 credit = 1 AI Root Cause Copilot analysis |
| AuthStartup | 1 credit = 1 AI Security Advisor recommendation |
| ERPAudit | 1 credit = 1 AI ERP Auditor summary |
| ContactVerify | 1 credit = 1 AI Contact Health Engine profile |
| CharacterConsistency | 1 credit = 1 AI Character DNA generation |
| PayrollAudit | 1 credit = 1 AI Payroll Copilot brief |
| TranscriptionQA | 1 credit = 1 AI Accuracy Copilot brief |
| SchemaLint | 1 credit = 1 AI Database Architect brief |

**Margin verification** (against the already-locked prices, product-specific cost/credit, and the
allotments above): all Starter/Pro/Business combinations clear the ≥75% target after retuning —
see the Portfolio-Wide Unit Economics Summary at the end of this document, which is updated with
these product-specific figures. CodeAudit Pro/Business required tuning down from an initial
200/600-credit draft to 150/320 to clear the margin floor (CodeAudit has the highest cost/credit
in the portfolio) — captured in each product's Section 4 migration notes below.

---

## SECTION 2 — PRODUCT-SPECIFIC LIMITS

Every limit key below is the **real, already-implemented** entitlement key from each product's
`lib/services/billing.ts` (verified by reading the actual code, not invented). Two changes are
made portfolio-wide relative to the current code:

1. **A `business` tier is inserted** between the current `pro` and `enterprise` rows.
2. **Any limit that is currently `null` (unlimited) at Pro is capped at a high finite number.**
   Loop 1's code left several Pro-tier limits unbounded, which leaves no room for Business to be a
   meaningfully bigger tier and violates the global rule "DO NOT use Unlimited unless financially
   sustainable." Enterprise remains the only tier with true `null` (unlimited) limits.

| Product | Limit | Free | Starter | Pro (was ∞ in code → capped) | Business | Enterprise |
|---|---|---|---|---|---|---|
| **SpendGov** | Organizations | 1 | 3 | 10 *(was ∞)* | 25 | ∞ |
| | SaaS apps tracked | 25 | 100 | 500 *(was ∞)* | 2,000 | ∞ |
| | AI tools tracked | 10 | 50 *(was ∞ — now finite)* | 250 | 1,000 | ∞ |
| | History (days) | 14 | 90 | 1,095 | 1,825 | ∞ |
| **SecCorrelate** | Integrations | 2 | 10 | 25 *(was ∞)* | 100 | ∞ |
| | Alert ingestion / day | 1,000 | 50,000 | 250,000 *(was ∞)* | 1,000,000 | ∞ |
| **CodeAudit** | Private repos | 1 | 10 | 50 *(was ∞)* | 200 | ∞ |
| | Public repos | 3 | 50 *(was ∞ — now finite)* | 200 | 1,000 | ∞ |
| | Files scanned / month | 500 | 5,000 | 25,000 *(was ∞)* | 100,000 | ∞ |
| | PR scans / month | 20 | 300 | 1,500 *(was ∞)* | 6,000 | ∞ |
| **CRMCapture** | Contacts | 100 | 10,000 | 50,000 *(was ∞)* | 200,000 | ∞ |
| | Leads | 100 | 10,000 *(was ∞ — now finite)* | 50,000 | 200,000 | ∞ |
| | ~~ai_summaries_monthly~~ | — | — | — | — | *deprecated → folded into `ai_credits_monthly` (Section 1)* |
| **IncidentTriage** | Projects (services) | 1 | 5 | 25 *(was ∞)* | 100 | ∞ |
| | Team members | 2 | 10 | 50 *(was ∞)* | 200 | ∞ |
| | Incidents / month | 100 | 1,000 | 5,000 *(was ∞)* | 20,000 | ∞ |
| | ~~ai_root_cause_analyses_monthly~~ | — | — | — | — | *deprecated → folded into `ai_credits_monthly`* |
| | History (days) | 7 | 90 | 730 | 1,825 | ∞ |
| **AuthStartup** | Projects | 1 | 3 *(was 1 — bumped, Starter=Free was a Loop 1 gap)* | 25 *(was ∞)* | 100 | ∞ |
| | Monthly active users (MAU) | 1,000 | 10,000 | 100,000 *(was ∞)* | 500,000 | ∞ |
| **ERPAudit** | ERP instances | 1 | 5 | 25 *(was ∞)* | 100 | ∞ |
| | Users | 2 | 10 | 50 *(was ∞)* | 200 | ∞ |
| | Configuration scans / month | 5 | 100 *(was ∞ — now finite)* | 500 | 2,000 | ∞ |
| | History (days) | 7 | 90 | 730 | 1,825 | ∞ |
| **ContactVerify** | Verifications / month | 500 | 10,000 | 50,000 *(was ∞)* | 200,000 | ∞ |
| **CharacterConsistency** | Characters | 1 | 10 | 50 *(was ∞)* | 200 | ∞ |
| | Generations / month | 20 | 500 | 2,500 *(was ∞)* | 10,000 | ∞ |
| | Style references | 5 | 50 | 200 *(was ∞)* | 1,000 | ∞ |
| **PayrollAudit** | Companies | 1 | 2 *(was 1 — bumped, Starter=Free was a Loop 1 gap)* | 10 *(was ∞)* | 40 | ∞ |
| | Employees | 20 | 250 | 2,000 *(was ∞)* | 10,000 | ∞ |
| | Payroll runs / month | 1 | 20 *(was ∞ — now finite)* | 100 | 400 | ∞ |
| **TranscriptionQA** | Audio uploads (transcripts) / month | 5 | 100 *(was ∞ — now finite)* | 500 | 2,000 | ∞ |
| | Processing minutes / month | 60 | 500 | 2,500 *(was ∞)* | 10,000 | ∞ |
| **SchemaLint** | Database schemas | 3 | 20 | 100 *(was ∞)* | 400 | ∞ |
| | Tables tracked | 100 | 2,000 *(was ∞ — now finite)* | 10,000 | 40,000 | ∞ |

---

## SECTION 3 — COMMERCIAL DEPENDENCY MAP

```
Pricing (locked $ per plan, this document)
  └──▶ Stripe
         ├──▶ Stripe Price IDs (env-var per plan per product, fail-closed if unset)
         │      └──▶ stripe-price-map.ts (12x, one per product)
         │             └──▶ Checkout Route (app/api/billing/checkout)
         │                    └──▶ createCheckoutSession() [@founder-os/platform/billing]
         ├──▶ Stripe Billing Portal
         │      └──▶ Portal Route (app/api/billing/portal)
         └──▶ Stripe Webhook
                └──▶ Webhook Route (app/api/billing/webhook)
                       └──▶ handleStripeWebhookEvent() [@founder-os/platform/billing]
                              └──▶ Subscription record (plan, status, currentPeriodStart/End)

Feature Gates (Section 2 booleans, e.g. use_ai_cfo_copilot)
  └──▶ Plan Engine [@founder-os/platform/billing: can(), getEntitlementSummary()]
         └──▶ PlanEntitlement rows (seeded per plan by each product's seedPlans())
                └──▶ Route-level can() checks (403 UNAUTHORIZED if not entitled)

AI Credits (Section 1, ai_credits_monthly)
  └──▶ Credit Ledger [@founder-os/platform/billing: withinLimit() + incrementUsage()]
         └──▶ UsageCounter rows (keyed by org + metric + subscription.currentPeriodStart)
                ├──▶ AI route pre-check: withinLimit(orgId, "ai_credits_monthly") → 403 if exceeded
                └──▶ AI route post-success: incrementUsage(orgId, "ai_credits_monthly", 1)
                       └──▶ AICreditMeter component [@founder-os/ui] reads getCurrentUsage() for display

Usage Limits (Section 2 numeric limits, e.g. saas_apps_tracked)
  └──▶ Usage Limit Engine [@founder-os/platform/billing: withinLimit(), incrementUsage()]
         └──▶ Same UsageCounter table as AI Credits, different metricKey per limit
                └──▶ UsageMeter component [@founder-os/ui] reads getCurrentUsage() for display

API (Section 5 of COMMERCIAL_FREEZE.md — 11/12 products: not live in V1)
  └──▶ API Gateway (V2 — not built; only AuthStartup's end-user auth API is live today)
         └──▶ API keys (AuthStartup only, already implemented: ProjectApiKey model)

Enterprise
  └──▶ SSO / SCIM (marketing-tier only — shared-platform OAuth/SAML library exists but is
         not wired into any product route; flagged as an engineering follow-up per product)
  └──▶ Private deployment (manually provisioned, outside the self-serve Stripe flow —
         Enterprise subscriptions are created directly against the "enterprise" plan code,
         bypassing Checkout entirely, same pattern as today)

Plan Badge / Pricing Card / Upgrade Modal / Feature Matrix [@founder-os/ui]
  └──▶ Read plan code + entitlement summary from the org's active Subscription
         └──▶ Rendered identically across all 12 products (Section 5 — shared, never duplicated)
```

Every arrow above is either already-implemented shared-platform infrastructure (Stripe, Plan
Engine, Credit/Usage Ledger — all one and the same `UsageCounter` mechanism) or a net-new shared
UI component to be built once in `@founder-os/ui` and consumed by all 12 products. No product gets
its own bespoke pricing/billing/credit code path — that would violate "never duplicate code."

---

## SECTION 4 — MIGRATION IMPACT TABLE

Every row below is scoped to **wiring the already-locked commercial model into existing code** —
no redesign, no renamed products, no new features beyond the Business tier and AI-credit metering.

| Product | Frontend Changes | Backend Changes | Database Changes | Billing Changes | Dashboard Changes | Feature Gate Changes | Navigation Changes | Risk | Complexity | Files Expected to Change | Purpose |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **SpendGov** | Billing page: 5-tier `PricingCard` grid, `AICreditMeter` | AI routes (`/copilot/generate`, `/contracts/extract`) add credit check | None (uses existing `UsageCounter` table) | New `business` Stripe price env var; checkout enum +`business` | Add `AICreditMeter` to dashboard header | AI CFO Copilot/contract extraction move Pro-only → Starter+ credit-gated | None | Low | Medium | `billing.ts`, `stripe-price-map.ts`, `checkout/route.ts`, `copilot/generate/route.ts`, `contracts/extract/route.ts`, `billing/page.tsx`, `dashboard/page.tsx` (~7) | Unlock the commercial model without touching product scope |
| **SecCorrelate** | Same pattern | `/alerts/[id]/summarize` adds credit check | None | Same | Same | AI Investigate stays available at all tiers, now credit-metered instead of unmetered | None | Low | Medium | ~7 files | Same |
| **CodeAudit** | Same pattern, per-seat pricing labels unchanged | `/findings/[id]/fix` adds credit check | None | Same | Same | AI Fix Engine moves Pro-only → Starter+ credit-gated | None | Low | Medium | ~7 files | Same |
| **CRMCapture** | Same pattern | `/contacts/extract`, `/leads/[id]/assist` add credit checks; retire `ai_summaries_monthly` limit | None | Same | Same | AI Lead Extraction (already Starter+) and AI Sales Assistant (Pro-only → Starter+) both credit-gated | None | Low | Medium | ~8 files | Same |
| **IncidentTriage** | Same pattern | `/incidents/[id]/analyze` adds credit check; retire `ai_root_cause_analyses_monthly` | None | Same | Same | AI Root Cause Copilot's existing Free-5/mo cap becomes the Free credit allotment | None | Low | Medium | ~8 files | Same |
| **AuthStartup** | Same pattern + existing live API docs unaffected | `/security/[id]/recommend` adds credit check | None | Same | Same + credit meter alongside existing MAU meter | AI Security Advisor moves Pro-only → Starter+ credit-gated | None | Low | Medium | ~7 files | Same |
| **ERPAudit** | Same pattern | `/findings/[id]/summarize` adds credit check | None | Same | Same | AI ERP Auditor moves Pro-only → Starter+ credit-gated | None | Low | Medium | ~7 files | Same |
| **ContactVerify** | Same pattern | `/contacts/[id]/analyze` adds credit check | None | Same | Same | AI Contact Health Engine moves Pro-only → Starter+ credit-gated | None | Low | Medium | ~7 files | Same |
| **CharacterConsistency** | Same pattern | `/characters/[id]/dna` adds credit check | None | Same | Same | AI Character DNA moves Pro-only → Starter+ credit-gated | None | Low | Medium | ~7 files | Same |
| **PayrollAudit** | Same pattern | `/payroll-runs/[id]/copilot` adds credit check | None | Same | Same | AI Payroll Copilot's existing basic/full split becomes Starter/Pro credit tiers | None | Low | Medium | ~7 files | Same |
| **TranscriptionQA** | Same pattern | `/transcripts/[id]/copilot` adds credit check | None | Same | Same | AI Accuracy Copilot moves Pro-only → Starter+ credit-gated | None | Low | Medium | ~7 files | Same |
| **SchemaLint** | Same pattern | `/schemas/[id]/architect` adds credit check | None | Same | Same | AI Database Architect moves Pro-only → Starter+ credit-gated | None | Low | Medium | ~7 files | Same |
| **Shared Platform** | New `PricingCard`, `AICreditMeter`, `UsageMeter`, `PlanBadge`, `UpgradeModal`, `FeatureMatrix` in `@founder-os/ui` | New `checkAndConsumeAiCredit()` convenience helper in `@founder-os/platform/billing` (thin wrapper over existing `withinLimit`+`incrementUsage`, avoids duplicating the same 4-line boilerplate 12x) | None — reuses existing `UsageCounter`/`PlanEntitlement` tables | None | — | — | — | Low | Medium | ~7 new component files + 1 new helper file | Give all 12 products one shared implementation instead of 12 bespoke ones |

**Why every product row reads "Database Changes: None":** the Business tier and AI credits both
reuse tables that already exist (`Plan`, `PlanEntitlement`, `Subscription`, `UsageCounter`) — this
is additive `PlanEntitlement` seeding, not a schema migration. **Why every "Navigation Changes"
row is None:** the commercial model changes what a nav item is gated behind, not what nav items
exist — no page is added, removed, or renamed.

---

## SECTION 5 — SHARED COMPONENT INVENTORY

| Component | Status | Where it lives / will live | Used for |
|---|---|---|---|
| `Card`, `CardHeader`, `CardTitle`, `CardContent` | ✅ Exists | `@founder-os/ui/primitives` | Base of every pricing card, dashboard card |
| `Button` | ✅ Exists | `@founder-os/ui/primitives` | Upgrade/checkout/portal CTAs |
| `Badge` | ✅ Exists | `@founder-os/ui/primitives` | Base of the new `PlanBadge` |
| `Modal`, `ConfirmDialog` | ✅ Exists | `@founder-os/ui/primitives` | Base of the new `UpgradeModal` |
| `DataTable` | ✅ Exists | `@founder-os/ui/dashboard` | Base of the new `FeatureMatrix` (rows=features, cols=plans) |
| `KPICard`, `ChartCard` | ✅ Exists | `@founder-os/ui/dashboard` | Dashboard cards — unchanged, no product should hand-roll a new card style |
| `DashboardShell`, `AdminShell` | ✅ Exists | `@founder-os/ui/dashboard`, `@founder-os/ui/admin` | Sidebar + top navigation — unchanged, confirmed one shared implementation, no per-product forks found in Loop 1 audits |
| `BillingPanel` | ✅ Exists (admin-facing, read-only) | `@founder-os/ui/admin` | Admin billing summary — distinct from the user-facing pricing page, not duplicated |
| `EmptyState`, `ErrorState`, `Skeleton` | ✅ Exists | `@founder-os/ui/primitives` | Loading/empty states — unchanged |
| `Input`, `Select`, `Textarea`, `Checkbox` | ✅ Exists | `@founder-os/ui/primitives` | Forms — unchanged |
| `Toast`/`ToastProvider` | ✅ Exists | `@founder-os/ui/primitives` | Checkout error/success notifications — unchanged |
| `PricingCard` | 🆕 New | `@founder-os/ui/billing` (new subpath) | Renders one plan's price/features/CTA — replaces the 12 hand-rolled `PLANS.map(...)` blocks with one shared component taking plan data as props |
| `AICreditMeter` | 🆕 New | `@founder-os/ui/billing` | Progress-bar style "N of M AI credits used this period," reads `getCurrentUsage(orgId, "ai_credits_monthly")` |
| `UsageMeter` | 🆕 New | `@founder-os/ui/billing` | Generic version of the above for any numeric limit (contacts, schemas, employees, etc.) — `AICreditMeter` is a thin preset of this |
| `PlanBadge` | 🆕 New | `@founder-os/ui/billing` | Small pill showing the org's current plan (Free/Starter/Pro/Business/Enterprise), used in nav header and admin billing panel |
| `UpgradeModal` | 🆕 New | `@founder-os/ui/billing` | Triggered when a `withinLimit`/`can` check fails client-side; shows the specific limit hit and a CTA into the pricing page |
| `FeatureMatrix` | 🆕 New | `@founder-os/ui/billing` | Full feature-by-plan comparison table for the pricing page, built on top of the existing `DataTable` |

**Zero duplication confirmed:** grepping all 12 products' `app/(app)/billing/page.tsx` in Loop 1
showed every product already uses the *same* `Card`/`Button` primitives with a locally-defined
`PLANS` array — the only duplication is the plan-rendering JSX itself (~30 lines × 12 = ~360 lines
of near-identical code), which `PricingCard` + `FeatureMatrix` eliminate. No product has a bespoke
sidebar, table, chart, or dialog implementation — the existing `@founder-os/ui` primitives are
already fully shared, confirming the portfolio-first architecture rule was already being followed
before this loop.

---

## LOOP 2 FINAL APPROVAL

| Gate | Status |
|---|---|
| Product Freeze (Loop 1) | ✅ Approved |
| Commercial Freeze — 12 product sections | ✅ Approved |
| Commercial Freeze — Section 1 (AI Credits) | ✅ Approved |
| Commercial Freeze — Section 2 (Limits) | ✅ Approved |
| Commercial Freeze — Section 3 (Dependency Map) | ✅ Approved |
| Commercial Freeze — Section 4 (Migration Impact) | ✅ Approved |
| Commercial Freeze — Section 5 (Shared Components) | ✅ Approved |

**COMMERCIAL STATUS: ✅ LOCKED**

Product Freeze — Approved
Commercial Freeze — Approved


## GLOBAL STATUS

**FOUNDER OS V1 — COMMERCIAL MODEL LOCKED**

No more pricing changes. No more plan changes. No more limit changes. No more AI credit changes.

**STATUS: ✅ COMMERCIAL MODEL LOCKED — ALL 12 PRODUCTS**

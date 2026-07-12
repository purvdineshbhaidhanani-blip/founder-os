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

## GLOBAL STATUS

**FOUNDER OS V1 — COMMERCIAL MODEL LOCKED**

No more pricing changes. No more plan changes. No more limit changes. No more AI credit changes.

**STATUS: ✅ COMMERCIAL MODEL LOCKED — ALL 12 PRODUCTS**

# PRODUCT FREEZE — LOOP 1

> Generated: 2026-07-12
> Scope: All 12 Founder OS SaaS products
> Purpose: Audit-only feature freeze — no code changes
> Authority: Evidence from actual codebase inspection (routes, services, schemas, UI)

---

## 1. SPENDGOV

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Subscription inventory (create/list/get/update/soft-delete SaaS apps & AI tools) | `app/api/subscriptions`, `app/(app)/subscriptions` | IMPLEMENTED |
| 2 | Spend dashboard (KPI cards: total/SaaS/AI spend, potential savings, spend-by-category, alert feed) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 3 | Renewal calendar (subscriptions renewing within 90-day window) | `app/(app)/renewals`, `app/api/renewals` | IMPLEMENTED |
| 4 | Duplicate tool detection (rule-based category grouping, ≥2 vendors flagged) | `app/(app)/duplicates`, `app/api/duplicates/detect` | IMPLEMENTED |
| 5 | Waste identification (unused/underutilized/overprovisioned flagging by utilization thresholds) | `app/(app)/waste`, `app/api/waste/detect` | IMPLEMENTED |
| 6 | Vendor consolidation analysis (fragmented low-spend vendors flagged) | `app/(app)/vendors`, `app/api/vendors/analyze` | IMPLEMENTED |
| 7 | License utilization analysis (seat utilization %, wasted seat cost) | `lib/services/license-utilization.ts`, surfaced via `/api/dashboard` | IMPLEMENTED |
| 8 | AI CFO Copilot (structured spend recommendations via LLM, Pro+ gated) | `app/(app)/copilot`, `app/api/copilot/generate` | IMPLEMENTED |
| 9 | AI contract term extraction (paste contract text → structured JSON, Pro+ gated) | `app/api/contracts/extract` | IMPLEMENTED |
| 10 | CSV spend report export | `app/(app)/reports`, `app/api/reports/spend` | IMPLEMENTED |
| 11 | Admin user management (list/role-change/remove members) | `app/(admin)/admin/users`, `app/api/admin/members` | IMPLEMENTED |
| 12 | Admin audit log viewer | `app/(admin)/admin/audit-log`, `app/api/admin/audit-log` | IMPLEMENTED |
| 13 | Admin billing panel | `app/(admin)/admin/billing`, `app/api/admin/billing` | IMPLEMENTED |
| 14 | Email/password signup with org creation + 14-day Pro trial | `app/(auth)/signup`, `app/api/auth/signup` | IMPLEMENTED |
| 15 | Email/password login (session cookie) | `app/(auth)/login`, `app/api/auth/login` | IMPLEMENTED |
| 16 | Logout with session revocation | `app/api/auth/logout` | IMPLEMENTED |
| 17 | Profile page (view/edit display name) | `app/(app)/profile`, `app/api/profile` | IMPLEMENTED |
| 18 | Organization settings (view slug, edit name) | `app/(app)/settings`, `app/api/organization` | IMPLEMENTED |
| 19 | Stripe checkout (Starter/Pro) | `app/api/billing/checkout` | IMPLEMENTED |
| 20 | Stripe billing portal | `app/api/billing/portal` | IMPLEMENTED |
| 21 | Stripe webhook handler | `app/api/billing/webhook` | IMPLEMENTED |
| 22 | In-app notification on Copilot generation | `lib/services/copilot.ts` | IMPLEMENTED |
| 23 | Analytics event tracking (Copilot generation) | `lib/services/copilot.ts` | IMPLEMENTED |
| 24 | Plan-based usage limits (tracked apps/tools) | `app/api/subscriptions` | IMPLEMENTED |
| 25 | Entitlement gating (detect_duplicates, AI Copilot, contract extraction) | `app/api/duplicates`, `app/api/copilot`, `app/api/contracts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Subscription inventory | KEEP | Core domain, fully functional |
| Spend dashboard | KEEP | Core domain, all KPIs working |
| Renewal calendar | KEEP | Core domain, working |
| Duplicate detection (rule-based) | KEEP | Core domain, persisted findings |
| Waste identification | KEEP | Core domain, threshold-based |
| Vendor consolidation | KEEP | Core domain, working |
| License utilization | KEEP | Core domain, dashboard surfacing |
| AI CFO Copilot | KEEP | Killer feature, Pro-gated, fail-closed |
| AI contract extraction | KEEP | Differentiator, Pro-gated, fail-closed |
| CSV spend report | KEEP | All-plan export |
| Admin user management | KEEP | Platform standard |
| Admin audit log | KEEP | Platform standard |
| Admin billing panel | KEEP | Platform standard |
| Auth (signup/login/logout) | KEEP | Platform standard |
| Profile & settings | KEEP | Platform standard |
| Stripe billing flow | KEEP | Platform standard |
| Notifications & analytics | KEEP | Platform standard |
| Plan-based limits & entitlements | KEEP | Platform standard |
| CSV bulk import | REMOVE | Schema exists but no route/UI — dead code |
| Slack/email alert sending | REMOVE | Listed in pricing table but not implemented |
| Approval workflows | REMOVE | Entitlement defined but no feature code |
| API access | REMOVE | Entitlement defined but no feature code |
| Forecasting | REMOVE | Entitlement defined but no feature code |
| SSO/SCIM | REMOVE | Entitlement defined but no feature code |
| MFA | REMOVE | Login UI stub exists but explicitly not wired |

### Step 3: Hero Features (max 5)

1. **AI CFO Copilot** — LLM-powered spend recommendations with dollar-quantified actions
2. **Duplicate Tool Detection** — Rule-based category overlap flagging with savings estimates
3. **Waste Identification** — Utilization-threshold-based unused/underutilized/overprovisioned detection
4. **Renewal Calendar** — 90-day lookahead with days-until-renewal
5. **AI Contract Term Extraction** — Paste contract text → structured vendor/terms/renewal JSON

### Step 4: Core Features (max 12)

1. Subscription inventory (CRUD)
2. Spend dashboard (KPI cards + category breakdown)
3. Renewal calendar (90-day window)
4. Duplicate tool detection
5. Waste identification
6. Vendor consolidation analysis
7. License utilization analysis
8. AI CFO Copilot (Pro+)
9. AI contract term extraction (Pro+)
10. CSV spend report export
11. Plan-based usage limits & entitlement gating
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| CSV bulk import | HIGH | Schema ready, no route/UI yet |
| Slack/email alert channels | MEDIUM | Notification framework exists, channels not wired |
| Approval workflows | MEDIUM | Entitlement defined, no feature |
| Semantic duplicate detection (embeddings) | LOW | Currently rule-based; docs aspire to embeddings |
| SSO/SCIM | LOW | Enterprise tier, Phase 2 |
| Forecasting/budget projections | LOW | Entitlement defined, no feature |
| MFA | LOW | Platform capability exists, UI not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Total Monthly Spend | SaaS Spend | AI Tool Spend | Potential Savings
- Section: Spend by Category (breakdown)
- Section: Combined Alert Feed (waste alerts + upcoming renewals)

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Subscriptions
- Renewals
- Duplicates
- Waste
- Vendors
- Copilot (AI)
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Subscription Inventory
  ├── Renewal Calendar (reads renewal dates)
  ├── Duplicate Detection (groups by category)
  ├── Waste Identification (reads utilization/seat data)
  ├── Vendor Consolidation (reads vendor spend)
  ├── License Utilization (reads seat counts)
  └── AI CFO Copilot (reads all findings + renewals + spend)
       └── AI Contract Extraction (independent, links to subscription)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → Gated features (AI Copilot, Duplicates, Contract Extraction)
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 2. SECCORRELATE

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Log event ingestion (5 source types: firewall, EDR, IAM, app, DNS) | `app/(app)/log-events`, `app/api/log-events` | IMPLEMENTED |
| 2 | Correlation rule builder (first event type, second event type, time window, source IP) | `app/(app)/rules`, `app/api/rules` | IMPLEMENTED |
| 3 | Batch correlation engine (manual "Run correlation now" trigger) | `app/api/rules/run`, `lib/services/correlation-engine.ts` | IMPLEMENTED |
| 4 | Alert generation from correlation matches | `lib/services/alerts-repo.ts` | IMPLEMENTED |
| 5 | Alert triage workflow (list/filter/status change: open/investigating/resolved/dismissed) | `app/(app)/alerts`, `app/api/alerts` | IMPLEMENTED |
| 6 | Alert detail page (two correlated log events side by side) | `app/(app)/alerts/[id]` | IMPLEMENTED |
| 7 | AI Investigate (incident summary, root cause, MITRE ATT&CK mapping) | `app/api/alerts/[id]/summarize`, `lib/services/` | IMPLEMENTED |
| 8 | Dashboard KPIs (open/critical/high alerts, log events 24h, severity breakdown) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 9 | CSV alert report export | `app/(app)/reports`, `app/api/reports/alerts` | IMPLEMENTED |
| 10 | Admin user management | `app/(admin)/admin/users`, `app/api/admin/members` | IMPLEMENTED |
| 11 | Admin audit log | `app/(admin)/admin/audit-log` | IMPLEMENTED |
| 12 | Admin billing panel | `app/(admin)/admin/billing` | IMPLEMENTED |
| 13 | Email/password signup with org + 14-day trial | `app/(auth)/signup` | IMPLEMENTED |
| 14 | Email/password login | `app/(auth)/login` | IMPLEMENTED |
| 15 | Logout | `app/api/auth/logout` | IMPLEMENTED |
| 16 | Profile & settings | `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 17 | Stripe checkout/portal/webhook | `app/api/billing/*` | IMPLEMENTED |
| 18 | Entitlement gating (AI incident summary, correlation rules) | Route-level `can()` checks | IMPLEMENTED |
| 19 | Daily alert ingestion limit | `withinLimit` on log event creation | IMPLEMENTED |
| 20 | In-app notification on AI summary | `lib/services/` | IMPLEMENTED |
| 21 | Analytics event tracking | `lib/services/` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Log event ingestion | KEEP | Core domain |
| Correlation rule builder | KEEP | Core domain |
| Batch correlation engine | KEEP | Core domain |
| Alert generation & triage | KEEP | Core domain |
| AI Investigate (incident summary) | KEEP | Killer feature, fail-closed |
| Dashboard KPIs | KEEP | Core domain |
| CSV alert export | KEEP | All-plan export |
| Admin/auth/billing/profile/settings | KEEP | Platform standard |
| Entitlements & limits | KEEP | Platform standard |
| Rule templates (pre-built detection rules) | REMOVE | Documented but not implemented |
| AI Incident Graph (visual timeline) | REMOVE | Docs describe as "Killer Feature" but only text summary exists |
| AI threat hunting | REMOVE | Docs only, no code |
| SOC-specific roles (Analyst/Hunter/Manager/Viewer) | REMOVE | Only owner/admin/member implemented |
| PagerDuty/Slack alert routing | REMOVE | Documented Phase 2, no code |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Investigate** — LLM-powered incident summary with root cause + MITRE ATT&CK mapping
2. **Correlation Rule Builder** — No-code rule definition (event types, time window, source IP join)
3. **Batch Correlation Engine** — Manual-trigger evaluation of rules against log events
4. **Alert Triage Workflow** — Status progression with dual-event side-by-side view
5. **Log Event Ingestion** — Multi-source (firewall, EDR, IAM, app, DNS) with structured payloads

### Step 4: Core Features (max 12)

1. Log event ingestion (5 source types)
2. Correlation rule builder
3. Batch correlation engine
4. Alert generation from matches
5. Alert triage workflow (status management)
6. Alert detail (dual-event view)
7. AI Investigate (incident summary, Pro+)
8. Dashboard KPIs (open/critical/high/events/severity)
9. CSV alert report export
10. Daily ingestion limits
11. Entitlement gating
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Pre-built rule templates (brute force, lateral movement, etc.) | HIGH | Core value, no code yet |
| AI Incident Graph (visual attack timeline) | HIGH | Documented as killer feature |
| SOC-specific roles | MEDIUM | Security domain requires finer RBAC |
| PagerDuty/Slack alert routing | MEDIUM | Phase 2 integration |
| AI threat hunting | LOW | Advanced, Phase 2 |
| Baseline learning / anomaly scoring | LOW | ML-based, Phase 2 |
| Automated playbook execution | LOW | Phase 2 |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Open Alerts | Critical Open | High Open | Log Events (24h)
- Section: Alerts by Severity (breakdown)

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Log Events
- Rules
- Alerts
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Log Event Ingestion
  └── Correlation Engine (consumes log events)
       └── Alert Generation (from correlation matches)
            ├── Alert Triage Workflow
            └── AI Investigate (reads alert + source events)

Correlation Rule Builder → Correlation Engine (rules define what to correlate)
Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Investigate, Rule Creation, Ingestion Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 3. CODEAUDIT

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Repository tracking (add/list repos with name, branch, visibility) | `app/(app)/repositories`, `app/api/repositories` | IMPLEMENTED |
| 2 | Manual code scan (paste file path + content) | `app/(app)/scans`, `app/api/scans` | IMPLEMENTED |
| 3 | Regex/pattern SAST engine (8 rules: SQL injection, hardcoded keys, eval, weak hash, XSS, debug stmts, TODOs) | `lib/services/scanner.ts` | IMPLEMENTED |
| 4 | Code health score (severity-weighted, 0-100) | `lib/services/scanner.ts` | IMPLEMENTED |
| 5 | Findings pipeline (file/line/category/severity/CWE/snippet) | Prisma `Finding` model | IMPLEMENTED |
| 6 | Finding status workflow (open/fixed/false_positive/wont_fix) | `app/api/findings/[id]` | IMPLEMENTED |
| 7 | AI Fix Engine (explanation + patch + risk score, Pro+ gated) | `app/api/findings/[id]/fix`, `lib/services/fix-engine.ts` | IMPLEMENTED |
| 8 | Dashboard (health score, open/critical findings, repo count, by-category) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 9 | CSV findings report export | `app/(app)/reports`, `app/api/reports/findings` | IMPLEMENTED |
| 10 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 11 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 12 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 13 | Plan-based repo limits & scan limits | `app/api/repositories`, `lib/services/scans-repo.ts` | IMPLEMENTED |
| 14 | In-app notification on AI fix suggestion | `lib/services/fix-engine.ts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Repository tracking | KEEP | Core domain |
| Manual code scan | KEEP | Core domain (Phase 1 paste mode) |
| Regex SAST engine (8 rules) | KEEP | Core domain |
| Code health score | KEEP | Core domain |
| Findings pipeline & status workflow | KEEP | Core domain |
| AI Fix Engine | KEEP | Killer feature, Pro-gated, fail-closed |
| Dashboard | KEEP | Core domain |
| CSV findings report | KEEP | All-plan export |
| Admin/auth/billing | KEEP | Platform standard |
| Plan-based limits | KEEP | Platform standard |
| GitHub PR webhook integration | REMOVE | Not implemented, docs describe as Phase 1 but no code |
| CI/CD integration | REMOVE | Entitlement defined but no feature code |
| Secret detection (dedicated) | REMOVE | Entitlement defined, only basic regex exists |
| Dependency scanning | REMOVE | Entitlement defined but no feature code |
| Container scanning | REMOVE | Entitlement defined but no feature code |
| Custom rules | REMOVE | Entitlement defined but no feature code |
| SSO/SCIM | REMOVE | Entitlement defined but no feature code |
| Smart false-positive detection (AI) | REMOVE | Documented Phase 2, no code |
| AI prioritization | REMOVE | Documented Phase 2, no code |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Fix Engine** — LLM-generated explanation, concrete patch, and risk score per finding
2. **Regex SAST Engine** — 8-rule pattern scanner (SQL injection, hardcoded keys, eval, weak hash, XSS, etc.)
3. **Code Health Score** — Severity-weighted 0-100 score per scan
4. **Finding Status Workflow** — Open/fixed/false_positive/wont_fix with triage UI
5. **Repository Tracking** — Multi-repo inventory with visibility and branch metadata

### Step 4: Core Features (max 12)

1. Repository tracking
2. Manual code scan (paste mode)
3. Regex SAST engine (8 rules)
4. Code health score
5. Findings pipeline (file/line/CWE/snippet)
6. Finding status workflow
7. AI Fix Engine (Pro+)
8. Dashboard (health score, findings breakdown)
9. CSV findings report export
10. Plan-based repo & scan limits
11. Entitlement gating
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| GitHub PR webhook integration | HIGH | Core value prop, no code |
| CI/CD integration | HIGH | Entitlement defined, no feature |
| Dedicated secret detection | MEDIUM | Only basic regex exists |
| Dependency scanning | MEDIUM | Entitlement defined, no feature |
| Custom rules | MEDIUM | Entitlement defined, no feature |
| Container scanning | LOW | Enterprise tier |
| AI false-positive detection | LOW | Phase 2 |
| AI prioritization | LOW | Phase 2 |
| SSO/SCIM | LOW | Enterprise tier |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Health Score (rolling avg) | Open Findings | Critical Open | Repository Count
- Section: Findings by Category (breakdown)

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Repositories
- Scans
- Findings
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Repository Tracking
  └── Code Scan (scans a repo's pasted code)
       └── SAST Engine (produces findings + health score)
            ├── Finding Status Workflow
            └── AI Fix Engine (explains + patches a finding)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Fix Engine, Repo Limits, Scan Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 4. CRMCAPTURE

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Contact management (create/list with source tagging) | `app/api/contacts`, `app/(app)/contacts` | IMPLEMENTED |
| 2 | Email/phone normalization for dedup matching | `lib/services/dedup-engine.ts` | IMPLEMENTED |
| 3 | Rule-based duplicate detection (email/phone/fuzzy name) | `app/api/contacts/duplicates`, `lib/services/dedup-engine.ts` | IMPLEMENTED |
| 4 | Lead creation from contact with per-org lead cap | `app/api/leads`, `lib/services/leads-repo.ts` | IMPLEMENTED |
| 5 | Deterministic lead scoring (0-100, source/field/title weighted) | `lib/services/lead-scoring.ts` | IMPLEMENTED |
| 6 | Lead list (filter by status/assignee, sorted by score) | `app/(app)/leads`, `app/api/leads` | IMPLEMENTED |
| 7 | Lead status workflow (new→contacted→qualified→converted→lost) | `app/api/leads/[id]` | IMPLEMENTED |
| 8 | Lead assignment (manual, to specific user) | Schema + `leads-repo.ts` | IMPLEMENTED |
| 9 | AI Lead Extraction (paste text → structured contact, Starter+) | `app/api/contacts/extract`, `lib/services/lead-extraction.ts` | IMPLEMENTED |
| 10 | AI Sales Assistant (summary + next step + draft email + opportunity flag, Pro) | `app/api/leads/[id]/assist`, `lib/services/sales-assistant.ts` | IMPLEMENTED |
| 11 | Dashboard KPIs (contacts, new/qualified leads, avg score, by-status) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 12 | CSV leads report export | `app/(app)/reports`, `app/api/reports/leads` | IMPLEMENTED |
| 13 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 14 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 15 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 16 | Plan-based contact & lead limits | `lib/services/contacts-repo.ts`, `lib/services/leads-repo.ts` | IMPLEMENTED |
| 17 | In-app notification on AI Sales Assistant | `lib/services/sales-assistant.ts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Contact management | KEEP | Core domain |
| Duplicate detection (email/phone/fuzzy name) | KEEP | Core domain |
| Lead creation & scoring | KEEP | Core domain |
| Lead status workflow | KEEP | Core domain |
| Lead assignment (manual) | KEEP | Core domain |
| AI Lead Extraction | KEEP | Differentiator, Starter+ gated |
| AI Sales Assistant | KEEP | Killer feature, Pro gated, fail-closed |
| Dashboard KPIs | KEEP | Core domain |
| CSV leads report | KEEP | All-plan export |
| Admin/auth/billing | KEEP | Platform standard |
| CRM sync (Salesforce/HubSpot/Pipedrive) | REMOVE | Documented as "built and wired" but no code exists |
| LinkedIn import | REMOVE | Documented, not implemented |
| CSV import | REMOVE | Source enum exists, no route/UI |
| Lead routing/round-robin | REMOVE | Documented, no automated routing code |
| Contact enrichment (Hunter/RocketReach) | REMOVE | Documented, not implemented |
| Workflow automation | REMOVE | Entitlement defined, no feature |
| AI call summary | REMOVE | Entitlement defined, no route/service |
| AI lead scoring (separate) | REMOVE | Entitlement defined, no separate endpoint |
| SSO | REMOVE | Entitlement defined, no feature |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Sales Assistant** — LLM-generated summary, next step, draft follow-up email, opportunity detection
2. **AI Lead Extraction** — Paste raw text → structured contact fields via LLM
3. **Deterministic Lead Scoring** — Weighted 0-100 score (source, fields, seniority)
4. **Rule-Based Duplicate Detection** — Email/phone/fuzzy-name dedup with match reason
5. **Lead Status Workflow** — New→contacted→qualified→converted→lost pipeline

### Step 4: Core Features (max 12)

1. Contact management (create/list)
2. Duplicate detection (email/phone/fuzzy name)
3. Lead creation from contact
4. Deterministic lead scoring (0-100)
5. Lead list (filter/sort/paginate)
6. Lead status workflow
7. Lead assignment (manual)
8. AI Lead Extraction (Starter+)
9. AI Sales Assistant (Pro)
10. Dashboard KPIs
11. CSV leads report export
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| CRM sync (Salesforce/HubSpot/Pipedrive) | HIGH | Core value, documented but no code |
| CSV/bulk import | HIGH | Source enum exists, no route |
| LinkedIn import | MEDIUM | Documented, not built |
| Lead routing/round-robin | MEDIUM | Documented, not built |
| Contact enrichment | MEDIUM | Documented, not built |
| Workflow automation | LOW | Entitlement defined, no feature |
| AI call summary | LOW | Entitlement defined, no feature |
| SSO | LOW | Enterprise tier |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Contact Count | New Leads | Qualified Leads | Average Lead Score
- Section: Leads by Status (breakdown)

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Contacts
- Leads
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Contact Management
  ├── Duplicate Detection (groups contacts by email/phone/name)
  ├── AI Lead Extraction (creates contacts from raw text)
  └── Lead Creation (from existing contact)
       ├── Lead Scoring (computed at creation)
       ├── Lead Status Workflow
       ├── Lead Assignment
       └── AI Sales Assistant (reads lead context)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Lead Extraction, AI Sales Assistant, Contact/Lead Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 5. INCIDENTTRIAGE

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Service registry (create/list services with health status) | `app/(app)/services`, `app/api/services` | IMPLEMENTED |
| 2 | Alert ingestion (manual/API, source/message/severity) | `app/(app)/alerts`, `app/api/alerts` | IMPLEMENTED |
| 3 | Alert correlation into incidents (time-window chaining, 15-min window) | `lib/services/alerts-repo.ts` | IMPLEMENTED |
| 4 | Incident list/detail with status workflow (open→investigating→resolved) | `app/(app)/incidents`, `app/api/incidents` | IMPLEMENTED |
| 5 | Service health computation (healthy/degraded/down from 60-min alert lookback) | `lib/services/` | IMPLEMENTED |
| 6 | AI Root Cause Copilot (hypothesis, confidence score, culprit service, fix, recovery time) | `app/api/incidents/[id]/analyze`, `lib/services/root-cause-copilot.ts` | IMPLEMENTED |
| 7 | Dashboard KPIs (open incidents, critical, total, service count + health list) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 8 | CSV incident report export | `app/(app)/reports`, `app/api/reports/incidents` | IMPLEMENTED |
| 9 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 10 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 11 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 12 | Plan-based limits (services, monthly incidents, monthly AI analyses) | Route-level checks | IMPLEMENTED |
| 13 | In-app notification on AI analysis | `lib/services/root-cause-copilot.ts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Service registry | KEEP | Core domain |
| Alert ingestion | KEEP | Core domain |
| Alert correlation into incidents | KEEP | Core domain |
| Incident status workflow | KEEP | Core domain |
| Service health computation | KEEP | Core domain |
| AI Root Cause Copilot | KEEP | Killer feature, fail-closed |
| Dashboard KPIs | KEEP | Core domain |
| CSV incident report | KEEP | All-plan export |
| Admin/auth/billing | KEEP | Platform standard |
| Plan-based limits | KEEP | Platform standard |
| AI Incident Copilot (interactive Q&A) | REMOVE | Documented, not implemented |
| AI Recovery Suggestions | REMOVE | Documented, not implemented |
| AI Postmortem Generator | REMOVE | Documented, not implemented |
| Incident Prediction | REMOVE | Documented, not implemented |
| Change Risk Analysis | REMOVE | Documented, not implemented |
| PagerDuty/Opsgenie/Slack integration | REMOVE | Documented as "built and wired" but no connector code |
| Jira integration | REMOVE | Documented, not implemented |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Root Cause Copilot** — LLM-powered root cause hypothesis with confidence score, culprit service, fix, recovery time
2. **Alert Correlation into Incidents** — Time-window chaining with automatic severity escalation
3. **Service Health Computation** — Real-time healthy/degraded/down from alert lookback
4. **Incident Status Workflow** — Open→investigating→resolved with alert timeline
5. **Alert Ingestion** — Multi-source manual/API entry with severity levels

### Step 4: Core Features (max 12)

1. Service registry
2. Alert ingestion
3. Alert correlation into incidents
4. Incident list/detail/status workflow
5. Service health computation
6. AI Root Cause Copilot
7. Dashboard KPIs (incidents, services, health)
8. CSV incident report export
9. Plan-based limits (services, incidents, AI analyses)
10. Entitlement gating
11. In-app notifications & analytics
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| PagerDuty/Opsgenie webhook receiver | HIGH | Core value, no connector code |
| AI Postmortem Generator | HIGH | Documented, not built |
| AI Recovery Suggestions | MEDIUM | Documented, not built |
| Jira integration | MEDIUM | Documented, not built |
| Slack notifications | MEDIUM | No channel wiring |
| AI Incident Copilot (interactive Q&A) | LOW | Phase 2 |
| Incident Prediction | LOW | ML-based, Phase 2 |
| Change Risk Analysis | LOW | Phase 2 |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Open Incidents | Critical Open | Total Incidents | Service Count
- Section: Service Health List

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Services
- Alerts
- Incidents
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Service Registry
  └── Alert Ingestion (alerts tied to services)
       ├── Service Health Computation (from alert lookback)
       └── Alert Correlation (time-window chaining)
            └── Incident Generation
                 ├── Incident Status Workflow
                 └── AI Root Cause Copilot (reads incident + alerts)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Root Cause, Service/Incident/AI Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 6. AUTHSTARTUP

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Multi-project model (isolated end-user pools per project) | `app/(app)/projects`, `app/api/projects` | IMPLEMENTED |
| 2 | Per-project config (environment, requireMfa flag, session TTL) | Prisma `Project` model | IMPLEMENTED |
| 3 | Project-scoped API keys (create/list/revoke, hash+prefix storage) | `app/api/projects/[id]/keys` | IMPLEMENTED |
| 4 | Public end-user auth API (register/login via Bearer API key) | `app/api/v1/auth/register`, `app/api/v1/auth/login` | IMPLEMENTED |
| 5 | End-user password hashing (argon2id) | `lib/services/end-users-repo.ts` | IMPLEMENTED |
| 6 | End-user session management (random token, SHA-256 hash, configurable TTL) | `EndUserSession` model | IMPLEMENTED |
| 7 | Login event logging (success/failure) | `LoginEvent` model | IMPLEMENTED |
| 8 | Rule-based security posture engine (3 rules: MFA not enforced, long session TTL, login velocity) | `lib/services/security-rules.ts` | IMPLEMENTED |
| 9 | "Run Security Advisor" action (manual trigger) | `app/api/projects/[id]/security/run` | IMPLEMENTED |
| 10 | Security findings list/detail with status workflow (open→resolved/dismissed) | `app/(app)/security`, `app/api/security` | IMPLEMENTED |
| 11 | AI Security Advisor (explanation + recommended action per finding, Pro) | `app/api/security/[id]/recommend`, `lib/services/security-advisor.ts` | IMPLEMENTED |
| 12 | Dashboard KPIs (projects, end users, open findings, high-severity) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 13 | CSV security findings report export | `app/(app)/reports`, `app/api/reports/security` | IMPLEMENTED |
| 14 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 15 | Developer auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 16 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 17 | Plan-based limits (projects, MAU) | Route-level checks | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Multi-project model | KEEP | Core domain |
| Per-project config | KEEP | Core domain |
| API key management | KEEP | Core domain |
| Public end-user auth API (email/password) | KEEP | Core domain |
| End-user session management | KEEP | Core domain |
| Login event logging | KEEP | Core domain |
| Security posture engine (3 rules) | KEEP | Core domain |
| Security findings workflow | KEEP | Core domain |
| AI Security Advisor | KEEP | Killer feature, Pro-gated |
| Dashboard/reports/admin/auth/billing | KEEP | Platform standard |
| OAuth/social login (Google/GitHub) | REMOVE | Platform lib exists, not wired to any route |
| Magic links | REMOVE | Platform lib exists, not wired to any route |
| MFA enrollment/verification | REMOVE | Platform lib exists, not wired; login UI stub only |
| Organizations/RBAC for end users | REMOVE | Only developer RBAC exists |
| SAML/SSO/SCIM | REMOVE | Entitlement defined, no code |
| Custom domains | REMOVE | Entitlement defined, no code |
| Webhooks | REMOVE | Entitlement defined, no code |
| Password reset | REMOVE | Platform lib exists, no route/UI |
| Session listing/revocation UI | REMOVE | Repo function exists, no route |
| AI Risk Detection | REMOVE | Documented Phase 2, no code |
| AI Adaptive Authentication | REMOVE | Documented Phase 2, no code |

### Step 3: Hero Features (max 5)

1. **AI Security Advisor** — LLM-powered explanation and recommended action per security finding
2. **Public End-User Auth API** — Bearer-key-authenticated register/login for customer apps
3. **Rule-Based Security Engine** — 3 rules (MFA enforcement, session TTL, login velocity)
4. **Multi-Project Model** — Isolated end-user pools with per-project configuration
5. **API Key Management** — Create/revoke project-scoped API keys with hash+prefix storage

### Step 4: Core Features (max 12)

1. Multi-project model
2. Per-project configuration (env, MFA flag, session TTL)
3. API key management (create/list/revoke)
4. Public end-user auth API (register/login)
5. End-user password hashing (argon2id)
6. End-user session management
7. Login event logging
8. Security posture engine (3 rules)
9. Security findings workflow
10. AI Security Advisor (Pro)
11. Dashboard KPIs & CSV report
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| OAuth/social login (Google/GitHub) | HIGH | Platform lib exists, just needs wiring |
| Magic links | HIGH | Platform lib exists, just needs wiring |
| MFA enrollment/verification | HIGH | Platform lib exists, critical auth feature |
| Password reset flow | HIGH | Platform lib exists, basic auth need |
| Session listing/revocation UI | MEDIUM | Repo function exists, needs route/UI |
| End-user organizations/RBAC | MEDIUM | Core product value, not built |
| Webhooks | MEDIUM | Entitlement defined, no code |
| Custom domains | LOW | Enterprise tier |
| SAML/SSO/SCIM | LOW | Enterprise tier |
| AI Risk Detection | LOW | Phase 2 |
| AI Adaptive Authentication | LOW | Phase 2 |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Project Count | End User Count | Open Findings | High-Severity Open
- Section: Project List

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Projects
- Security
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Multi-Project Model
  ├── Per-Project Config (env, MFA, TTL)
  ├── API Key Management (scoped to project)
  └── Public End-User Auth API (uses project's API key for auth)
       ├── End-User Sessions (configurable TTL)
       └── Login Event Logging
            └── Security Posture Engine (analyzes login events + project config)
                 ├── Security Findings Workflow
                 └── AI Security Advisor (explains findings)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Security Advisor, Project/MAU Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 7. ERPAUDIT

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | ERP instance management (SAP/Oracle/Dynamics, create/list) | `app/(app)/instances`, `app/api/instances` | IMPLEMENTED |
| 2 | Configuration scan intake (paste role assignments + config settings) | `app/api/scans`, `lib/services/scans-repo.ts` | IMPLEMENTED |
| 3 | SoD violation detection (4 conflict pairs) | `lib/services/sod-engine.ts` | IMPLEMENTED |
| 4 | Configuration rule engine (4 rules: four-eyes, threshold, password, audit logging) | `lib/services/config-rules.ts` | IMPLEMENTED |
| 5 | Compliance score (severity-weighted 0-100) | `lib/services/config-rules.ts` | IMPLEMENTED |
| 6 | Findings list/detail (sod_violation/config_error/process_deviation) | `app/(app)/findings`, `app/api/findings` | IMPLEMENTED |
| 7 | Finding status workflow (open/resolved/accepted_risk) | `app/api/findings/[id]` | IMPLEMENTED |
| 8 | AI ERP Auditor (explanation + compliance impact + fix + business impact per finding) | `app/api/findings/[id]/summarize`, `lib/services/audit-summary.ts` | IMPLEMENTED |
| 9 | Dashboard (compliance score, open findings, SoD violations, instance count) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 10 | CSV findings report export | `app/(app)/reports`, `app/api/reports/findings` | IMPLEMENTED |
| 11 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 12 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 13 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 14 | Plan-based scan limits | `lib/services/scans-repo.ts` | IMPLEMENTED |
| 15 | Role/config upsert per instance (drift tracking) | `lib/services/scans-repo.ts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| ERP instance management | KEEP | Core domain |
| Configuration scan intake | KEEP | Core domain |
| SoD violation detection | KEEP | Core domain |
| Configuration rule engine | KEEP | Core domain |
| Compliance score | KEEP | Core domain |
| Findings list/detail/status | KEEP | Core domain |
| AI ERP Auditor | KEEP | Killer feature, fail-closed |
| Dashboard/reports/admin/auth/billing | KEEP | Platform standard |
| Plan-based scan limits | KEEP | Platform standard |
| Role/config upsert (drift tracking) | KEEP | Core domain |
| Live ERP API connectors (SAP/Oracle/Dynamics) | REMOVE | Documented Phase 1 read-only, but no connector code |
| Change diff UI ("what changed since last scan") | REMOVE | Acceptance criteria mentions, no UI/endpoint |
| AI Risk Detection | REMOVE | Documented, not implemented |
| AI Root Cause Detection | REMOVE | Documented, not implemented |
| AI Compliance Advisor Q&A | REMOVE | Documented, not implemented |
| AI Process Optimization | REMOVE | Documented, not implemented |
| Predictive Risk Analysis | REMOVE | Documented, not implemented |
| Domain-specific roles (Admin/Auditor/Viewer) | REMOVE | Only owner/admin/member |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI ERP Auditor** — LLM-powered plain-language explanation, compliance impact, fix, and business impact per finding
2. **SoD Violation Detection** — 4 conflict-pair library auto-flags users with conflicting permissions
3. **Configuration Rule Engine** — 4-rule checker (four-eyes, thresholds, password policy, audit logging)
4. **Compliance Score** — Severity-weighted 0-100 across all findings
5. **Configuration Scan Intake** — Paste-based role assignment + config setting import

### Step 4: Core Features (max 12)

1. ERP instance management (SAP/Oracle/Dynamics)
2. Configuration scan intake (paste mode)
3. SoD violation detection (4 conflict pairs)
4. Configuration rule engine (4 rules)
5. Compliance score computation
6. Findings list/detail/status workflow
7. AI ERP Auditor (Pro+)
8. Role/config upsert with drift tracking
9. Dashboard (compliance score, findings, instances)
10. CSV findings report export
11. Plan-based scan limits
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Live ERP connectors (SAP/Oracle/Dynamics read-only) | HIGH | Core value, Phase 1 scope |
| Change diff view (what changed since last scan) | HIGH | Acceptance criteria, no UI |
| Domain-specific roles (Auditor/Viewer) | MEDIUM | Audit domain needs finer RBAC |
| AI Compliance Advisor Q&A | MEDIUM | Documented, not built |
| AI Root Cause Detection | LOW | Documented, not built |
| AI Process Optimization | LOW | Phase 2 |
| Predictive Risk Analysis | LOW | Phase 2 |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Compliance Score (avg) | Open Findings | Open SoD Violations | Instance Count
- Section: Instance List

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Instances
- Findings
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
ERP Instance Management
  └── Configuration Scan Intake (scans tied to instances)
       ├── Role/Config Upsert (drift tracking)
       ├── SoD Violation Detection (from role assignments)
       ├── Configuration Rule Engine (from config settings)
       └── Compliance Score (from all findings)
            ├── Findings Status Workflow
            └── AI ERP Auditor (explains findings)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI ERP Auditor, Scan Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 8. CONTACTVERIFY

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Contact creation (name/email/phone/company/title) | `app/api/contacts`, `app/(app)/contacts` | IMPLEMENTED |
| 2 | Email validation (syntax + disposable domain blocklist → valid/invalid/risky) | `lib/services/email-validator.ts` | IMPLEMENTED |
| 3 | Phone validation (digit-count format check → valid/invalid/risky) | `lib/services/phone-validator.ts` | IMPLEMENTED |
| 4 | Duplicate detection (exact email, exact phone, fuzzy name+company via Levenshtein) | `lib/services/dedup-engine.ts` | IMPLEMENTED |
| 5 | Contact health score (0-100, deterministic: email+phone+company+title−duplicates) | `lib/services/health-score.ts` | IMPLEMENTED |
| 6 | Contact list with status badges and health score | `app/(app)/contacts` | IMPLEMENTED |
| 7 | Contact detail page | `app/(app)/contacts/[id]` | IMPLEMENTED |
| 8 | Duplicate group listing | `app/api/contacts/duplicates` | IMPLEMENTED |
| 9 | AI Contact Health Engine (lead quality, missing fields, enrichment suggestions, confidence) | `app/api/contacts/[id]/analyze`, `lib/services/` | IMPLEMENTED |
| 10 | Dashboard KPIs (total/verified/invalid contacts, avg health, duplicate groups) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 11 | CSV contacts report export | `app/(app)/reports`, `app/api/reports/contacts` | IMPLEMENTED |
| 12 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 13 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 14 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 15 | Monthly verification limits | `lib/services/contacts-repo.ts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Contact creation with validation | KEEP | Core domain |
| Email validation (syntax + blocklist) | KEEP | Core domain |
| Phone validation (digit-count) | KEEP | Core domain |
| Duplicate detection (email/phone/fuzzy) | KEEP | Core domain |
| Contact health score | KEEP | Core domain |
| AI Contact Health Engine | KEEP | Killer feature, Pro-gated, fail-closed |
| Dashboard/reports/admin/auth/billing | KEEP | Platform standard |
| Monthly verification limits | KEEP | Platform standard |
| CRM sync (HubSpot/Salesforce) | REMOVE | Documented as "built and wired" but no code |
| Contact enrichment (fill missing fields) | REMOVE | Documented Must Have, not implemented |
| AI Duplicate Merge suggestions | REMOVE | Documented, not implemented |
| AI Data Enrichment | REMOVE | Documented, not implemented |
| AI Lead Quality Score (standalone) | REMOVE | Documented, not implemented |
| Workflow automation | REMOVE | Documented, not implemented |
| Bulk verification/import | REMOVE | No batch endpoint |
| Live MX/mailbox lookup | REMOVE | Only syntactic check |
| Live carrier/line-type lookup | REMOVE | Only digit-count check |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Contact Health Engine** — LLM-scored lead quality, missing fields, enrichment suggestions, confidence
2. **Deterministic Health Score** — 0-100 composite from email/phone validity, completeness, dedup status
3. **Duplicate Detection** — Email/phone/fuzzy-name+company grouping via Levenshtein
4. **Email Validation** — Syntax + disposable-domain blocklist (offline)
5. **Phone Validation** — Digit-count format check (offline)

### Step 4: Core Features (max 12)

1. Contact creation with real-time validation
2. Email validation (syntax + disposable blocklist)
3. Phone validation (digit-count format)
4. Duplicate detection (email/phone/fuzzy name)
5. Contact health score (0-100)
6. Contact list with status badges
7. Duplicate group listing
8. AI Contact Health Engine (Pro)
9. Dashboard KPIs
10. CSV contacts report export
11. Monthly verification limits
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Contact enrichment (fill missing fields) | HIGH | Documented Must Have, not built |
| CRM sync (HubSpot/Salesforce) | HIGH | Documented, no code |
| Bulk verification/import | HIGH | Core scale need |
| Live MX/mailbox email verification | MEDIUM | Currently offline only |
| Live carrier/line-type phone lookup | MEDIUM | Currently digit-count only |
| AI Duplicate Merge suggestions | MEDIUM | Documented, not built |
| AI Data Enrichment | LOW | Documented, not built |
| Workflow automation | LOW | Documented, not built |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Total Contacts | Verified Contacts | Invalid Contacts | Average Health Score
- Section: Duplicate Groups/Contacts Count

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Contacts
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Contact Creation
  ├── Email Validation (runs on create)
  ├── Phone Validation (runs on create)
  ├── Health Score Computation (from validation + completeness + dedup)
  ├── Duplicate Detection (groups contacts)
  └── AI Contact Health Engine (reads contact + validation + dedup status)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Health Engine, Verification Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 9. CHARACTERCONSISTENCY

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Character creation (name, description, face/hair/outfit, art style) | `app/(app)/characters`, `app/api/characters` | IMPLEMENTED |
| 2 | Character library/list view | `app/(app)/characters` | IMPLEMENTED |
| 3 | Character detail page (fields + DNA) | `app/(app)/characters/[id]` | IMPLEMENTED |
| 4 | Generation requests (character + pose + scene → locked prompt text) | `app/api/generations`, `lib/services/prompt-assembler.ts` | IMPLEMENTED |
| 5 | Consistency/drift scoring (keyword-based heuristic, 0-100, contradictions flagged) | `lib/services/consistency-engine.ts` | IMPLEMENTED |
| 6 | Generation history list with consistency badges | `app/(app)/generations` | IMPLEMENTED |
| 7 | Generation credit metering (monthly limit) | `lib/services/generations-repo.ts` | IMPLEMENTED |
| 8 | AI Character DNA (structured identity spec via LLM, Pro-gated) | `app/api/characters/[id]/dna`, `lib/services/character-dna.ts` | IMPLEMENTED |
| 9 | Dashboard KPIs (characters, generations, avg consistency, drift count) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 10 | CSV generation history export | `app/(app)/reports`, `app/api/reports/generations` | IMPLEMENTED |
| 11 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 12 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 13 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 14 | Plan-based character & generation limits | Route-level checks | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Character creation & library | KEEP | Core domain |
| Generation requests (prompt assembly) | KEEP | Core domain |
| Consistency/drift scoring | KEEP | Core domain |
| Generation history | KEEP | Core domain |
| Generation credit metering | KEEP | Core domain |
| AI Character DNA | KEEP | Killer feature, Pro-gated, fail-closed |
| Dashboard/reports/admin/auth/billing | KEEP | Platform standard |
| Pose Memory (beyond rule-based) | REMOVE | Documented, not implemented |
| AI Story Memory | REMOVE | Documented, not implemented |
| AI Prompt Optimizer | REMOVE | Documented, not implemented |
| Multi-Character Scenes | REMOVE | Entitlement defined, no feature code |
| Video Character Consistency | REMOVE | Entitlement defined, no feature code |
| Comic Panel Generator | REMOVE | Documented, not implemented |
| HD Export | REMOVE | Entitlement defined, no feature code |
| Team workspace | REMOVE | Entitlement defined, no feature code |
| White label / private models | REMOVE | Entitlement defined, no feature code |
| Image generation (Stability/DALL-E/Midjourney) | REMOVE | Phase 1 is text-prompt only, no image provider |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Character DNA** — LLM-generated structured identity spec (prompt template, negative prompt, locked attributes, distinguishing features)
2. **Consistency/Drift Scoring** — Keyword-based 0-100 score detecting attribute contradictions
3. **Prompt Assembly** — Deterministic combination of locked character fields with new pose/scene
4. **Character Library** — Persistent, reusable character definitions with face/hair/outfit/style
5. **Generation Credit Metering** — Plan-based monthly generation limits

### Step 4: Core Features (max 12)

1. Character creation (name, description, visual attributes, art style)
2. Character library/list view
3. Character detail page
4. Generation requests (prompt assembly)
5. Consistency/drift scoring (keyword heuristic)
6. Generation history with consistency badges
7. Generation credit metering
8. AI Character DNA (Pro)
9. Dashboard KPIs (characters, generations, consistency, drift)
10. CSV generation history export
11. Plan-based character & generation limits
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Image generation provider integration (Stability/DALL-E) | HIGH | Core value, Phase 1 is text-only |
| AI Prompt Optimizer | MEDIUM | Documented, not built |
| Multi-Character Scenes | MEDIUM | Entitlement defined, no feature |
| AI Story Memory | MEDIUM | Documented, not built |
| Comic Panel Generator | LOW | Documented, not built |
| Video Character Consistency | LOW | Entitlement defined, no feature |
| HD Export | LOW | Entitlement defined, no feature |
| Team workspace | LOW | Entitlement defined, no feature |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Total Characters | Total Generations | Average Consistency Score | Generations with Drift

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Characters
- Generations
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Character Library
  ├── AI Character DNA (generates structured identity from character fields)
  └── Generation Request
       ├── Prompt Assembly (locks character fields + new pose/scene)
       └── Consistency/Drift Scoring (compares generation against character attributes)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Character DNA, Character/Generation Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 10. PAYROLLAUDIT

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Multi-company support per organization | `app/api/companies`, `lib/services/companies-repo.ts` | IMPLEMENTED |
| 2 | Employee management (pay type, rate/salary, active status) | `app/(app)/employees`, `app/api/employees` | IMPLEMENTED |
| 3 | Payroll run import (period + payslip lines: hours, gross, tax, net, attendance) | `app/(app)/payroll-runs`, `app/api/payroll-runs` | IMPLEMENTED |
| 4 | Deterministic payroll validation engine (gross pay, tax, net, attendance, overtime) | `lib/services/payroll-engine.ts` | IMPLEMENTED |
| 5 | Compliance score (severity-weighted 0-100) | `lib/services/payroll-engine.ts` | IMPLEMENTED |
| 6 | Findings management (per-discrepancy records, severity, status) | `app/api/findings`, `app/(app)/payroll-runs/[id]` | IMPLEMENTED |
| 7 | Monthly payroll-run usage limits | `withinLimit` checks | IMPLEMENTED |
| 8 | AI Payroll Copilot (summary, recommended fixes, risk level, Pro-gated) | `app/api/payroll-runs/[id]/copilot`, `lib/services/payroll-copilot.ts` | IMPLEMENTED |
| 9 | Dashboard KPIs (employees, avg compliance, open/critical findings) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 10 | CSV findings report export | `app/(app)/reports`, `app/api/reports/findings` | IMPLEMENTED |
| 11 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 12 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 13 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 14 | Plan-based limits (companies, employees, monthly runs) | Route-level checks | IMPLEMENTED |
| 15 | Auto-create first company on signup | `lib/services/onboarding.ts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Multi-company support | KEEP | Core domain |
| Employee management | KEEP | Core domain |
| Payroll run import | KEEP | Core domain |
| Payroll validation engine (5 checks) | KEEP | Core domain |
| Compliance score | KEEP | Core domain |
| Findings management | KEEP | Core domain |
| AI Payroll Copilot | KEEP | Killer feature, Pro-gated, fail-closed |
| Dashboard/reports/admin/auth/billing | KEEP | Platform standard |
| Plan-based limits | KEEP | Platform standard |
| AI Salary Forecasting | REMOVE | Documented, not implemented |
| AI Fraud Detection | REMOVE | Documented, not implemented |
| Automated Audit Reports | REMOVE | Documented, not implemented |
| Workflow approvals | REMOVE | Entitlement defined, no feature code |
| API access | REMOVE | Entitlement defined, no feature code |
| SSO/SCIM | REMOVE | Entitlement defined, no feature code |
| Salary forecasting | REMOVE | Entitlement defined, no feature code |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Payroll Copilot** — LLM-powered summary, prioritized fix list, risk level from deterministic findings
2. **Payroll Validation Engine** — 5 deterministic checks (gross, tax, net, attendance, overtime)
3. **Compliance Score** — Severity-weighted 0-100 per payroll run
4. **Payroll Run Import** — Manual entry of period + payslip lines with full data fields
5. **Multi-Company Support** — Multiple companies per organization

### Step 4: Core Features (max 12)

1. Multi-company support
2. Employee management
3. Payroll run import
4. Payroll validation engine (5 checks)
5. Compliance score computation
6. Findings management (status workflow)
7. Monthly payroll-run limits
8. AI Payroll Copilot (Pro)
9. Dashboard KPIs (employees, compliance, findings)
10. CSV findings report export
11. Auto-create first company on signup
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Spreadsheet/CSV bulk payroll import | HIGH | Currently manual entry only |
| AI Fraud Detection | MEDIUM | Documented, not built |
| AI Salary Forecasting | MEDIUM | Documented, not built |
| Automated Audit Reports | MEDIUM | Documented, not built |
| Workflow approvals | LOW | Entitlement defined, no feature |
| API access (public) | LOW | Entitlement defined, no feature |
| SSO/SCIM | LOW | Enterprise tier |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Employee Count | Average Compliance Score | Open Findings | Critical Open Findings
- Section: Recent Payroll Runs List (last 10)

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Employees
- Payroll Runs
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Multi-Company Support
  └── Employee Management (employees belong to companies)
       └── Payroll Run Import (payslip lines reference employees)
            ├── Payroll Validation Engine (5 checks against employee data)
            ├── Compliance Score (from findings)
            ├── Findings Management
            └── AI Payroll Copilot (reads run + findings)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Payroll Copilot, Company/Employee/Run Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 11. TRANSCRIPTIONQA

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Transcript ingestion (title, source, minutes, speaker-labeled segments — paste, no audio) | `app/(app)/transcripts`, `app/api/transcripts` | IMPLEMENTED |
| 2 | Domain terminology validation (regex medical/legal word-pair checks, Starter+) | `lib/services/qa-engine.ts` | IMPLEMENTED |
| 3 | Speaker attribution anomaly detection (short-segment diarization glitch flagging) | `lib/services/qa-engine.ts` | IMPLEMENTED |
| 4 | Accuracy score (severity-weighted 0-100) | `lib/services/qa-engine.ts` | IMPLEMENTED |
| 5 | Findings list/detail with status workflow (open→resolved) | `app/api/findings`, `app/(app)/transcripts/[id]` | IMPLEMENTED |
| 6 | Plain-text transcript export | `app/api/transcripts/[id]/export` | IMPLEMENTED |
| 7 | AI Accuracy Copilot (summary, risk level, highlighted risk sections, Pro+) | `app/api/transcripts/[id]/copilot`, `lib/services/accuracy-copilot.ts` | IMPLEMENTED |
| 8 | Dashboard KPIs (transcript count, avg accuracy, open findings, terminology findings) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 9 | CSV findings report export | `app/(app)/reports`, `app/api/reports/findings` | IMPLEMENTED |
| 10 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 11 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 12 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |
| 13 | Plan-based limits (audio uploads, processing minutes) | `lib/services/transcripts-repo.ts` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Transcript ingestion (paste mode) | KEEP | Core domain |
| Domain terminology validation | KEEP | Core domain, Starter+ gated |
| Speaker attribution anomaly detection | KEEP | Core domain |
| Accuracy score | KEEP | Core domain |
| Findings status workflow | KEEP | Core domain |
| Plain-text export | KEEP | Core domain |
| AI Accuracy Copilot | KEEP | Killer feature, Pro+ gated, fail-closed |
| Dashboard/reports/admin/auth/billing | KEEP | Platform standard |
| Plan-based limits | KEEP | Platform standard |
| Audio upload / ASR integration | REMOVE | Not implemented, transcript is text-paste only |
| AI Grammar Check | REMOVE | Documented, not implemented |
| AI Translation | REMOVE | Documented, not implemented |
| AI Compliance Detection | REMOVE | Documented, not implemented |
| AI Sentiment Analysis | REMOVE | Documented, not implemented |
| AI Speaker Verification/Matching | REMOVE | Documented, not implemented |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Accuracy Copilot** — LLM-powered content summary, risk level, highlighted risk sections
2. **Domain Terminology Validation** — Regex-based medical/legal ASR confusion word-pair checks
3. **Speaker Attribution Anomaly Detection** — Short-segment diarization glitch flagging
4. **Accuracy Score** — Severity-weighted 0-100 composite
5. **Plain-Text Transcript Export** — Full transcript with unresolved findings

### Step 4: Core Features (max 12)

1. Transcript ingestion (paste with speaker labels)
2. Domain terminology validation (Starter+)
3. Speaker attribution anomaly detection
4. Accuracy score computation
5. Findings list/detail/status workflow
6. Plain-text transcript export
7. AI Accuracy Copilot (Pro+)
8. Dashboard KPIs (transcripts, accuracy, findings)
9. CSV findings report export
10. Plan-based usage limits (uploads, minutes)
11. Entitlement gating (terminology: Starter+, AI: Pro+)
12. Admin panel (users, audit log, billing)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Audio upload / ASR integration | HIGH | Core value, currently text-paste only |
| AI Grammar Check | MEDIUM | Documented, not built |
| AI Compliance Detection | MEDIUM | Healthcare/legal compliance |
| AI Translation | LOW | Documented, not built |
| AI Sentiment Analysis | LOW | Documented, not built |
| AI Speaker Verification | LOW | Documented, not built |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Transcript Count | Average Accuracy Score | Open Findings | Terminology Findings

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Transcripts
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Transcript Ingestion
  ├── Domain Terminology Validation (scans segment text)
  ├── Speaker Attribution Anomaly Detection (scans speaker labels)
  ├── Accuracy Score (from all findings)
  ├── Findings Status Workflow
  ├── Plain-Text Export (transcript + findings)
  └── AI Accuracy Copilot (reads transcript + findings)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → Terminology (Starter+), AI Copilot (Pro+), Upload/Minute Limits
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## 12. SCHEMALINT

### Step 1: Existing Feature Audit

| # | Feature | Location | Status |
|---|---------|----------|--------|
| 1 | Schema import/scan (paste JSON tables/columns/FKs/indexes, engine selectable) | `app/(app)/schemas`, `app/api/schemas` | IMPLEMENTED |
| 2 | Deterministic lint engine (4 rules: missing PK, missing FK index, naming, duplicate indexes) | `lib/services/schema-lint-engine.ts` | IMPLEMENTED |
| 3 | Health score (severity-weighted 0-100) | `lib/services/schema-lint-engine.ts` | IMPLEMENTED |
| 4 | Schema detail view (per-table columns, indexes, health badge) | `app/(app)/schemas/[id]` | IMPLEMENTED |
| 5 | Findings list per schema (severity badges, mark resolved) | `app/api/findings`, `app/api/findings/[id]` | IMPLEMENTED |
| 6 | AI Database Architect (summary, risk level, prioritized recommendations, Pro+) | `app/api/schemas/[id]/architect`, `lib/services/database-architect.ts` | IMPLEMENTED |
| 7 | Dashboard KPIs (schema count, avg health, open findings, critical findings) | `app/(app)/dashboard`, `app/api/dashboard` | IMPLEMENTED |
| 8 | CSV findings report export | `app/(app)/reports`, `app/api/reports/findings` | IMPLEMENTED |
| 9 | Admin panel (users, audit log, billing) | `app/(admin)/admin/*` | IMPLEMENTED |
| 10 | Auth (signup/login/logout) + profile + settings | `app/(auth)/*`, `app/(app)/profile`, `app/(app)/settings` | IMPLEMENTED |
| 11 | Stripe billing (checkout/portal/webhook) | `app/api/billing/*` | IMPLEMENTED |

### Step 2: Feature Classification

| Feature | Classification | Rationale |
|---------|---------------|-----------|
| Schema import/scan (paste mode) | KEEP | Core domain |
| Lint engine (4 rules) | KEEP | Core domain |
| Health score | KEEP | Core domain |
| Schema detail view | KEEP | Core domain |
| Findings list/status | KEEP | Core domain |
| AI Database Architect | KEEP | Killer feature, Pro+ gated, fail-closed |
| Dashboard/reports/admin/auth/billing | KEEP | Platform standard |
| AI Migration Generator | REMOVE | Documented Phase 2, no code |
| AI Query Optimization | REMOVE | Documented Phase 2, no code |
| AI Security Audit | REMOVE | Documented Phase 2, no code |
| AI Cost Estimation | REMOVE | Documented Phase 2, no code |
| Live database connection | REMOVE | Phase 1 is paste-JSON only |
| MFA | REMOVE | UI stub, not wired |

### Step 3: Hero Features (max 5)

1. **AI Database Architect** — LLM-powered summary, risk level, prioritized recommendations (relationships, indexing, normalization, migrations)
2. **Deterministic Lint Engine** — 4-rule checker (missing PK, missing FK index, naming conventions, duplicate indexes)
3. **Health Score** — Severity-weighted 0-100 per schema
4. **Schema Import** — Multi-engine paste-JSON import (PostgreSQL, MySQL, SQLite, SQL Server)
5. **Schema Detail View** — Per-table column/index/FK visualization with health badge

### Step 4: Core Features (max 12)

1. Schema import/scan (paste JSON, engine selectable)
2. Deterministic lint engine (4 rules)
3. Health score computation
4. Schema detail view (tables, columns, indexes)
5. Findings list with severity badges
6. Finding status management (mark resolved)
7. AI Database Architect (Pro+)
8. Dashboard KPIs (schemas, health, findings)
9. CSV findings report export
10. Admin panel (users, audit log, billing)
11. Auth (signup/login/logout) + profile + settings
12. Stripe billing (checkout/portal/webhook)

### Step 5: V2 Backlog

| Feature | Priority | Rationale |
|---------|----------|-----------|
| Live database connection (read-only) | HIGH | Core value, currently paste-only |
| AI Migration Generator | MEDIUM | Documented Phase 2 |
| AI Query Optimization | MEDIUM | Documented Phase 2 |
| Additional lint rules (beyond 4) | MEDIUM | Limited rule set currently |
| AI Security Audit | LOW | Documented Phase 2 |
| AI Cost Estimation | LOW | Documented Phase 2 |
| MFA | LOW | Platform capability, not wired |

### Step 6: Dashboard Freeze

**Locked dashboard layout:**
- KPI Row: Schema Count | Average Health Score | Open Findings | Critical Findings
- Section: Recent Schemas List (last 10)

### Step 7: Navigation Freeze

**Locked navigation:**
- Dashboard
- Schemas
- Reports
- Billing
- Settings
- Profile
- Admin → Users | Audit Log | Billing

### Step 8: Feature Dependency Map

```
Schema Import/Scan
  ├── Lint Engine (produces findings + health score)
  │    └── Findings Status Management
  └── AI Database Architect (reads schema + findings → recommendations)

Platform Auth → Organization Context → All features
Stripe Billing → Entitlement Engine → AI Database Architect (Pro+)
```

### Step 9: Product Change Log

| Date | Change | Type |
|------|--------|------|
| 2026-07-12 | Initial product freeze audit | FREEZE |

### Step 10: Feature Freeze

**STATUS: PRODUCT FEATURES LOCKED**

---

## CROSS-PRODUCT PATTERNS (Common Platform Features)

Every product shares these via `@founder-os/platform` and `@founder-os/ui`:

| Feature | Implementation | Status |
|---------|---------------|--------|
| Email/password auth (signup + org creation + 14-day Pro trial) | `@founder-os/platform/auth` | ALL 12 |
| Session cookie management (httpOnly/secure/sameSite=lax) | `@founder-os/platform/auth` | ALL 12 |
| MFA detection (requiresMfa flag) | `@founder-os/platform/auth` | ALL 12 (UI NOT WIRED) |
| Organization context resolution (first membership) | Per-product `lib/organization-context.ts` | ALL 12 |
| RBAC roles: owner/admin/member | `@founder-os/platform` | ALL 12 |
| Admin user management (list/role-change/remove) | Per-product admin panel | ALL 12 |
| Admin audit log viewer | `@founder-os/platform/audit` | ALL 12 |
| Admin billing panel | `@founder-os/platform/billing` | ALL 12 |
| Stripe checkout (Starter/Pro) | `@founder-os/platform/billing` | ALL 12 |
| Stripe billing portal | `@founder-os/platform/billing` | ALL 12 |
| Stripe webhook handler (signature-verified) | `@founder-os/platform/billing` | ALL 12 |
| Entitlement engine (can/withinLimit/incrementUsage) | `@founder-os/platform/billing` | ALL 12 |
| AI provider routing (Anthropic primary, OpenAI fallback) | `@founder-os/platform/ai` | ALL 12 |
| AI fail-closed (503 when no API key configured) | `@founder-os/platform/ai` | ALL 12 |
| Structured AI output with Zod validation + self-correction | `@founder-os/platform/ai` | ALL 12 |
| In-app notifications | `@founder-os/platform/notifications` | ALL 12 |
| Analytics event tracking | `@founder-os/platform/analytics` | ALL 12 |
| CSV report export (at least one per product) | Per-product reports page | ALL 12 |
| Profile page (view/edit display name) | Per-product | ALL 12 |
| Organization settings (view slug, edit name) | Per-product | ALL 12 |

---

**ALL 12 PRODUCTS: STATUS: PRODUCT FEATURES LOCKED**

# Product Identity — IncidentTriage

## 1. Product Vision

An AI-powered incident intelligence platform for DevOps and SRE teams that explains what broke, why it broke, and how to fix it — turning hours of manual log archaeology into a 60-second AI-generated root cause explanation.

## 2. Problem Statement

When production breaks, engineers spend the first (and most critical) 30–60 minutes not fixing the problem but figuring out what's actually wrong: which service failed first, what changed recently, which logs matter out of millions of lines, and who else has seen this before. Alert tools (PagerDuty, Opsgenie) tell you *that* something broke; they don't tell you *why*. Observability tools (Datadog, Grafana) show dashboards, but someone still has to manually correlate metrics, logs, traces, and recent deploys into a coherent story. Postmortems are written from memory days later, missing details. The result: Mean Time to Resolution (MTTR) stays high, on-call burnout is common, and the same root causes recur because no one systematically learns from past incidents.

## 3. Root Cause

Incident response tooling is split into silos: alerting (PagerDuty), observability (Datadog/Grafana), logs (ELK/Splunk), and tickets (Jira) — none of which talk to each other during an active incident. No tool synthesizes "here's what happened" from all four sources simultaneously. Root cause analysis is a manual, expert-dependent skill (senior engineers are faster at this because of pattern memory, not tooling) that doesn't scale as teams grow or on-call rotates to less experienced engineers. Postmortems are written after the fact, disconnected from the incident timeline data that could auto-generate them.

## 4. Target Customer

DevOps and SRE teams at companies running production services with meaningful uptime pressure — from small engineering teams (5–50 engineers) running lean on-call rotations up to larger platform/SRE organizations (200+ engineers) that need multi-team incident coordination and compliance-grade audit trails.

## 5. Business Value

- **Faster resolution:** Reduce MTTR by 40–60% by giving on-call engineers an AI-generated root cause hypothesis in the first 60 seconds instead of the first 45 minutes.
- **Reduced on-call burden:** Junior/less-experienced on-call engineers perform closer to senior-engineer triage speed because the AI provides the pattern-matching senior engineers do from memory.
- **Institutional memory:** Every incident's root cause, timeline, and fix become searchable knowledge instead of living in one engineer's head or a stale wiki page.
- **Fewer repeat incidents:** AI Postmortem Generator + change risk analysis close the loop from "what broke" to "why does this keep happening."
- **On-call sustainability:** Faster, less stressful incident response reduces on-call burnout and improves retention of SRE/DevOps talent.

**Killer Feature — AI Root Cause Copilot (Pro tier):** Instead of manually searching logs, AI explains what happened, why it happened, which service failed first, a suggested fix, and estimated recovery time — replacing the first 30–45 minutes of an incident with a 60-second AI-generated brief.

## 6. Success Goal

Customers reduce MTTR by 40%+ within 90 days and cut time-to-first-hypothesis (from alert fired to "here's likely what's wrong") from 30+ minutes to under 5 minutes.

## 7. Acceptance Criteria (MVP)

- [ ] Incident dashboard: Active incidents, service health status, recent incident history.
- [ ] Alert correlation: Ingest alerts from existing tools (PagerDuty, Opsgenie, or direct webhook) and correlate related alerts into a single incident.
- [ ] AI root cause analysis: Given an incident's logs/metrics/recent-deploy context, generate a root cause hypothesis with confidence level.
- [ ] Log timeline: Reconstruct the sequence of events (deploys, alerts, log spikes) leading to and during the incident.
- [ ] Service health dashboard: Real-time status per service (healthy, degraded, down) based on ingested signals.
- [ ] Incident reports: Structured summary per incident (timeline, root cause, resolution, duration).
- [ ] Role-based access: Admin, Team Member, Viewer. Project-scoped visibility.
- [ ] Audit logging: Every incident action, every AI analysis request.
- [ ] Slack + Jira integration: Built and wired, disabled until Phase 2 credentials provided.
- [ ] No external integrations required to run Phase 1; PagerDuty/Opsgenie/Datadog connectors built but disabled until credentials arrive.

## 8. ICP Definition

Companies meeting ALL:
- Running production services with real uptime/reliability pressure (SaaS, e-commerce, fintech, infrastructure).
- 5–500+ engineers with a defined on-call rotation (formal or informal).
- Existing alerting tool (PagerDuty, Opsgenie, or similar) generating incidents to correlate against.
- At least weekly incidents/alerts worth investigating (enough volume for AI root cause analysis to prove value quickly).
- Willingness to grant read access to logs/metrics/deploy history for AI correlation.

## 9. Personas

### Primary: On-Call Engineer / SRE
- **Role:** Site Reliability Engineer, DevOps Engineer, or on-call software engineer.
- **Goal:** Resolve the incident fast, minimize customer impact, get back to sleep/regular work.
- **Pain:** Paged at 3am for an unfamiliar service; spends 30–45 minutes just figuring out what's wrong before starting to fix it.
- **Power:** First responder; drives the incident investigation.

### Secondary: SRE / Platform Engineering Lead
- **Role:** Head of SRE, Platform Engineering Manager, VP Engineering.
- **Goal:** Reduce MTTR org-wide, reduce on-call burnout, prevent repeat incidents.
- **Pain:** MTTR is inconsistent across the team (senior engineers resolve incidents 3x faster than junior); no systematic postmortem process; incidents repeat.
- **Power:** Owns incident response process; sets tooling budget; drives postmortem culture.

### Influencer: Engineering Director / CTO
- **Role:** Director of Engineering, CTO.
- **Goal:** Uptime SLAs met, engineering org scales without proportional on-call pain, incident costs (revenue impact, engineering hours) go down.
- **Pain:** Can't quantify incident cost or MTTR trend; board/customers ask about reliability and answers are anecdotal.
- **Power:** Approves budget for reliability tooling; cares about SLA/uptime metrics.

## 10. Jobs-to-be-Done

1. **Tell me what's wrong, fast** — When I get paged, show me a plausible root cause hypothesis in under a minute so I can start fixing instead of searching logs.
2. **Show me the timeline** — Reconstruct what happened (deploys, alerts, log spikes) in the order it happened, so I don't have to manually correlate five tools.
3. **Help me write the postmortem** — Generate a first-draft postmortem from the incident timeline and root cause so I don't have to reconstruct it from memory three days later.
4. **Warn me before I break something** — Analyze the risk of an upcoming deploy/change based on past incidents tied to similar changes.
5. **Let leadership see the trend** — Give engineering leadership a dashboard of MTTR, incident frequency, and repeat-cause analysis so reliability investment is data-driven, not anecdotal.

## 11. Pain Points (Ranked by Severity)

1. **[Critical] Root cause investigation eats the first 30–45 minutes of every incident** — Engineers manually correlate alerts, logs, metrics, and deploy history before they can even start fixing the problem.
2. **[Critical] MTTR varies wildly by who's on call** — Senior engineers resolve incidents fast from pattern memory; junior/less-experienced on-call engineers take much longer on the same class of incident.
3. **[High] No unified incident timeline** — PagerDuty shows alerts, Datadog shows metrics, ELK shows logs, GitHub shows deploys — nobody has correlated them into one story until a human does it manually.
4. **[High] Postmortems are written from memory, days later** — Details are lost; postmortems become a compliance exercise instead of a learning tool.
5. **[High] Repeat incidents aren't systematically prevented** — Without structured root-cause history, the same class of failure (bad deploy, resource exhaustion, dependency timeout) recurs.
6. **[Medium] On-call burnout** — Slow, stressful incident response with poor tooling drives SRE/DevOps attrition.
7. **[Medium] No incident cost visibility** — Leadership can't quantify MTTR trends or incident cost to justify reliability investment.
8. **[Low] Change risk is invisible** — No systematic way to flag "this deploy resembles ones that caused past incidents" before it ships.

## 12. Customer Journey

### Phase 1: Awareness
- **Trigger:** A bad on-call week (multiple 3am pages, slow resolution) or a major incident with a long MTTR that gets leadership attention.
- **Action:** SRE lead searches "AI incident management" or "root cause analysis tool"; sees demo of AI-generated root cause hypothesis.
- **Moment:** "That would have saved us 40 minutes on last week's outage" — aha moment.

### Phase 2: Consideration
- **Trigger:** Trial IncidentTriage against last month's incidents (historical replay).
- **Action:** Connect one project's alert source; AI generates root cause hypotheses for 5 past incidents; team compares against what actually happened.
- **Moment:** AI correctly identifies root cause (or gets close) on 4 of 5 historical incidents — validation.

### Phase 3: Activation
- **Trigger:** Team adopts for live on-call rotation.
- **Action:** Connect PagerDuty/Opsgenie webhook; on-call engineer gets first live page with AI root cause hypothesis attached.
- **Moment:** First real incident resolved in half the usual time because the AI hypothesis was correct.

### Phase 4: Habit
- **Trigger:** IncidentTriage becomes the default first tab opened when paged.
- **Action:** Team relies on AI Root Cause Copilot + timeline for every incident; postmortems auto-drafted.
- **Moment:** MTTR dashboard shows a sustained 40%+ reduction after one quarter.

### Phase 5: Expansion
- **Trigger:** Other teams/services want the same tooling; leadership wants org-wide MTTR visibility.
- **Action:** Add more projects/teams; enable change risk analysis on deploy pipeline; multi-team incident coordination for Enterprise.
- **Moment:** Engineering leadership presents quarter-over-quarter MTTR improvement to the board.

## 13. Buying Triggers

1. A high-profile incident with a long MTTR draws leadership scrutiny.
2. On-call burnout/attrition becomes visible (engineers refusing on-call, quitting).
3. SRE team scaling (hiring less-experienced on-call engineers) increases MTTR variance.
4. SLA/uptime commitments to customers create pressure to formalize incident response.
5. Postmortem culture initiative from engineering leadership with no tooling to support it.

## 14. Competitors Considered

| Competitor | Type | Notes |
|---|---|---|
| Manual triage (Slack war room + tribal knowledge) | Status quo | Default today; works but slow, inconsistent, doesn't scale past senior engineers. |
| PagerDuty (Incident Response module) | Direct | Excellent alerting/on-call scheduling; incident response features are workflow-focused (runbooks, status pages), not AI root cause analysis. |
| Opsgenie (Atlassian) | Direct | Similar to PagerDuty; alerting + escalation focus; no AI root cause synthesis. |
| incident.io | Direct | Strong incident coordination/Slack-native workflow; lighter on AI-driven root cause analysis from logs/metrics. |
| Rootly | Direct | Modern incident management, automation-focused; overlaps on postmortem generation; less emphasis on cross-source AI correlation. |
| Datadog Incident Management | Substitute | Tied to Datadog's observability stack; strong if already all-in on Datadog, but not a standalone cross-tool correlator. |
| Blameless | Direct | SRE-focused incident + reliability platform; enterprise-priced; slower-moving product. |

## 15. Market Gaps

| Gap | Tied to Pain | Why Incumbent Can't Own |
|---|---|---|
| AI-generated root cause hypothesis in the first minute of an incident | Pain #1, #2 | PagerDuty/Opsgenie are alerting/escalation tools, not root-cause engines. Observability vendors (Datadog) require you to already be all-in on their stack. |
| Cross-tool timeline correlation (alerts + logs + metrics + deploys) without full observability migration | Pain #3 | Datadog/Grafana correlate within their own stack; IncidentTriage sits on top of whatever tools a team already uses. |
| Auto-drafted postmortems from real incident data | Pain #4 | Rootly/incident.io have workflow templates; few generate the narrative from actual timeline + root cause data automatically. |
| MTTR-variance reduction (junior engineers perform like seniors) | Pain #2, #6 | No competitor explicitly targets skill-leveling as the value prop; most tools assume triage skill, not augment it. |

## 16. Opportunities

| Opportunity | Why Hard to Copy | Attractiveness (1–5) |
|---|---|---|
| AI Root Cause Copilot (explain what/why/which-service/fix/ETA) | Requires correlating logs + metrics + deploys + historical incident patterns into one coherent narrative; hard engineering + prompt design problem. | 5 |
| AI Postmortem Generator from real timeline data | Requires accurate timeline reconstruction first; compounds with root cause engine. | 4 |
| Change risk analysis (flag deploys resembling past incident causes) | Requires historical incident-to-deploy correlation dataset; improves with usage (data moat). | 4 |
| Incident prediction (pre-emptive risk scoring from telemetry trends) | Requires mature baseline + anomaly detection; high ceiling, Phase 2 feature. | 3 |
| Multi-team incident coordination for large orgs | Workflow/UX problem more than AI problem; still valuable enterprise differentiator. | 3 |

## 17. Positioning Statement

> For **DevOps and SRE teams who need to resolve incidents fast without depending on tribal knowledge**, unlike **alerting/escalation tools (PagerDuty, Opsgenie) that tell you something broke but not why**, IncidentTriage provides an **AI Root Cause Copilot that explains what happened, why, and how to fix it** in the first 60 seconds of an incident.

## 18. Feature Classification (MoSCoW + Priority)

### Must Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| Incident dashboard | 5 | 4 | 5 | 2 | 2.0 | JTBD #1, #5 |
| Alert correlation (ingest + dedupe) | 5 | 5 | 4 | 3 | 1.33 | Pain #1, #3 |
| AI root cause analysis | 5 | 5 | 4 | 4 | 1.25 | Pain #1, #2, JTBD #1 |
| Log timeline reconstruction | 4 | 5 | 4 | 3 | 1.33 | Pain #3, JTBD #2 |
| Service health dashboard | 4 | 4 | 5 | 2 | 2.0 | JTBD #1 |
| Incident reports | 4 | 4 | 5 | 2 | 2.0 | Pain #4 |
| RBAC + audit logging | 5 | 4 | 5 | 2 | 2.0 | Compliance |

### Should Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| AI Incident Copilot (interactive Q&A on active incident) | 3 | 5 | 3 | 4 | 0.94 | JTBD #1, Killer Feature |
| AI Recovery Suggestions | 3 | 4 | 3 | 3 | 1.0 | JTBD #1 |
| Slack integration (built, disabled until Phase 2) | 4 | 3 | 5 | 1 | 6.0 | Workflow |
| Jira integration (built, disabled until Phase 2) | 3 | 3 | 4 | 2 | 1.5 | Workflow |

### Nice to Have (Post-Phase 1)

| Feature | Reason | Ties to |
|---|---|---|
| AI Postmortem Generator | High-value but depends on mature timeline + root cause accuracy first. | Pain #4 |
| Auto ticket creation | Workflow automation; Phase 2 once integrations enabled. | Workflow |
| Status page integration | Premium/customer-facing feature; Phase 2. | Enterprise |
| Custom dashboards | Requires flexible dashboard framework; Phase 2. | Enterprise |

### Future / Out of Scope

- Incident prediction (proactive risk scoring) — requires mature baseline data; Phase 2+.
- Change risk analysis — requires deploy-to-incident historical correlation at scale; Phase 2+.
- Full observability platform (metrics/traces storage) — IncidentTriage correlates, it doesn't replace Datadog/Grafana.

## 19. Feature Priority Narrative

**Phase 1 mission:** Solve pain #1 (root cause investigation eats 30–45 minutes) and #3 (no unified timeline) by giving on-call engineers an AI-generated hypothesis and correlated timeline the moment they're paged.

**Rationale for musts:** Alert correlation + AI root cause analysis are the core differentiator — without them, this is just another dashboard. Timeline reconstruction is what makes the root cause explainable, not just a guess. Incident dashboard and service health give the always-on situational awareness teams currently patch together from multiple tools. RBAC + audit logging are non-negotiable for teams that treat incidents as compliance-relevant events (SOC2, uptime SLAs).

**Rationale for shoulds:** AI Incident Copilot (interactive Q&A) is the natural extension of root cause analysis but requires conversational infrastructure — ambitious but high-value, stretch goal for Phase 1. Recovery suggestions build on root cause output. Slack/Jira integrations are built and wired per Phase 1 rules but stay disabled until real credentials arrive in Phase 2 — the connector code ships now so there's no rearchitecture later.

**Rationale for nice-to-haves:** Postmortem generation depends on root cause + timeline being reliable first (sequencing risk if built too early). Auto ticket creation needs live Jira credentials (Phase 2). Status pages and custom dashboards are enterprise/premium expansion features.

## 20. Pricing Strategy

**Principle:** Product-led growth for engineering teams. A single team can adopt IncidentTriage for one project without procurement friction, prove MTTR reduction within a month, then expand to more projects/teams. AI-heavy capabilities (Incident Copilot, recovery suggestions, advanced analytics) unlock at Pro, where most revenue concentrates since that's where MTTR reduction becomes dramatic rather than incremental.

**Model:** Subscription SaaS, monthly billing (annual discount available), four-tier pricing ladder (Free → Starter → Pro → Enterprise).

## 21. Pricing Tiers & Entitlements

| | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **Price** | $0 | $39/month | $149/month | Custom |
| **Target** | Small teams evaluating | Single-team on-call rotations | Multi-team SRE orgs | Large platform orgs, compliance-driven |
| **Projects** | 1 | 5 | Unlimited | Unlimited |
| **Team Members** | 2 | 10 | Unlimited (multi-team) | Unlimited (multi-team) |
| **Incidents / Month** | 100 | 1,000 | Unlimited | Unlimited |
| **AI Root Cause Analyses** | 5 | Unlimited | Unlimited + AI Incident Copilot | Unlimited + custom models |
| **AI Recovery Suggestions** | — | — | Yes | Yes |
| **Log Timeline** | Basic | Yes | Yes | Yes |
| **Service Health Dashboard** | Basic | Yes | Advanced | Advanced + custom |
| **Reports** | — | Incident reports | Advanced analytics | Advanced + custom |
| **Dashboards** | Basic | Basic | Custom dashboards | Custom + multi-org |
| **API Access** | — | — | Yes | Yes |
| **Integrations** | Email alerts | Slack, Jira | + Status Page | + custom integrations |
| **History Retention** | 7 days | 90 days | 2 years | Custom |
| **Support** | Community | Email | Priority email | Dedicated + SLA |
| **Compliance & Enterprise** | — | — | — | SSO, SCIM, audit logs, dedicated support, SLA, private deployment |

**Rationale:**
- Free: 1 project, 2 members, 100 incidents/mo, 5 AI root cause analyses — enough to validate accuracy against real historical incidents before committing.
- Starter ($39/mo): 5 projects, 10 members, unlimited AI root cause analysis, Slack/Jira — the point a single on-call rotation fully adopts the tool.
- Pro ($149/mo): Unlimited projects/incidents, AI Incident Copilot (killer feature extension), recovery suggestions, multi-team support, API access — this is where MTTR reduction compounds across an org, and where most revenue concentrates.
- Enterprise (Custom): SSO/SCIM/audit logs/private deployment for large platform orgs with compliance requirements.

## 22. Entitlements Logic (Pricing Engine)

| Feature / Limit | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| `withinLimit("projects", org)` | 1 | 5 | Unlimited | Unlimited |
| `withinLimit("team_members", org)` | 2 | 10 | Unlimited | Unlimited |
| `withinMonthly("incidents", org)` | 100 | 1,000 | Unlimited | Unlimited |
| `withinMonthly("ai_root_cause_analyses", org)` | 5 | Unlimited | Unlimited | Unlimited |
| `can("use_ai_incident_copilot")` | No | No | Yes | Yes |
| `can("use_ai_recovery_suggestions")` | No | No | Yes | Yes |
| `can("use_advanced_analytics")` | No | No | Yes | Yes |
| `can("use_custom_dashboards")` | No | No | Yes | Yes |
| `can("use_api")` | No | No | Yes | Yes |
| `can("use_status_page_integration")` | No | No | Yes | Yes |
| `can("use_sso")` / `can("use_scim")` | No | No | No | Yes |
| `withinLimit("history_days", org)` | 7 | 90 | 730 | Custom |

## 23. Limit Behavior

- **Approaching limit:** In-app banner at 80% of monthly incident or AI-analysis limit (e.g., "You've used 4 of 5 AI root cause analyses this month on Free."). Suggests upgrade.
- **At limit:** New incidents still get correlated and logged (never silently dropped), but AI root cause analysis is queued until upgrade or next cycle reset.
- **Upgrade impact:** Limit increases immediately on upgrade; monthly billing prorates the first cycle.

## 24. Billing States

| State | Effect on Entitlements | Behavior |
|---|---|---|
| **Trialing (14 days)** | Full Pro features enabled | Auto-downgrades to Free (capped) unless card added. |
| **Active (paid subscription)** | Tier-appropriate features | Full access; incident correlation continues uninterrupted. |
| **Past due (7+ days unpaid)** | Read-only access; no new AI analyses | Grace period for card retry; incident history retained. |
| **Canceled** | Downgrade to Free tier limits | History retained 90 days; can restart without re-onboarding. |

## 25. Market Potential

**TAM:** Global companies running production software with on-call rotations. **Estimate:** 200,000 companies, $8B market (incident management + observability-adjacent tooling spend).

**SAM (Serviceable Addressable Market):** Companies with 5+ engineers and a formal/informal on-call rotation using an existing alerting tool. **Estimate:** 60,000 companies, $2B market.

**SOM (Serviceable Obtainable Market, Year 5):** 3% of SAM = 1,800 companies, $40M ARR. Realistic with freemium-driven adoption and PagerDuty/Opsgenie's large existing installed base to layer on top of.

**Market growth:** Incident management market growing 15%+/year as more companies formalize SRE practices; AI-augmented ops tooling is a fast-growing subcategory.

## 26. Revenue Potential

**PLG funnel assumption:** Free signups (individual teams evaluating) → 12–15% convert to Starter/Pro within 30 days once AI root cause accuracy is proven on real incidents → Enterprise sourced from Pro accounts hitting multi-team/compliance needs.

**Year 1:** 8,000 free signups → 900 paying accounts (55% Starter $39, 45% Pro $149; blended ~$89/mo) + 10 Enterprise accounts ($35K avg annual) = ~$960K ARR self-serve + $350K ARR Enterprise = **~$1.3M ARR**.
**Year 2:** 25,000 signups → 3,200 paying accounts + 35 Enterprise = **$4.5M ARR**.
**Year 3:** 60,000 signups → 8,000 paying accounts + 90 Enterprise = **$11M ARR**.
**Year 5:** 150,000 signups → 20,000 paying accounts + 250 Enterprise = **$32M ARR**.

**Expansion revenue:** Starter → Pro upgrade (30% of Starter accounts within 12 months for AI Incident Copilot), multi-team Enterprise expansion, incident prediction/change risk analysis add-ons (Phase 2).

**Unit economics:**
- CAC (self-serve): ~$180 (developer/SRE community content, near-zero paid acquisition).
- CAC (Enterprise, sales-assisted): ~$9K (outbound + 3-month cycle; 30% close rate).
- LTV (self-serve, 3-year retention, $89/mo blended avg): ~$3,204.
- LTV (Enterprise, 4-year retention, $35K/year): ~$140K.
- Blended LTV:CAC ratio: ~14–16× (strong for SaaS).

## 27. Technical Difficulty (Inverted: 5 = Easy/Low-Risk)

**Rating: 3 / 5** (Moderate difficulty)

**Why not 5:**
- AI root cause analysis requires synthesizing multiple data types (structured alerts, unstructured logs, time-series metrics, deploy events) into one coherent hypothesis — a genuinely hard prompt-engineering + retrieval problem.
- Accuracy is critical: a wrong root cause hypothesis wastes an on-call engineer's time and destroys trust quickly.
- Correlating alerts from multiple third-party sources (PagerDuty, Opsgenie, direct webhooks) into a single incident requires robust deduplication logic.
- Timeline reconstruction across heterogeneous log formats is brittle without careful normalization.

**Why not 1:**
- Core ingestion (webhooks, log parsing) uses well-established patterns.
- No need to build a full observability platform — IncidentTriage correlates data from tools customers already have, not replaces them.
- LLM-based summarization/explanation (the heart of the Root Cause Copilot) is a well-understood application of structured-output prompting, not novel ML research.

**Risk mitigation:**
- Validate AI root cause accuracy against historical incidents (replay mode) before going live for any customer — target >70% "directionally correct" hypothesis rate pre-launch, improving with usage data.
- Modular ingestion connectors (each alert/log source isolated) so one format change doesn't break correlation for other sources.
- Confidence scoring surfaced alongside every AI hypothesis so engineers know when to trust vs. verify.

**Scalability:** Event-driven ingestion (queue-based), stateless correlation workers, time-series storage for metrics/logs correlation. Handles thousands of incidents/day per customer without rearchitect.

## 28. AI Differentiation

**AI capabilities (Phase 1 & 2):**

1. **AI Root Cause Copilot (Phase 1, killer feature):** Explains what happened, why, which service failed first, a suggested fix, and estimated recovery time — synthesized from alerts, logs, metrics, and recent deploys.
2. **AI Incident Copilot (Phase 1 stretch / Phase 2):** Interactive Q&A during an active incident ("has this happened before?", "what changed in the last hour?").
3. **AI Recovery Suggestions (Phase 1):** Concrete next-step recommendations based on the root cause hypothesis and historical resolutions for similar incidents.
4. **AI Postmortem Generator (Phase 2):** Auto-drafts a postmortem from the incident timeline, root cause, and resolution — human reviews and finalizes.
5. **Incident Prediction (Phase 2):** Risk-scores upcoming deploys/changes based on historical incident-to-change correlation.
6. **Change Risk Analysis (Phase 2):** Flags deploys that resemble patterns from past incidents before they ship.

**Why AI matters:**
- Root cause analysis is currently a scarce, expert-dependent skill; AI democratizes senior-engineer-level triage speed across the whole on-call rotation.
- Manual cross-tool correlation (alerts + logs + metrics + deploys) doesn't scale with alert volume or team growth; AI does this in seconds.
- Postmortem quality depends on accurate memory of a stressful event; AI drafting from real timeline data is more accurate and faster.

**How it's differentiated:**
- PagerDuty/Opsgenie are alerting and escalation tools; they don't explain root cause.
- Datadog/Grafana require full observability-stack adoption; IncidentTriage layers on top of whatever tools a team already has.
- incident.io/Rootly focus on workflow/coordination; IncidentTriage's core bet is the AI root cause engine itself, not just process automation.

## 29. Scalability Plan

- **Incident volume:** Thousands of incidents/day per large customer. Handled by event-driven ingestion (queue-based) and stateless correlation workers.
- **Log/metric volume:** Correlation engine samples and indexes rather than storing full observability data (not competing with Datadog on raw telemetry storage).
- **Concurrency:** Multiple simultaneous active incidents per customer during major outages; correlation workers scale horizontally.
- **Multi-tenancy:** Every incident, alert, and log entry scoped by organization_id and project_id.
- **Growth path:** Shared infrastructure up to hundreds of customers; then dedicated ingestion workers per high-volume enterprise customer.

## 30. Build Recommendation

**Verdict: BUILD**

**Biggest reason:** Every company running production software eventually hits the same wall: incident response tooling tells you something broke but not why, and root cause investigation is a scarce, expert-dependent skill that doesn't scale with team growth. No incumbent (PagerDuty, Opsgenie, incident.io, Rootly) has made AI-driven root cause synthesis their core bet — they're workflow/escalation tools with AI features bolted on, not AI-first root cause engines. Strong unit economics (14–16× LTV:CAC) and a large, underserved market (60K SAM companies) support a credible path to $30M+ ARR by Year 5, especially given PagerDuty/Opsgenie's large existing installed base IncidentTriage can layer on top of without requiring a rip-and-replace.

**Biggest risk:** AI root cause accuracy is the entire value proposition — if the hypothesis is wrong more often than it's right, on-call engineers stop trusting it within a week and churn immediately. Contingency: Spend the first 4–6 weeks validating root cause accuracy in replay mode against historical incidents from 5+ design-partner companies before any live on-call deployment. Target >70% directionally-correct hypothesis rate pre-launch, with confidence scoring surfaced so engineers know when to double-check rather than blindly trust.

**If Build — the one thing that most needs to go right:** Win 3–5 design-partner teams willing to replay their last 20–30 incidents through IncidentTriage's AI root cause engine and validate accuracy before going live on real on-call rotations. Accuracy validated on real historical data is the only way to earn trust from a skeptical, technically sophisticated SRE audience — a wrong hypothesis during a live 3am incident destroys credibility instantly and is very hard to win back.

---

## Validation Checklist

- [x] Vision is crisp and differentiated (AI root cause, not alerting/escalation).
- [x] Problem is quantified (30–45 min lost per incident to manual root cause investigation, MTTR variance by seniority).
- [x] Target customer has real pain (DevOps/SRE teams with on-call rotations, 5–500+ engineers).
- [x] Business value ties to jobs-to-be-done (fast root cause, timeline, postmortem drafting, change risk, leadership visibility).
- [x] Competitors include status quo (manual triage) and honest strengths/weaknesses for PagerDuty, Opsgenie, incident.io, Rootly, Datadog, Blameless.
- [x] Market gaps sourced to competitor analysis.
- [x] Positioning differentiates vs. PagerDuty/Opsgenie (root cause vs. alerting/escalation).
- [x] Feature classification traces musts to pains/JTBD.
- [x] Pricing ties to value (per-project/team scale; AI capability gates at Pro).
- [x] AI differentiation specific (Root Cause Copilot, Incident Copilot, Recovery Suggestions, Postmortem Generator, Prediction, Change Risk Analysis).
- [x] Technical difficulty justified (3/5 — multi-source AI synthesis is hard; ingestion patterns are standard).
- [x] Build recommendation includes biggest reason, risk, and one critical success factor.

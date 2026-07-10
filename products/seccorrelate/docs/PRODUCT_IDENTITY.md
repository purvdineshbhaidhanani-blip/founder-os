# Product Identity — SecCorrelate

## 1. Product Vision

A unified security log correlation platform that detects threats in real-time by synthesizing data from firewalls, endpoints, identity systems, and applications—giving security teams answers in seconds, not days.

## 2. Problem Statement

Security teams are drowning in logs. Firewalls generate 10M+ events/day. Endpoints, identity systems, and applications each contribute their own streams. A single breach involves signals scattered across five systems. Alert fatigue is catastrophic (500 alerts/day, 99% false positives). Threat hunters manually build timelines across tools, burning $200K/year in labor. By the time a breach is discovered, attackers have been inside for 200+ days.

## 3. Root Cause

Log sources don't communicate. Each tool (firewall, EDR, IAM, app logs) operates independently. Correlation rules are hand-coded in spreadsheets or firewall configs—brittle, slow to update, miss edge cases. SIEM platforms (Splunk, ELK) can correlate, but cost $500K+ to implement and maintain. Small-to-mid security teams can't afford it. Most don't have the analysts to write correlation rules.

## 4. Target Customer

Mid-market companies (500–5,000 employees) and high-security verticals (finance, healthcare, SaaS) with mature security programs, 24/7 SOC ambitions, and 10–50 person security teams who need correlation today but can't afford or deploy enterprise SIEM.

## 5. Business Value

- **Detection speed:** Detect advanced persistent threat (APT) patterns in minutes, not days. Reduce dwell time from 200 days to 1–2 days.
- **Analyst efficiency:** Eliminate 60–70% of manual correlation work. Shift headcount from alert-chasing to hunting and response.
- **False positive reduction:** From 99% to 80–85% by combining context. Real threats float to top of queue.
- **Compliance:** Automated alerting + audit trail for breach investigation. Faster breach response improves regulatory standing (HIPAA, PCI, SOC2).
- **Cost avoidance:** Enterprise SIEM alternative at 10–20% of TCO.

## 6. Success Goal

Customers identify and investigate a simulated APT (lateral movement + data exfil) in <30 minutes using SecCorrelate. Reduce analyst time-to-investigate from hours to 15 minutes.

## 7. Acceptance Criteria (MVP)

- [ ] Log ingestion from ≥5 sources: firewall, EDR (CrowdStrike, Defender), IAM (Okta, Azure AD), app logs (webhooks), DNS logs.
- [ ] Real-time rule engine: Create correlation rules (e.g., "failed login from IP + firewall block from same IP within 5 min = potential brute force") via no-code UI.
- [ ] Alert aggregation: Deduplicate + correlate related alerts; group by attack pattern.
- [ ] Automated alert investigation: Retrieve context from all sources (e.g., user's last login, recent endpoint behaviors, network egress).
- [ ] Role-based access: SOC Analyst, Threat Hunter, Security Manager, Viewer. No cross-team visibility.
- [ ] Audit logging: Every rule execution, every investigator action.
- [ ] Alert routing: Send alerts to teams (in-app), PagerDuty (Phase 2), Slack (Phase 2).
- [ ] Threat timeline: Reconstruct attack sequence (lateral movement, exfil) from correlated logs.
- [ ] No external integrations required in Phase 1; built but disabled.

## 8. ICP Definition

Mid-market and high-security companies meeting ALL:
- 500–10,000 employees.
- $5M–$50M annual security/IT budget.
- Existing SOC or security operations center (don't need to start from scratch).
- ≥3 of: firewall, EDR, IAM, cloud identity, centralized app logging.
- Recent security incident OR regulatory requirement (SOC2, HIPAA, PCI-DSS).
- NOT constrained by extreme data residency (cloud-compatible); willing to aggregate logs in unified platform.

## 9. Personas

### Primary: SOC Analyst / Incident Responder
- **Role:** Junior/mid-level analyst responding to alerts 24/7.
- **Goal:** Triage alerts fast, escalate real threats to hunter, dismiss false positives.
- **Pain:** 500 alerts/day, 99% false; spend 4 hours/day clicking between tools to build context.
- **Power:** First responder; controls alert triage workflow.

### Secondary: Security Manager / Operations Lead
- **Role:** Head of SOC, Security Operations Manager.
- **Goal:** Reduce dwell time, improve SLA (detect breach within 24 hours), hire efficiently.
- **Pain:** Alert fatigue burns out junior analysts; can't find budget for SIEM + headcount.
- **Power:** Budget holder; sets detection SLAs; controls tool selection.

### Influencer: Threat Hunter
- **Role:** Hunting analyst, incident response lead.
- **Goal:** Hunt for advanced threats, investigate incidents, write detection rules.
- **Pain:** Manually builds timelines across 5 tools; writes correlation rules in Python that no one else maintains.
- **Power:** Sets threat model; owns hunting playbooks.

## 10. Jobs-to-be-Done

1. **Quickly confirm it's real** — When an alert fires, show me in 30 seconds whether it's an actual threat or noise, so I can decide whether to escalate.
2. **Reconstruct what happened** — Show me the full attack timeline (lateral movement, exfil, persistence) from all sources, so I can brief leadership and start investigation.
3. **Hunt without code** — Let me define detection rules without writing Python, so I can experiment with new threat models without waiting for engineering.
4. **Reduce toil** — Stop asking me to log into five different tools and manually correlate; give me one dashboard with context pre-fetched.
5. **Build rules from incidents** — After an incident, capture the IOCs (IP, hash, domain) and turn them into rules automatically, so similar attacks are caught next time.

## 11. Pain Points (Ranked by Severity)

1. **[Critical] Alert fatigue destroys detection capability** — 500 alerts/day, 99% false. Analysts stop reading them. Real threats hide in noise. Dwell time: 200+ days.
2. **[Critical] Manual correlation burns analyst time** — Find the connection between 5 alerts across tools in 5 systems = 3–4 hours of manual work per incident.
3. **[High] Rules live in silos or spreadsheets** — Threat hunter writes Python correlation rules; no one else understands them; break on log format changes; no version control.
4. **[High] No unified view of attack chain** — Lateral movement from workstation → server → exfil requires analysts to stitch timelines manually.
5. **[High] False positives damage trust** — PagerDuty/Slack integrations send 50 false alerts/day; on-call team stops responding.
6. **[Medium] SOC headcount can't scale** — More alerts = need more analysts; but good analysts cost $80K–$120K. No leverage.
7. **[Medium] Post-incident analysis is manual** — After breach, spend weeks gathering evidence from 5 tools; no structured playbook.
8. **[Low] No threat hunting capability** — Alerts come from known patterns; no proactive hunt for unknown APTs.

## 12. Customer Journey

### Phase 1: Awareness
- **Trigger:** Breach discovered; 200-day dwell time leaked; SOC Manager directs team to evaluate detection solutions.
- **Action:** Search "SIEM alternative" or "log correlation platform"; see Gartner report on SIEM market consolidation.
- **Moment:** Read case study: "Detected APT in 1 day instead of 200 with SecCorrelate."

### Phase 2: Consideration
- **Trigger:** Test SecCorrelate with internal log data (last 2 weeks).
- **Action:** SOC Analyst builds first correlation rule ("brute force login attempt"); sees it fire correctly.
- **Moment:** "We could have caught the last incident with this rule" — aha moment.

### Phase 3: Activation
- **Trigger:** Budget approved; security team allocated 2 weeks for deployment.
- **Action:** Connect firewall + EDR + IAM; SOC Manager defines first 10 detection rules with Threat Hunter.
- **Moment:** First alert fires; analyst triages it in 2 minutes (vs. 1 hour manual). Alert deemed real; escalated to incident commander.

### Phase 4: Habit
- **Trigger:** Daily alert handling replaces prior chaos.
- **Action:** Analysts check SecCorrelate queue every 30 min; triage 50 correlated alerts instead of 500 raw alerts.
- **Moment:** Team's detection SLA improves from "unknown" to "1-hour MTTR."

### Phase 5: Expansion
- **Trigger:** First threat hunt rule fires and catches unknown malware.
- **Action:** Threat Hunter expands rule set; adds cloud app logs; tests APT playbooks.
- **Moment:** Real breach detected in 4 hours (vs. 200 days); security team publicizes win.

## 13. Buying Triggers

1. Recent security incident with >1-day dwell time.
2. Security audit with "improve detection capability" finding.
3. Compliance mandate (SOC2, HIPAA, PCI-DSS audit).
4. Attempted hire of SIEM admin / correlation engineer; candidate asks for modern tools.
5. CTO/CISO mandate to reduce alert fatigue.

## 14. Competitors Considered

| Competitor | Type | Notes |
|---|---|---|
| Manual log review + spreadsheets | Status quo | Default today; no alerting, manual correlation, labor-intensive. |
| Splunk | Direct | Enterprise-grade SIEM; powerful but $500K–$2M TCO; 12-month implementation; overkill for mid-market. |
| Elastic (ELK + detection) | Direct | Open source base; lower cost than Splunk but still requires $200K+ engineering investment to customize. |
| Sumo Logic | Direct | Cloud SIEM; simpler than Splunk but still $200K+ annually; less flexible rule engine. |
| Microsoft Sentinel (Azure SIEM) | Substitute | Bundled with Microsoft stack (Defender, Sentinel); requires Azure commitment; limited for multi-cloud environments. |
| Wiz / Falcon Cloud Security | Indirect | Cloud-native SIEM; lacks breadth for on-prem + multi-cloud (firewall, EDR, IAM correlation). |
| Datadog Security | Indirect | APM + security; not built for SIEM-class correlation; over-indexes on infrastructure. |

## 15. Market Gaps

| Gap | Tied to Pain | Why Incumbent Can't Own |
|---|---|---|
| No-code correlation rules for mid-market | Pain #1, #3 | Splunk requires Python/SPL expertise; not accessible to SOC Analyst. Sentinel tied to Microsoft ecosystem. Gap: modern rule builder + SIEM-lite features. |
| Unified detection across firewall + EDR + IAM without SIEM cost | Pain #1 | Splunk/Sentinel are $500K+ entry cost. Mid-market can't afford. SecCorrelate is $10K–$50K. |
| Automated attack timeline reconstruction | Pain #2, #4 | SIEM tools are log-search-first; correlation is add-on. SecCorrelate makes timeline first-class. |
| Threat hunting platform (not pure SIEM) | Pain #3, #8 | SIEMs optimize for "detect known threats." No guidance for hunting; rule-writing is hard. Gap: no threat hunting cloud. |
| Single pane for multi-cloud + on-prem | Pain #1 | Sentinel locks you into Azure. Splunk is multi-cloud but too expensive. Gap: lightweight correlation for hybrid environments. |

## 16. Opportunities

| Opportunity | Why Hard to Copy | Attractiveness (1–5) |
|---|---|---|
| No-code correlation rules + rule templates (APT patterns, ransomware, insider threat, data exfil) | Requires domain expertise + UX design + security research; most vendors ship code-first interfaces. | 5 |
| Automated threat timeline + forensic reconstruction | Requires correlation engine precision + UX to visualize timelines; Splunk focuses on raw search; Sentinel on alerts. | 5 |
| Managed threat hunting service (humans + AI) | Bundled offering; SecCorrelate + security team reviewing alerts 24/7; recurring revenue; high margin. | 4 |
| Third-party integration marketplace (CrowdStrike, Okta, Datadog connectors pre-built) | First mover owns integrations; high switching cost once 10+ connectors exist. | 4 |
| AI-driven baseline learning (learn what normal looks like per customer; auto-suppress legit patterns) | Requires data + ML ops; most SIEM vendors ship statistical rules only. | 4 |
| Threat intelligence feed curation (curated IP/domain/hash blocklists for mid-market) | Requires partnerships + continuous update; Splunk outsources to third parties; SecCorrelate owns for customers. | 3 |

## 17. Positioning Statement

> For **mid-market security teams (SOC analysts, managers, hunters) who need real-time threat detection without enterprise SIEM complexity and cost**, unlike **expensive SIEMs (Splunk, Elastic) or cloud-locked competitors (Sentinel)**, SecCorrelate provides **no-code correlation rules, unified log ingestion, and automated threat timelines** in hours, not months or years.

## 18. Feature Classification (MoSCoW + Priority)

### Must Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| Log ingestion from ≥5 sources | 5 | 5 | 5 | 4 | 1.25 | Pain #1, #2 |
| Real-time rule engine (no-code UI) | 5 | 5 | 4 | 4 | 1.25 | Pain #1, #3 |
| Alert aggregation + deduplication | 5 | 4 | 5 | 3 | 1.33 | Pain #1 |
| Automated alert investigation (context retrieval) | 4 | 5 | 3 | 4 | 1.0 | Pain #2, JTBD #1 |
| Threat timeline reconstruction | 4 | 5 | 3 | 4 | 1.0 | Pain #4, JTBD #2 |
| RBAC + audit logging | 5 | 4 | 5 | 2 | 2.0 | Pain #1 |
| In-app alerting | 5 | 3 | 5 | 1 | 3.0 | Pain #1 |

### Should Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| Rule templates (brute force, lateral movement, data exfil, ransomware) | 3 | 4 | 4 | 2 | 2.0 | Pain #3, JTBD #3 |
| Threat hunting dashboard (IOC search, tactical queries) | 3 | 4 | 3 | 3 | 1.0 | Pain #8, JTBD #5 |
| Automated rule generation from incidents | 2 | 5 | 2 | 4 | 0.5 | JTBD #5 |
| Baseline learning (per-customer normal behavior) | 2 | 5 | 2 | 4 | 0.5 | Pain #1 |

### Nice to Have (Post-Phase 1)

| Feature | Reason | Ties to |
|---|---|---|
| Managed 24/7 SOC service | Premium offering; Phase 2. | Revenue expansion |
| Third-party connector marketplace | Integrations; Phase 2. | Expansion |
| Threat intelligence feed integration | Data partnerships; Phase 2. | Expansion |
| Cloud SIEM advanced analytics | Advanced ML; Phase 2. | Expansion |

### Future / Out of Scope

- Full SIEM feature parity (not goal — we're correlation-first, not log search-first).
- DLP/data exfiltration prevention (platform, not standalone).
- Endpoint management (leave to EDR vendors).

## 19. Feature Priority Narrative

**Phase 1 mission:** Solve pain #1 (alert fatigue) and #2 (manual correlation) by delivering correlation rules + unified log view + automated investigation in 6 weeks.

**Rationale for musts:** Log ingestion + rule engine are the core. No rules = no differentiation. Alert aggregation + deduplication cut false positives by 50–60%, making alerts actionable. Threat timeline is the "aha" moment (analysts love seeing the full attack path). RBAC is table-stakes for security. In-app alerting works in Phase 1; PagerDuty/Slack integrations are Phase 2 (no external credentials).

**Rationale for shoulds:** Rule templates ship 10 pre-built detections (brute force, lateral movement, etc.); reduces time-to-first-detection. Threat hunting dashboard is for hunters; analysts don't need it for first week, but hunters ask for it immediately. Automated rule generation is Phase 1 if we can ship simple IOC → rule mapping; stretch goal. Baseline learning is Phase 2 (requires weeks of data collection).

**Rationale for nice-to-haves:** Managed SOC is pure revenue play (human analysts monitoring 24/7); Phase 2. Connector marketplace requires 10+ integrations (future, once market proven). Threat intel feeds are data partnerships; Phase 2.

## 20. Pricing Strategy

**Principle:** Security budgets are fixed per fiscal year. Price by log volume and number of data sources (bigger security footprint = higher price). Lock customers in before budget freeze (September).

**Model:** Subscription SaaS, annual billing, five-tier pricing ladder.

## 21. Pricing Tiers & Entitlements

| | Free | Starter | Professional | Enterprise | Advanced |
|---|---|---|---|---|---|
| **Annual Price** | $0 | $18K | $50K | $120K | Custom |
| **Target** | Evaluation | Mid-market <2K employees | Mid-market 2K–5K | Large enterprise | Regional / MSSP |
| **Daily Log Ingestion** | 10M | 100M | 500M | 5B | Unlimited |
| **Data Sources** | 2 | 5 | 10 | Unlimited | Unlimited |
| **Custom Rules** | 5 | 25 | 100 | Unlimited | Unlimited |
| **Alert Retention** | 30 days | 90 days | 1 year | 2 years | Custom |
| **Rule Templates** | Basic (5) | Standard (25) | Advanced (50) | All + custom | All + custom |
| **Automated Investigation** | 3 fields | 10 fields | 50 fields | Unlimited | Unlimited |
| **Timeline Analysis** | Limited | 30-day window | 90-day window | 1-year window | Unlimited |
| **Team Collaboration** | None | Email | In-app comments | In-app + Slack (Phase 2) | In-app + Teams (Phase 2) |
| **Hunting Features** | — | — | IOC search, tactical queries | Full hunting suite | Full suite + managed service |
| **Support** | Community | Email | Priority email | Dedicated + QBR | Dedicated + 24/7 SOC |
| **Gated Features** | — | — | Threat hunting, advanced timeline | All analytics | All + managed hunting |

**Rationale:**
- Free tier: Evaluation for small teams; 2 sources max to prevent abuse.
- Starter: Mid-market SMB; 5 sources covers firewall + EDR + IAM + app logs + DNS.
- Professional: Mid-market growth; 500M logs/day handles 2K–5K employee company with 50+ alerts/day.
- Enterprise: Large enterprise; unlimited scale + custom integrations.
- Advanced: Managed security service + rule optimization; sold as 1-1 custom with dedicated success manager.

## 22. Entitlements Logic (Pricing Engine)

| Feature / Limit | Free | Starter | Professional | Enterprise | Advanced |
|---|---|---|---|---|---|
| `can("ingest_logs")` | Yes | Yes | Yes | Yes | Yes |
| `can("create_correlation_rule")` | Limit: 5 | Limit: 25 | Limit: 100 | Unlimited | Unlimited |
| `can("use_rule_template")` | Limit: 5 | Limit: 25 | Limit: 50 | Unlimited | Unlimited |
| `can("add_data_source")` | Limit: 2 | Limit: 5 | Limit: 10 | Unlimited | Unlimited |
| `can("view_timeline")` | Yes (30-day) | Yes (30-day) | Yes (90-day) | Yes (1-year) | Yes (unlimited) |
| `can("use_hunting_dashboard")` | No | No | Yes | Yes | Yes |
| `withinDaily("log_ingestion", org)` | 10M logs/day | 100M | 500M | 5B | Unlimited |
| `withinDaily("alert_ingestion", org)` | 100 alerts/day | 500 | 2,000 | 10,000 | Unlimited |
| `can("request_managed_soc")` | No | No | No | Upgrade to Advanced | Yes |

## 23. Limit Behavior

- **Approaching limit:** Alert appears at 80% of daily log limit (e.g., "You've ingested 400M of 500M logs today"). Suggests upgrade path.
- **At limit:** If log volume hits cap, oldest logs are rolled to archive (queryable but not in real-time detection). Alert to customer.
- **Upgrade impact:** Limit resets daily; upgrade takes effect next billing cycle.

## 24. Billing States

| State | Effect on Entitlements | Behavior |
|---|---|---|
| **Trialing (14 days)** | All features enabled (Professional tier) | Converts to Starter on day 15 unless card added. |
| **Active (paid subscription)** | Tier-appropriate features | Full access; alerts as configured. |
| **Past due (30+ days unpaid)** | Downgrade to Starter on day 30; Free on day 60 | Grace period; data retention paused but not deleted. |
| **Canceled** | Downgrade to Free tier | Data retained for 90 days; can restart without re-onboarding. |

## 25. Market Potential

**TAM:** Global mid-market companies with active SOC (500–5,000 employees). **Estimate:** 50,000 companies, $10B market (average $200K/year spent on SIEM/correlation).

**SAM (Serviceable Addressable Market):** Companies in high-security verticals (finance, healthcare, SaaS, tech) + companies with recent breaches. **Estimate:** 15,000 companies, $3B market.

**SOM (Serviceable Obtainable Market, Year 5):** 5% of SAM = 750 companies, $150M ARR. Realistic with product-market fit + free tier activation.

**Market growth:** Breaches increasing 25%/year; log volume growing 50%/year; SIEM market growing 8–10%/year.

## 26. Revenue Potential

**Year 1:** 20 companies (Starter + Professional mix) = $800K ARR.
**Year 2:** 60 companies = $2.5M ARR.
**Year 3:** 150 companies = $6M ARR.
**Year 5:** 400 companies = $18M ARR.

**Expansion revenue:** Managed SOC service (+$50K–$200K per customer annually), rule consulting (+$20K/engagement).

**Unit economics:**
- CAC: $15K (self-serve + community activation; 3-month decision cycle; 40% close rate).
- LTV (3-year retention, $50K avg annual contract): $150K.
- LTV:CAC ratio = 10× (excellent for SaaS).

## 27. Technical Difficulty (Inverted: 5 = Easy/Low-Risk)

**Rating: 2 / 5** (Moderately high difficulty)

**Why not 5:**
- Real-time correlation at scale (500M+ logs/day) is complex. Requires stream processing (Kafka, Flink) + optimized databases.
- Rule engine must be fast (detect patterns within seconds) and expressive (support complex boolean logic). Performance is critical.
- Log parsing from 20+ source formats is brittle (format changes break parsing).
- Threat timeline reconstruction requires sophisticated graph queries + deduplication logic.
- Security alerting has high upside of false positives (customers disable tool if accuracy is bad).

**Why not 1:**
- Core tech is standard (stream processing, rule engines, time-series databases).
- No novel ML required for Phase 1 (statistical anomaly detection exists).
- Log ingestion is a solved problem (Fluentd, Logstash exist).
- Rule engine is conceptually simple (boolean logic evaluated in real-time).

**Risk mitigation:**
- Modular architecture: each data source connector is isolated; format changes don't cascade.
- Rule engine tested against 1,000+ threat patterns pre-launch.
- Performance budget: rule evaluation <100ms per alert; timeline query <1 sec.
- Accuracy testing: run against historical breaches to validate detection rate.

**Scalability:** Stream processing with Kafka + Flink for real-time; PostgreSQL for rule/alert storage; ClickHouse for log analytics. Handles 5B logs/day without rearchitect.

## 28. AI Differentiation

**AI capabilities (Phase 1 & 2):**

1. **Baseline learning (Phase 2):** Learn per-customer normal behavior (typical login IPs, typical file access patterns, typical data volumes). Suppress alerts that match baseline; flag deviations.
2. **Anomaly scoring (Phase 1):** Score each alert on severity and likelihood of being real threat. Use statistical models (isolation forest, one-class SVM) on historical data.
3. **Correlated anomaly detection (Phase 2):** "Brute force + successful login + data exfil pattern within 2 hours = APT score 95%."
4. **Automated playbook execution (Phase 2):** When APT score >80%, auto-execute playbook (isolate host, revoke session, notify IR lead).
5. **Threat hunting recommendations (Phase 2):** "Based on your threat model and industry, you haven't hunted for Lazarus group; recommend these 10 rules."

**Why AI matters:**
- Alert fatigue makes human triage impossible. AI scoring helps analysts prioritize.
- Baseline learning eliminates 50% of false positives (legitimate patterns).
- Correlated anomaly detection finds attacks humans miss (multi-step chains).

**How it's differentiated:**
- Competitors (Splunk, Sentinel) ship alerting on known signatures. SecCorrelate enables customers to build custom correlations + AI learns from their data.
- Most SIEM vendors ignore baseline learning (too hard, requires ML ops). SecCorrelate bakes it in.

## 29. Scalability Plan

- **Log volume:** 5B+ logs/day per customer possible. Handled by stream processing (Kafka + Flink for real-time rule evaluation) + log archive (S3 for historical queries).
- **Concurrency:** 50+ analysts querying simultaneously. Caching + read replicas prevent query pile-up.
- **Multi-tenancy:** Every query scoped by organization_id. Separate Kafka topics per customer (isolation).
- **Growth path:** Shared infrastructure up to 500 customers; then dedicated stream processing per region.

## 30. Build Recommendation

**Verdict: BUILD**

**Biggest reason:** Mid-market security teams have severe, recurring pain (alert fatigue, manual correlation) with no affordable modern solution. Splunk is $500K+; Sentinel locks you into Azure. SecCorrelate's no-code rule engine + automated timeline reconstruction are defensible (hard to copy). Strong unit economics (10× LTV:CAC) support 5-year runway to profitability. TAM is large (50K companies × $200K = $10B) with 25%/year growth.

**Biggest risk:** Security product adoption is slow (long eval cycles, security-first orgs are risk-averse). Need to win 5 design-reference customers by Month 9 (via free beta) to validate correlation accuracy before GA. If detection accuracy is <90%, product is dead-on-arrival. Contingency: Spend first 6 weeks benchmarking against 3 real customer datasets (historical logs from known breaches); validate detection rate before building other features.

**If Build — the one thing that most needs to go right:** Achieve >90% detection accuracy on known threat patterns (brute force, lateral movement, data exfil) in Phase 1. Accuracy is the entire moat. If we ship false-positive-heavy, customers disable tool and abandon. Spend 50% of Phase 1 engineering on accuracy + testing against historical breaches, not new features.

---

## Validation Checklist

- [x] Vision statement is crisp and differentiated.
- [x] Problem is quantified (500 alerts/day, 99% false, 200-day dwell time).
- [x] Target customer has money (mid-market + high-security verticals).
- [x] Business value ties to jobs-to-be-done (reduce triage time, reconstruct timelines, hunt without code).
- [x] Competitors include status quo; honest strengths/weaknesses assigned.
- [x] Market gaps sourced to competitor analysis.
- [x] Positioning differentiates vs. Splunk/Sentinel.
- [x] Feature classification traces musts to pains/JTBD.
- [x] Pricing ties to value (by log volume + data sources).
- [x] AI differentiation specific (baseline learning, anomaly scoring, correlated detection).
- [x] Technical difficulty justified (complex but not impossible; stream processing is solved).
- [x] Build recommendation includes biggest reason, risk, and one critical success factor.

# Product Identity — CodeAudit

## 1. Product Vision

A developer-friendly code quality and security platform that catches vulnerabilities, technical debt, and quality issues in pull requests—giving engineering teams confident deployments and eliminating surprise production incidents.

## 2. Problem Statement

Development teams ship code without visibility into security risks, code quality, or technical debt accumulation. Security scanners (SAST) exist but are slow, noisy, and integrated into CI/CD pipelines that developers don't control. Code reviews catch obvious bugs, but miss architectural debt patterns. By the time developers hear about vulnerabilities, code is in production. Technical debt compounds silently. No team has a single source of truth for code health.

## 3. Root Cause

Security and quality tools are siloed. SAST tools exist but require expensive security expertise to tune (high false positives). Code review processes are manual and inconsistent. Linters are per-language and hard to standardize. No system aggregates signals into a unified health score. Developers have no feedback until code is merged.

## 4. Target Customer

Individual developers and open-source maintainers as the free-tier entry point (bottom-up adoption), expanding to mid-size technology companies (100–1,000 engineers) and growing startups (20–200 engineers) on Starter/Pro once a team formalizes CI/CD scanning, and large orgs (>1,000 engineers) with compliance needs on Enterprise.

## 5. Business Value

- **Incident reduction:** Catch 40–60% of production bugs before deployment.
- **Security velocity:** Find vulnerability classes (SQL injection, XSS, insecure crypto) in seconds, not weeks of manual review.
- **Debt visibility:** Track technical debt accumulation per team; quantify cost of cutting corners.
- **Developer productivity:** Shift-left feedback: errors caught in PR, not production; developers learn patterns from feedback.
- **Confidence to ship:** Teams deploy more frequently (3–5× higher deployment rate) when quality is visible and gated.

**Killer Feature — AI Fix Engine (Pro tier):** Instead of saying "SQL Injection Found," it automatically suggests a production-ready secure patch — turning a finding into a mergeable fix instead of a research task.

## 6. Success Goal

Customers reduce production incidents by 30% and code review time per PR by 50% within 6 months. Developers ship 2–3× more frequently with confidence.

## 7. Acceptance Criteria (MVP)

- [ ] PR-integrated code scanning: Analyze code on PR creation; report issues before merge.
- [ ] Support ≥3 languages: JavaScript/TypeScript, Python, Java/Go (highest-adoption languages).
- [ ] Vulnerability detection: OWASP Top 10 + CWE coverage (SQL injection, XSS, insecure deserialization, weak crypto, etc.).
- [ ] Code quality checks: Complexity, duplication, style, naming conventions.
- [ ] Technical debt tracking: Quantify debt (effort to fix) per issue and per codebase.
- [ ] Unified dashboard: Code health score per repo, per team, per language.
- [ ] Issue triage UI: Browse findings, filter by severity/type, mark false positives, track remediation.
- [ ] Seamless CI/CD integration: Fail PR if high-severity issue found (configurable policy).
- [ ] Role-based access: Developer, Team Lead, Security Manager, Viewer. Team-scoped visibility.
- [ ] Audit logging: Every scan, every issue change.
- [ ] No external integrations required in Phase 1; built but disabled (Slack, email, Jira).

## 8. ICP Definition

Technology companies meeting ALL:
- 100–10,000 engineers.
- Fast-moving development (≥5 deployments/week).
- ≥10 active code repositories.
- Existing security/quality practices (code review, CI/CD).
- Recent incident or near-miss tied to code quality or security.
- Willingness to adopt tool into PR workflow (not a "run-once" product).

## 9. Personas

### Primary: Engineering Lead / Tech Lead
- **Role:** Tech lead, staff engineer, or engineering manager owning code quality.
- **Goal:** Ship fast without breaking production; ensure team writes maintainable code.
- **Pain:** Code reviews take 4 hours/PR; team doesn't follow patterns; no visibility into debt.
- **Power:** Merges code; sets team standards.

### Secondary: Security Engineer / AppSec Lead
- **Role:** Application security engineer, security champion, or CISO.
- **Goal:** Reduce security vulnerabilities, meet compliance requirements (SOC2, PCI).
- **Pain:** Manual security review is slow; developers bypass security checks; no audit trail.
- **Power:** Sets security policy; approves/blocks risky merges.

### Influencer: Developer (IC)
- **Role:** Individual contributor, junior/senior engineer.
- **Goal:** Write good code, learn patterns, ship features fast.
- **Pain:** Code review comments are vague; feedback arrives hours later; learns from mistakes in production.
- **Power:** Uses tool daily; determines adoption success.

## 10. Jobs-to-be-Done

1. **Catch bugs before users see them** — Before I merge code, show me what's wrong (security hole, performance issue, missing edge case) so I can fix it now instead of fielding a production incident.
2. **Learn patterns from feedback** — When my PR gets flagged for a pattern I didn't know was bad, explain WHY it's bad (not just "don't do X") so I improve as an engineer.
3. **Give me confidence to ship** — Let me deploy multiple times per day knowing that basic quality and security gates have been checked automatically.
4. **Stop code reviews from being bottlenecks** — Auto-check for obvious issues (style, complexity, security) so code reviewers focus on architecture/logic, not lint.
5. **Quantify technical debt** — Show me how much debt we've accumulated and which areas are most expensive to maintain, so I can justify refactoring time to leadership.

## 11. Pain Points (Ranked by Severity)

1. **[Critical] Security vulnerabilities found in production, not PR** — SAST tools exist but are slow/noisy. Most teams don't run them. Vulnerabilities slip through.
2. **[Critical] Code review is manual, slow, and inconsistent** — 2–4 hours per PR waiting for review. Reviewers miss issues. Patterns aren't enforced consistently.
3. **[High] No visibility into technical debt** — Debt accumulates silently. By year 2, codebase is slow and hard to change. No one can quantify cost.
4. **[High] Developers learn too late** — Feedback arrives after code is merged or in production. Developer repeats same mistake next sprint.
5. **[High] No unified quality signal** — Five different tools (linter, SAST, code coverage, dependency check, performance profiler) with five dashboards. No single "is this code good?" answer.
6. **[Medium] Teams can't enforce consistent standards** — Each developer uses their own linter config. No way to enforce team standards across repos.
7. **[Medium] Compliance audits are manual** — "Show me all code changes with security implications in Q3" requires manual log review. No audit trail.
8. **[Low] Onboarding new engineers is slow** — New engineers repeat mistakes because they don't know the patterns the team has learned.

## 12. Customer Journey

### Phase 1: Awareness
- **Trigger:** Production incident traced to code quality issue (null pointer, SQL injection, race condition).
- **Action:** Engineering lead searches "code security scanning" or "code quality tools"; sees demo of CodeAudit on PR.
- **Moment:** "We could have caught that in the PR" — aha moment.

### Phase 2: Consideration
- **Trigger:** Tech lead suggests trial on one repository.
- **Action:** Run CodeAudit on last 20 PRs (historical scan); see findings; discuss with team which are real, which are false positives.
- **Moment:** "This would have caught the SQL injection from last month" — validation.

### Phase 3: Activation
- **Trigger:** Budget approved; tool configured in CI/CD.
- **Action:** Integrate CodeAudit into PR workflow. First PR comes through; developer sees 3 findings; fixes 2, marks 1 as false positive.
- **Moment:** "Feedback in seconds, not hours" — adoption moment.

### Phase 4: Habit
- **Trigger:** Team reaches zero high-severity findings.
- **Action:** Developers auto-fix suggestions from CodeAudit; security engineer reviews complex findings.
- **Moment:** First deployment with no code-quality issues. Ship multiple times per day.

### Phase 5: Expansion
- **Trigger:** Adjacent team wants to use CodeAudit; leadership sees code health dashboard.
- **Action:** Configure tool for second team; add coverage requirements for third team.
- **Moment:** Company-wide code health metric becomes part of engineering dashboard.

## 13. Buying Triggers

1. Production incident tied to code quality or security.
2. Failed security audit or compliance review.
3. Code review bottleneck slowing deployment velocity.
4. Technical debt assessment revealed $2M–$5M remediation cost.
5. New security/compliance hire wants modern tooling.
6. Team scaling (hiring engineers) increases quality risk.

## 14. Competitors Considered

| Competitor | Type | Notes |
|---|---|---|
| Manual code review only | Status quo | Default today; no SAST, no linting enforcement, slow, inconsistent. |
| Snyk | Direct | Excellent for dependency vulnerabilities; lacks code-quality focus; limited SAST. |
| SonarQube | Direct | Comprehensive code quality + SAST; powerful but expensive ($50K–$200K/year); slow feedback loop (scan takes 30+ min). |
| GitHub Advanced Security | Substitute | Bundled with GitHub Enterprise; basic SAST; limited customization; tied to GitHub. |
| Checkmarx / Veracode | Direct | Enterprise SAST tools; expensive; slow; require security expertise to tune. |
| Semgrep | Direct | Fast, lightweight SAST; lacks code-quality features; no dashboards. |
| Linters (ESLint, Pylint, etc.) | Substitute | Language-specific; don't catch cross-file issues or architectural patterns. |
| In-house security scripts | Substitute | Some large companies built custom tools; 2–3 year project; high maintenance. |

## 15. Market Gaps

| Gap | Tied to Pain | Why Incumbent Can't Own |
|---|---|---|
| Fast, developer-friendly SAST that doesn't break CI | Pain #1 | SonarQube scans take 30+ min. Developers wait; disable it. CodeAudit: <1 min per PR. Speed = adoption. |
| Unified code quality + security + debt in one dashboard | Pain #5 | SonarQube is quality-focused; Snyk is dependency-focused; GHSA is basic. No one owns the unified signal. |
| Code health scoring that ties to business impact (incident reduction, velocity) | Pain #5 | No vendor exposes "code health" as a quantified metric. CodeAudit: "20-point code health score" translates to "3% incident reduction." |
| Educational feedback (explain WHY, not just flag) | Pain #4 | Linters say "line 42: use `const` instead of `let`." They don't explain why it matters. CodeAudit: "Using `let` can cause closure bugs in loops; use `const` when value doesn't change." |
| Team/org-level debt tracking | Pain #3 | SonarQube tracks technical debt points; not connected to business metrics. No guidance on "which team should refactor which system." |

## 16. Opportunities

| Opportunity | Why Hard to Copy | Attractiveness (1–5) |
|---|---|---|
| Developer education + fix suggestions (explain WHY + HOW) | Requires deep security + quality expertise to write explanations for 500+ issue types; most vendors ship generic rules. | 5 |
| Code health scoring (quantified, business-aligned) | Requires model connecting code metrics to incident/velocity impact; no one has built this; proprietary research. | 5 |
| AI-powered issue triage (auto-classify false positives) | Requires customer feedback data + ML ops; new vendors haven't collected this; data moat. | 4 |
| Architectural debt detection (service coupling, circular dependencies, god objects) | Requires graph analysis + domain expertise; SonarQube doesn't ship this; niche but high-value. | 4 |
| IDE integration (feedback while coding, not on PR) | Most tools are CI/CD-focused. IDE integration requires IDE-specific extensions; high bar for quality. | 3 |

## 17. Positioning Statement

> For **developers and engineering leaders who ship often and need confidence in code quality**, unlike **slow enterprise tools (SonarQube) or point solutions (Snyk)**, CodeAudit provides **unified security + quality scanning, educational feedback, and 60-second PR feedback** so you catch bugs and learn patterns before merge.

## 18. Feature Classification (MoSCoW + Priority)

### Must Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| PR-integrated scanning (JS/TS, Python, Java/Go) | 5 | 5 | 5 | 4 | 1.25 | Pain #1, JTBD #1 |
| Vulnerability detection (OWASP Top 10) | 5 | 5 | 5 | 4 | 1.25 | Pain #1 |
| Code quality checks (complexity, duplication, style) | 5 | 4 | 5 | 3 | 1.33 | Pain #2, #5 |
| Unified code health dashboard | 4 | 4 | 5 | 3 | 1.33 | Pain #5, JTBD #5 |
| Issue triage UI (filter, dismiss, remediate) | 4 | 4 | 5 | 2 | 2.0 | Pain #2 |
| Technical debt quantification | 3 | 5 | 3 | 3 | 1.0 | Pain #3, JTBD #5 |
| CI/CD integration (fail on high-severity) | 5 | 4 | 5 | 2 | 2.0 | JTBD #3 |
| RBAC + audit logging | 5 | 4 | 5 | 2 | 2.0 | Pain #7 |

### Should Have (Phase 1)

| Feature | Reach | Impact | Confidence | Effort | Priority | Ties to |
|---|---|---|---|---|---|---|
| Educational feedback (explain WHY) | 4 | 5 | 3 | 3 | 1.33 | JTBD #2, #4 |
| Auto-fix suggestions | 3 | 4 | 2 | 4 | 0.75 | JTBD #1, #2 |
| Architectural debt detection | 2 | 5 | 2 | 4 | 0.5 | Pain #3, JTBD #5 |
| Team/org-level debt reports | 2 | 4 | 3 | 2 | 1.5 | Pain #3, JTBD #5 |

### Nice to Have (Post-Phase 1)

| Feature | Reason | Ties to |
|---|---|---|
| IDE integration (real-time feedback while coding) | Premium feature; Phase 2 expansion. | Developer productivity |
| AI-powered auto-triage (false positive detection) | Requires customer data; Phase 2. | Efficiency |
| Compliance report generation (SOC2, PCI) | Premium feature; Phase 2. | Revenue expansion |
| Integration with Jira, GitHub Issues (auto-create tickets) | Phase 2 when API stable. | Workflow integration |

### Future / Out of Scope

- Automated code refactoring (too risky; humans should drive refactoring).
- Binary / compiled-code scanning (focus on source code).
- Interactive penetration testing (not in scope).

## 19. Feature Priority Narrative

**Phase 1 mission:** Solve pain #1 (security vulnerabilities in production) and #2 (slow code review) by giving developers fast, trustworthy feedback on PRs.

**Rationale for musts:** PR scanning is the core — without it, tool doesn't integrate into workflow. Vulnerability detection + code quality are table-stakes. Code health dashboard is the "aha" moment (customers see debt quantified). Issue triage UI is how developers interact daily. Technical debt quantification ties to JTBD #5 (justify refactoring to leadership). CI/CD integration gates bad code. RBAC + audit logging are non-negotiable for compliance.

**Rationale for shoulds:** Educational feedback is high-impact (developers learn) but requires domain expertise to write. Auto-fix suggestions are valuable but require language-specific knowledge. Architectural debt detection is Phase 1 stretch goal; complex graph analysis. Team-level reports are important for scaling but secondary to individual PR feedback.

**Rationale for nice-to-haves:** IDE integration is premium feature (developers want real-time feedback, but PR feedback is sufficient for Phase 1). AI auto-triage requires customer data (Phase 2). Compliance reports are Phase 2 revenue play.

## 20. Pricing Strategy

**Principle:** Pure product-led growth, no credit card at signup. Individual developers and open-source maintainers get real value for free (not a crippled demo), which drives bottom-up adoption inside companies. Price per-developer/month once a team needs private repos at scale, CI/CD integration, or team-wide dashboards — the natural point where an individual tool becomes a team system of record for code health.

**Model:** Subscription SaaS, per-developer monthly billing (annual discount available), four-tier pricing ladder (Free → Starter → Pro → Enterprise).

## 21. Pricing Tiers & Entitlements

| | Free (No Card) | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **Price** | $0 | $19/developer/month | $49/developer/month | Custom |
| **Target** | Individual developers, OSS maintainers | Small teams formalizing CI | Teams scaling security + quality | Large orgs, compliance-driven |
| **Developers** | 1 | Per-seat | Per-seat | Per-seat, volume pricing |
| **Private Repositories** | 1 | 10 | Unlimited | Unlimited |
| **Public Repositories** | 3 | Unlimited | Unlimited | Unlimited |
| **Files Scanned / Month** | 500 | 5,000 | Unlimited | Unlimited |
| **PR Scans / Month** | 20 | 300 | Unlimited | Unlimited |
| **AI Code Review** | Basic | Basic + AI Explanations | AI Refactoring + AI Fix Suggestions | AI Refactoring + Fix + Dedicated AI |
| **OWASP Top 10 Detection** | Yes | Yes | Yes | Yes + custom rules |
| **Secret Detection** | — | — | Yes | Yes |
| **Dependency Scan** | — | — | Yes | Yes |
| **Container Scan** | — | — | Yes | Yes |
| **Security / Quality Score** | Yes | Yes | Yes | Yes |
| **Custom Rules** | — | — | Yes | Yes + compliance rule packs |
| **Team Dashboard** | — | — | Yes | Yes + multi-org |
| **API Access** | — | — | Yes | Yes |
| **Integrations** | — | GitHub, GitLab, Bitbucket, Jira | + Slack Alerts | + custom |
| **CI/CD** | No | Yes | Yes | Yes |
| **Reports** | Email report | Weekly reports | Weekly + team reports | Custom + compliance reports |
| **Support** | Community | Email | Priority email | Dedicated + premium support |
| **Compliance & Enterprise** | — | — | — | SSO, SCIM, audit logs, compliance, private deployment, SLA |

**Rationale:**
- Free (no card): 1 developer, 1 private + 3 public repos, 500 files / 20 PR scans monthly — genuinely useful for an individual or small OSS project, which is what drives viral, bottom-up adoption. No API/team/CI-CD keeps it individual-scoped.
- Starter ($19/dev/mo): Unlocks the CI/CD integrations (GitHub/GitLab/Bitbucket) and Jira — the point where a team formalizes code review in their pipeline.
- Pro ($49/dev/mo): Unlocks the AI Fix Engine (killer feature), secret/dependency/container scanning, custom rules, and team dashboard — this is where CodeAudit becomes the team's security + quality system of record, and where most revenue concentrates.
- Enterprise (Custom): SSO/SCIM/compliance/private deployment for orgs with procurement and regulatory requirements; sold directly.

## 22. Entitlements Logic (Pricing Engine)

| Feature / Limit | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| `can("scan_pr")` | Yes | Yes | Yes | Yes |
| `withinLimit("private_repos", org)` | 1 | 10 | Unlimited | Unlimited |
| `withinLimit("public_repos", org)` | 3 | Unlimited | Unlimited | Unlimited |
| `withinMonthly("files_scanned", org)` | 500 | 5,000 | Unlimited | Unlimited |
| `withinMonthly("pr_scans", org)` | 20 | 300 | Unlimited | Unlimited |
| `can("use_ci_cd")` | No | Yes | Yes | Yes |
| `can("use_ai_explanations")` | No | Yes | Yes | Yes |
| `can("use_ai_fix_engine")` | No | No | Yes | Yes |
| `can("use_secret_detection")` | No | No | Yes | Yes |
| `can("use_dependency_scan")` | No | No | Yes | Yes |
| `can("use_container_scan")` | No | No | Yes | Yes |
| `can("use_custom_rules")` | No | No | Yes | Yes |
| `can("view_team_dashboard")` | No | No | Yes | Yes (multi-org) |
| `can("use_api")` | No | No | Yes | Yes |
| `can("use_sso")` / `can("use_scim")` | No | No | No | Yes |

## 23. Limit Behavior

- **Approaching limit:** Banner at 80% of monthly file-scan or PR-scan limit (e.g., "You've scanned 400 of 500 files this month"). Suggests upgrade.
- **At limit:** New PR scans are queued (not silently skipped); merge is not auto-blocked on a queued scan. Popup offers upgrade with a per-developer cost calculator.
- **Upgrade impact:** Limit increases immediately on upgrade; monthly per-seat billing prorates the first cycle.

## 24. Billing States

| State | Effect on Entitlements | Behavior |
|---|---|---|
| **Trialing (14 days, Pro features)** | Full Pro features enabled | Auto-downgrades to Free (capped) unless card added. |
| **Active (paid subscription)** | Tier-appropriate features, billed per developer seat | Full access; scanning runs as configured. |
| **Past due (7+ days unpaid)** | Read-only scan history; no new scans | Grace period for card retry; scan history preserved. |
| **Canceled** | Downgrade to Free tier limits | Historical data retained 90 days; can restart without re-onboarding. |

## 25. Market Potential

**TAM:** Global software development teams with >5 engineers. **Estimate:** 500,000 companies, $25B market (average $50K/year spent on dev tools).

**SAM (Serviceable Addressable Market):** Mid-size + enterprise tech companies (100–10,000 engineers). **Estimate:** 50,000 companies, $5B market.

**SOM (Serviceable Obtainable Market, Year 5):** 2% of SAM = 1,000 companies, $200M ARR. Conservative but realistic with freemium model + viral adoption.

**Market growth:** Developer tool spending growing 15–20%/year; code quality + security tools growing 25%+ annually.

## 26. Revenue Potential

**PLG funnel assumption:** Free signups (individual developers, no card) → team adoption inside a company → 1+ seats convert to Starter/Pro once the team needs private-repo scale or CI/CD → Enterprise sourced from Pro accounts hitting org-wide/compliance needs.

**Year 1:** 40,000 free developer signups → 3,000 paid seats (60% Starter $19, 40% Pro $49; blended ~$31/seat/mo) + 15 Enterprise accounts ($40K avg annual) = ~$1.1M ARR seats + $600K ARR Enterprise = **~$1.7M ARR**.
**Year 2:** 150,000 signups → 12,000 paid seats + 50 Enterprise = **$6.5M ARR**.
**Year 3:** 400,000 signups → 32,000 paid seats + 130 Enterprise = **$17M ARR**.
**Year 5:** 1.2M signups → 90,000 paid seats + 350 Enterprise = **$48M ARR**.

**Expansion revenue:** Starter → Pro upgrade (35% of Starter seats within 12 months as teams add secret/dependency scanning), enterprise custom rule packs (+$20K–$100K/org/year), consulting on code health (+$50K/engagement).

**Unit economics:**
- CAC (self-serve, per-seat): ~$60 (pure viral/OSS-driven; near-zero paid acquisition cost).
- CAC (Enterprise, sales-assisted): ~$10K (outbound + 4-month cycle; 30% close rate).
- LTV (self-serve seat, 3-year retention, $31/mo blended avg): ~$1,116.
- LTV (Enterprise, 4-year retention, $40K/year): ~$160K.
- Blended LTV:CAC ratio: ~18–20× (viral free tier keeps self-serve CAC near zero; Enterprise adds ACV depth) — still exceptional for SaaS.

## 27. Technical Difficulty (Inverted: 5 = Easy/Low-Risk)

**Rating: 3 / 5** (Moderate difficulty)

**Why not 5:**
- Language-specific SAST is complex. Each language (JavaScript, Python, Java, Go) requires different parsers and rules. Shipping 3 languages in Phase 1 is ambitious.
- False positive rates are high for SAST. Security + quality logic must be carefully tuned. Customers will disable tool if accuracy is poor.
- PR integration requires webhooks + GitHub/GitLab/Bitbucket APIs. Each platform has quirks.
- Performance is critical (scan must complete <1 min per PR, or developers disable it).

**Why not 1:**
- Core SAST engines are open-source (e.g., Semgrep, gosec). Can build on proven foundations.
- Code parsing is a solved problem (AST libraries exist for all major languages).
- Rule engines are standard (boolean logic evaluated against AST).
- PR/CI integration is standard (GitHub Actions, GitLab CI, etc. are well-documented).

**Risk mitigation:**
- Start with 3 highest-adoption languages (JS/TS, Python, Java/Go); add Ruby/PHP/C# in Phase 2.
- Curate rule set from OWASP + CWE to minimize false positives. Test against 10K+ open-source repos.
- Performance architecture: stateless scanners, caching, incremental scanning (only scan changed files, not whole repo).
- Accuracy target: >85% precision (low false positives), >60% recall (catch most issues).

**Scalability:** Distributed scanning (workers per language), caching layer, result aggregation. Handles 500+ companies × 20 repos × 50 PRs/day without rearchitect.

## 28. AI Differentiation

**AI capabilities (Phase 1 & 2):**

1. **Smart false-positive detection (Phase 2):** Learn from user feedback (developer marks "false positive" on 1,000 findings); suppress similar findings.
2. **Educational feedback (Phase 1):** For each issue, provide explanation (WHY it's bad, business impact, how to fix).
3. **Risk scoring (Phase 1):** Score each finding 1–10 based on severity, likelihood, and context (e.g., password in logs = high risk; unused variable = low).
4. **Prioritization (Phase 2):** "Top 3 issues to fix this sprint" based on impact + effort.
5. **Auto-fix suggestions (Phase 1):** For simple issues (style, unused variables), suggest fix (may be auto-applied with developer approval).
6. **Architectural pattern detection (Phase 2):** Identify anti-patterns (circular dependencies, god objects, overfitting) that don't require explicit rules.

**Why AI matters:**
- SAST tools ship rules, not guidance. Developers don't know WHY something is bad; ignore the warning.
- False positives destroy adoption. Manual review of every finding is labor-intensive.
- Auto-fix suggestions save developer time (don't manually fix every style issue).

**How it's differentiated:**
- SonarQube ships rules without deep explanation (machine-readable descriptions).
- Snyk is dependency-focused; CodeAudit is source-focused + AI-guided.
- No competitor ships educational feedback + auto-fix + risk scoring in one platform.

## 29. Scalability Plan

- **Scan volume:** 10,000 scans/day per customer (e.g., 100 engineers × 100 PRs/day). Handled by distributed scanning workers + caching.
- **Codebase size:** Up to 10M LOC per repository. Handled by incremental scanning (only changed files) + caching.
- **Concurrency:** 50+ concurrent PRs scanned simultaneously. Queue-based architecture prevents bottlenecks.
- **Multi-tenancy:** Every scan scoped by organization_id at database level. Separate worker pools per customer if needed.
- **Growth path:** Shared infrastructure up to 1,000 customers; then dedicated workers per region.

## 30. Build Recommendation

**Verdict: BUILD**

**Biggest reason:** Developers ship code every day and lack real-time quality/security feedback. Enterprise tools (SonarQube) are slow and expensive; developers don't use them. Gap exists for fast, affordable, developer-friendly scanning. Strong unit economics (19× LTV:CAC) support 5-year profitability. Large TAM (500K companies) with 20%+ annual growth. Freemium model drives viral adoption — every free tier customer is a potential enterprise expansion deal.

**Biggest risk:** Language-specific SAST is hard. Shipping 3 languages in Phase 1 is risky; each language requires expertise. If scanning accuracy is poor (>30% false positives), developers disable tool and abandon. Contingency: Spend first 4 weeks benchmarking SAST accuracy on public codebases (GitHub top repos); validate >85% precision + >60% recall before shipping Phase 1. If accuracy target can't be met, pivot to code-quality-only MVP (no SAST) and add security in Phase 2.

**If Build — the one thing that most needs to go right:** Achieve >85% precision (false positives) on OWASP Top 10 vulnerability classes by Phase 1 launch. Accuracy is the entire moat. If developers see 50+ false positives per PR, they disable CodeAudit immediately. Spend 50% of Phase 1 engineering on accuracy (testing against 10K+ public repositories, iterating on rules, gathering customer feedback on real codebases) vs. new features. Ship a smaller, high-confidence feature set than a large, noisy feature set.

---

## Validation Checklist

- [x] Vision is crisp and developer-centric.
- [x] Problem is quantified (security in production, slow code review, silent debt).
- [x] Target customer has velocity + security pressure (100–1,000 engineers, 5+ deployments/week).
- [x] Business value ties to jobs-to-be-done (catch bugs, learn patterns, ship fast).
- [x] Competitors include status quo (manual review); honest strengths/weaknesses assigned.
- [x] Market gaps sourced to competitor analysis.
- [x] Positioning differentiates vs. SonarQube (speed, developer experience).
- [x] Feature classification traces musts to pains/JTBD.
- [x] Pricing ties to value (by developer count + scan volume).
- [x] AI differentiation specific (false-positive detection, educational feedback, risk scoring, auto-fix).
- [x] Technical difficulty justified (3/5 — hard language SAST, but proven tech stack).
- [x] Build recommendation includes biggest reason, risk, and one critical success factor.

# Venture Evidence Log — B2B SaaS Opportunity Research
**Method:** WebSearch (AI-summarized web results, NOT raw platform API scraping). Every item below is a real citation with a real URL returned by the tool. No fabricated data. `/last30days` engine's Reddit/GitHub/HN direct-API sources are network-blocked in this sandbox and could not be used — see limitations note at bottom.

**Started:** 2026-07-13

---

## PHASE 1 — BROAD SWEEP

### Category: Security tool sprawl
- Query returned no specific citable Reddit threads. **REJECTED for lack of evidence** (search engine indexing gap, not proof of absence — flagged as unverified, not used).

### Category: CRM (Salesforce/HubSpot)
- Source: pedowitzgroup.com (consulting firm blog) — "couldn't justify the $80,000 to $150,000/year in admin costs alone" for Salesforce; consulting firm has completed 100+ Salesforce→HubSpot migrations for mid-market B2B.
- Source: multiple pricing-comparison sites — HubSpot Marketing Hub Professional starts at $890/mo + mandatory $3,000 onboarding fee + 12-month commitment; "essential features locked behind expensive tiers."
- Pattern: **High implementation/consultant cost complaints, not tool-quality complaints.** Market already has entrenched incumbents (Salesforce, HubSpot) plus active migration-consulting ecosystem. Saturated.

### Category: HR software (SMB)
- Source: aggregated small-business software commentary — "Most small businesses use 4-5 different software subscriptions for HR, payroll, finance, CRM" — subscription fragmentation confirmed but generic, not attributed to a specific complaint thread.
- "HR teams using legacy systems spend up to 40% of their time on administrative tasks" — uncited claim in a vendor-adjacent source, weak provenance.
- **Weak evidence** — mostly vendor-comparison content, not primary complaint sources.

### Category: SOC 2 / GRC compliance
- Confirmed: manual SOC 2 prep = "hundreds of hours of manual screenshots, spreadsheet tracking, evidence organization."
- Confirmed: GRC platforms (Vanta/Drata/Secureframe-class) already charge **$12,000–$30,000/year** — i.e., this problem is **already solved and monetized** by well-funded incumbents (Drata, Secureframe, Vanta, Sprinto all appeared in results).
- **VERDICT: Market saturated, dominant winners exist. Not a gap.**

### Category: B2B lead-gen / sales intelligence tool fragmentation
- Source: origami.chat blog — r/B2BSaaS thread, 400+ upvotes, "How are you actually generating leads right now?"
- Confirmed pattern: founders use LinkedIn Sales Navigator to search/browse, then switch to ZoomInfo to pull contact info, "because neither tool does both well" — genuine tool-switching workflow complaint.
- Source: datalane.com, clay.com — "sales teams still hop between four tabs just to build a single prospect list."
- ZoomInfo: credit-based pricing, "most teams report spending at least $15,000/year to get started" — pricing complaint.
- Clay: "not designed for non-technical users," "many teams use Clay for enrichment then hand off lists to Outreach/Salesloft" — confirms 3+ tool stacking (Clay + Outreach/Salesloft + LinkedIn Sales Nav/ZoomInfo).
- **VERDICT: Real, recurring, recent (2026) evidence of 3-tool-minimum stacking with real pricing pain. BUT already crowded with well-funded entrants (Clay, Apollo, Origami, Artisan all cited as competitors in the same results) — market is being actively contested, not a whitespace.**

### Category: Construction management (Procore)
- Direct quote (softwarefinder.com review aggregation): "Price is way too high. For small companies like ours its a huge expense."
- Confirmed: Procore pricing $4,500–$55,000+/year, opaque custom-quote model, "no free trial or public price calculator."
- Direct quote: "ProCore is MUCH more expensive than BuilderTrend and the pricing model... makes it too expensive for small sub-contractors."
- "Sledgehammer for smaller projects... pain to onboard new subcontractors without training."
- **VERDICT: Real, recurring, well-documented pricing/complexity complaint specifically for the SMB/subcontractor segment. Competitors already exist for this exact segment (BuilderTrend named directly as the cheaper alternative) — meaning the gap is narrower than it looks; BuilderTrend, Jobber-adjacent players already serve small contractors.**

### Category: Medical/EHR (small clinic)
- Confirmed complaint: EHR billing-team "holding onto claims... not following up" (small practice pain).
- Confirmed: Practice Fusion — "frequent technical glitches, crashes, slow performance... system under-coding diagnoses, forcing manual billing code edits."
- Confirmed: "gap between systems with genuine US-based phone support and those routing everything through chatbots... difference between a 10-minute fix and a lost clinic morning" for practices with no IT staff.
- Confirmed general EHR complaint: click-fatigue, "physicians spend more time interacting with computer screens than with patients."
- **VERDICT: Real, recurring pain, but EHR is one of the most heavily regulated, most heavily incumbent-occupied categories in software (Epic, Cerner, athenahealth, Practice Fusion, Tebra, RXNT, etc.) — extremely high regulatory/switching-cost moat for incumbents, high sales-cycle risk for a new entrant.**

### Category: Legal contract management (small firm)
- Confirmed: "If you are signing more than 10 contracts a month, you have likely felt the pain of a manual workflow."
- Confirmed: "switching between Word files, emails, and PDFs... agreements slip through the cracks; approvals stall, post-signature obligations go unmonitored until something goes wrong."
- Confirmed pricing gap: enterprise CLM "starting at roughly $30,000/year and often exceeding $100,000... out of reach for most small and mid-market teams."
- **VERDICT: Real, recurring pain AND a real pricing gap between "free/manual" and "$30K+ enterprise." This is a genuine underserved middle. Worth Phase 3 deep-dive.**

### Category: Field service (HVAC/plumbing — ServiceTitan)
- Direct quote: "The product is complicated, which means you need help regularly, but their product support is TERRIBLE."
- Direct quote: "Office personnel cannot create an invoice without creating a dispatch under a technician" — workflow rigidity complaint.
- Confirmed: ServiceTitan base subscription excludes key features — Marketing Pro (~$2,000+/mo), Dispatch Pro, Fleet Pro, Phones Pro, Pricebook Pro all separate paid add-ons. $245-598/tech/month + $5K-50K setup + 12-month commitment.
- Confirmed: "built for enterprise... smaller teams struggle to extract value," ideal fit is "10+ techs... dedicated office staff who can absorb 6-month implementation."
- **VERDICT: Strong, specific, recurring complaint pattern (add-on pricing, workflow rigidity, poor support) + an explicit stated underserved segment (sub-10-tech shops). BUT Jobber and Housecall Pro already explicitly compete for that smaller segment (named in results) — again narrower gap than headline suggests.**

---

## PRELIMINARY PATTERN (Phase 1, in progress)

Every category searched so far shares the same shape: **real, recurring, well-documented pain exists, but every category already has at least one funded incumbent explicitly targeting the underserved sub-segment** (BuilderTrend for small construction, Jobber/Housecall Pro for small field service, Clay/Apollo for lead-gen fragmentation, Drata/Vanta/Secureframe for compliance). This matters directly for the "why hasn't a dominant winner solved it" test in the brief — so far the honest answer in most categories is "someone already has, or is actively trying."

Continuing sweep before drawing conclusions — 5 categories is not enough to rank with confidence.

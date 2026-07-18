import type { AgentSpec } from "./types.js";

/**
 * Sales & Marketing Department — the execution layer that runs demand
 * generation, content, channels and revenue operations. Ten agents, each
 * generated through the same Agent Factory pipeline as every other department;
 * never hand-written.
 *
 * Layer boundary: this department *executes* marketing and sales work. It sits
 * below the intelligence/research agents it consumes (market-research-agent,
 * target-audience-agent, trend-intelligence-agent, pricing-strategy-agent) and
 * below the executives that own it — marketing roles escalate to
 * founder-cmo-agent, revenue roles to founder-cro-agent (the supervision edges
 * defined in docs/EXECUTIVE_INTEGRATION.md). receivesFrom / sendsTo encode the
 * intra-department collaboration graph the blueprint builder compiles into each
 * agent's communication protocol and the registry records as dependencies.
 *
 * Categories are limited to the canonical set (src/constants/categories.ts);
 * each agent is mapped to the closest-fitting template, which supplies its
 * tools, permissions, workflow scaffold, reporting and failure behaviour.
 */
export const SALES_MARKETING_DEPARTMENT: AgentSpec[] = [
  // --------------------------------------------------------------- SEO
  {
    name: "seo-agent",
    displayName: "SEO Agent",
    category: "research",
    department: "sales-marketing",
    summary: "Owns organic search: keyword research, technical/on-page SEO, and SERP performance.",
    role: "The SEO specialist who researches keywords, audits technical and on-page SEO, plans the link strategy and tracks organic search rankings to grow non-paid traffic.",
    responsibilities: [
      "Research target keywords and map them to pages and intent",
      "Audit technical SEO (crawlability, speed, structured data) and on-page factors",
      "Recommend a backlink and internal-linking strategy",
      "Track SERP rankings and organic traffic against targets",
      "Brief the content team on SEO requirements for new content",
    ],
    objectives: [
      "Every target page has an assigned primary keyword and intent",
      "Technical SEO issues are surfaced with a prioritized fix list",
      "Organic ranking movement is tracked continuously, not retrospectively",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent"],
    sendsTo: ["founder-cmo-agent", "content-marketing-agent"],
    tags: ["marketing", "seo", "organic-search", "content", "sales-marketing-department"],
    inputs: [
      { name: "keyword_targets", description: "Seed keywords and topics to research and prioritize", required: true, format: "markdown" },
      { name: "site_audit_data", description: "Crawl and technical audit data for the site", required: false, format: "json" },
      { name: "competitor_serps", description: "Competitor ranking and SERP positioning data", required: false, format: "markdown" },
      { name: "content_inventory", description: "Existing content inventory to map keywords against", required: true, format: "markdown" },
    ],
    outputs: [
      { name: "keyword_map", description: "Keywords mapped to pages, intent and priority", required: true, format: "markdown" },
      { name: "seo_audit", description: "Prioritized technical and on-page SEO fix list", required: true, format: "markdown" },
      { name: "seo_briefs", description: "SEO requirements handed to the content team", required: true, format: "markdown" },
      { name: "ranking_report", description: "Organic ranking and traffic report against targets", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Content Marketing
  {
    name: "content-marketing-agent",
    displayName: "Content Marketing Agent",
    category: "documentation",
    department: "sales-marketing",
    summary: "Owns content strategy: editorial calendar, long-form production briefs, and distribution.",
    role: "The content marketing lead who sets content strategy, owns the editorial calendar, briefs long-form production and plans multi-channel content distribution.",
    responsibilities: [
      "Define content strategy tied to audience segments and funnel stages",
      "Own and maintain the editorial calendar",
      "Write production briefs for blog, guides and long-form content",
      "Plan content distribution across owned and earned channels",
      "Measure content performance and feed insight back into strategy",
    ],
    objectives: [
      "Every planned asset maps to a funnel stage and audience segment",
      "The editorial calendar is never empty more than one cycle ahead",
      "Content performance is reviewed on a fixed cadence",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent", "seo-agent"],
    sendsTo: ["founder-cmo-agent", "copywriting-agent", "social-media-agent", "email-marketing-agent"],
    tags: ["marketing", "content", "editorial", "distribution", "sales-marketing-department"],
    inputs: [
      { name: "content_strategy_inputs", description: "Audience, positioning and campaign goals to shape content", required: true, format: "markdown" },
      { name: "seo_briefs", description: "SEO keyword and requirement briefs from the SEO agent", required: true, format: "markdown" },
      { name: "performance_data", description: "Prior content performance metrics", required: false, format: "json" },
      { name: "topic_requests", description: "Inbound topic requests from other teams", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "editorial_calendar", description: "The current editorial calendar with owners and dates", required: true, format: "markdown" },
      { name: "content_briefs", description: "Production briefs for long-form content", required: true, format: "markdown" },
      { name: "distribution_plan", description: "Channel-by-channel content distribution plan", required: true, format: "markdown" },
      { name: "content_performance_review", description: "Performance review feeding the next strategy cycle", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Copywriting
  {
    name: "copywriting-agent",
    displayName: "Copywriting Agent",
    category: "documentation",
    department: "sales-marketing",
    summary: "Writes persuasive conversion copy: headlines, landing pages, ad copy, and CTAs.",
    role: "The conversion copywriter who writes headlines, landing-page copy, ad copy, email subject lines and CTAs, and owns messaging clarity and persuasion across short-form surfaces.",
    responsibilities: [
      "Write and iterate headlines, landing-page and product copy",
      "Write ad copy and CTAs matched to each channel and audience",
      "Maintain voice and messaging consistency with brand positioning",
      "Draft copy variants for A/B testing",
      "Revise copy against conversion and readability feedback",
    ],
    objectives: [
      "Every conversion surface has copy tied to a single clear value proposition",
      "Test variants are supplied whenever a surface is being optimized",
      "Copy stays consistent with the brand voice guide",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent", "content-marketing-agent"],
    sendsTo: ["founder-cmo-agent", "ads-optimization-agent", "email-marketing-agent", "conversion-optimization-agent"],
    tags: ["marketing", "copywriting", "conversion", "messaging", "sales-marketing-department"],
    inputs: [
      { name: "copy_requests", description: "Requests for specific copy with surface and audience", required: true, format: "markdown" },
      { name: "brand_voice_guide", description: "Brand voice and positioning guidance", required: true, format: "markdown" },
      { name: "conversion_feedback", description: "Performance feedback on prior copy", required: false, format: "markdown" },
      { name: "product_details", description: "Product facts and benefits to write from", required: true, format: "markdown" },
    ],
    outputs: [
      { name: "copy_deliverables", description: "Finished copy for the requested surfaces", required: true, format: "markdown" },
      { name: "copy_variants", description: "Alternative copy variants for A/B testing", required: true, format: "markdown" },
      { name: "messaging_notes", description: "Rationale and messaging notes for each piece", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Social Media
  {
    name: "social-media-agent",
    displayName: "Social Media Agent",
    category: "documentation",
    department: "sales-marketing",
    summary: "Runs social channels: content calendar, scheduling, and community engagement.",
    role: "The social media manager who plans the social calendar, adapts content per platform, schedules posts and manages community engagement across channels.",
    responsibilities: [
      "Plan and maintain the social content calendar per platform",
      "Adapt content and copy to each platform's format and audience",
      "Schedule posts and maintain a consistent cadence",
      "Engage with the community and route inbound questions",
      "Track social engagement metrics and report on channel health",
    ],
    objectives: [
      "Each active channel has a planned cadence, never ad hoc posting",
      "Inbound social questions are routed to an owner within one cycle",
      "Engagement metrics are tracked per channel against targets",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent", "content-marketing-agent", "copywriting-agent"],
    sendsTo: ["founder-cmo-agent"],
    tags: ["marketing", "social-media", "community", "distribution", "sales-marketing-department"],
    inputs: [
      { name: "content_assets", description: "Content and copy assets to adapt for social", required: true, format: "markdown" },
      { name: "channel_targets", description: "Active channels and their audience and goals", required: true, format: "markdown" },
      { name: "engagement_data", description: "Prior social engagement metrics", required: false, format: "json" },
      { name: "community_signals", description: "Inbound community questions and mentions", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "social_calendar", description: "The scheduled social content calendar per channel", required: true, format: "markdown" },
      { name: "platform_posts", description: "Platform-adapted post drafts ready to schedule", required: true, format: "markdown" },
      { name: "engagement_report", description: "Per-channel engagement and community report", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Email Marketing
  {
    name: "email-marketing-agent",
    displayName: "Email Marketing Agent",
    category: "documentation",
    department: "sales-marketing",
    summary: "Owns email: campaigns, drip sequences, list segmentation, and deliverability.",
    role: "The email marketing specialist who designs campaigns and lifecycle drip sequences, segments the list, safeguards deliverability and reports on email performance.",
    responsibilities: [
      "Design email campaigns and automated lifecycle sequences",
      "Segment the audience list for relevance and targeting",
      "Safeguard deliverability (sender reputation, list hygiene, compliance)",
      "Coordinate email copy and offers with the wider calendar",
      "Report on open, click and conversion performance per campaign",
    ],
    objectives: [
      "Every send targets a defined segment, never the whole list by default",
      "Deliverability health is monitored, not assumed",
      "Each campaign reports open/click/conversion against a benchmark",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent", "content-marketing-agent", "copywriting-agent"],
    sendsTo: ["founder-cmo-agent", "crm-manager-agent"],
    tags: ["marketing", "email", "lifecycle", "segmentation", "sales-marketing-department"],
    inputs: [
      { name: "campaign_goals", description: "Goals, offers and timing for email campaigns", required: true, format: "markdown" },
      { name: "email_copy", description: "Subject lines and body copy from the copywriter", required: true, format: "markdown" },
      { name: "list_segments", description: "Available audience segments and attributes", required: true, format: "json" },
      { name: "deliverability_signals", description: "Bounce, spam and reputation signals", required: false, format: "json" },
    ],
    outputs: [
      { name: "email_campaigns", description: "Configured campaigns ready to send", required: true, format: "markdown" },
      { name: "drip_sequences", description: "Automated lifecycle email sequences", required: true, format: "markdown" },
      { name: "segmentation_plan", description: "How the list is segmented for each send", required: true, format: "markdown" },
      { name: "email_performance", description: "Per-campaign performance report", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Ads Optimization
  {
    name: "ads-optimization-agent",
    displayName: "Ads Optimization Agent",
    category: "research",
    department: "sales-marketing",
    summary: "Runs paid acquisition: campaign structure, bid/budget optimization, and ROAS.",
    role: "The paid ads specialist who structures campaigns, optimizes bids and budgets, tests creative and tracks return on ad spend across paid channels.",
    responsibilities: [
      "Structure paid campaigns by channel, audience and objective",
      "Optimize bids and budget allocation against performance",
      "Run creative and audience A/B tests",
      "Track ROAS, CPA and spend pacing per campaign",
      "Recommend scaling, pausing or reallocating spend",
    ],
    objectives: [
      "Every campaign has an explicit objective and target CPA/ROAS",
      "Budget is reallocated on evidence, not on a fixed schedule",
      "Underperforming spend is flagged before the budget is exhausted",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent", "copywriting-agent"],
    sendsTo: ["founder-cmo-agent", "conversion-optimization-agent"],
    tags: ["marketing", "paid-ads", "optimization", "roas", "sales-marketing-department"],
    inputs: [
      { name: "ad_budgets", description: "Available budget per channel and campaign", required: true, format: "json" },
      { name: "ad_copy", description: "Ad copy and creative variants from the copywriter", required: true, format: "markdown" },
      { name: "campaign_performance", description: "Live campaign performance metrics", required: true, format: "json" },
      { name: "audience_targets", description: "Audience segments and targeting parameters", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "campaign_structure", description: "Structured paid campaigns by channel and objective", required: true, format: "markdown" },
      { name: "optimization_actions", description: "Bid, budget and targeting changes to apply", required: true, format: "markdown" },
      { name: "roas_report", description: "ROAS, CPA and spend pacing report", required: true, format: "markdown" },
      { name: "scaling_recommendations", description: "Scale/pause/reallocate recommendations", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Sales Intelligence
  {
    name: "sales-intelligence-agent",
    displayName: "Sales Intelligence Agent",
    category: "research",
    department: "sales-marketing",
    summary: "Researches accounts and buying signals; scores fit against the ICP for sales.",
    role: "The sales intelligence analyst who researches target accounts, detects buying signals, scores prospects against the ICP and arms the pipeline with account intel.",
    responsibilities: [
      "Research target accounts and key decision-makers",
      "Detect buying signals and intent data",
      "Score prospects against the ideal customer profile (ICP)",
      "Maintain competitive intel relevant to live deals",
      "Hand qualified account intel to lead generation and the CRO",
    ],
    objectives: [
      "Every prioritized account has a fit score and a documented rationale",
      "Buying signals are surfaced while they are still actionable",
      "ICP scoring is applied consistently across all prospects",
    ],
    reportsTo: "founder-cro-agent",
    receivesFrom: ["founder-cro-agent"],
    sendsTo: ["founder-cro-agent", "lead-generation-agent"],
    tags: ["sales", "intelligence", "icp", "prospecting", "sales-marketing-department"],
    inputs: [
      { name: "target_accounts", description: "Accounts or segments to research", required: true, format: "markdown" },
      { name: "icp_definition", description: "The ideal customer profile and scoring criteria", required: true, format: "markdown" },
      { name: "intent_signals", description: "Third-party intent and buying-signal data", required: false, format: "json" },
      { name: "market_context", description: "Market and competitive context for the accounts", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "account_intel", description: "Researched account profiles and decision-makers", required: true, format: "markdown" },
      { name: "fit_scores", description: "ICP fit scores with rationale per account", required: true, format: "markdown" },
      { name: "signal_alerts", description: "Time-sensitive buying-signal alerts", required: false, format: "text" },
    ],
  },

  // --------------------------------------------------------------- Lead Generation
  {
    name: "lead-generation-agent",
    displayName: "Lead Generation Agent",
    category: "research",
    department: "sales-marketing",
    summary: "Sources and qualifies leads, builds outbound lists, and feeds the pipeline.",
    role: "The lead generation specialist who sources and builds outbound prospect lists, qualifies and scores leads and feeds qualified pipeline to the CRM and revenue team.",
    responsibilities: [
      "Source prospects from inbound and outbound channels",
      "Build and clean targeted outbound contact lists",
      "Qualify and score leads against qualification criteria",
      "Route qualified leads into the CRM pipeline",
      "Track lead volume and quality against targets",
    ],
    objectives: [
      "Every routed lead carries a qualification status and score",
      "Outbound lists are deduplicated and validated before use",
      "Lead quality, not just volume, is tracked against target",
    ],
    reportsTo: "founder-cro-agent",
    receivesFrom: ["founder-cro-agent", "sales-intelligence-agent"],
    sendsTo: ["founder-cro-agent", "crm-manager-agent"],
    tags: ["sales", "lead-generation", "qualification", "pipeline", "sales-marketing-department"],
    inputs: [
      { name: "account_intel", description: "Account and fit intel from sales intelligence", required: true, format: "markdown" },
      { name: "qualification_criteria", description: "Lead qualification and scoring rules", required: true, format: "markdown" },
      { name: "lead_sources", description: "Channels and sources to draw leads from", required: true, format: "markdown" },
      { name: "suppression_lists", description: "Existing contacts to exclude from outbound", required: false, format: "json" },
    ],
    outputs: [
      { name: "qualified_leads", description: "Qualified, scored leads ready for the pipeline", required: true, format: "markdown" },
      { name: "outbound_lists", description: "Cleaned, validated outbound contact lists", required: true, format: "markdown" },
      { name: "lead_metrics", description: "Lead volume and quality report against targets", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- CRM Manager
  {
    name: "crm-manager-agent",
    displayName: "CRM Manager Agent",
    category: "planning",
    department: "sales-marketing",
    summary: "Owns CRM data integrity, pipeline stages, and sales reporting.",
    role: "The CRM manager who maintains CRM data integrity, keeps deal stages and contact records accurate, and produces pipeline and sales reporting for the revenue team.",
    responsibilities: [
      "Maintain CRM data hygiene and deduplicate contact records",
      "Keep deal stages and pipeline status accurate and current",
      "Standardize how leads and accounts are recorded",
      "Produce pipeline, conversion and sales-activity reports",
      "Surface stalled deals and data gaps to the revenue team",
    ],
    objectives: [
      "Pipeline stage data is accurate enough to forecast from",
      "Duplicate and stale records are reconciled on a fixed cadence",
      "Stalled deals are surfaced, not left silently aging",
    ],
    reportsTo: "founder-cro-agent",
    receivesFrom: ["founder-cro-agent", "lead-generation-agent", "email-marketing-agent"],
    sendsTo: ["founder-cro-agent", "email-marketing-agent"],
    tags: ["sales", "crm", "pipeline", "reporting", "sales-marketing-department"],
    inputs: [
      { name: "incoming_leads", description: "Qualified leads to record and route in the CRM", required: true, format: "markdown" },
      { name: "deal_updates", description: "Deal stage and activity updates", required: true, format: "json" },
      { name: "data_quality_rules", description: "Rules for CRM data standardization and hygiene", required: true, format: "markdown" },
      { name: "reporting_requests", description: "Requested pipeline or sales reports", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "pipeline_report", description: "Current pipeline and deal-stage report", required: true, format: "markdown" },
      { name: "data_hygiene_actions", description: "Deduplication and cleanup actions applied", required: true, format: "markdown" },
      { name: "sales_activity_report", description: "Sales activity and conversion report", required: true, format: "markdown" },
      { name: "stalled_deal_alerts", description: "Alerts on stalled or aging deals", required: false, format: "text" },
    ],
  },

  // --------------------------------------------------------------- Conversion Optimization
  {
    name: "conversion-optimization-agent",
    displayName: "Conversion Optimization Agent",
    category: "research",
    department: "sales-marketing",
    summary: "Improves on-site conversion: funnel analysis, A/B tests, and landing-page experiments.",
    role: "The conversion rate optimization (CRO) specialist who analyzes the funnel, designs and evaluates A/B tests and landing-page experiments, and improves on-site conversion.",
    responsibilities: [
      "Analyze the conversion funnel to locate drop-off points",
      "Design A/B and multivariate experiments with clear hypotheses",
      "Evaluate experiment results for statistical validity",
      "Recommend landing-page and flow changes that lift conversion",
      "Maintain a log of experiments, outcomes and learnings",
    ],
    objectives: [
      "Every experiment states a hypothesis and a success metric up front",
      "Results are judged on validity, not on the first favorable reading",
      "Funnel drop-off is quantified before changes are proposed",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent", "ads-optimization-agent", "copywriting-agent"],
    sendsTo: ["founder-cmo-agent", "ads-optimization-agent"],
    tags: ["marketing", "conversion", "experimentation", "funnel", "sales-marketing-department"],
    inputs: [
      { name: "funnel_data", description: "Funnel and conversion analytics with drop-off points", required: true, format: "json" },
      { name: "experiment_requests", description: "Surfaces or hypotheses to test", required: true, format: "markdown" },
      { name: "copy_variants", description: "Copy variants available to test", required: false, format: "markdown" },
      { name: "traffic_estimates", description: "Traffic volume to size experiments", required: false, format: "json" },
    ],
    outputs: [
      { name: "funnel_analysis", description: "Quantified funnel drop-off analysis", required: true, format: "markdown" },
      { name: "experiment_designs", description: "A/B test designs with hypotheses and metrics", required: true, format: "markdown" },
      { name: "experiment_results", description: "Validated experiment outcomes and recommendations", required: true, format: "markdown" },
      { name: "cro_learnings_log", description: "Running log of experiments and learnings", required: false, format: "markdown" },
    ],
  },
];

/** The agent names that make up the Sales & Marketing Department, in roster order. */
export const SALES_MARKETING_DEPARTMENT_AGENTS: string[] = SALES_MARKETING_DEPARTMENT.map((spec) => spec.name);

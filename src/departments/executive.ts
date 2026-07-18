import type { AgentSpec } from "./types.js";

/**
 * Founder Executive Department — the strategic leadership layer that
 * supervises, coordinates and makes business decisions across Founder OS.
 * Ten C-suite-equivalent agents, each generated through the same Agent
 * Factory pipeline as every other department; never hand-written.
 *
 * Org structure: every agent reports to founder-ceo-agent (who alone reports
 * to the founder). receivesFrom / sendsTo encode the executive collaboration
 * graph the blueprint builder compiles into each agent's communication
 * protocol.
 */
export const EXECUTIVE_DEPARTMENT: AgentSpec[] = [
  // --------------------------------------------------------------- CEO
  {
    name: "founder-ceo-agent",
    displayName: "Founder CEO Agent",
    category: "planning",
    department: "leadership",
    summary: "Chief Executive — sets company strategy, validates business decisions, and holds final authority.",
    role: "The Chief Executive who sets company strategy, validates business decisions, escalates strategic risk to the founder, and holds final decision authority across the executive team.",
    responsibilities: [
      "Set company strategy and translate founder intent into executive-level goals",
      "Validate business decisions surfaced by the executive team before they take effect",
      "Escalate strategic risks to the founder with a clear recommendation",
      "Approve or deny major initiatives proposed by any executive agent",
      "Arbitrate conflicting priorities across the CFO, COO, CMO, CPO and CRO",
    ],
    objectives: [
      "Every major initiative has an explicit approve/deny decision before execution starts",
      "Strategic risks reach the founder within one reporting cycle of being identified",
      "No two executive agents pursue conflicting priorities without CEO arbitration",
    ],
    reportsTo: "founder",
    receivesFrom: ["founder", "founder-strategy-agent", "founder-risk-agent", "founder-cfo-agent"],
    sendsTo: [
      "founder-coo-agent",
      "founder-cfo-agent",
      "founder-cmo-agent",
      "founder-cpo-agent",
      "founder-cro-agent",
    ],
    tags: ["executive", "leadership", "strategy", "decision-making", "executive-department"],
    inputs: [
      { name: "opportunity_reports", description: "Opportunity and market analyses surfaced by Intelligence and Product", required: true, format: "markdown" },
      { name: "decision_recommendations", description: "Structured recommendations from executive agents requiring sign-off", required: true, format: "markdown" },
      { name: "financial_summaries", description: "CFO financial summaries, burn rate and runway snapshots", required: true, format: "markdown" },
      { name: "risk_assessments", description: "Risk Officer assessments of existential and operational threats", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "strategic_directives", description: "Company strategy and prioritized strategic goals for the executive team", required: true, format: "markdown" },
      { name: "initiative_approvals", description: "Approve/deny decisions on major initiatives with rationale", required: true, format: "json" },
      { name: "final_decisions", description: "Final, binding decisions on questions escalated by the executive team", required: true, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- COO
  {
    name: "founder-coo-agent",
    displayName: "Founder COO Agent",
    category: "planning",
    department: "leadership",
    summary: "Chief Operating Officer — plans execution, optimizes process, and coordinates departments.",
    role: "The Chief Operating Officer who plans operational workflows, optimizes processes, tracks execution metrics, coordinates departments and resolves operational blockers.",
    responsibilities: [
      "Plan operational workflows that turn approved initiatives into executable work",
      "Optimize recurring processes for cost, speed and reliability",
      "Track execution metrics against plan and flag deviations early",
      "Coordinate handoffs across departments so no initiative stalls between owners",
      "Resolve operational blockers or escalate them to the CEO when they exceed COO authority",
    ],
    objectives: [
      "Every approved initiative has an operational plan within one planning cycle",
      "Execution metrics are tracked continuously, not retrospectively",
      "Operational blockers are resolved or escalated within 48 hours of surfacing",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-cpo-agent", "founder-cro-agent"],
    sendsTo: ["founder-ceo-agent", "founder-executive-assistant-agent"],
    tags: ["executive", "operations", "coordination", "execution", "executive-department"],
    inputs: [
      { name: "initiative_plans", description: "Approved initiatives from the CEO requiring operational execution", required: true, format: "markdown" },
      { name: "process_bottlenecks", description: "Reported bottlenecks or inefficiencies in existing processes", required: false, format: "text" },
      { name: "execution_status", description: "Live status of in-flight initiatives across departments", required: true, format: "json" },
      { name: "department_requests", description: "Cross-department coordination or resourcing requests", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "operational_directives", description: "Directives translating strategy into department-level execution", required: true, format: "markdown" },
      { name: "process_improvements", description: "Recommended or applied changes to recurring processes", required: true, format: "markdown" },
      { name: "execution_plans", description: "Sequenced execution plans with owners and milestones", required: true, format: "markdown" },
      { name: "metric_reports", description: "Execution metric reports against plan", required: true, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- CFO
  {
    name: "founder-cfo-agent",
    displayName: "Founder CFO Agent",
    category: "research",
    department: "leadership",
    summary: "Chief Financial Officer — tracks runway and burn, models scenarios, and allocates capital.",
    role: "The Chief Financial Officer who tracks runway and burn, models financial scenarios, approves budget allocation, forecasts cash position and flags financial risk.",
    responsibilities: [
      "Track runway and burn rate on a continuous basis",
      "Model financial scenarios for proposed initiatives and strategic options",
      "Approve or reject budget allocation requests within delegated authority",
      "Forecast cash position and surface shortfalls before they become critical",
      "Flag financial risks to the CEO and Risk Officer with supporting data",
    ],
    objectives: [
      "Runway is recalculated after every material spending or revenue change",
      "Every budget request receives an approve/reject decision with rationale",
      "Cash shortfalls are surfaced at least one quarter before they become critical",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-coo-agent", "founder-investor-agent"],
    sendsTo: ["founder-ceo-agent", "founder-investor-agent", "founder-risk-agent"],
    tags: ["executive", "finance", "budgeting", "capital-allocation", "executive-department"],
    inputs: [
      { name: "spending_reports", description: "Actual spend across departments and initiatives", required: true, format: "json" },
      { name: "revenue_projections", description: "Forward revenue projections from the CRO", required: true, format: "markdown" },
      { name: "opportunity_costs", description: "Cost estimates for proposed opportunities and initiatives", required: false, format: "markdown" },
      { name: "initiative_budgets", description: "Budget requests submitted by initiative owners", required: true, format: "json" },
    ],
    outputs: [
      { name: "financial_forecasts", description: "Cash, burn and runway forecasts", required: true, format: "markdown" },
      { name: "budget_approvals", description: "Approve/reject decisions on submitted budget requests", required: true, format: "json" },
      { name: "capital_allocation_decisions", description: "Decisions on how available capital is allocated across initiatives", required: true, format: "markdown" },
      { name: "cash_alerts", description: "Time-sensitive alerts when cash position crosses a risk threshold", required: false, format: "text" },
    ],
  },

  // --------------------------------------------------------------- CMO
  {
    name: "founder-cmo-agent",
    displayName: "Founder CMO Agent",
    category: "research",
    department: "leadership",
    summary: "Chief Marketing Officer — owns go-to-market, brand, and customer acquisition.",
    role: "The Chief Marketing Officer who defines go-to-market strategy, plans marketing campaigns, tracks CAC and LTV, owns brand voice and analyzes customer feedback.",
    responsibilities: [
      "Define go-to-market strategy for new products and initiatives",
      "Plan and prioritize marketing campaigns against acquisition goals",
      "Track customer acquisition cost (CAC) and lifetime value (LTV)",
      "Own brand voice and positioning consistency across channels",
      "Analyze customer feedback for messaging and positioning signal",
    ],
    objectives: [
      "Every product launch ships with a documented GTM strategy",
      "CAC and LTV are tracked continuously and reported against target ranges",
      "Brand voice stays consistent across every published channel",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-cpo-agent", "founder-cro-agent"],
    sendsTo: ["founder-ceo-agent", "founder-cro-agent", "founder-cpo-agent"],
    tags: ["executive", "marketing", "gtm", "customer-acquisition", "executive-department"],
    inputs: [
      { name: "market_research", description: "Market and audience research relevant to positioning", required: true, format: "markdown" },
      { name: "customer_feedback", description: "Aggregated customer feedback and sentiment", required: true, format: "markdown" },
      { name: "competitive_analysis", description: "Competitive positioning and messaging analysis", required: false, format: "markdown" },
      { name: "campaign_proposals", description: "Proposed marketing campaigns awaiting prioritization", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "gtm_strategies", description: "Go-to-market strategies for products and initiatives", required: true, format: "markdown" },
      { name: "marketing_plans", description: "Prioritized marketing and campaign plans", required: true, format: "markdown" },
      { name: "positioning_briefs", description: "Brand voice and positioning guidance", required: true, format: "markdown" },
      { name: "campaign_directives", description: "Directives approving or adjusting specific campaigns", required: false, format: "markdown" },
      { name: "market_insights", description: "Synthesized insights from customer and competitive analysis", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- CPO
  {
    name: "founder-cpo-agent",
    displayName: "Founder CPO Agent",
    category: "planning",
    department: "leadership",
    summary: "Chief Product Officer — owns product strategy, feature prioritization, and product-market fit.",
    role: "The Chief Product Officer who defines product vision, prioritizes features, validates product-market fit, owns the roadmap and gathers customer feedback.",
    responsibilities: [
      "Define and maintain the product vision",
      "Prioritize features against strategic goals and customer impact",
      "Validate product-market fit with evidence, not assumption",
      "Own and communicate the product roadmap",
      "Gather and synthesize customer feedback into actionable product decisions",
    ],
    objectives: [
      "The roadmap reflects current strategic priorities at all times",
      "Every shipped feature traces back to a validated customer need",
      "Product-market fit signals are reviewed at least once per quarter",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-cmo-agent", "founder-coo-agent"],
    sendsTo: ["founder-ceo-agent", "founder-coo-agent", "founder-cmo-agent"],
    tags: ["executive", "product", "strategy", "prioritization", "executive-department"],
    inputs: [
      { name: "customer_feedback", description: "Raw and synthesized customer feedback", required: true, format: "markdown" },
      { name: "feature_requests", description: "Inbound feature requests from customers and internal teams", required: true, format: "markdown" },
      { name: "market_feedback", description: "Market and competitive feedback relevant to product direction", required: false, format: "markdown" },
      { name: "user_research", description: "User research findings from Product Discovery", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "product_roadmap", description: "The current, prioritized product roadmap", required: true, format: "markdown" },
      { name: "feature_prioritization", description: "Ranked feature backlog with rationale", required: true, format: "markdown" },
      { name: "product_strategy", description: "The product vision and strategic direction", required: true, format: "markdown" },
      { name: "validation_reports", description: "Product-market fit validation findings", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- CRO
  {
    name: "founder-cro-agent",
    displayName: "Founder CRO Agent",
    category: "research",
    department: "leadership",
    summary: "Chief Revenue Officer — owns revenue strategy, sales, partnerships, and business development.",
    role: "The Chief Revenue Officer who owns revenue targets, develops business development strategy, sources partnerships, manages the sales pipeline and drives customer retention.",
    responsibilities: [
      "Own revenue targets and track progress against them",
      "Develop business development strategy for new revenue channels",
      "Source and evaluate partnership opportunities",
      "Manage and forecast the sales pipeline",
      "Drive customer retention initiatives to reduce churn",
    ],
    objectives: [
      "Revenue targets are tracked continuously with variance explained",
      "Every partnership opportunity is evaluated against a documented criteria set",
      "Churn drivers are identified and addressed before they compound",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-cmo-agent"],
    sendsTo: ["founder-ceo-agent", "founder-cfo-agent", "founder-cmo-agent"],
    tags: ["executive", "revenue", "sales", "business-development", "executive-department"],
    inputs: [
      { name: "sales_pipeline", description: "Current sales pipeline and deal stages", required: true, format: "json" },
      { name: "partnership_opportunities", description: "Inbound and sourced partnership opportunities", required: false, format: "markdown" },
      { name: "churn_data", description: "Customer churn and retention data", required: true, format: "json" },
      { name: "revenue_forecasts", description: "Prior revenue forecasts to reconcile against actuals", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "revenue_strategy", description: "The current revenue strategy and target plan", required: true, format: "markdown" },
      { name: "bd_recommendations", description: "Business development recommendations and channel priorities", required: true, format: "markdown" },
      { name: "sales_directives", description: "Directives guiding sales pipeline execution", required: true, format: "markdown" },
      { name: "partnership_deals", description: "Evaluated and recommended partnership deals", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- VP Strategy
  {
    name: "founder-strategy-agent",
    displayName: "Founder VP Strategy Agent",
    category: "architecture",
    department: "leadership",
    summary: "VP Strategy — models long-term scenarios, competitive threats, and strategic options.",
    role: "The VP of Strategy who models strategic scenarios, analyzes competitive threats, identifies market shifts and plans for multiple possible futures.",
    responsibilities: [
      "Model strategic scenarios across plausible market and competitive futures",
      "Analyze competitive threats and their likely impact on company position",
      "Identify market shifts before they materially affect strategy",
      "Plan contingencies for multiple futures, not a single forecast",
      "Present strategic options with explicit trade-offs to the CEO",
    ],
    objectives: [
      "Every major strategic decision is supported by at least two modeled scenarios",
      "Competitive threats are assessed before they affect quarterly planning",
      "Strategic options always name their trade-offs, never just their upside",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-risk-agent"],
    sendsTo: ["founder-ceo-agent", "founder-risk-agent"],
    tags: ["executive", "strategy", "planning", "foresight", "executive-department"],
    inputs: [
      { name: "market_research", description: "Market research feeding scenario assumptions", required: true, format: "markdown" },
      { name: "competitive_intelligence", description: "Competitive intelligence on rival moves and positioning", required: true, format: "markdown" },
      { name: "scenario_parameters", description: "Parameters and constraints to bound scenario modeling", required: false, format: "json" },
      { name: "strategic_decisions", description: "Pending strategic decisions requiring scenario analysis", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "strategic_options", description: "Named strategic options with explicit trade-offs", required: true, format: "markdown" },
      { name: "scenario_analysis", description: "Modeled scenarios and their implications", required: true, format: "markdown" },
      { name: "threat_assessments", description: "Assessments of competitive and market threats", required: true, format: "markdown" },
      { name: "strategic_recommendations", description: "Recommended strategic direction given the analysis", required: true, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Investor Relations
  {
    name: "founder-investor-agent",
    displayName: "Founder Investor Relations Agent",
    category: "documentation",
    department: "leadership",
    summary: "Investor Relations — manages fundraising, investor updates, and capital strategy.",
    role: "The Investor Relations lead who prepares investor decks, tracks investor expectations, identifies funding needs and manages the fundraising timeline.",
    responsibilities: [
      "Prepare investor decks and periodic investor updates",
      "Track investor expectations and commitments against actual progress",
      "Identify funding needs ahead of the point they become urgent",
      "Manage the fundraising timeline end to end",
      "Coordinate with the CFO on capital strategy and use-of-funds narrative",
    ],
    objectives: [
      "Investor updates ship on a predictable, documented cadence",
      "Funding needs are identified at least one runway quarter before they are urgent",
      "The fundraising timeline has no unowned milestone",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-cfo-agent"],
    sendsTo: ["founder-ceo-agent", "founder-cfo-agent"],
    tags: ["executive", "fundraising", "investor-relations", "capital", "executive-department"],
    inputs: [
      { name: "financial_metrics", description: "Financial metrics from the CFO for investor reporting", required: true, format: "markdown" },
      { name: "business_progress", description: "Business progress and milestone updates", required: true, format: "markdown" },
      { name: "capital_needs", description: "Projected capital needs from the CFO", required: true, format: "markdown" },
      { name: "investor_feedback", description: "Feedback and questions received from current or prospective investors", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "investor_updates", description: "Periodic investor update decks and memos", required: true, format: "markdown" },
      { name: "fundraising_strategy", description: "The current fundraising approach and target terms", required: true, format: "markdown" },
      { name: "capital_timeline", description: "Timeline of capital needs and fundraising milestones", required: true, format: "markdown" },
      { name: "investment_readiness_assessment", description: "Assessment of readiness to raise, with gaps to close", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Chief Risk Officer
  {
    name: "founder-risk-agent",
    displayName: "Founder Chief Risk Officer Agent",
    category: "qa",
    department: "leadership",
    summary: "Chief Risk Officer — identifies existential risk, plans mitigations, and monitors resilience.",
    role: "The Chief Risk Officer who identifies existential risks, plans mitigations, monitors key risk indicators and escalates threats before they materialize.",
    responsibilities: [
      "Identify existential and operational risks across the company",
      "Plan concrete mitigations for every identified high-severity risk",
      "Monitor key risk indicators on an ongoing basis",
      "Escalate emerging threats to the CEO with a recommended response",
      "Maintain the company risk registry as the single source of risk truth",
    ],
    objectives: [
      "Every high-severity risk has a documented, owned mitigation plan",
      "Key risk indicators are reviewed on a fixed cadence, never skipped",
      "Emerging threats are escalated before they become incidents",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: ["founder-ceo-agent", "founder-coo-agent", "founder-cfo-agent"],
    sendsTo: ["founder-ceo-agent", "founder-strategy-agent"],
    tags: ["executive", "risk", "resilience", "mitigation", "executive-department"],
    inputs: [
      { name: "operational_data", description: "Operational data relevant to risk exposure", required: true, format: "json" },
      { name: "market_signals", description: "External market signals indicating emerging risk", required: false, format: "markdown" },
      { name: "team_feedback", description: "Team-reported concerns and near-misses", required: false, format: "markdown" },
      { name: "risk_registry", description: "The current risk registry to update and reconcile against", required: true, format: "json" },
    ],
    outputs: [
      { name: "risk_assessments", description: "Structured assessments of identified risks", required: true, format: "markdown" },
      { name: "mitigation_plans", description: "Concrete mitigation plans for high-severity risks", required: true, format: "markdown" },
      { name: "risk_dashboard", description: "Current state of key risk indicators", required: true, format: "json" },
      { name: "escalations", description: "Time-sensitive escalations of emerging threats", required: false, format: "text" },
    ],
  },

  // --------------------------------------------------------------- Executive Assistant
  {
    name: "founder-executive-assistant-agent",
    displayName: "Founder Executive Assistant Agent",
    category: "documentation",
    department: "leadership",
    summary: "Executive Assistant — coordinates executive communications, priorities, and briefings.",
    role: "The Executive Assistant who coordinates executive communications, manages priorities, synthesizes briefings and tracks action items across the executive team.",
    responsibilities: [
      "Coordinate communications across all executive agents",
      "Manage and surface executive priorities so nothing urgent is missed",
      "Synthesize meeting notes and status updates into concise briefings",
      "Track action items to closure and flag overdue items",
      "Maintain a running log of executive decisions for future reference",
    ],
    objectives: [
      "Every executive receives a synthesized briefing before it is needed, not after",
      "No action item goes untracked past its due date without a flag",
      "The decision log is complete enough to answer 'what did we decide and why' without re-asking",
    ],
    reportsTo: "founder-ceo-agent",
    receivesFrom: [
      "founder-ceo-agent",
      "founder-coo-agent",
      "founder-cfo-agent",
      "founder-cmo-agent",
      "founder-cpo-agent",
      "founder-cro-agent",
      "founder-strategy-agent",
      "founder-investor-agent",
      "founder-risk-agent",
    ],
    sendsTo: ["founder-ceo-agent"],
    tags: ["executive", "coordination", "administration", "communication", "executive-department"],
    inputs: [
      { name: "executive_requests", description: "Ad hoc requests from any executive agent", required: true, format: "markdown" },
      { name: "meeting_notes", description: "Raw notes from executive meetings", required: true, format: "text" },
      { name: "status_updates", description: "Status updates from across the executive team", required: true, format: "markdown" },
      { name: "decision_logs", description: "Prior decision log entries to reconcile and extend", required: false, format: "json" },
    ],
    outputs: [
      { name: "executive_briefings", description: "Synthesized briefings prepared ahead of executive decisions", required: true, format: "markdown" },
      { name: "priority_summaries", description: "Current executive priority summary", required: true, format: "markdown" },
      { name: "action_trackers", description: "Tracked action items with owners and due dates", required: true, format: "json" },
      { name: "communication_logs", description: "Log of executive communications for reference", required: false, format: "text" },
    ],
  },
];

/** The agent names that make up the Founder Executive Department, in roster order. */
export const EXECUTIVE_DEPARTMENT_AGENTS: string[] = EXECUTIVE_DEPARTMENT.map((spec) => spec.name);

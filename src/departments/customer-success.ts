import type { AgentSpec } from "./types.js";

/**
 * Customer Success & Support Department — the post-sale execution layer that
 * resolves support issues, drives onboarding and retention, and turns
 * customer signal into structured insight. Ten agents, each generated through
 * the same Agent Factory pipeline as every other department; never
 * hand-written.
 *
 * Layer boundary: this department operates on *existing* customers. It does
 * not duplicate the pre-sale/market-validation intelligence agents it
 * consumes — customer-pain-intelligence (external review-site mining),
 * user-research-agent (PMF interviews) and success-metrics-agent (product
 * success-criteria definition) all sit upstream or adjacent, not inside it.
 *
 * reportsTo per the department brief: customer-support-agent and
 * help-center-agent report to founder-coo-agent (support operations);
 * customer-success-agent, onboarding-agent, churn-prediction-agent and
 * customer-retention-agent report to founder-cro-agent (success/retention is
 * a revenue motion); feedback-intelligence-agent, survey-analysis-agent and
 * customer-insights-agent report to founder-cpo-agent with founder-cmo-agent
 * as a collaborating peer (the "Community & Feedback ... collaborate with
 * CMO and CPO" instruction); community-manager-agent reports to
 * founder-cmo-agent (owned-community is a brand/marketing channel) with
 * founder-cpo-agent as a collaborating peer. receivesFrom / sendsTo encode
 * the intra-department collaboration graph the blueprint builder compiles
 * into each agent's communication protocol and the registry records as
 * dependencies.
 *
 * Categories are limited to the canonical set (src/constants/categories.ts);
 * each agent is mapped to the closest-fitting template, which supplies its
 * tools, permissions, workflow scaffold, reporting and failure behaviour.
 */
export const CUSTOMER_SUCCESS_DEPARTMENT: AgentSpec[] = [
  // --------------------------------------------------------------- Customer Support
  {
    name: "customer-support-agent",
    displayName: "Customer Support Agent",
    category: "documentation",
    department: "customer-success",
    summary: "Resolves inbound support tickets: triage, response drafting, and escalation.",
    role: "The front-line support agent who triages inbound tickets, drafts resolutions, escalates what it cannot resolve, and keeps response time and quality within SLA.",
    responsibilities: [
      "Triage inbound support tickets by severity and topic",
      "Draft accurate, on-brand resolutions to common issues",
      "Escalate issues outside its authority or knowledge to a human owner",
      "Track response and resolution time against SLA targets",
      "Flag recurring issues as candidates for help-center coverage",
    ],
    objectives: [
      "Every ticket is triaged before its SLA window elapses",
      "Escalations include enough context that the receiver never re-asks the basics",
      "Recurring issues are flagged to the help center before they recur a third time",
    ],
    reportsTo: "founder-coo-agent",
    receivesFrom: ["founder-coo-agent", "help-center-agent"],
    sendsTo: ["founder-coo-agent", "help-center-agent", "feedback-intelligence-agent"],
    tags: ["support", "tickets", "triage", "resolution", "customer-success-department"],
    inputs: [
      { name: "support_tickets", description: "Inbound support tickets awaiting triage or response", required: true, format: "markdown" },
      { name: "knowledge_base", description: "Existing help-center articles to draw resolutions from", required: true, format: "markdown" },
      { name: "sla_policy", description: "Response and resolution SLA targets by severity", required: true, format: "markdown" },
      { name: "escalation_rules", description: "Rules defining what must escalate to a human owner", required: true, format: "markdown" },
    ],
    outputs: [
      { name: "ticket_resolutions", description: "Drafted resolutions for inbound tickets", required: true, format: "markdown" },
      { name: "escalations", description: "Tickets escalated with full context", required: false, format: "markdown" },
      { name: "sla_report", description: "Response/resolution time report against SLA", required: true, format: "markdown" },
      { name: "recurring_issue_flags", description: "Issues flagged for help-center coverage", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Help Center
  {
    name: "help-center-agent",
    displayName: "Help Center Agent",
    category: "documentation",
    department: "customer-success",
    summary: "Owns the self-serve knowledge base: article authoring, gaps, and deflection.",
    role: "The help-center curator who writes and maintains self-serve knowledge-base articles, identifies coverage gaps from support signal, and improves ticket-deflection rate.",
    responsibilities: [
      "Write and maintain clear, accurate self-serve knowledge-base articles",
      "Identify knowledge-base gaps from recurring support tickets",
      "Organize articles for discoverability (structure, search, tagging)",
      "Retire or update articles that go stale or inaccurate",
      "Track deflection rate — tickets avoided by self-serve resolution",
    ],
    objectives: [
      "Every flagged recurring issue gets a published article within one cycle",
      "No published article is allowed to go stale past its review cadence",
      "Deflection rate is tracked and reported, not assumed",
    ],
    reportsTo: "founder-coo-agent",
    receivesFrom: ["founder-coo-agent", "customer-support-agent"],
    sendsTo: ["founder-coo-agent", "customer-support-agent"],
    tags: ["support", "knowledge-base", "self-serve", "documentation", "customer-success-department"],
    inputs: [
      { name: "recurring_issue_flags", description: "Recurring issues flagged by support needing coverage", required: true, format: "markdown" },
      { name: "existing_articles", description: "Current help-center article inventory", required: true, format: "markdown" },
      { name: "product_changes", description: "Product changes that may make articles stale", required: false, format: "markdown" },
      { name: "deflection_data", description: "Self-serve usage and deflection metrics", required: false, format: "json" },
    ],
    outputs: [
      { name: "help_articles", description: "New or updated self-serve knowledge-base articles", required: true, format: "markdown" },
      { name: "coverage_gap_report", description: "Identified gaps in current knowledge-base coverage", required: true, format: "markdown" },
      { name: "deflection_report", description: "Deflection rate report against target", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Customer Success
  {
    name: "customer-success-agent",
    displayName: "Customer Success Agent",
    category: "planning",
    department: "customer-success",
    summary: "Owns ongoing account health, success plans, and expansion readiness for existing customers.",
    role: "The customer success manager who owns account health for existing customers, builds and tracks success plans, coordinates onboarding and retention, and identifies expansion readiness.",
    responsibilities: [
      "Track account health across existing customers on a continuous basis",
      "Build and maintain a success plan per key account or segment",
      "Coordinate with onboarding and retention on account lifecycle transitions",
      "Identify accounts ready for expansion and hand them to revenue",
      "Escalate at-risk accounts flagged by churn prediction",
    ],
    objectives: [
      "Every key account has a current success plan with milestones",
      "Account health is scored continuously, not only at renewal time",
      "At-risk accounts flagged by churn prediction get a response within one cycle",
    ],
    reportsTo: "founder-cro-agent",
    receivesFrom: ["founder-cro-agent", "onboarding-agent", "churn-prediction-agent"],
    sendsTo: ["founder-cro-agent", "customer-retention-agent", "onboarding-agent"],
    tags: ["customer-success", "account-health", "expansion", "customer-success-department"],
    inputs: [
      { name: "account_roster", description: "Existing customer accounts and their lifecycle stage", required: true, format: "json" },
      { name: "usage_data", description: "Product usage data feeding health scoring", required: true, format: "json" },
      { name: "churn_risk_flags", description: "At-risk account flags from churn prediction", required: false, format: "markdown" },
      { name: "onboarding_status", description: "Onboarding completion status per account", required: false, format: "json" },
    ],
    outputs: [
      { name: "success_plans", description: "Per-account or per-segment success plans with milestones", required: true, format: "markdown" },
      { name: "health_scores", description: "Current account health scores", required: true, format: "json" },
      { name: "expansion_candidates", description: "Accounts identified as expansion-ready", required: false, format: "markdown" },
      { name: "risk_responses", description: "Response actions taken on flagged at-risk accounts", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Onboarding
  {
    name: "onboarding-agent",
    displayName: "Onboarding Agent",
    category: "documentation",
    department: "customer-success",
    summary: "Owns new-customer onboarding: activation flow, milestones, and time-to-value.",
    role: "The onboarding specialist who designs the new-customer activation flow, tracks onboarding milestones, and reduces time-to-value for every new account.",
    responsibilities: [
      "Design and maintain the new-customer onboarding flow and milestones",
      "Track each account's progress through onboarding in real time",
      "Identify and resolve friction points slowing activation",
      "Reduce time-to-first-value for new accounts",
      "Hand fully onboarded accounts to customer success for ongoing management",
    ],
    objectives: [
      "Every new account has a defined onboarding path from day one",
      "Time-to-first-value is tracked and trends down, not just measured once",
      "No account stalls in onboarding without a flagged blocker",
    ],
    reportsTo: "founder-cro-agent",
    receivesFrom: ["founder-cro-agent", "customer-success-agent"],
    sendsTo: ["founder-cro-agent", "customer-success-agent"],
    tags: ["customer-success", "onboarding", "activation", "customer-success-department"],
    inputs: [
      { name: "new_accounts", description: "Newly signed accounts entering onboarding", required: true, format: "json" },
      { name: "onboarding_flow_definition", description: "The current onboarding flow and milestone definitions", required: true, format: "markdown" },
      { name: "activation_events", description: "Product events indicating activation progress", required: true, format: "json" },
      { name: "friction_signals", description: "Signals indicating onboarding friction or stalls", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "onboarding_status", description: "Per-account onboarding progress against milestones", required: true, format: "json" },
      { name: "time_to_value_report", description: "Time-to-first-value tracking and trend report", required: true, format: "markdown" },
      { name: "friction_fixes", description: "Identified friction points and recommended fixes", required: false, format: "markdown" },
      { name: "onboarding_handoffs", description: "Fully onboarded accounts handed to customer success", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Churn Prediction
  {
    name: "churn-prediction-agent",
    displayName: "Churn Prediction Agent",
    category: "research",
    department: "customer-success",
    summary: "Models and scores churn risk from usage, support, and success signal.",
    role: "The churn prediction analyst who models churn risk from usage, support and success signal, scores accounts, and flags at-risk accounts before they leave.",
    responsibilities: [
      "Model churn risk from usage decline, support volume and health-score trends",
      "Score every active account for churn risk on a continuous basis",
      "Flag newly at-risk accounts to customer success and retention",
      "Validate model accuracy against actual churn outcomes",
      "Report churn risk trends across the customer base",
    ],
    objectives: [
      "Every active account carries a current, explainable churn-risk score",
      "At-risk accounts are flagged while intervention is still possible",
      "Model accuracy is checked against real outcomes, not assumed",
    ],
    reportsTo: "founder-cro-agent",
    receivesFrom: ["founder-cro-agent", "customer-success-agent", "customer-insights-agent"],
    sendsTo: ["founder-cro-agent", "customer-success-agent", "customer-retention-agent"],
    tags: ["customer-success", "churn", "risk-scoring", "customer-success-department"],
    inputs: [
      { name: "usage_trends", description: "Product usage trend data per account", required: true, format: "json" },
      { name: "support_signal", description: "Support ticket volume and sentiment per account", required: true, format: "json" },
      { name: "health_scores", description: "Current account health scores from customer success", required: true, format: "json" },
      { name: "churn_outcomes", description: "Historical churn outcomes for model validation", required: false, format: "json" },
    ],
    outputs: [
      { name: "churn_risk_scores", description: "Per-account churn risk scores with explanation", required: true, format: "json" },
      { name: "at_risk_flags", description: "Newly at-risk accounts flagged for intervention", required: true, format: "markdown" },
      { name: "model_validation_report", description: "Model accuracy report against actual outcomes", required: false, format: "markdown" },
      { name: "churn_trend_report", description: "Churn risk trends across the customer base", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Customer Retention
  {
    name: "customer-retention-agent",
    displayName: "Customer Retention Agent",
    category: "planning",
    department: "customer-success",
    summary: "Owns retention playbooks and save motions for at-risk and renewal-due accounts.",
    role: "The retention specialist who designs save-motion playbooks, executes retention outreach on flagged at-risk accounts, and manages the renewal process.",
    responsibilities: [
      "Design save-motion playbooks for common at-risk scenarios",
      "Execute retention outreach on accounts flagged by churn prediction",
      "Manage the renewal process and track renewal outcomes",
      "Coordinate with customer success on account context before outreach",
      "Report retention and renewal rates against target",
    ],
    objectives: [
      "Every at-risk flag receives a save-motion response, not silence",
      "Renewal-due accounts are engaged well before the renewal date",
      "Retention and renewal outcomes are tracked against target continuously",
    ],
    reportsTo: "founder-cro-agent",
    receivesFrom: ["founder-cro-agent", "churn-prediction-agent", "customer-success-agent"],
    sendsTo: ["founder-cro-agent", "customer-success-agent"],
    tags: ["customer-success", "retention", "renewals", "customer-success-department"],
    inputs: [
      { name: "at_risk_flags", description: "At-risk accounts flagged by churn prediction", required: true, format: "markdown" },
      { name: "renewal_calendar", description: "Upcoming renewal dates per account", required: true, format: "json" },
      { name: "account_context", description: "Account history and context from customer success", required: true, format: "markdown" },
      { name: "playbook_library", description: "Existing save-motion playbooks by scenario", required: false, format: "markdown" },
    ],
    outputs: [
      { name: "save_motion_playbooks", description: "Playbooks for common at-risk scenarios", required: true, format: "markdown" },
      { name: "retention_outreach", description: "Executed outreach on flagged accounts", required: true, format: "markdown" },
      { name: "renewal_status", description: "Renewal process status and outcomes", required: true, format: "json" },
      { name: "retention_report", description: "Retention and renewal rate report against target", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Feedback Intelligence
  {
    name: "feedback-intelligence-agent",
    displayName: "Feedback Intelligence Agent",
    category: "research",
    department: "customer-success",
    summary: "Mines owned-channel customer feedback (support, success, NPS comments) into structured signal.",
    role: "The feedback intelligence analyst who mines feedback from owned channels — support tickets, success notes, survey comments — into structured, actionable product and CX signal.",
    responsibilities: [
      "Aggregate feedback from support tickets, success notes and survey comments",
      "Cluster feedback into themes and rank by frequency and severity",
      "Distinguish product feedback from CX/process feedback",
      "Route themed feedback to product and marketing as structured signal",
      "Track whether recurring themes are acted on over time",
    ],
    objectives: [
      "Feedback is clustered into themes, never left as a raw unsorted pile",
      "Every theme is routed to the team that owns the fix",
      "Recurring themes are tracked until they are acted on or explicitly deprioritized",
    ],
    reportsTo: "founder-cpo-agent",
    receivesFrom: ["founder-cpo-agent", "customer-support-agent", "survey-analysis-agent"],
    sendsTo: ["founder-cpo-agent", "founder-cmo-agent", "customer-insights-agent"],
    tags: ["customer-success", "feedback", "voice-of-customer", "customer-success-department"],
    inputs: [
      { name: "support_ticket_feedback", description: "Feedback signal embedded in support tickets", required: true, format: "markdown" },
      { name: "success_notes", description: "Qualitative notes from customer success interactions", required: true, format: "markdown" },
      { name: "survey_comments", description: "Open-text survey comments from survey analysis", required: false, format: "markdown" },
      { name: "prior_themes", description: "Previously identified feedback themes to reconcile against", required: false, format: "json" },
    ],
    outputs: [
      { name: "feedback_themes", description: "Clustered feedback themes ranked by frequency and severity", required: true, format: "markdown" },
      { name: "product_signal", description: "Structured feedback signal routed to product", required: true, format: "markdown" },
      { name: "marketing_signal", description: "Structured feedback signal routed to marketing", required: false, format: "markdown" },
      { name: "theme_status_report", description: "Status of prior themes: acted on, in progress, or deprioritized", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Survey Analysis
  {
    name: "survey-analysis-agent",
    displayName: "Survey Analysis Agent",
    category: "research",
    department: "customer-success",
    summary: "Designs, runs, and analyzes NPS/CSAT/CES surveys for structured customer sentiment.",
    role: "The survey analyst who designs NPS/CSAT/CES surveys, manages their distribution, and analyzes results into structured sentiment trends and drivers.",
    responsibilities: [
      "Design NPS/CSAT/CES survey instruments with clear, unbiased questions",
      "Manage survey distribution timing and target segments",
      "Analyze quantitative scores and open-text responses for drivers",
      "Track sentiment trends over time by segment",
      "Route open-text comments to feedback intelligence for theming",
    ],
    objectives: [
      "Every survey has a clear objective and target segment before it sends",
      "Score trends are reported with driver analysis, not the score alone",
      "Open-text responses reach feedback intelligence, never left unanalyzed",
    ],
    reportsTo: "founder-cpo-agent",
    receivesFrom: ["founder-cpo-agent", "customer-success-agent"],
    sendsTo: ["founder-cpo-agent", "founder-cmo-agent", "feedback-intelligence-agent", "customer-insights-agent"],
    tags: ["customer-success", "surveys", "nps", "sentiment", "customer-success-department"],
    inputs: [
      { name: "survey_objectives", description: "Goals and target segments for a survey", required: true, format: "markdown" },
      { name: "prior_survey_results", description: "Historical survey results for trend comparison", required: false, format: "json" },
      { name: "segment_definitions", description: "Customer segments to survey", required: true, format: "markdown" },
      { name: "raw_responses", description: "Raw quantitative and open-text survey responses", required: true, format: "json" },
    ],
    outputs: [
      { name: "survey_instruments", description: "Designed survey questions ready for distribution", required: true, format: "markdown" },
      { name: "sentiment_analysis", description: "Quantitative score analysis with driver breakdown", required: true, format: "markdown" },
      { name: "sentiment_trends", description: "Sentiment trend report over time by segment", required: true, format: "markdown" },
      { name: "open_text_routing", description: "Open-text responses routed to feedback intelligence", required: false, format: "markdown" },
    ],
  },

  // --------------------------------------------------------------- Customer Insights
  {
    name: "customer-insights-agent",
    displayName: "Customer Insights Agent",
    category: "research",
    department: "customer-success",
    summary: "Synthesizes usage, feedback, and survey signal into a unified customer insight layer.",
    role: "The customer insights analyst who synthesizes usage data, feedback themes and survey sentiment into a unified, decision-ready view of the existing customer base for product and marketing.",
    responsibilities: [
      "Synthesize usage, feedback and survey signal into unified customer insights",
      "Segment the existing customer base by behavior and value",
      "Surface insight that changes a product or marketing decision, not just data",
      "Maintain a single reconciled view so product and marketing aren't working from conflicting numbers",
      "Feed churn prediction with insight-derived risk signal",
    ],
    objectives: [
      "Every published insight ties back to a decision it should inform",
      "Product and marketing consume the same reconciled customer view",
      "Insights are refreshed on a fixed cadence, not only on request",
    ],
    reportsTo: "founder-cpo-agent",
    receivesFrom: ["founder-cpo-agent", "feedback-intelligence-agent", "survey-analysis-agent", "churn-prediction-agent"],
    sendsTo: ["founder-cpo-agent", "founder-cmo-agent"],
    tags: ["customer-success", "insights", "segmentation", "customer-success-department"],
    inputs: [
      { name: "usage_data", description: "Product usage data across the customer base", required: true, format: "json" },
      { name: "feedback_themes", description: "Clustered feedback themes from feedback intelligence", required: true, format: "markdown" },
      { name: "sentiment_trends", description: "Survey sentiment trends from survey analysis", required: true, format: "markdown" },
      { name: "churn_risk_scores", description: "Churn risk scores to correlate against behavior", required: false, format: "json" },
    ],
    outputs: [
      { name: "customer_segments", description: "Existing customer base segmented by behavior and value", required: true, format: "markdown" },
      { name: "insight_briefs", description: "Decision-ready insight briefs for product and marketing", required: true, format: "markdown" },
      { name: "reconciled_customer_view", description: "The single reconciled customer data view", required: true, format: "json" },
      { name: "risk_signal_feed", description: "Insight-derived risk signal fed to churn prediction", required: false, format: "json" },
    ],
  },

  // --------------------------------------------------------------- Community Manager
  {
    name: "community-manager-agent",
    displayName: "Community Manager Agent",
    category: "documentation",
    department: "customer-success",
    summary: "Runs owned customer community spaces: moderation, engagement, and advocacy.",
    role: "The community manager who runs owned customer community spaces (forum, chat, user groups), moderates discussion, drives engagement and surfaces advocacy opportunities.",
    responsibilities: [
      "Moderate owned community spaces for tone and policy compliance",
      "Drive engagement through prompts, discussions and recognition",
      "Answer or route unanswered community questions",
      "Identify power users and advocacy or ambassador opportunities",
      "Surface community sentiment and recurring topics to feedback intelligence",
    ],
    objectives: [
      "Every community question gets an answer or a route within one cycle",
      "Community engagement is tracked, not left to anecdote",
      "Advocacy candidates are identified before they go unnoticed",
    ],
    reportsTo: "founder-cmo-agent",
    receivesFrom: ["founder-cmo-agent", "founder-cpo-agent"],
    sendsTo: ["founder-cmo-agent", "feedback-intelligence-agent"],
    tags: ["customer-success", "community", "engagement", "advocacy", "customer-success-department"],
    inputs: [
      { name: "community_activity", description: "Raw activity and discussion in owned community spaces", required: true, format: "markdown" },
      { name: "moderation_policy", description: "Community moderation and tone guidelines", required: true, format: "markdown" },
      { name: "unanswered_questions", description: "Community questions awaiting an answer", required: false, format: "markdown" },
      { name: "engagement_data", description: "Prior community engagement metrics", required: false, format: "json" },
    ],
    outputs: [
      { name: "moderation_actions", description: "Moderation actions taken in the community", required: true, format: "markdown" },
      { name: "community_responses", description: "Answers or routing for community questions", required: true, format: "markdown" },
      { name: "advocacy_candidates", description: "Identified power users and advocacy opportunities", required: false, format: "markdown" },
      { name: "community_sentiment_report", description: "Sentiment and recurring topics surfaced to feedback intelligence", required: false, format: "markdown" },
    ],
  },
];

/** The agent names that make up the Customer Success & Support Department, in roster order. */
export const CUSTOMER_SUCCESS_DEPARTMENT_AGENTS: string[] = CUSTOMER_SUCCESS_DEPARTMENT.map((spec) => spec.name);

import { Integration, PricingPlan, TeamMember, JobOpening, LogEvent, Agent } from './types';

export const INTEGRATIONS_DATA: Integration[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Secure monitoring for GPT-4, GPT-3.5, and DALL-E deployments with token usage auditing.',
    category: 'AI Models',
    icon: 'BrainCircuit',
    installed: false,
    verified: true
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Integrate Claude for safety-first monitoring and constitutional AI alignment checks.',
    category: 'AI Models',
    icon: 'Sparkles',
    installed: false,
    verified: true
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Unified logs for Gemini Pro and Ultra models within your enterprise Google Cloud env.',
    category: 'AI Models',
    icon: 'Atom',
    installed: true,
    verified: true
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Real-time alerts and incident response directly in your #security channels.',
    category: 'Communication',
    icon: 'MessageSquareCode',
    installed: true,
    verified: true
  },
  {
    id: 'email',
    name: 'Enterprise Email',
    description: 'Daily summary reports and critical escalation notifications via SMTP or SendGrid.',
    category: 'Communication',
    icon: 'Mail',
    installed: false,
    verified: false
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Webhook-based alerting for developer communities and agile monitoring teams.',
    category: 'Communication',
    icon: 'Users',
    installed: false,
    verified: false
  },
  {
    id: 'datadog',
    name: 'Datadog',
    description: 'Stream Sentinel AI security events into your existing Datadog dashboards and monitors.',
    category: 'Observability',
    icon: 'Activity',
    installed: false,
    verified: false
  },
  {
    id: 'splunk',
    name: 'Splunk',
    description: 'Enterprise-grade log forwarding for long-term audit compliance and deep forensics.',
    category: 'Observability',
    icon: 'Database',
    installed: false,
    verified: false
  }
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'mo',
    description: 'Perfect for exploring our monitoring engine.',
    features: ['1 AI Agent', 'Standard Dashboard', '24h Log Retention'],
    buttonText: 'Get Started'
  },
  {
    name: 'Starter',
    price: '$49',
    period: 'mo',
    description: 'Essential tools for small collaborative teams.',
    features: ['5 AI Agents', '3 Team Members', '7-day Log Retention'],
    buttonText: 'Start Trial'
  },
  {
    name: 'Pro',
    price: '$149',
    period: 'mo',
    description: 'Advanced monitoring for growing deployments.',
    features: ['Unlimited Agents', 'Advanced Observability', '30-day Log Retention', 'API Access'],
    buttonText: 'Go Pro',
    recommended: true
  },
  {
    name: 'Business',
    price: '$499',
    period: 'mo',
    description: 'Enterprise-grade scaling with full control.',
    features: ['Dedicated Instance', 'Custom Compliance', '90-day Log Retention', 'SSO Integration'],
    buttonText: 'Contact Sales'
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'custom',
    description: 'Bespoke solutions for critical infrastructure.',
    features: ['Personalized Support', 'Infinite Retention', 'White-glove Setup'],
    buttonText: 'Request Quote'
  }
];

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Dr. Elena Voss',
    role: 'Chief Executive Officer',
    bio: 'Former Head of Safety at GlobalAI, Elena led the first regulatory compliance initiative for LLMs.',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&h=300&fit=crop',
    details: 'Elena holds a PhD in Human-AI Interaction and advocates for ethical agent governance.'
  },
  {
    name: 'Marcus Thorne',
    role: 'Chief Technology Officer',
    bio: 'A pioneer in distributed systems, Marcus holds 12 patents in real-time monitoring architectures.',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=300&h=300&fit=crop',
    details: 'Previously scaled core telemetry engines at Datacore and Neuralink.'
  },
  {
    name: 'Sarah Chen',
    role: 'Head of AI Ethics',
    bio: 'Sarah specializes in algorithmic bias detection and spent 5 years at the UN Data Initiative.',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&h=300&fit=crop',
    details: 'Leads the Sentinel Red-Teaming protocol development and dataset verification.'
  },
  {
    name: 'Julian Gray',
    role: 'VP of Engineering',
    bio: 'An expert in scalable cloud infrastructure, Julian previously scaled core services at OpsMaster.',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&h=300&fit=crop',
    details: 'Focuses on low-latency asynchronous trace ingestion and on-prem deployments.'
  }
];

export const JOB_OPENINGS: JobOpening[] = [
  {
    id: 'sec-eng',
    title: 'Senior Security Engineer',
    location: 'San Francisco / Remote',
    type: 'Full-time'
  },
  {
    id: 'ai-res',
    title: 'AI Monitoring Researcher',
    location: 'London / Remote',
    type: 'Full-time'
  },
  {
    id: 'prod-des',
    title: 'Lead Product Designer',
    location: 'Remote',
    type: 'Full-time'
  },
  {
    id: 'infra-lead',
    title: 'Cloud Infrastructure Lead',
    location: 'Singapore / Remote',
    type: 'Full-time'
  }
];

export const FAQS = [
  {
    q: 'How does Sentinel AI detect hallucinations?',
    a: 'We use a multi-agent verification system that cross-references model outputs against your grounding data, company policies, and business logic constraints in real-time.'
  },
  {
    q: 'Does this add latency to my AI application?',
    a: 'No. Sentinel AI operates fully asynchronously. We ingest trace payloads via our SDKs, proxy middleware, or webhooks, ensuring your user experience is never slowed down.'
  },
  {
    q: 'Is my enterprise data secure?',
    a: 'We are SOC2 Type II compliant and offer secure zero-knowledge monitoring. For regulated industries, we provide private VPC or on-premise deployments where data never leaves your network.'
  },
  {
    q: 'How do automated red-teaming attacks work?',
    a: 'Sentinel AI periodically executes simulated adversarial attacks (such as prompt injections, jailbreaks, and privilege escalation attempts) against your registered agents to identify gaps before production.'
  }
];

export const TESTIMONIALS = [
  {
    quote: "Sentinel AI caught a logic loop in our sales bot that was costing us $2,000 an hour in API tokens. We would never have seen it until the bill arrived.",
    author: "Sarah Chen",
    title: "CTO at Velox Systems",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&h=150&fit=crop"
  },
  {
    quote: "The hallucination detection is world-class. It's the only reason we were able to clear our AI support agent for production in a regulated industry.",
    author: "Marcus Thorne",
    title: "Head of AI, FinTrust",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&fit=crop"
  }
];

export const INITIAL_AGENTS: Agent[] = [
  { id: 'cs-v4', name: 'CustomerSupport_v4', status: 'active', perfScore: 98.4, latency: '142ms', tokens: 184500, anomalyRate: 0.1 },
  { id: 'market-gpt', name: 'MarketAnalysis_GPT', status: 'active', perfScore: 94.2, latency: '280ms', tokens: 89000, anomalyRate: 0.4 },
  { id: 'hr-bot', name: 'InternalHR_Bot', status: 'throttled', perfScore: 81.5, latency: '420ms', tokens: 41200, anomalyRate: 4.8 },
  { id: 'sales-v2', name: 'SalesAgent_V2', status: 'inactive', perfScore: 100, latency: '0ms', tokens: 0, anomalyRate: 0 },
  { id: 'data-synth', name: 'Data_Synthesizer', status: 'active', perfScore: 97.1, latency: '195ms', tokens: 125000, anomalyRate: 0.8 }
];

export const INITIAL_LOGS: LogEvent[] = [
  { id: '1', timestamp: '14:24:01.02', agentName: 'CustomerSupport_v4', action: 'Redacted user credit card info', status: 'SECURE', riskScore: 0.02 },
  { id: '2', timestamp: '14:23:45.19', agentName: 'MarketAnalysis_GPT', action: 'Analysis of Q3 projections complete', status: 'INFO', riskScore: 0.12 },
  { id: '3', timestamp: '14:21:12.88', agentName: 'InternalHR_Bot', action: 'Attempted prompt injection detected', status: 'BLOCKED', riskScore: 0.94 },
  { id: '4', timestamp: '14:18:02.34', agentName: 'CustomerSupport_v4', action: 'API connection re-established', status: 'RECOVERY', riskScore: 0.05 },
  { id: '5', timestamp: '14:15:55.00', agentName: 'Data_Synthesizer', action: 'Token limit warning threshold', status: 'WARNING', riskScore: 0.65 }
];

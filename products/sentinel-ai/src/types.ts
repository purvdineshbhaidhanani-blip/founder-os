export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'throttled' | 'inactive' | 'error';
  perfScore: number;
  latency: string;
  tokens: number;
  anomalyRate: number;
}

export interface LogEvent {
  id: string;
  timestamp: string;
  agentName: string;
  action: string;
  status: 'SECURE' | 'INFO' | 'BLOCKED' | 'RECOVERY' | 'WARNING';
  riskScore?: number;
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'AI Models' | 'Communication' | 'Observability';
  icon: string;
  installed: boolean;
  verified: boolean;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  recommended?: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
  details: string;
}

export interface JobOpening {
  id: string;
  title: string;
  location: string;
  type: string;
}

import { useState } from 'react';
import { Shield, Sparkles, Terminal, ShieldAlert, ArrowRight, Activity, FileText, CheckCircle2, ChevronRight, HelpCircle, MessageSquareText, Mail, Bell, AlertTriangle } from 'lucide-react';
import { FAQS, TESTIMONIALS } from '../data';

interface HeroHomeProps {
  onNavigate: (view: string) => void;
}

export default function HeroHome({ onNavigate }: HeroHomeProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleSlackInvestigate = () => {
    onNavigate('dashboard');
  };

  return (
    <div className="w-full">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[650px] flex flex-col items-center justify-center text-center px-6 md:px-12 py-24 overflow-hidden">
        {/* Subtle mesh background element */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-primary/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-brand-primary/10 border border-brand-primary/20">
            <span className="flex h-2.5 w-2.5 rounded-full bg-brand-primary status-pulse"></span>
            <span className="font-mono text-[11px] font-medium text-brand-primary tracking-widest uppercase">
              Agent Reliability Engine 2.0
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-4xl sm:text-6xl font-bold mb-6 leading-[1.15] text-on-surface tracking-tight">
            Know when your AI Agents fail <br className="hidden md:block" />
            <span className="text-brand-primary bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">
              before your customers do.
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-on-surface-variant mb-12 max-w-2xl mx-auto leading-relaxed">
            Monitor every autonomous AI agent from one workspace. Detect silent failures, hallucinations, private data leakage, and system risks with enterprise reliability monitors.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => onNavigate('auth')}
              className="w-full sm:w-auto bg-brand-primary text-on-primary px-8 py-4 rounded-xl font-semibold shadow-[0_0_20px_rgba(78,222,163,0.3)] hover:scale-105 transition-all cursor-pointer"
            >
              Get Started Free
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="w-full sm:w-auto bg-transparent border border-brand-border text-on-surface hover:text-brand-primary hover:border-brand-primary px-8 py-4 rounded-xl font-semibold hover:bg-brand-surface/60 transition-all cursor-pointer"
            >
              Book Strategic Demo
            </button>
          </div>
        </div>
      </section>

      {/* 2. BRAND LOGOS TRUSTED MARQUEE */}
      <section className="py-12 border-y border-brand-border/60 bg-brand-surface/30">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest text-on-surface-variant/75 mb-6 font-mono">
            Trusted by the architects of autonomous systems
          </p>
          <div className="marquee-container">
            <div className="marquee-content-track">
              {/* Set of logos */}
              <div className="flex items-center gap-3 grayscale opacity-45 hover:grayscale-0 hover:opacity-90 transition-all cursor-pointer font-display">
                <Shield className="w-6 h-6 text-brand-primary" />
                <span className="font-bold tracking-wider text-sm">CYBERDYNE SYSTEMS</span>
              </div>
              <div className="flex items-center gap-3 grayscale opacity-45 hover:grayscale-0 hover:opacity-90 transition-all cursor-pointer font-display">
                <Activity className="w-6 h-6 text-brand-secondary" />
                <span className="font-bold tracking-wider text-sm">DATACORE LOGISTICS</span>
              </div>
              <div className="flex items-center gap-3 grayscale opacity-45 hover:grayscale-0 hover:opacity-90 transition-all cursor-pointer font-display">
                <Sparkles className="w-6 h-6 text-brand-tertiary" />
                <span className="font-bold tracking-wider text-sm">NEURALINK OPS</span>
              </div>
              <div className="flex items-center gap-3 grayscale opacity-45 hover:grayscale-0 hover:opacity-90 transition-all cursor-pointer font-display">
                <Terminal className="w-6 h-6 text-on-surface" />
                <span className="font-bold tracking-wider text-sm">STRATUS DISTRIBUTED</span>
              </div>
              <div className="flex items-center gap-3 grayscale opacity-45 hover:grayscale-0 hover:opacity-90 transition-all cursor-pointer font-display">
                <ShieldAlert className="w-6 h-6 text-brand-primary" />
                <span className="font-bold tracking-wider text-sm">AEROSPACE COGNITIVE</span>
              </div>
              {/* Repeating Set to ensure loop spacing */}
              <div className="flex items-center gap-3 grayscale opacity-45 hover:grayscale-0 hover:opacity-90 transition-all cursor-pointer font-display">
                <Shield className="w-6 h-6 text-brand-primary" />
                <span className="font-bold tracking-wider text-sm">CYBERDYNE SYSTEMS</span>
              </div>
              <div className="flex items-center gap-3 grayscale opacity-45 hover:grayscale-0 hover:opacity-90 transition-all cursor-pointer font-display">
                <Activity className="w-6 h-6 text-brand-secondary" />
                <span className="font-bold tracking-wider text-sm">DATACORE LOGISTICS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM DIAGNOSTIC SECTION */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6 text-on-surface">
              AI Agents fail silently.<br />
              <span className="text-brand-tertiary">That's where risk propagates.</span>
            </h2>
            <p className="text-base sm:text-lg text-on-surface-variant mb-8 leading-relaxed">
              Unlike traditional API gateways or microservices, AI systems do not throw standard HTTP 500 status codes when they fail. They confidently issue wrong answers, leak private client logs, or enter recursive loops that exhaust your token budget.
            </p>
            <ul className="space-y-6">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-tertiary/10 border border-brand-tertiary/30 flex items-center justify-center shrink-0 text-brand-tertiary mt-1">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display text-base font-semibold text-on-surface">The "Confident Wrong"</h4>
                  <p className="text-sm text-on-surface-variant mt-1">Model hallucinations presented with factual conviction, misguiding active end-users.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 border border-brand-primary/30 flex items-center justify-center shrink-0 text-brand-primary mt-1">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display text-base font-semibold text-on-surface">PII / Data Leakage</h4>
                  <p className="text-sm text-on-surface-variant mt-1">Private client identities, SSNs, and secure credentials inadvertently printed into generative text.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Simulated Diagnostic Panel */}
          <div className="bg-brand-surface rounded-2xl border border-brand-border p-6 md:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-tertiary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-6 border-b border-brand-border/60 pb-4">
              <span className="flex h-3 w-3 rounded-full bg-brand-tertiary status-pulse"></span>
              <span className="font-mono text-xs font-semibold text-brand-tertiary tracking-wider uppercase">
                Critical Agent Anomaly Detected
              </span>
            </div>

            <div className="bg-[#050505] rounded-xl p-5 border border-brand-border font-mono text-xs text-on-surface-variant leading-relaxed">
              <p className="text-on-surface mb-2">[System] Initializing Telemetry Trace...</p>
              <p className="text-[#888]">[14:02:18] Agent Instance: <span className="text-brand-secondary">CustomerSuccess_V3</span></p>
              <p className="text-brand-tertiary font-medium">[ALERT] Anomaly Detected in State 4: Refund_Authorization</p>
              <p className="text-[#888]">[Trace] Recursive Reasoning loop detected (Depth: 14)</p>
              <p className="text-brand-tertiary font-medium">[Error] 94% probability of Hallucination detected</p>
              <p className="text-brand-primary mt-3">[Sentinel] Mitigation: Throttling budget allocation & alerting supervisor.</p>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-xs font-mono text-on-surface-variant mb-2">
                <span>Anomaly Severity Probability</span>
                <span className="text-brand-tertiary font-semibold">94% Critical</span>
              </div>
              <div className="h-2 w-full bg-brand-border rounded-full overflow-hidden">
                <div className="h-full bg-brand-tertiary rounded-full w-11/12" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BENTO GRID FEATURES PREVIEW */}
      <section className="py-24 px-6 md:px-12 bg-brand-surface/20 border-y border-brand-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-on-surface">
              Complete Observability Suite
            </h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              Surgical monitoring, auditing tools, and compliance safeguards built for companies operating with production-level AI workforces.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 - Large Bento */}
            <div className="md:col-span-2 shimmer-border bg-brand-surface p-8 rounded-2xl border border-brand-border/80 flex flex-col justify-between min-h-[350px]">
              <div>
                <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/30 rounded-lg flex items-center justify-center text-brand-primary mb-6">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-2">AI Health Score</h3>
                <p className="text-on-surface-variant text-sm max-w-md">
                  A high-fidelity composite metric evaluating active agent reliability, response latencies, policy compliance, and token expenditure.
                </p>
              </div>
              {/* Graphic Element */}
              <div className="mt-8 h-28 flex items-end gap-1.5 border-b border-brand-border pb-1">
                <div className="w-full bg-brand-primary/10 h-[30%] rounded hover:bg-brand-primary/30 transition-all cursor-pointer"></div>
                <div className="w-full bg-brand-primary/15 h-[50%] rounded hover:bg-brand-primary/30 transition-all cursor-pointer"></div>
                <div className="w-full bg-brand-primary/10 h-[45%] rounded hover:bg-brand-primary/30 transition-all cursor-pointer"></div>
                <div className="w-full bg-brand-primary/20 h-[75%] rounded hover:bg-brand-primary/40 transition-all cursor-pointer"></div>
                <div className="w-full bg-brand-primary/30 h-[92%] rounded hover:bg-brand-primary/50 transition-all cursor-pointer"></div>
                <div className="w-full bg-brand-primary/25 h-[65%] rounded hover:bg-brand-primary/45 transition-all cursor-pointer"></div>
                <div className="w-full bg-brand-primary/40 h-[85%] rounded hover:bg-brand-primary/60 transition-all cursor-pointer"></div>
              </div>
            </div>

            {/* Feature 2 - Small Bento */}
            <div className="bg-brand-surface p-8 rounded-2xl border border-brand-border/80 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-brand-secondary/10 border border-brand-secondary/30 rounded-lg flex items-center justify-center text-brand-secondary mb-6">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-2">Incident Timeline</h3>
                <p className="text-on-surface-variant text-sm">
                  Frame-by-frame analysis of active logs. Drill down into individual prompt traces and policy deviations instantly.
                </p>
              </div>
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 bg-[#050505] rounded-lg p-3 border border-brand-border/60">
                  <span className="w-1.5 h-6 bg-brand-primary rounded-full" />
                  <span className="font-mono text-[10px] text-on-surface">14:20 - Model Policy Verified</span>
                </div>
                <div className="flex items-center gap-3 bg-[#050505] rounded-lg p-3 border border-brand-border/60">
                  <span className="w-1.5 h-6 bg-brand-tertiary rounded-full animate-pulse" />
                  <span className="font-mono text-[10px] text-brand-tertiary">14:21 - Hallucination Blocked</span>
                </div>
              </div>
            </div>

            {/* Feature 3 - Small Bento */}
            <div className="bg-brand-surface p-8 rounded-2xl border border-brand-border/80">
              <div className="w-12 h-12 bg-brand-tertiary/10 border border-brand-tertiary/30 rounded-lg flex items-center justify-center text-brand-tertiary mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-2">Plain English Reports</h3>
              <p className="text-on-surface-variant text-sm">
                Automated summaries explaining raw system logs, trace variables, and complex failures in clear business terms for stakeholders.
              </p>
            </div>

            {/* Feature 4 - Large Bento */}
            <div className="md:col-span-2 bg-brand-surface p-8 rounded-2xl border border-brand-border/80 overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display text-xl font-bold text-on-surface mb-2">Automated Red-Teaming</h3>
                  <p className="text-on-surface-variant text-sm max-w-md">
                    Continual automated diagnostic evaluation to test prompt injections, jailbreaks, and memory-poisoning threats before bad actors can exploit them.
                  </p>
                </div>
                <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/30 rounded-lg flex items-center justify-center text-brand-primary shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="flex gap-4 mt-4">
                <div className="flex-1 h-10 rounded-lg bg-brand-border/40 animate-pulse"></div>
                <div className="flex-1 h-10 rounded-lg bg-brand-border/60 animate-pulse delay-100"></div>
                <div className="flex-1 h-10 rounded-lg bg-brand-border/40 animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DASHBOARD SCREEN PREVIEW */}
      <section className="py-24 bg-[#050505] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-on-surface">
              Mission Control for Your AI Workforce
            </h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              Unified real-time telemetry, model benchmarks, prompt logs, and guardrails inside a central web console.
            </p>
          </div>

          <div className="shimmer-border p-3 bg-brand-surface/40 rounded-2xl border border-brand-border max-w-4xl mx-auto">
            <div className="rounded-xl border border-brand-border overflow-hidden bg-brand-bg shadow-2xl relative aspect-video flex flex-col items-center justify-center">
              {/* Fake dashboard visual */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-bg via-brand-surface/90 to-brand-bg opacity-90" />
              <div className="relative z-10 flex flex-col items-center p-6 text-center">
                <Activity className="w-12 h-12 text-brand-primary mb-4 animate-pulse" />
                <h4 className="font-display text-lg font-bold text-on-surface">Interactive Sentinel Dashboard</h4>
                <p className="text-sm text-on-surface-variant mt-2 max-w-sm">
                  Click below to open our fully responsive, live log-ingesting developer sandbox.
                </p>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="mt-6 bg-brand-primary text-on-primary font-semibold px-6 py-2.5 rounded-lg text-sm shadow-md cursor-pointer hover:scale-105 transition-all"
                >
                  Enter Live Console
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTEGRATIONS ALERTS */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 md:p-14 flex flex-col lg:flex-row gap-12 items-center">
          <div className="lg:w-1/2">
            <h2 className="font-display text-3xl font-bold mb-6 text-on-surface">
              Alerts where you live.
            </h2>
            <p className="text-on-surface-variant mb-8 text-base">
              Establish connections from Sentinel AI to your active engineering stack. We ping your teams immediately through Slack, webhooks, or email when an anomaly threshold is broken.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => onNavigate('integrations')}
                className="p-3.5 bg-brand-bg hover:border-brand-primary hover:text-brand-primary transition-all rounded-xl border border-brand-border flex items-center justify-center cursor-pointer"
              >
                <MessageSquareText className="w-6 h-6" />
              </button>
              <button
                onClick={() => onNavigate('integrations')}
                className="p-3.5 bg-brand-bg hover:border-brand-primary hover:text-brand-primary transition-all rounded-xl border border-brand-border flex items-center justify-center cursor-pointer"
              >
                <Mail className="w-6 h-6" />
              </button>
              <button
                onClick={() => onNavigate('integrations')}
                className="p-3.5 bg-brand-bg hover:border-brand-primary hover:text-brand-primary transition-all rounded-xl border border-brand-border flex items-center justify-center cursor-pointer"
              >
                <Shield className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="lg:w-1/2 w-full">
            {/* Interactive Simulated Slack Notification Card */}
            <div className="bg-[#0c0c0d] p-6 rounded-2xl shadow-2xl border border-brand-border hover:border-brand-primary/40 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded bg-brand-primary flex items-center justify-center font-bold text-on-primary">
                  S
                </div>
                <div>
                  <span className="font-bold text-sm text-on-surface">Sentinel AI</span>
                  <span className="text-on-surface-variant text-[10px] uppercase font-mono ml-2">APP • 12:11 PM</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-brand-tertiary mb-1">🚨 ANOMALY ALERT: SupportAgent_v4</p>
              <p className="text-xs text-on-surface-variant mb-4">
                Hallucination score jumped to <span className="text-brand-tertiary font-bold font-mono">0.85</span> in customer session #4492. Potential PII leak detected.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleSlackInvestigate}
                  className="px-4 py-1.5 bg-brand-primary text-on-primary text-xs rounded font-semibold hover:shadow-md cursor-pointer hover:brightness-105"
                >
                  Investigate Telemetry
                </button>
                <button
                  onClick={() => alert('Anomaly feedback report submitted to Red-Team logs')}
                  className="px-3 py-1.5 bg-brand-surface text-on-surface-variant text-xs rounded border border-brand-border hover:text-on-surface cursor-pointer"
                >
                  Ignore (Audit Safe)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRICING QUICK SUMMARY CARD */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl font-bold mb-4 text-on-surface">
            Scalable plans for any infrastructure
          </h2>
          <p className="text-on-surface-variant max-w-md mx-auto">
            From developers testing locally to global companies auditing heavy prompt pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-brand-surface p-8 rounded-2xl border border-brand-border flex flex-col justify-between hover:border-brand-border/100 transition-colors">
            <div>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block mb-2">Developer Pack</span>
              <h3 className="text-2xl font-bold text-on-surface mb-2">$0</h3>
              <p className="text-sm text-on-surface-variant mb-6">Perfect for individuals experimenting with LLMs.</p>
              <ul className="space-y-3 text-sm text-on-surface-variant mb-8 border-t border-brand-border/60 pt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> 1 AI Agent</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> Standard Web Console</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> 24-hour retention</li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('auth')}
              className="w-full py-3 rounded-lg bg-brand-bg text-on-surface font-semibold border border-brand-border hover:border-brand-primary transition-all cursor-pointer"
            >
              Get Started
            </button>
          </div>

          <div className="shimmer-border bg-brand-surface p-8 rounded-2xl flex flex-col justify-between relative scale-100 md:scale-105 shadow-2xl">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-primary text-on-primary text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-widest">
              Most Popular
            </div>
            <div>
              <span className="font-mono text-[10px] text-brand-primary uppercase tracking-widest block mb-2 mt-2">Production Pro</span>
              <h3 className="text-2xl font-bold text-on-surface mb-2">$149<span className="text-xs text-on-surface-variant font-normal"> / mo</span></h3>
              <p className="text-sm text-on-surface-variant mb-6">For expanding applications handling critical workloads.</p>
              <ul className="space-y-3 text-sm text-on-surface-variant mb-8 border-t border-brand-border/60 pt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> Unlimited AI Agents</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> Advanced Observability</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> 30-day retention</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> Full REST API Access</li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('pricing')}
              className="w-full py-3 rounded-lg bg-brand-primary text-on-primary font-bold shadow-[0_0_20px_rgba(78,222,163,0.3)] hover:scale-102 transition-all cursor-pointer"
            >
              Configure Plan
            </button>
          </div>

          <div className="bg-brand-surface p-8 rounded-2xl border border-brand-border flex flex-col justify-between hover:border-brand-border/100 transition-colors">
            <div>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest block mb-2">Enterprise Grid</span>
              <h3 className="text-2xl font-bold text-on-surface mb-2">Custom</h3>
              <p className="text-sm text-on-surface-variant mb-6">Secure custom hosting and multi-user audit logs.</p>
              <ul className="space-y-3 text-sm text-on-surface-variant mb-8 border-t border-brand-border/60 pt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> Dedicated Instance hosting</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> SOC2 Compliance guarantees</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> 24/7 dedicated support team</li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('contact')}
              className="w-full py-3 rounded-lg bg-brand-bg text-on-surface font-semibold border border-brand-border hover:border-brand-primary transition-all cursor-pointer"
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS */}
      <section className="py-24 px-6 md:px-12 bg-brand-surface/10 border-t border-brand-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="bg-brand-surface p-8 rounded-2xl border border-brand-border shadow-md flex flex-col justify-between">
                <p className="text-lg italic text-on-surface-variant mb-8 leading-relaxed">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-4">
                  <img src={t.avatar} alt={t.author} className="w-12 h-12 rounded-full object-cover border border-brand-border" />
                  <div>
                    <h5 className="font-display text-sm font-semibold text-on-surface">{t.author}</h5>
                    <p className="text-xs text-on-surface-variant mt-0.5">{t.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section className="py-24 px-6 md:px-12 max-w-4xl mx-auto">
        <h2 className="font-display text-3xl font-bold mb-12 text-center text-on-surface">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div
              key={idx}
              className="border-b border-brand-border/60 pb-4"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="flex justify-between items-center w-full text-left font-display text-base font-semibold py-3 text-on-surface hover:text-brand-primary transition-colors cursor-pointer focus:outline-none"
              >
                <span>{faq.q}</span>
                <span className={`transform transition-transform text-brand-primary ${openFaq === idx ? 'rotate-180' : 'rotate-0'}`}>
                  <ChevronRight className="w-5 h-5" />
                </span>
              </button>
              {openFaq === idx && (
                <div className="text-sm text-on-surface-variant mt-2 leading-relaxed animate-fade-in pl-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

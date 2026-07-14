import { useState } from 'react';
import { Search, BrainCircuit, Sparkles, Atom, MessageSquareCode, Mail, Users, Activity, Database, CheckCircle, Plus, Info, ExternalLink } from 'lucide-react';
import { INTEGRATIONS_DATA } from '../data';
import { Integration } from '../types';

export default function IntegrationsView() {
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'AI Models' | 'Communication' | 'Observability'>('All');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(INTEGRATIONS_DATA[2]); // Default Google Gemini

  const handleToggleInstall = (id: string) => {
    setIntegrations(prev =>
      prev.map(item => (item.id === id ? { ...item, installed: !item.installed } : item))
    );
  };

  const filtered = integrations.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getCodeSnippet = (integration: Integration) => {
    switch (integration.id) {
      case 'openai':
        return `import { Sentinel } from '@sentinel/sdk';
import { OpenAI } from 'openai';

const sentinel = new Sentinel({ apiKey: process.env.SENTINEL_API_KEY });
const openai = new OpenAI();

// Sentinel intercepts and monitors request stream in background
const response = await sentinel.monitor(openai.chat.completions.create({
  model: "gpt-4-turbo",
  messages: [{ role: "user", content: prompt }]
}));`;
      case 'anthropic':
        return `import { Sentinel } from '@sentinel/sdk';
import { Anthropic } from '@anthropic-ai/sdk';

const sentinel = new Sentinel({ apiKey: process.env.SENTINEL_API_KEY });
const anthropic = new Anthropic();

// Constitutional safety checks are applied asynchronously
const response = await sentinel.trace("Claude-3", () => 
  anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }]
  })
);`;
      case 'gemini':
        return `import { Sentinel } from '@sentinel/sdk';
import { GoogleGenAI } from '@google/genai';

const sentinel = new Sentinel({ apiKey: process.env.SENTINEL_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Real-time hallucination evaluation interceptor
const response = await sentinel.observeGemini(
  ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  })
);`;
      case 'slack':
        return `// Send custom alert events to your workspace security channels
import { Sentinel } from '@sentinel/sdk';

const sentinel = new Sentinel({ apiKey: process.env.SENTINEL_API_KEY });

await sentinel.configureAlerts({
  channel: "slack",
  webhookUrl: "https://hooks.slack.com/services/T00000/B00000/XXXXXX",
  minSeverity: "WARNING",
  notifyOnAnomaly: true
});`;
      default:
        return `import { Sentinel } from '@sentinel/sdk';

const sentinel = new Sentinel({ apiKey: process.env.SENTINEL_API_KEY });

// Push asynchronous logs to sentinel
await sentinel.logTrace({
  agentId: "${integration.id}_agent_v1",
  event: "custom_verification_trace",
  payload: { text: "Audit log message" }
});`;
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'BrainCircuit': return <BrainCircuit className="w-6 h-6 text-brand-primary" />;
      case 'Sparkles': return <Sparkles className="w-6 h-6 text-brand-secondary" />;
      case 'Atom': return <Atom className="w-6 h-6 text-brand-primary" />;
      case 'MessageSquareCode': return <MessageSquareCode className="w-6 h-6 text-[#4edea3]" />;
      case 'Mail': return <Mail className="w-6 h-6 text-brand-secondary" />;
      case 'Users': return <Users className="w-6 h-6 text-brand-primary" />;
      case 'Activity': return <Activity className="w-6 h-6 text-brand-secondary" />;
      case 'Database': return <Database className="w-6 h-6 text-brand-primary" />;
      default: return <BrainCircuit className="w-6 h-6 text-brand-primary" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
      {/* View Header */}
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold text-on-surface mb-4">
          External Integrations Hub
        </h1>
        <p className="text-on-surface-variant max-w-xl mx-auto text-sm sm:text-base">
          Establish asynchronous connections to feed model logs into Sentinel, or pipe anomalies into slack alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Side: Search and Listings */}
        <div className="lg:col-span-7 space-y-8">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-brand-surface p-4 rounded-xl border border-brand-border/80">
            <div className="relative w-full sm:w-72">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search platforms..."
                className="w-full bg-[#050505] pl-10 pr-4 py-2 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
              {(['All', 'AI Models', 'Communication', 'Observability'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer shrink-0 border transition-all ${
                    categoryFilter === cat
                      ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedIntegration(item)}
                className={`p-6 rounded-xl border bg-brand-surface transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01] ${
                  selectedIntegration?.id === item.id
                    ? 'border-brand-primary shadow-lg shadow-brand-primary/5 bg-brand-surface'
                    : 'border-brand-border/60 hover:border-brand-border'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 rounded-lg bg-brand-bg border border-brand-border/60">
                      {getIcon(item.icon)}
                    </div>
                    {item.verified && (
                      <span className="bg-brand-primary/10 text-brand-primary text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        Verified
                      </span>
                    )}
                  </div>
                  <h4 className="font-display text-base font-bold text-on-surface mb-2">{item.name}</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3 mb-4">{item.description}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-brand-border/30">
                  <span className="text-[10px] uppercase font-mono text-on-surface-variant">{item.category}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleInstall(item.id);
                    }}
                    className={`text-xs font-semibold px-3 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                      item.installed
                        ? 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20'
                        : 'bg-brand-bg border border-brand-border text-on-surface hover:border-brand-primary hover:text-brand-primary'
                    }`}
                  >
                    {item.installed ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Connected
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Interactive Integration Playground */}
        <div className="lg:col-span-5 bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-8 space-y-6 self-start">
          {selectedIntegration ? (
            <>
              <div className="flex items-center gap-4 border-b border-brand-border pb-4">
                <div className="p-3 bg-brand-bg rounded-xl border border-brand-border">
                  {getIcon(selectedIntegration.icon)}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-on-surface">{selectedIntegration.name} Connection</h3>
                  <p className="text-xs text-on-surface-variant">Setup trace proxies asynchronously.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-mono font-bold text-brand-primary uppercase tracking-wider mb-2">SDK Setup Guide</h5>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Install the Sentinel telemetry client library and initialize with your credentials to automatically intercept request streams.
                  </p>
                </div>

                <div className="bg-[#050505] rounded-lg p-3 border border-brand-border/60">
                  <code className="text-xs font-mono text-[#fc7c78]">$ npm install @sentinel/sdk</code>
                </div>

                <div>
                  <h5 className="text-xs font-mono font-bold text-brand-secondary uppercase tracking-wider mb-2">Initialize Script</h5>
                  <div className="relative">
                    <pre className="bg-[#050505] p-4 rounded-xl border border-brand-border text-xs font-mono overflow-x-auto text-[#fff]/90 leading-relaxed max-h-[300px]">
                      {getCodeSnippet(selectedIntegration)}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-on-surface-variant bg-brand-bg/60 p-3 rounded-lg border border-brand-border/40">
                  <Info className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>Sentinel client uses zero-allocation logs proxying with negligible overhead.</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <BrainCircuit className="w-12 h-12 text-brand-border mx-auto mb-4 animate-pulse" />
              <h4 className="font-display text-base font-semibold text-on-surface">Select an Integration</h4>
              <p className="text-xs text-on-surface-variant mt-1">Choose a provider from the left panel to display setup guides.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

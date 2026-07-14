import { useState, useEffect, FormEvent } from 'react';
import { INITIAL_AGENTS, INITIAL_LOGS } from '../data';
import { Agent, LogEvent } from '../types';
import { Shield, Play, Pause, AlertTriangle, CheckCircle, RotateCw, Sparkles, Terminal, Activity, Plus, Filter, Info, Trash2 } from 'lucide-react';

export default function DashboardView() {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [logs, setLogs] = useState<LogEvent[]>(INITIAL_LOGS);
  const [selectedAgentName, setSelectedAgentName] = useState<string | null>(null);

  // For Adding new agents in-session
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentStatus, setNewAgentStatus] = useState<'active' | 'throttled' | 'inactive'>('active');

  // Diagnostic states
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Periodic simulated log ticks
  useEffect(() => {
    const timer = setInterval(() => {
      // Periodic soft activity logs
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      if (randomAgent.status === 'inactive') return;

      const actions = [
        "Verified system boundary parameters",
        "Scrubbed credit card trace chunk",
        "Dispatched model grounding payload",
        "Asynchronous latency calculation complete",
        "Token verification audit check"
      ];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];

      const newLog: LogEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        agentName: randomAgent.name,
        action: randomAction,
        status: 'SECURE',
        riskScore: Math.round(Math.random() * 8) / 100
      };

      setLogs(prev => [newLog, ...prev.slice(0, 19)]);
    }, 9000);

    return () => clearInterval(timer);
  }, [agents]);

  // Handle diagnostic countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isRecalibrating) {
      setIsRecalibrating(false);
      // Reset HR Bot status to active (recalibrated!)
      setAgents(prev =>
        prev.map(a => (a.id === 'hr-bot' ? { ...a, status: 'active', perfScore: 98.2, anomalyRate: 0.1 } : a))
      );
    }
  }, [countdown, isRecalibrating]);

  const handleCreateAgent = (e: FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: newAgentName.trim().replace(/\s+/g, '_'),
      status: newAgentStatus,
      perfScore: newAgentStatus === 'active' ? 95.8 : (newAgentStatus === 'throttled' ? 82.1 : 100),
      latency: newAgentStatus === 'inactive' ? '0ms' : `${Math.round(100 + Math.random() * 200)}ms`,
      tokens: newAgentStatus === 'inactive' ? 0 : Math.round(10000 + Math.random() * 50000),
      anomalyRate: newAgentStatus === 'throttled' ? 4.5 : 0.2
    };

    setAgents(prev => [...prev, newAgent]);
    setNewAgentName('');

    // Append audit log
    const creationLog: LogEvent = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      agentName: newAgent.name,
      action: `Initialized and verified node container (Status: ${newAgent.status})`,
      status: 'INFO',
      riskScore: 0.01
    };
    setLogs(prev => [creationLog, ...prev]);
  };

  const handleInjectAnomaly = () => {
    const target = agents[Math.floor(Math.random() * agents.length)];
    const threats = [
      "Potential jailbreak injection packet",
      "PII leaks in generated response stream",
      "Model hallucination variance > 0.85",
      "Recursive API budget allocation loop"
    ];
    const threatMsg = threats[Math.floor(Math.random() * threats.length)];

    const anomalyLog: LogEvent = {
      id: `anom-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      agentName: target.name,
      action: `[CRITICAL ANOMALY] ${threatMsg}`,
      status: 'BLOCKED',
      riskScore: Math.round(80 + Math.random() * 19) / 100
    };

    setLogs(prev => [anomalyLog, ...prev]);

    // Update target agent parameters to error status
    setAgents(prev =>
      prev.map(a => (a.id === target.id ? { ...a, status: 'error', anomalyRate: 12.4, perfScore: 68.4 } : a))
    );
  };

  const handleTriggerRecalibration = () => {
    setIsRecalibrating(true);
    setCountdown(3);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = selectedAgentName
    ? logs.filter(l => l.agentName === selectedAgentName)
    : logs;

  // Composite Calculations
  const averageHealth = Math.round(agents.reduce((acc, curr) => acc + curr.perfScore, 0) / agents.length);
  const totalTokens = agents.reduce((acc, curr) => acc + curr.tokens, 0);
  const activeCount = agents.filter(a => a.status === 'active').length;

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'SECURE': return 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary';
      case 'INFO': return 'bg-brand-secondary/10 border-brand-secondary/30 text-brand-secondary';
      case 'WARNING': return 'bg-[#fc7c78]/10 border-[#fc7c78]/30 text-[#fc7c78]';
      case 'BLOCKED': return 'bg-brand-tertiary/15 border-brand-tertiary/40 text-brand-tertiary font-bold';
      case 'RECOVERY': return 'bg-brand-secondary/15 border-brand-secondary/35 text-brand-secondary';
      default: return 'bg-brand-border/40 text-on-surface-variant';
    }
  };

  const getAgentStatusBullet = (status: string) => {
    switch (status) {
      case 'active': return 'bg-brand-primary';
      case 'throttled': return 'bg-brand-secondary';
      case 'inactive': return 'bg-brand-border';
      case 'error': return 'bg-brand-tertiary status-pulse';
      default: return 'bg-brand-border';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 space-y-8">
      {/* Overview Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Composite Health Card */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Workspace Health</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-extrabold text-on-surface text-glow">{averageHealth}%</span>
              <span className="text-xs text-brand-primary font-mono font-bold">Stable</span>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-[#050505] rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary rounded-full transition-all duration-1000" style={{ width: `${averageHealth}%` }} />
          </div>
        </div>

        {/* Active Nodes Card */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Active Nodes</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-display font-extrabold text-on-surface">{activeCount}</span>
              <span className="text-xs text-on-surface-variant">/ {agents.length} containers</span>
            </div>
          </div>
          <div className="flex gap-1.5 mt-4">
            {agents.map((a, i) => (
              <span key={i} className={`h-2.5 w-2.5 rounded-full ${getAgentStatusBullet(a.status)}`} title={a.name} />
            ))}
          </div>
        </div>

        {/* Total Tokens audited */}
        <div className="bg-brand-surface p-6 rounded-2xl border border-brand-border/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Audited Tokens</span>
            <span className="text-4xl font-display font-extrabold text-on-surface">{(totalTokens / 1000).toFixed(1)}k</span>
          </div>
          <span className="text-[10px] font-mono text-brand-secondary uppercase tracking-wider block mt-4">asynchronous proxies</span>
        </div>

        {/* Threat Controls Panel */}
        <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border/80 flex flex-col gap-2.5 justify-center">
          <button
            onClick={handleInjectAnomaly}
            className="w-full bg-brand-tertiary/10 hover:bg-brand-tertiary hover:text-on-primary text-brand-tertiary border border-brand-tertiary/30 font-bold text-xs py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Inject Threat payload
          </button>
          <button
            onClick={handleTriggerRecalibration}
            disabled={isRecalibrating}
            className="w-full bg-brand-primary/10 hover:bg-brand-primary hover:text-on-primary text-brand-primary border border-brand-primary/30 font-bold text-xs py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRecalibrating ? 'animate-spin' : ''}`} />
            {isRecalibrating ? `Self-Healing... (${countdown}s)` : 'Deploy self-healing fix'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Agent roster and adding agents */}
        <div className="lg:col-span-5 space-y-6">
          {/* Agent registration wizard */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6">
            <h4 className="font-display font-bold text-sm text-on-surface mb-4">Register Telemetry Container</h4>
            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-on-surface-variant uppercase mb-1.5">Agent Identifier</label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                  placeholder="BillingBot_v1"
                  className="w-full bg-[#050505] p-2.5 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-on-surface-variant uppercase mb-1.5">Launch Condition</label>
                <div className="flex gap-2">
                  {(['active', 'throttled', 'inactive'] as const).map(cond => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setNewAgentStatus(cond)}
                      className={`flex-1 py-1.5 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer capitalize ${
                        newAgentStatus === cond
                          ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary'
                          : 'border-brand-border/60 text-on-surface-variant'
                      }`}
                    >
                      {cond}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-brand-primary text-on-primary font-bold text-xs rounded-lg shadow-md cursor-pointer hover:brightness-105 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Initialize Agent Container
              </button>
            </form>
          </div>

          {/* Registered agent roster list */}
          <div className="bg-brand-surface border border-brand-border/80 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-display font-bold text-sm text-on-surface">Registered Nodes</h4>
              {selectedAgentName && (
                <button
                  onClick={() => setSelectedAgentName(null)}
                  className="text-[10px] font-mono text-brand-tertiary hover:underline cursor-pointer"
                >
                  Clear Filter
                </button>
              )}
            </div>

            <div className="space-y-3">
              {agents.map(agent => {
                const isSelected = selectedAgentName === agent.name;
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentName(isSelected ? null : agent.name)}
                    className={`p-3.5 bg-brand-bg rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-border/40 hover:border-brand-border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${getAgentStatusBullet(agent.status)}`} />
                      <div>
                        <h5 className="font-mono text-xs font-bold text-on-surface">{agent.name}</h5>
                        <p className="text-[10px] text-on-surface-variant mt-0.5">Latency: {agent.latency} • Score: {agent.perfScore}%</p>
                      </div>
                    </div>

                    <span className="font-mono text-[10px] text-on-surface-variant">{agent.tokens > 0 ? `${(agent.tokens / 1000).toFixed(1)}k` : '0'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Interactive logs terminal */}
        <div className="lg:col-span-7 bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col h-[585px]">
          <div className="flex justify-between items-center border-b border-brand-border pb-4 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="text-brand-primary w-4 h-4" />
              <h4 className="font-display font-bold text-sm text-on-surface">Asynchronous Audited Log Stream</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearLogs}
                className="p-1.5 text-on-surface-variant hover:text-brand-tertiary transition-colors cursor-pointer"
                title="Clear Logs Feed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active logs filter badge */}
          {selectedAgentName && (
            <div className="mb-3 px-3 py-1.5 bg-brand-primary/10 border border-brand-primary/30 rounded-lg text-[10px] text-brand-primary font-mono flex items-center justify-between shrink-0 animate-fade-in">
              <span>Filtering telemetry trace logs for: <strong>{selectedAgentName}</strong></span>
              <button onClick={() => setSelectedAgentName(null)} className="font-bold uppercase tracking-wider text-[9px] hover:underline cursor-pointer">
                Remove Filter
              </button>
            </div>
          )}

          {/* Logs Terminal list */}
          <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs pr-1">
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="bg-[#050505] border border-brand-border/60 rounded-lg p-3.5 flex flex-col gap-2 relative overflow-hidden group hover:border-brand-border"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#555]">{log.timestamp}</span>
                      <span className="font-bold text-on-surface">{log.agentName}</span>
                    </div>

                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusClass(log.status)}`}>
                      {log.status}
                    </span>
                  </div>

                  <p className="text-on-surface-variant text-[11px] leading-relaxed italic">{log.action}</p>

                  {log.riskScore !== undefined && (
                    <div className="flex justify-between items-center pt-1.5 border-t border-brand-border/20 text-[10px] text-[#555]">
                      <span>Compliance Hazard Score</span>
                      <span className={`font-bold ${log.riskScore > 0.5 ? 'text-brand-tertiary' : 'text-brand-primary'}`}>
                        {Math.round(log.riskScore * 100)}% Risk
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-20 text-on-surface-variant italic">
                Logs console empty. Click "Inject Threat Payload" or wait for background agent events.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center gap-2 text-[10px] text-[#555] shrink-0">
            <Info className="w-3.5 h-3.5 text-brand-primary" />
            <span>Telemetry buffer is persistent. New audit ticks arrive every 9 seconds.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

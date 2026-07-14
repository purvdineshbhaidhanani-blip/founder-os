import { useState, useEffect, useRef, FormEvent } from 'react';
import { Send, CheckCircle2, MessageSquareText, Mail, ShieldCheck, MapPin, Clock } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export default function ContactView() {
  const [form, setForm] = useState({ name: '', email: '', company: '', topic: 'Security Compliance', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Support Chatbox State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'Hello! I am Sentinel Support Bot. Ask me any technical questions about our API integrations, latency, or compliance.' }
  ]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isBotTyping]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setForm({ name: '', email: '', company: '', topic: 'Security Compliance', message: '' });
    }, 4000);
  };

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const prompt = chatInput.toLowerCase();
    setChatInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      let botResponse = "I have noted your request. Would you like to schedule a deep-dive call with our telemetry architects? You can submit our Inquiry Protocol form on the left.";
      
      if (prompt.includes('latency') || prompt.includes('slow')) {
        botResponse = "Sentinel AI operates asynchronously outside your execution path, which adds 0ms of latency to your client-facing LLM interactions. We process telemetry chunks in lightweight background queues.";
      } else if (prompt.includes('security') || prompt.includes('compliance') || prompt.includes('soc2')) {
        botResponse = "Sentinel AI is SOC2 Type II certified. Our platform features edge-based zero-knowledge PII scrubbing. We also support on-premises hosting and private VPC installations to prevent any data egress.";
      } else if (prompt.includes('openai') || prompt.includes('claude') || prompt.includes('gemini') || prompt.includes('model')) {
        botResponse = "We offer native integration proxies for OpenAI GPT-4o, Anthropic Claude 3.5, and Google Gemini 2.5-pro/flash. Connection is as simple as running our wrapper or adding a lightweight middleware client.";
      } else if (prompt.includes('price') || prompt.includes('pricing') || prompt.includes('cost')) {
        botResponse = "We offer a Free Developer tier. Our Pro tier starts at $149/mo (which includes unlimited agents and 30-day retention). Our custom Enterprise contracts feature bespoke dedicated environments.";
      }

      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'bot', text: botResponse }]);
      setIsBotTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="font-display text-4xl font-bold text-on-surface mb-4">
          Sentinel Inquiry Protocol
        </h1>
        <p className="text-on-surface-variant max-w-xl mx-auto text-sm sm:text-base">
          Connect directly with our security compliance leads and systems architects for white-glove setup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left: Contact Form */}
        <div className="lg:col-span-6 bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-10">
          <h3 className="font-display text-xl font-bold text-on-surface mb-6">Strategic Contact Protocol</h3>
          {isSubmitted ? (
            <div className="text-center py-16 space-y-4">
              <CheckCircle2 className="w-14 h-14 text-brand-primary mx-auto animate-bounce" />
              <h4 className="font-display text-xl font-bold text-on-surface">Message Transmitted Successfully</h4>
              <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
                Thank you! Your secure transmission has been routed to our technical support team. We will respond within 2 business hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="Marcus Thorne"
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({...form, email: e.target.value})}
                    placeholder="marcus@fintrust.com"
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Company Name</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => setForm({...form, company: e.target.value})}
                    placeholder="FinTrust Systems"
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Inquiry Topic</label>
                  <select
                    value={form.topic}
                    onChange={e => setForm({...form, topic: e.target.value})}
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary"
                  >
                    <option>Security & Compliance</option>
                    <option>On-Prem / VPC Deployments</option>
                    <option>High-Throughput SLAs</option>
                    <option>Partner Integrations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Inquiry Details</label>
                <textarea
                  rows={5}
                  required
                  value={form.message}
                  onChange={e => setForm({...form, message: e.target.value})}
                  placeholder="Tell us about your agent workloads and auditing priorities..."
                  className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-lg bg-brand-primary text-on-primary font-bold text-xs shadow-md cursor-pointer hover:brightness-105 active:scale-98 transition-all"
              >
                Transmit Secure Message
              </button>
            </form>
          )}
        </div>

        {/* Right: Support bot chat and directories */}
        <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
          {/* Interactive Chat Widget */}
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col h-[350px]">
            <div className="flex items-center gap-3 border-b border-brand-border/60 pb-3 mb-3 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-primary status-pulse"></span>
              <span className="font-display font-semibold text-xs text-on-surface">Interactive Support Bot</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 text-xs">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl max-w-[80%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-brand-primary/15 border border-brand-primary/30 text-brand-primary'
                      : 'bg-brand-bg border border-brand-border text-on-surface-variant'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isBotTyping && (
                <div className="flex justify-start">
                  <div className="bg-brand-bg border border-brand-border p-3 rounded-xl text-on-surface-variant italic">
                    typing telemetry reports...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about latency, security, models..."
                className="flex-1 bg-[#050505] px-3 py-2 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary"
              />
              <button
                type="submit"
                className="p-2.5 bg-brand-primary text-on-primary rounded-lg shadow cursor-pointer hover:brightness-105"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick Info details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-brand-surface rounded-xl border border-brand-border/60 flex items-center gap-3">
              <MapPin className="text-brand-primary w-5 h-5 shrink-0" />
              <div>
                <h5 className="font-display font-bold text-xs text-on-surface">San Francisco Office</h5>
                <p className="text-[10px] text-on-surface-variant mt-0.5">344 Pine St, California</p>
              </div>
            </div>
            <div className="p-4 bg-brand-surface rounded-xl border border-brand-border/60 flex items-center gap-3">
              <Clock className="text-brand-secondary w-5 h-5 shrink-0" />
              <div>
                <h5 className="font-display font-bold text-xs text-on-surface">Compliance Hours</h5>
                <p className="text-[10px] text-on-surface-variant mt-0.5">24/7/365 Autonomous SLA</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

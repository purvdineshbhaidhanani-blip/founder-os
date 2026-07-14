import { useState } from 'react';
import { CheckCircle2, XCircle, Info, ShieldCheck, HelpCircle } from 'lucide-react';
import { PRICING_PLANS } from '../data';

export default function PricingView() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('annually');
  const [selectedPlan, setSelectedPlan] = useState('Pro');

  const getPriceValue = (planName: string, basePrice: string) => {
    if (basePrice === '$0' || basePrice === 'Custom') return basePrice;
    const num = parseInt(basePrice.replace('$', ''), 10);
    if (billingPeriod === 'annually') {
      // 20% discount
      return `$${Math.round(num * 0.8)}`;
    }
    return `$${num}`;
  };

  const planFeatures = [
    { name: "Active AI Agents Monitoring", starter: "Up to 5", pro: "Unlimited", business: "Unlimited (Dedicated)", enterprise: "Custom Allocation" },
    { name: "Log Storage Retention", starter: "7 days", pro: "30 days", business: "90 days", enterprise: "Infinite" },
    { name: "Hallucination Detection Core", starter: "Standard", pro: "Advanced", business: "Bespoke fine-tuned", enterprise: "Full Isolation" },
    { name: "PII Scrubbing Interceptor", starter: "Standard regex", pro: "Custom dictionary + AI", business: "Custom dictionary + AI", enterprise: "On-Prem / Zero-knowledge" },
    { name: "Continuous Red-Teaming Tests", starter: "Monthly schedule", pro: "Weekly schedule", business: "On-Demand (API triggered)", enterprise: "Continuous + custom script payloads" },
    { name: "API & Trace Log Webhooks", starter: false, pro: true, business: true, enterprise: true },
    { name: "SSO (SAML / OIDC)", starter: false, pro: false, business: true, enterprise: true },
    { name: "SLA Guarantees", starter: false, pro: false, business: "99.9% Uptime", enterprise: "99.99% Uptime + custom penalties" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold text-on-surface mb-4">
          Transparent, Scalable Observability Plans
        </h1>
        <p className="text-on-surface-variant max-w-xl mx-auto text-sm sm:text-base">
          Establish reliable monitoring scopes for dev trials, startup launches, or high-throughput enterprise API deployments.
        </p>

        {/* Annual vs Monthly Toggle */}
        <div className="inline-flex items-center gap-3 bg-brand-surface border border-brand-border p-1.5 rounded-full mt-8">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-[#050505] text-on-surface border border-brand-border/80'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingPeriod('annually')}
            className={`px-5 py-2 rounded-full text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
              billingPeriod === 'annually'
                ? 'bg-[#050505] text-brand-primary border border-brand-border/80'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Annually (20% Off)
            <span className="bg-brand-primary/10 text-brand-primary font-mono text-[9px] px-1.5 py-0.5 rounded">SAVE</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-20 items-stretch">
        {PRICING_PLANS.map((plan, idx) => {
          const isPro = plan.name === 'Pro';
          const isSelected = selectedPlan === plan.name;
          return (
            <div
              key={idx}
              onClick={() => setSelectedPlan(plan.name)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:scale-[1.01] ${
                isPro
                  ? 'bg-brand-surface/75 border-brand-primary/50 shadow-2xl relative shadow-brand-primary/5 scale-100'
                  : 'bg-brand-surface border-brand-border/60 hover:border-brand-border'
              } ${isSelected ? 'border-brand-primary ring-1 ring-brand-primary/30' : ''}`}
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-display font-bold text-on-surface text-base">{plan.name}</h4>
                  {isPro && (
                    <span className="bg-brand-primary/15 text-brand-primary text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-display font-bold text-on-surface">
                    {getPriceValue(plan.name, plan.price)}
                  </span>
                  {plan.price !== 'Custom' && plan.price !== '$0' && (
                    <span className="text-xs text-on-surface-variant"> / mo</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-6 border-b border-brand-border/60 pb-4 h-12">
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2 text-xs text-on-surface-variant">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isPro
                    ? 'bg-brand-primary text-on-primary hover:brightness-105 shadow-md shadow-brand-primary/10'
                    : 'bg-brand-bg text-on-surface border border-brand-border hover:border-brand-primary'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-8 overflow-x-auto">
        <h3 className="font-display text-lg font-bold text-on-surface mb-6">Detailed Plan Features Breakdown</h3>
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-brand-border/60">
              <th className="pb-4 font-display font-bold text-sm text-on-surface w-1/3">Feature Details</th>
              <th className="pb-4 font-mono text-xs text-on-surface-variant">Starter</th>
              <th className="pb-4 font-mono text-xs text-brand-primary">Pro</th>
              <th className="pb-4 font-mono text-xs text-on-surface-variant">Business</th>
              <th className="pb-4 font-mono text-xs text-on-surface-variant">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {planFeatures.map((row, idx) => (
              <tr key={idx} className="border-b border-brand-border/40 hover:bg-brand-bg/20 transition-colors">
                <td className="py-4 text-xs font-semibold text-on-surface">{row.name}</td>
                
                {/* Starter */}
                <td className="py-4 text-xs text-on-surface-variant">
                  {typeof row.starter === 'boolean' ? (
                    row.starter ? <CheckCircle2 className="w-4 h-4 text-brand-primary" /> : <XCircle className="w-4 h-4 text-brand-border" />
                  ) : row.starter}
                </td>

                {/* Pro */}
                <td className="py-4 text-xs text-brand-primary">
                  {typeof row.pro === 'boolean' ? (
                    row.pro ? <CheckCircle2 className="w-4 h-4 text-brand-primary" /> : <XCircle className="w-4 h-4 text-brand-border" />
                  ) : row.pro}
                </td>

                {/* Business */}
                <td className="py-4 text-xs text-on-surface-variant">
                  {typeof row.business === 'boolean' ? (
                    row.business ? <CheckCircle2 className="w-4 h-4 text-brand-primary" /> : <XCircle className="w-4 h-4 text-brand-border" />
                  ) : row.business}
                </td>

                {/* Enterprise */}
                <td className="py-4 text-xs text-on-surface-variant">
                  {typeof row.enterprise === 'boolean' ? (
                    row.enterprise ? <CheckCircle2 className="w-4 h-4 text-brand-primary" /> : <XCircle className="w-4 h-4 text-brand-border" />
                  ) : row.enterprise}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

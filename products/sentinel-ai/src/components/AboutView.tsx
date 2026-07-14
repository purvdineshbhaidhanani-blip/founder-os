import { useState, FormEvent } from 'react';
import { TEAM_MEMBERS, JOB_OPENINGS } from '../data';
import { ShieldCheck, Heart, Users, Target, CheckCircle2, ChevronRight, X } from 'lucide-react';
import { TeamMember, JobOpening } from '../types';

export default function AboutView() {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeJob, setActiveJob] = useState<JobOpening | null>(null);
  const [appForm, setAppForm] = useState({ name: '', email: '', portfolio: '', coverLetter: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleApplySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!appForm.name || !appForm.email) return;
    setSubmitted(true);
    setTimeout(() => {
      // Complete visual loop
      setSubmitted(false);
      setActiveJob(null);
      setAppForm({ name: '', email: '', portfolio: '', coverLetter: '' });
    }, 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-24">
      {/* Overview Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="font-display text-4xl font-bold text-on-surface mb-4">
          Securing the Autonomous Workforce
        </h1>
        <p className="text-on-surface-variant text-base sm:text-lg leading-relaxed">
          At Sentinel AI, we build safety infrastructure, monitoring protocols, and verification tools for companies deploying heavy LLM workloads.
        </p>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-brand-surface p-8 rounded-2xl border border-brand-border/60 hover:border-brand-border transition-colors">
          <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/30 rounded-xl flex items-center justify-center text-brand-primary mb-6">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-on-surface mb-2">Architectural Safety</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Safety must be compiled directly into AI routing pipelines, rather than retrofitted as a secondary filter. We make compliance automatic.
          </p>
        </div>

        <div className="bg-brand-surface p-8 rounded-2xl border border-brand-border/60 hover:border-brand-border transition-colors">
          <div className="w-12 h-12 bg-brand-secondary/10 border border-brand-secondary/30 rounded-xl flex items-center justify-center text-brand-secondary mb-6">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-on-surface mb-2">Zero-Knowledge Trust</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Your data logs belong to you. We design all client trace pipelines with high-speed local scrubbing and absolute privacy bounds.
          </p>
        </div>

        <div className="bg-brand-surface p-8 rounded-2xl border border-brand-border/60 hover:border-brand-border transition-colors">
          <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/30 rounded-xl flex items-center justify-center text-brand-primary mb-6">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-on-surface mb-2">Collaborative Red-Teaming</h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            By building simulated adversarial exploits and open benchmarking databases, we push the frontier of alignment research.
          </p>
        </div>
      </div>

      {/* Team Leadership Grid */}
      <div>
        <h2 className="font-display text-2xl font-bold text-on-surface mb-8 text-center">Our Leadership & Research Team</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TEAM_MEMBERS.map((m, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedMember(m)}
              className="bg-brand-surface border border-brand-border/60 hover:border-brand-primary rounded-2xl overflow-hidden transition-all cursor-pointer group"
            >
              <img src={m.avatarUrl} alt={m.name} className="w-full h-56 object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-500" />
              <div className="p-6">
                <h4 className="font-display font-bold text-base text-on-surface group-hover:text-brand-primary transition-colors">{m.name}</h4>
                <p className="text-xs text-brand-secondary font-mono mt-0.5">{m.role}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed mt-4 line-clamp-3">{m.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Careers Openings Board */}
      <div className="bg-brand-surface border border-brand-border rounded-3xl p-8 md:p-12">
        <div className="max-w-xl mb-12">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">Join our research mission</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            We are always seeking proactive engineers, AI security researchers, and product designers who value safety, privacy, and absolute reliability.
          </p>
        </div>

        <div className="space-y-4">
          {JOB_OPENINGS.map(job => (
            <div
              key={job.id}
              className="p-6 bg-brand-bg/60 rounded-xl border border-brand-border/60 hover:border-brand-primary/40 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div>
                <h4 className="font-display font-semibold text-base text-on-surface">{job.title}</h4>
                <div className="flex gap-4 mt-1">
                  <span className="text-[10px] font-mono uppercase text-brand-secondary">{job.location}</span>
                  <span className="text-[10px] font-mono uppercase text-on-surface-variant">• {job.type}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveJob(job)}
                className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-on-primary font-semibold text-xs px-5 py-2.5 rounded-lg border border-brand-primary/30 cursor-pointer transition-all"
              >
                Apply Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Team Member Bio Dialog Popup */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-bg/85 backdrop-blur-md">
          <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-md w-full p-6 relative shadow-2xl animate-fade-in">
            <button onClick={() => setSelectedMember(null)} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <img src={selectedMember.avatarUrl} alt={selectedMember.name} className="w-16 h-16 rounded-full object-cover border border-brand-border" />
              <div>
                <h4 className="font-display font-bold text-lg text-on-surface">{selectedMember.name}</h4>
                <p className="text-xs text-brand-primary font-mono">{selectedMember.role}</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{selectedMember.bio}</p>
            <div className="p-3 bg-brand-bg rounded-lg border border-brand-border/60 text-xs text-brand-secondary leading-relaxed font-mono">
              {selectedMember.details}
            </div>
          </div>
        </div>
      )}

      {/* Job Application Modal Dialog */}
      {activeJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-bg/85 backdrop-blur-md">
          <div className="bg-brand-surface border border-brand-border rounded-2xl max-w-lg w-full p-6 md:p-8 relative shadow-2xl animate-fade-in">
            <button onClick={() => setActiveJob(null)} className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-display text-xl font-bold text-on-surface mb-1">Apply for: {activeJob.title}</h3>
            <p className="text-xs text-brand-secondary font-mono mb-6">{activeJob.location} • {activeJob.type}</p>

            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-brand-primary mx-auto animate-bounce" />
                <h4 className="font-display text-lg font-bold text-on-surface">Application Submitted Successfully</h4>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                  Thank you! Our recruitment operations team has received your details and will review them shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={appForm.name}
                    onChange={e => setAppForm({...appForm, name: e.target.value})}
                    placeholder="Jane Doe"
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={appForm.email}
                    onChange={e => setAppForm({...appForm, email: e.target.value})}
                    placeholder="jane@domain.com"
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Portfolio or LinkedIn URL</label>
                  <input
                    type="url"
                    value={appForm.portfolio}
                    onChange={e => setAppForm({...appForm, portfolio: e.target.value})}
                    placeholder="https://github.com/janedoe"
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Brief Cover Letter</label>
                  <textarea
                    rows={4}
                    value={appForm.coverLetter}
                    onChange={e => setAppForm({...appForm, coverLetter: e.target.value})}
                    placeholder="Tell us about your experience securing or building LLM agents..."
                    className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary resize-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveJob(null)}
                    className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-brand-bg text-on-surface border border-brand-border hover:text-brand-tertiary hover:border-brand-tertiary cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-brand-primary text-on-primary font-bold text-xs px-6 py-2.5 rounded-lg shadow-md cursor-pointer hover:brightness-105"
                  >
                    Submit Application
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

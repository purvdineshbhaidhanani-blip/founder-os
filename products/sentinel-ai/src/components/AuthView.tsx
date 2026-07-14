import { useState, FormEvent } from 'react';
import { Shield, Lock, Mail, User, ShieldCheck, HelpCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: () => void;
}

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'magic' | 'verify2fa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Telemetry Architect');
  const [passcode, setPasscode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      if (mode === 'login' || mode === 'signup') {
        // Require 2FA trigger!
        setMode('verify2fa');
      } else if (mode === 'forgot') {
        setSuccessMsg('Reset link dispatched. Please monitor your SMTP inbox.');
      } else if (mode === 'magic') {
        setSuccessMsg('Magic connection trace initiated. Verification link sent.');
      } else if (mode === 'verify2fa') {
        // Complete the authentication flow
        onLoginSuccess();
      }
    }, 1500);
  };

  const handleQuickLogin = (roleName: string) => {
    setEmail(`${roleName.toLowerCase().replace(' ', '_')}@sentinel-ai.dev`);
    setName(roleName);
    setPassword('••••••••••••');
    setMode('login');
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12">
      {/* Container */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/5 rounded-full blur-2xl pointer-events-none" />

        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-brand-primary/10 border border-brand-primary/30 rounded-xl flex items-center justify-center mb-4">
            <Shield className="text-brand-primary w-6 h-6 fill-brand-primary/10" />
          </div>
          <h2 className="font-display text-2xl font-bold text-on-surface">Sentinel Crypt-Gate</h2>
          <p className="text-xs text-on-surface-variant mt-1.5">Enterprise Identity Verification Protocol</p>
        </div>

        {/* Quick Access Roles selectors */}
        {mode === 'login' && (
          <div className="mb-6">
            <span className="block text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-2.5">Quick Access Roles</span>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                onClick={() => handleQuickLogin('Supervisor')}
                className="p-2.5 bg-brand-bg rounded-lg border border-brand-border/60 text-[11px] text-on-surface-variant hover:border-brand-primary hover:text-on-surface cursor-pointer text-left font-mono"
              >
                🤖 Supervisor
              </button>
              <button
                onClick={() => handleQuickLogin('Red-Team Lead')}
                className="p-2.5 bg-brand-bg rounded-lg border border-brand-border/60 text-[11px] text-on-surface-variant hover:border-brand-primary hover:text-on-surface cursor-pointer text-left font-mono"
              >
                🔥 Red-Team Lead
              </button>
            </div>
          </div>
        )}

        {successMsg ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-brand-primary mx-auto animate-pulse" />
            <p className="text-sm text-on-surface leading-relaxed font-semibold">{successMsg}</p>
            <button
              onClick={() => { setSuccessMsg(''); setMode('login'); }}
              className="text-xs text-brand-primary font-bold hover:underline mt-4 cursor-pointer"
            >
              Back to Login Gate
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Full Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Marcus Thorne"
                    className="w-full bg-[#050505] pl-10 pr-4 py-3 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'forgot' || mode === 'magic') && (
              <div>
                <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Security Email</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="architect@sentinel-ai.dev"
                    className="w-full bg-[#050505] pl-10 pr-4 py-3 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase">Passphrase</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[10px] font-mono text-brand-secondary hover:underline cursor-pointer"
                    >
                      Forgot Passphrase?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#050505] pl-10 pr-4 py-3 rounded-lg border border-brand-border text-sm text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Workspace Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-[#050505] p-3 rounded-lg border border-brand-border text-xs text-on-surface focus:outline-none focus:border-brand-primary"
                >
                  <option>Telemetry Architect</option>
                  <option>SecOps Auditor</option>
                  <option>Supervisor</option>
                  <option>Red-Team Lead</option>
                </select>
              </div>
            )}

            {mode === 'verify2fa' && (
              <div className="space-y-4">
                <div className="p-3 bg-brand-primary/5 rounded-lg border border-brand-primary/20 text-[11px] text-brand-primary leading-relaxed font-mono">
                  🚨 Passcode dispatch simulated. Enter any 6-digit number. Example: <span className="font-bold">449211</span>.
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-on-surface-variant uppercase mb-1.5">Passcode</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    placeholder="449211"
                    className="w-full bg-[#050505] text-center tracking-[1em] py-3 rounded-lg border border-brand-border text-base text-on-surface focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            )}

            {/* Action Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-brand-primary text-on-primary font-bold text-xs rounded-lg shadow-md cursor-pointer hover:brightness-105 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Validating connection payload...' : (
                <>
                  {mode === 'login' && 'Verify Identity Keys'}
                  {mode === 'signup' && 'Complete Onboarding Code'}
                  {mode === 'forgot' && 'Send Reset Vector'}
                  {mode === 'magic' && 'Send Magic Link Token'}
                  {mode === 'verify2fa' && 'Authenticate & Enter Console'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Toggle Footer Modes */}
        {!successMsg && (
          <div className="mt-6 pt-6 border-t border-brand-border/60 flex flex-col gap-2.5 items-center text-center text-xs text-on-surface-variant">
            {mode === 'login' && (
              <>
                <p>
                  New workspace?{' '}
                  <button onClick={() => setMode('signup')} className="text-brand-primary font-bold hover:underline cursor-pointer">
                    Create Security Credentials
                  </button>
                </p>
                <button onClick={() => setMode('magic')} className="text-brand-secondary font-bold hover:underline cursor-pointer">
                  Use Passwordless Magic Link
                </button>
              </>
            )}
            {mode === 'signup' && (
              <p>
                Already registered?{' '}
                <button onClick={() => setMode('login')} className="text-brand-primary font-bold hover:underline cursor-pointer">
                  Open Login Gate
                </button>
              </p>
            )}
            {(mode === 'forgot' || mode === 'magic' || mode === 'verify2fa') && (
              <button onClick={() => setMode('login')} className="text-brand-primary font-bold hover:underline cursor-pointer">
                Return to Login Gate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

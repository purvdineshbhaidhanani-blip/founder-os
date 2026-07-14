import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import HeroHome from './components/HeroHome';
import FeaturesView from './components/FeaturesView';
import IntegrationsView from './components/IntegrationsView';
import PricingView from './components/PricingView';
import AboutView from './components/AboutView';
import ContactView from './components/ContactView';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import { Shield, Mail, ArrowRight } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<string>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Scroll to top on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [activeView]);

  return (
    <div className="min-h-screen bg-brand-bg text-on-surface flex flex-col justify-between selection:bg-brand-primary/30 selection:text-brand-primary">
      {/* Sticky Top Header Navigation */}
      <Navigation
        activeView={activeView}
        setActiveView={setActiveView}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Page Layout Container */}
      <main className="flex-grow pt-20">
        <div className="transition-all duration-300">
          {activeView === 'home' && <HeroHome onNavigate={setActiveView} />}
          {activeView === 'features' && <FeaturesView />}
          {activeView === 'integrations' && <IntegrationsView />}
          {activeView === 'pricing' && <PricingView />}
          {activeView === 'about' && <AboutView />}
          {activeView === 'contact' && <ContactView />}
          {activeView === 'auth' && (
            <AuthView
              onLoginSuccess={() => {
                setIsLoggedIn(true);
                setActiveView('dashboard');
              }}
            />
          )}
          {activeView === 'dashboard' && <DashboardView />}
        </div>
      </main>

      {/* Footer Block */}
      <footer className="border-t border-brand-border/60 bg-[#070708] py-16 px-6 md:px-12 mt-20 shrink-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-primary/10 border border-brand-primary/30 rounded-lg flex items-center justify-center">
                <Shield className="text-brand-primary w-4.5 h-4.5 fill-brand-primary/10" />
              </div>
              <span className="font-display text-lg font-bold text-on-surface">Sentinel AI</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed max-w-xs">
              Autonomous agent observability, reliability monitoring, and safety governance protocols. Secure your AI workforce.
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h5 className="font-mono text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-4">Technology</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => setActiveView('features')} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  Observability Suite
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('integrations')} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  API & SDK Hub
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('pricing')} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  Transparent Plans
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h5 className="font-mono text-[10px] font-bold text-brand-secondary uppercase tracking-widest mb-4">Company</h5>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button onClick={() => setActiveView('about')} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  Our Mission
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('about')} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  Careers (Hiring)
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('contact')} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  Strategic Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Newsletter/Strategic */}
          <div className="space-y-4">
            <h5 className="font-mono text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-4">Newsletter Dispatch</h5>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Discreet monthly digests covering model jailbreaks, zero-day vectors, and compliance guidelines.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="security@domain.com"
                className="bg-[#050505] text-xs p-2.5 rounded-lg border border-brand-border text-on-surface focus:outline-none focus:border-brand-primary flex-grow"
              />
              <button
                onClick={() => alert('Secure subscription dispatch initialized.')}
                className="bg-brand-primary text-on-primary p-2.5 rounded-lg hover:brightness-105 cursor-pointer shadow-md"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lower Row */}
        <div className="max-w-7xl mx-auto border-t border-brand-border/40 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[11px] text-on-surface-variant/70 font-mono">
            © 2026 Sentinel AI Inc. All telemetry encrypted in compliance with SOC2 Type II.
          </p>
          <div className="flex gap-6 text-[11px] font-mono text-on-surface-variant/70">
            <a href="#privacy" className="hover:text-brand-primary">Security Policy</a>
            <a href="#terms" className="hover:text-brand-primary">Terms of Trace Protocol</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { Shield, Search, Bell, LogIn, LayoutDashboard, Menu, X } from 'lucide-react';

interface NavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (status: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Navigation({
  activeView,
  setActiveView,
  isLoggedIn,
  setIsLoggedIn,
  mobileMenuOpen,
  setMobileMenuOpen
}: NavigationProps) {
  const marketingLinks = [
    { id: 'home', label: 'Overview' },
    { id: 'features', label: 'Features' },
    { id: 'integrations', label: 'Integrations' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' }
  ];

  const handleAuthClick = () => {
    if (isLoggedIn) {
      // Log out
      setIsLoggedIn(false);
      setActiveView('home');
    } else {
      setActiveView('auth');
    }
    setMobileMenuOpen(false);
  };

  const handleDashboardClick = () => {
    if (isLoggedIn) {
      setActiveView('dashboard');
    } else {
      // Direct access playground!
      setActiveView('dashboard');
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-brand-bg/75 backdrop-blur-xl border-b border-brand-border/60 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex justify-between items-center">
        {/* Brand Logo */}
        <button
          onClick={() => { setActiveView('home'); setMobileMenuOpen(false); }}
          className="flex items-center gap-3 cursor-pointer group"
          id="nav-logo"
        >
          <div className="w-10 h-10 bg-brand-primary/10 border border-brand-primary/30 rounded-lg flex items-center justify-center transition-all group-hover:scale-105 group-hover:border-brand-primary/60">
            <Shield className="text-brand-primary w-5 h-5 fill-brand-primary/15" />
          </div>
          <span className="font-display text-2xl font-semibold text-on-surface tracking-tight">
            Sentinel <span className="text-brand-primary">AI</span>
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {marketingLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => setActiveView(link.id)}
              className={`font-medium transition-colors cursor-pointer text-sm ${
                activeView === link.id
                  ? 'text-brand-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={handleDashboardClick}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium border text-sm transition-all cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-primary'
                : 'border-brand-border/80 text-on-surface-variant hover:text-on-surface hover:border-brand-border'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Live Dashboard
          </button>

          <button
            onClick={handleAuthClick}
            className="bg-brand-primary hover:bg-brand-primary/90 text-on-primary text-sm px-5 py-2.5 rounded-lg font-semibold shadow-[0_0_15px_rgba(78,222,163,0.35)] transition-all cursor-pointer hover:shadow-[0_0_25px_rgba(78,222,163,0.5)] active:scale-95"
          >
            {isLoggedIn ? 'Log Out' : 'Sign In'}
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-on-surface hover:text-brand-primary transition-colors focus:outline-none p-1 cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-brand-bg/95 border-b border-brand-border/80 flex flex-col p-6 gap-4 shadow-2xl backdrop-blur-2xl">
          {marketingLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => { setActiveView(link.id); setMobileMenuOpen(false); }}
              className={`text-left font-medium py-2 transition-colors cursor-pointer ${
                activeView === link.id ? 'text-brand-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="h-px bg-brand-border/60 my-2" />
          <button
            onClick={handleDashboardClick}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-brand-border text-on-surface font-semibold hover:border-brand-primary hover:text-brand-primary transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Live Dashboard
          </button>
          <button
            onClick={handleAuthClick}
            className="bg-brand-primary text-on-primary w-full py-3 rounded-lg font-semibold text-center hover:bg-brand-primary/90 shadow-lg cursor-pointer"
          >
            {isLoggedIn ? 'Log Out' : 'Sign In'}
          </button>
        </div>
      )}
    </header>
  );
}

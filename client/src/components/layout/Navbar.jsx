import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from '../brand/Logo';
import { getClientModeTheme } from '../../data/modeThemes';
import ModeIcon from '../ui/ModeIcon';
import { FiHome, FiUser, FiSliders, FiShield, FiUsers } from 'react-icons/fi';

export default function Navbar({ activeMode = 'retention' }) {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const modeTheme = getClientModeTheme(activeMode);
  const darkTheme = modeTheme.dark || {};
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const headerPosition = isHome ? 'fixed top-0 left-0 right-0' : 'sticky top-0';
  const headerSurface = isHome
    ? scrolled
      ? 'bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-soft'
      : 'bg-transparent border-b border-transparent'
    : 'bg-[#0a0a0a]/85 backdrop-blur-xl border-b border-white/[0.07]';

  return (
    <header className={`${headerPosition} z-50 transition-all duration-300 ${headerSurface}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo + Navigation */}
          <div className="flex items-center gap-6">
            <Logo
              variant="dark"
              to="/"
              subtitle="Universal AI & Compliance Kernel"
              className="py-1"
            />

            {/* Navigation Tabs */}
            <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main Navigation">
              <Link
                to="/"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  location.pathname === '/'
                    ? 'bg-white/[0.08] text-white border border-white/15'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <FiHome className="h-3.5 w-3.5" />
                <span>Home</span>
              </Link>

              {/* Module 1: Compliance */}
              <Link
                to="/compliance"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  location.pathname === '/compliance'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-cyan-300 hover:bg-white/[0.04]'
                }`}
              >
                <FiShield className="h-3.5 w-3.5 text-cyan-400" />
                <span>Module 1: Compliance</span>
              </Link>

              {/* Module 2: HR Intelligence */}
              <Link
                to="/hr-suite"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  location.pathname.startsWith('/hr-suite') || location.pathname.startsWith('/interview') || location.pathname.startsWith('/report')
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-purple-300 hover:bg-white/[0.04]'
                }`}
              >
                <FiUsers className="h-3.5 w-3.5 text-purple-400" />
                <span>Module 2: HR Interviews</span>
              </Link>

              {/* Module 3: Adaptive Assessment */}
              <Link
                to="/employee"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  location.pathname === '/employee'
                    ? `${darkTheme.badge || 'bg-white/[0.08] text-white border-white/15'} border`
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <FiUser className="h-3.5 w-3.5" />
                <span>Module 3: Adaptive Test</span>
              </Link>

              <Link
                to="/hr"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  location.pathname === '/hr'
                    ? `${darkTheme.badge || 'bg-white/[0.08] text-white border-white/15'} border`
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <FiSliders className="h-3.5 w-3.5" />
                <span>HR Console</span>
              </Link>
            </nav>
          </div>

          {/* Right Action & System Status */}
          <div className="flex items-center gap-3">
            {/* Active Platform Mode Badge */}
            <Link
              to="/hr"
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md transition-all group ${
                darkTheme.badge || 'bg-white/[0.04] border-white/10 text-slate-200'
              }`}
              title="Click to change active evaluation mode in HR Console"
            >
              <ModeIcon mode={activeMode} className="w-3.5 h-3.5 transition-colors" />
              <span className="hidden sm:inline opacity-75">Mode:</span>
              <span className="font-semibold">
                {modeTheme.shortTitle || modeTheme.name}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

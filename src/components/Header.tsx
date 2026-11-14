import React from 'react';
import { ViewMode } from '../types';
import { useAccessibility } from '../context/AccessibilityContext';
import { Sparkles, Sun, Moon, Eye, Menu, X } from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenAccessibility: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenAccessibility,
}) => {
  const { settings, updateSetting, announceToScreenReader } = useAccessibility();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const toggleHighContrast = () => {
    const nextState = !settings.highContrast;
    updateSetting('highContrast', nextState);
    announceToScreenReader(
      nextState
        ? 'High contrast black and yellow mode enabled.'
        : 'High contrast mode disabled. Default cosmic theme restored.'
    );
  };

  const navItems: { id: ViewMode; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Explore Earth' },
    { id: 'stories', label: 'Access Experience' },
    { id: 'about', label: 'About Platform' },
  ];

  return (
    <header
      role="banner"
      className={`sticky top-0 z-50 w-full transition-colors duration-200 border-b ${
        settings.highContrast
          ? 'bg-black border-[#ffe600] text-white'
          : 'bg-black/85 backdrop-blur-md border-cyan-500/30 shadow-[0_4px_20px_rgba(6,182,212,0.08)] text-slate-100'
      }`}
    >
      {/* Luminous Bottom Glow Line */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[1.5px] pointer-events-none ${
          settings.highContrast
            ? 'bg-[#ffe600]'
            : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75'
        }`}
      />

      <div className="w-full px-3 sm:px-8 xl:px-12 h-14 sm:h-16 flex items-center justify-between relative gap-2 sm:gap-4">
        {/* Left: NASA Space Apps Challenge Logo FIRST, then Divider, then EarthPulse Brand */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 min-w-0">
          {/* 1. NASA Space Apps Challenge Official Logo */}
          <a
            href="https://www.spaceappschallenge.org/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center group transition-all duration-300 hover:scale-105 focus-visible:outline-none shrink-0"
            title="NASA Space Apps Challenge Official"
            aria-label="NASA Space Apps Challenge official website"
          >
            <img
              src="/assets/aistudio/Space_Apps_Logo_Dark_Theme.png"
              alt="NASA Space Apps Challenge"
              className="h-6 sm:h-8 md:h-9 w-auto object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_14px_rgba(255,58,35,0.45)]"
            />
          </a>

          {/* Vertical Divider */}
          <div className="h-6 sm:h-7 w-px bg-cyan-500/30 hidden sm:block" />

          {/* 2. EarthPulse Official Brand Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center text-left group focus-visible:outline-none rounded-lg transition-transform duration-300 hover:scale-[1.02] min-w-0"
            aria-label="EarthPulse4 Home — See the Earth, Hear the Change"
          >
            <img
              src="/assets/aistudio/EarthPulse_Logo_Trimmed.png"
              alt="EarthPulse4 — See the Earth, Hear the Change"
              className="h-7 sm:h-10 md:h-11 w-auto max-w-[130px] sm:max-w-[210px] lg:max-w-[240px] xl:max-w-[260px] object-contain transition-all duration-300 drop-shadow-[0_0_14px_rgba(6,182,212,0.35)]"
            />
          </button>
        </div>

        {/* Center: Navigation Links centered on desktop (lg+) so tablet widths avoid overlap */}
        <nav
          role="navigation"
          aria-label="Main Navigation"
          className="hidden lg:flex items-center justify-center gap-5 xl:gap-9 text-sm font-medium absolute left-1/2 -translate-x-1/2"
        >
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`transition-colors whitespace-nowrap py-1 relative focus-visible:outline-none text-[14px] ${
                  settings.highContrast
                    ? isActive
                      ? 'text-[#ffe600] font-bold border-b-2 border-[#ffe600]'
                      : 'text-white hover:text-[#ffe600]'
                    : isActive
                    ? 'text-cyan-300 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
                {!settings.highContrast && isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Action Buttons (Universal Access Pill + Theme Toggle + Mobile/Tablet Menu) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Pill-shaped Accessibility Button */}
          <button
            onClick={onOpenAccessibility}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all focus-visible:outline-none border ${
              settings.highContrast
                ? 'bg-transparent text-[#ffe600] border-2 border-[#ffe600] hover:bg-[#ffe600] hover:text-black font-bold'
                : 'bg-transparent text-slate-100 border-cyan-400/90 hover:bg-cyan-500/10 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.35)]'
            }`}
            aria-label="Universal Access"
            title="Universal Access Center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4 text-cyan-300 shrink-0"
            >
              <circle cx="12" cy="5" r="2" />
              <path d="m9 20 3-6 3 6" />
              <path d="m6 8 6 2 6-2" />
              <path d="M12 10v4" />
            </svg>
            <span className="hidden sm:inline whitespace-nowrap font-medium">Universal Access</span>
          </button>

          {/* Circular High Contrast / Theme Toggle Button */}
          <button
            onClick={toggleHighContrast}
            title={
              settings.highContrast
                ? 'Switch to Default Dark Theme'
                : 'Switch to High Contrast Theme (Black & Yellow)'
            }
            aria-label="Toggle High Contrast Theme"
            className={`p-2 rounded-full transition-all border focus-visible:outline-none ${
              settings.highContrast
                ? 'bg-[#ffe600] text-black border-[#ffe600]'
                : 'bg-transparent text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/15 hover:text-white hover:border-cyan-300'
            }`}
          >
            <Sun className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Mobile & Tablet Menu Toggle (<1024px) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 focus-visible:outline-none"
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden px-4 pt-2 pb-6 space-y-1 border-t ${
            settings.highContrast
              ? 'bg-black border-[#ffe600]'
              : 'bg-black/95 backdrop-blur-xl border-cyan-900/60'
          }`}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                currentView === item.id
                  ? settings.highContrast
                    ? 'bg-[#ffe600] text-black font-bold'
                    : 'bg-cyan-950/80 text-cyan-300'
                  : settings.highContrast
                  ? 'text-white hover:text-[#ffe600]'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}

          {/* Brand lockup in mobile drawer */}
          <div className="pt-3 pb-1 border-t border-slate-800 flex items-center justify-center gap-3">
            <a
              href="https://www.spaceappschallenge.org/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center"
            >
              <img
                src="/assets/aistudio/Space_Apps_Logo_Dark_Theme.png"
                alt="NASA Space Apps Challenge"
                className="h-7 w-auto object-contain"
              />
            </a>
            <div className="h-5 w-px bg-cyan-500/30" />
            <img
              src="/assets/aistudio/EarthPulse_Logo_Trimmed.png"
              alt="EarthPulse4"
              className="h-7 w-auto object-contain"
            />
          </div>
        </div>
      )}
    </header>
  );
};

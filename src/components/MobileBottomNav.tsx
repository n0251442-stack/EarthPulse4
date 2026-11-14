import React from 'react';
import { ViewMode } from '../types';
import { useAccessibility } from '../context/AccessibilityContext';
import { Home, Compass, Accessibility, Info } from 'lucide-react';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
}) => {
  const { settings } = useAccessibility();

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'dashboard', label: 'Explore', icon: <Compass className="w-5 h-5" /> },
    { id: 'accessibility', label: 'Access', icon: <Accessibility className="w-5 h-5" /> },
    { id: 'about', label: 'About', icon: <Info className="w-5 h-5" /> },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Mobile Bottom Navigation"
      className={`lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t flex items-center justify-around px-2 backdrop-blur-lg transition-colors ${
        settings.highContrast
          ? 'bg-black border-[#ffe600] text-white'
          : 'bg-black/95 border-cyan-950/80 text-slate-300'
      }`}
    >
      {navItems.map((item) => {
        const isActive =
          currentView === item.id ||
          (item.id === 'dashboard' && currentView === 'stories');

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              settings.highContrast
                ? isActive
                  ? 'text-[#ffe600] font-bold'
                  : 'text-white hover:text-[#ffe600]'
                : isActive
                ? 'text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div
              className={`p-1 rounded-md transition-transform ${
                isActive ? 'scale-110' : ''
              }`}
            >
              {item.icon}
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

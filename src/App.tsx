/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ViewMode, StoryId } from './types';
import { AccessibilityProvider, useAccessibility } from './context/AccessibilityContext';
import { Header } from './components/Header';
import { HomeHero } from './components/HomeHero';
import { StoriesLab } from './components/StoriesLab';
import { ScientificDashboard } from './components/ScientificDashboard';
import { AccessibilityCenter } from './components/AccessibilityCenter';
import { AboutPlatform } from './components/AboutPlatform';
import { DataTableModal } from './components/DataTableModal';
import { AudioGuideModal } from './components/AudioGuideModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { InteractiveStarfield } from './components/InteractiveStarfield';
import { audioEngine } from './services/audioEngine';
import { ExternalLink, ShieldCheck, Heart } from 'lucide-react';

function EarthPulseApp() {
  const { settings, updateSetting, announceToScreenReader } = useAccessibility();
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [currentStoryId, setCurrentStoryId] = useState<StoryId>('temperature');
  const [isAudioGuideOpen, setIsAudioGuideOpen] = useState<boolean>(false);
  const [isDataTableOpen, setIsDataTableOpen] = useState<boolean>(false);
  const narrationConfirmedRef = React.useRef<boolean>(false);
  const demoTimersRef = React.useRef<number[]>([]);

  const clearDemoTimers = React.useCallback(() => {
    demoTimersRef.current.forEach((id) => window.clearTimeout(id));
    demoTimersRef.current = [];
  }, []);

  // Play spoken narration & ascending sonification in background on website load
  const startBackgroundJourney = React.useCallback(
    (fromGesture: boolean = false, onConfirmed?: () => void) => {
      if (narrationConfirmedRef.current) return;
      if (!settings.audioGuide || settings.volume <= 0) return;

      if (fromGesture) {
        narrationConfirmedRef.current = true;
      }

      audioEngine.unlock();

      // Speak intro guidance immediately in background
      audioEngine.speakGuidance(
        'Welcome to EarthPulse 4. The Earth has a story that must be told. You will embark on a special and unique experience that brings together Earth science and art in a truly one-of-a-kind journey. Enjoy!',
        true,
        () => {
          // Browser blocked unprompted speech or failed to start: re-arm for next gesture
          narrationConfirmedRef.current = false;
          clearDemoTimers();
        },
        () => {
          narrationConfirmedRef.current = true;
          onConfirmed?.();
        }
      );

      // Accompanying harmonic ascending piano sonification pulses
      if (settings.sonificationEnabled) {
        const demoYears = [
          { anomaly: -0.16, delay: 2000 },
          { anomaly: -0.30, delay: 3500 },
          { anomaly: 0.05, delay: 5000 },
          { anomaly: 0.40, delay: 6500 },
          { anomaly: 0.85, delay: 8000 },
          { anomaly: 1.25, delay: 9500 },
        ];

        clearDemoTimers();
        demoTimersRef.current = demoYears.map(({ anomaly, delay }) =>
          window.setTimeout(() => {
            audioEngine.playDiscretePulse(anomaly, 0.7, settings.volume);
          }, delay)
        );
      }
    },
    [clearDemoTimers, settings.audioGuide, settings.sonificationEnabled, settings.volume]
  );

  // Autoplay as soon as the website is opened, with seamless interaction fallback
  useEffect(() => {
    const cleanup = () => {
      window.removeEventListener('click', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
      window.removeEventListener('touchend', onUserGesture);
    };

    const onUserGesture = () => {
      if (narrationConfirmedRef.current) {
        cleanup();
        return;
      }
      startBackgroundJourney(true, cleanup);
    };

    // 1. Attempt immediate launch
    const timer = window.setTimeout(() => {
      startBackgroundJourney(false, cleanup);
    }, 450);

    // 2. Gesture fallback when browser autoplay policy restricts unprompted speech
    window.addEventListener('click', onUserGesture);
    window.addEventListener('keydown', onUserGesture);
    window.addEventListener('touchend', onUserGesture);

    return () => {
      window.clearTimeout(timer);
      clearDemoTimers();
      cleanup();
    };
  }, [clearDemoTimers, startBackgroundJourney]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      // 'c' or 'C' for High Contrast toggle
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        const nextHC = !settings.highContrast;
        updateSetting('highContrast', nextHC);
        announceToScreenReader(
          nextHC ? 'High contrast black and yellow mode enabled' : 'Default dark mode restored'
        );
      }

      // '?' for Audio Guide
      if (e.key === '?') {
        e.preventDefault();
        setIsAudioGuideOpen(true);
      }

      // 't' or 'T' for Data Table
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setIsDataTableOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.highContrast, updateSetting, announceToScreenReader]);

  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: settings.reducedMotion ? 'auto' : 'smooth' });
    announceToScreenReader(`Navigated to ${view} screen.`);
  };

  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-200 ${
        settings.highContrast
          ? 'bg-black text-white selection:bg-[#ffe600] selection:text-black'
          : 'bg-black text-slate-100 selection:bg-cyan-500 selection:text-black'
      }`}
    >
      {/* Global Interactive Space Starfield across all pages */}
      <InteractiveStarfield />

      {/* Skip to Main Content Link for Screen Readers (WCAG AA requirement) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-cyan-400 focus:text-black focus:font-bold focus:rounded-md"
      >
        Skip to main content
      </a>

      {/* Header (Top Bar Contract) */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAccessibility={() => handleNavigate('accessibility')}
      />

      {/* Main View Router */}
      <div id="main-content" className={`flex-1 relative z-10 ${currentView === 'home' ? '-mt-14 sm:-mt-16' : ''}`}>
        {currentView === 'home' && (
          <HomeHero
            onNavigate={handleNavigate}
            onOpenAudioGuide={() => setIsAudioGuideOpen(true)}
            onOpenDataTable={() => setIsDataTableOpen(true)}
          />
        )}

        {currentView === 'stories' && (
          <StoriesLab
            onSelectStory={(id) => {
              setCurrentStoryId(id);
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'dashboard' && (
          <ScientificDashboard
            currentStoryId={currentStoryId}
            onNavigate={handleNavigate}
            onOpenAudioGuide={() => setIsAudioGuideOpen(true)}
            onOpenDataTable={() => setIsDataTableOpen(true)}
          />
        )}

        {currentView === 'accessibility' && (
          <AccessibilityCenter
            onNavigate={handleNavigate}
            onOpenDataTable={() => setIsDataTableOpen(true)}
          />
        )}

        {currentView === 'about' && (
          <AboutPlatform onNavigate={handleNavigate} />
        )}
      </div>

      {/* Accessible Modals */}
      <AudioGuideModal
        isOpen={isAudioGuideOpen}
        onClose={() => setIsAudioGuideOpen(false)}
      />

      <DataTableModal
        isOpen={isDataTableOpen}
        onClose={() => setIsDataTableOpen(false)}
        onSelectYear={(year) => {
          setCurrentView('dashboard');
        }}
      />

      {/* Mobile Bottom Navigation (Matching reference mobile mockup) */}
      <MobileBottomNav
        currentView={currentView}
        onNavigate={handleNavigate}
      />

      {/* Footer for non-home views (Fully Transparent, no border line) */}
      {currentView !== 'home' && (
        <footer
          role="contentinfo"
          className={`w-full pt-6 pb-24 lg:py-8 px-4 sm:px-6 lg:px-8 border-none text-xs transition-colors ${
            settings.highContrast
              ? 'bg-black text-slate-300'
              : 'bg-transparent text-slate-400'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <img
                src="/assets/aistudio/EarthPulse_Logo_Trimmed.png"
                alt="EarthPulse4"
                className="h-6 w-auto object-contain"
              />
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>NASA-inspired scientific data sonification</span>
            </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs font-mono">
            <button
              onClick={() => setIsAudioGuideOpen(true)}
              className="hover:underline hover:text-cyan-400"
            >
              Listening Guide
            </button>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <button
              onClick={() => setIsDataTableOpen(true)}
              className="hover:underline hover:text-cyan-400"
            >
              Tabular Data
            </button>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <a
              href="https://data.giss.nasa.gov/gistemp/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
            >
              <span>NASA GISTEMP</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AccessibilityProvider>
      <EarthPulseApp />
    </AccessibilityProvider>
  );
}

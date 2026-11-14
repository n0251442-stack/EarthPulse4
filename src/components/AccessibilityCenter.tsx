import React, { useState } from 'react';
import { ViewMode } from '../types';
import { useAccessibility } from '../context/AccessibilityContext';
import { audioEngine } from '../services/audioEngine';
import {
  Volume2,
  Sun,
  Keyboard,
  Headphones,
  RotateCcw,
  Check,
  Eye,
  Type,
  Table,
  Zap,
  Shield,
  Activity,
  Play,
  Pause,
} from 'lucide-react';

interface AccessibilityCenterProps {
  onNavigate: (view: ViewMode) => void;
  onOpenDataTable: () => void;
}

export const AccessibilityCenter: React.FC<AccessibilityCenterProps> = ({
  onNavigate,
  onOpenDataTable,
}) => {
  const {
    settings,
    updateSetting,
    resetDefaults,
    announceToScreenReader,
  } = useAccessibility();

  const [isPlayingDemo, setIsPlayingDemo] = useState<boolean>(false);

  const startAudioJourneyDemo = () => {
    if (isPlayingDemo) {
      audioEngine.stopSonification();
      audioEngine.stopSpeaking();
      setIsPlayingDemo(false);
      announceToScreenReader('Stopped audio journey.');
      return;
    }

    setIsPlayingDemo(true);
    announceToScreenReader('Starting EarthPulse audio journey.');

    // Speak intro
    audioEngine.speakGuidance(
      'Welcome to EarthPulse 4. The Earth has a story that must be told. You will embark on a special and unique experience that brings together Earth science and art in a truly one-of-a-kind journey. Enjoy!',
      true
    );

    // Play escalating sequence
    const demoYears = [
      { anomaly: -0.16, delay: 2000 },
      { anomaly: -0.30, delay: 3500 },
      { anomaly: 0.05, delay: 5000 },
      { anomaly: 0.40, delay: 6500 },
      { anomaly: 0.85, delay: 8000 },
      { anomaly: 1.25, delay: 9500 },
    ];

    demoYears.forEach(({ anomaly, delay }, idx) => {
      setTimeout(() => {
        if (!isPlayingDemo && idx > 0) return;
        audioEngine.playDiscretePulse(anomaly, 0.7, settings.volume);
        if (idx === demoYears.length - 1) {
          setIsPlayingDemo(false);
        }
      }, delay);
    });
  };

  return (
    <div
      className={`max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-16 transition-colors ${
        settings.highContrast ? 'text-white' : 'text-slate-100'
      }`}
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
        <h1
          className={`text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 ${
            settings.highContrast ? 'text-[#ffe600]' : 'text-white'
          }`}
        >
          Universal Accessibility Center
        </h1>
        <p
          className={`text-sm sm:text-lg ${
            settings.highContrast ? 'text-slate-200' : 'text-slate-400'
          }`}
        >
          Customize the platform to suit your needs. Every option is fully functional
          and engineered for accessible exploration.
        </p>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start mb-10 sm:mb-14">
        {/* Left Interactive Audio Journey Hero Card (5 Cols) */}
        <div
          className={`lg:col-span-5 p-5 sm:p-8 rounded-3xl border flex flex-col items-center justify-between text-center sm:min-h-[380px] transition-all ${
            settings.highContrast
              ? 'bg-black border-2 border-[#ffe600] text-white'
              : 'bg-transparent border-cyan-500/20 backdrop-blur-sm hover:border-cyan-400/40'
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center my-4 transition-transform ${
              settings.highContrast
                ? 'bg-[#ffe600] text-black shadow-[0_0_24px_#ffe600]'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_30px_rgba(6,182,212,0.4)]'
            }`}
          >
            <Headphones className="w-10 h-10" />
          </div>

          <div className="space-y-3">
            <h2
              className={`text-2xl font-bold ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              Explore Science Through Sound
            </h2>
            <p
              className={`text-sm leading-relaxed max-w-sm ${
                settings.highContrast ? 'text-slate-300' : 'text-slate-300'
              }`}
            >
              Listen to authentic NASA scientific data and discover how acoustic
              frequency represents planetary change.
            </p>
          </div>

          <button
            onClick={startAudioJourneyDemo}
            className={`mt-6 w-full py-3.5 px-6 rounded-full font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 transition-all ${
              settings.highContrast
                ? 'bg-[#ffe600] text-black hover:bg-yellow-300'
                : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
            }`}
            aria-label={
              isPlayingDemo
                ? 'Stop Audio Journey Preview'
                : 'Start Audio Journey Preview'
            }
          >
            {isPlayingDemo ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>
              {isPlayingDemo ? 'Stop Audio Journey' : 'Start Audio Journey'}
            </span>
          </button>
        </div>

        {/* Right Settings Toggles Panel (7 Cols) */}
        <div
          className={`lg:col-span-7 p-4 sm:p-8 rounded-3xl border space-y-5 sm:space-y-6 transition-all ${
            settings.highContrast
              ? 'bg-black border-[#ffe600] text-white'
              : 'bg-transparent border-cyan-500/20 backdrop-blur-sm'
          }`}
        >
          <div className="space-y-5">
            {/* Setting 1: Spoken Audio Guide */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    settings.highContrast
                      ? 'bg-[#ffe600] text-black'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  }`}
                >
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`text-base font-bold ${
                      settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                    }`}
                  >
                    Audio Guide & Spoken Narration
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Provides spoken introductions, scientific milestone commentary,
                    and listening context.
                  </p>
                </div>
              </div>

              {/* Custom Toggle Switch */}
              <button
                role="switch"
                aria-checked={settings.audioGuide}
                onClick={() => {
                  const val = !settings.audioGuide;
                  updateSetting('audioGuide', val);
                  announceToScreenReader(
                    val ? 'Spoken narration enabled' : 'Spoken narration disabled'
                  );
                }}
                className={`w-13 h-7 rounded-full p-1 transition-colors relative shrink-0 ${
                  settings.audioGuide
                    ? settings.highContrast
                      ? 'bg-[#ffe600]'
                      : 'bg-cyan-500'
                    : 'bg-slate-800'
                }`}
                aria-label="Toggle Spoken Audio Guide"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform ${
                    settings.highContrast
                      ? 'bg-black'
                      : settings.audioGuide
                      ? 'bg-slate-950'
                      : 'bg-slate-400'
                  } ${settings.audioGuide ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Setting 2: High Contrast Mode */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    settings.highContrast
                      ? 'bg-[#ffe600] text-black'
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`text-base font-bold ${
                      settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                    }`}
                  >
                    High Contrast Mode (WCAG AAA)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Switches to pure black background with radiant yellow accents
                    for optimal clarity and low-vision comfort.
                  </p>
                </div>
              </div>

              <button
                role="switch"
                aria-checked={settings.highContrast}
                onClick={() => {
                  const val = !settings.highContrast;
                  updateSetting('highContrast', val);
                  announceToScreenReader(
                    val
                      ? 'High contrast mode enabled'
                      : 'Default theme restored'
                  );
                }}
                className={`w-13 h-7 rounded-full p-1 transition-colors relative shrink-0 ${
                  settings.highContrast
                    ? 'bg-[#ffe600]'
                    : 'bg-slate-800'
                }`}
                aria-label="Toggle High Contrast Theme"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform ${
                    settings.highContrast ? 'bg-black' : 'bg-slate-400'
                  } ${settings.highContrast ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Setting 3: Keyboard Navigation & Focus */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    settings.highContrast
                      ? 'bg-[#ffe600] text-black'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`text-base font-bold ${
                      settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                    }`}
                  >
                    Keyboard Navigation Focus Rings
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ensures prominent focus indicators and full keyboard operability
                    without requiring a mouse.
                  </p>
                </div>
              </div>

              <button
                role="switch"
                aria-checked={settings.keyboardHelp}
                onClick={() => {
                  const val = !settings.keyboardHelp;
                  updateSetting('keyboardHelp', val);
                  announceToScreenReader(
                    val
                      ? 'Keyboard focus indicators emphasized'
                      : 'Standard focus rings'
                  );
                }}
                className={`w-13 h-7 rounded-full p-1 transition-colors relative shrink-0 ${
                  settings.keyboardHelp
                    ? settings.highContrast
                      ? 'bg-[#ffe600]'
                      : 'bg-cyan-500'
                    : 'bg-slate-800'
                }`}
                aria-label="Toggle Keyboard Focus Indicator Emphasis"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform ${
                    settings.highContrast
                      ? 'bg-black'
                      : settings.keyboardHelp
                      ? 'bg-slate-950'
                      : 'bg-slate-400'
                  } ${settings.keyboardHelp ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>

            {/* Setting 4: Reduced Motion */}
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    settings.highContrast
                      ? 'bg-[#ffe600] text-black'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    className={`text-base font-bold ${
                      settings.highContrast ? 'text-[#ffe600]' : 'text-white'
                    }`}
                  >
                    Reduced Motion Mode
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Halts planetary globe auto-spin and suppresses fluid motion
                    for users with vestibular sensitivity.
                  </p>
                </div>
              </div>

              <button
                role="switch"
                aria-checked={settings.reducedMotion}
                onClick={() => {
                  const val = !settings.reducedMotion;
                  updateSetting('reducedMotion', val);
                  announceToScreenReader(
                    val ? 'Reduced motion enabled' : 'Standard motion restored'
                  );
                }}
                className={`w-13 h-7 rounded-full p-1 transition-colors relative shrink-0 ${
                  settings.reducedMotion
                    ? settings.highContrast
                      ? 'bg-[#ffe600]'
                      : 'bg-cyan-500'
                    : 'bg-slate-800'
                }`}
                aria-label="Toggle Reduced Motion"
              >
                <div
                  className={`w-5 h-5 rounded-full transition-transform ${
                    settings.highContrast
                      ? 'bg-black'
                      : settings.reducedMotion
                      ? 'bg-slate-950'
                      : 'bg-slate-400'
                  } ${settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          {/* Reset to Defaults Button */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={resetDefaults}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 border transition-colors ${
                settings.highContrast
                  ? 'border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>

            <button
              onClick={onOpenDataTable}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-colors ${
                settings.highContrast
                  ? 'bg-[#ffe600] text-black border-[#ffe600] font-bold'
                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-800 hover:bg-cyan-500/20'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Open Screen Reader Data Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Informational Notification Banner (Matching middle-right reference) */}
      <div
        className={`p-4 rounded-2xl border flex items-center gap-3.5 mb-16 ${
          settings.highContrast
            ? 'bg-black border-2 border-[#ffe600] text-white'
            : 'bg-transparent border-cyan-500/20 backdrop-blur-sm text-slate-300'
        }`}
      >
        <Headphones
          className={`w-5 h-5 shrink-0 ${
            settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-400'
          }`}
        />
        <p className="text-xs sm:text-sm leading-relaxed">
          <strong
            className={
              settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-300'
            }
          >
            Now Active:
          </strong>{' '}
          Spoken audio guidance introduces each story before playback begins,
          explaining what tones represent and announcing major climate milestones
          as you move through time.
        </p>
      </div>

      {/* 6 Accessibility Features Grid (Matching bottom-right reference screenshot) */}
      <div>
        <div className="text-center mb-8">
          <h2
            className={`text-2xl font-bold tracking-tight mb-2 ${
              settings.highContrast ? 'text-[#ffe600]' : 'text-white'
            }`}
          >
            Universal Accessibility Standards
          </h2>
          <p
            className={`text-sm ${
              settings.highContrast ? 'text-slate-300' : 'text-slate-400'
            }`}
          >
            EarthPulse is designed from the ground up without sensory or physical
            barriers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Feature 1: Screen Reader */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-500/20 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-950/10 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`p-2 rounded-lg ${
                  settings.highContrast
                    ? 'bg-[#ffe600] text-black'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Screen Reader Support</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full compatibility with NVDA, JAWS, and VoiceOver with dedicated
              ARIA live regions and acoustic status cues.
            </p>
          </div>

          {/* Feature 2: Keyboard Navigation */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-500/20 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-950/10 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`p-2 rounded-lg ${
                  settings.highContrast
                    ? 'bg-[#ffe600] text-black'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <Keyboard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Full Keyboard Navigation</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete navigation without mouse input using Tab, Space, Arrow keys,
              and keyboard shortcuts.
            </p>
          </div>

          {/* Feature 3: High Contrast */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-500/20 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-950/10 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`p-2 rounded-lg ${
                  settings.highContrast
                    ? 'bg-[#ffe600] text-black'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">High Contrast Mode</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides maximum visual comfort, low glare, and high luminance
              separation exceeding WCAG AAA standards.
            </p>
          </div>

          {/* Feature 4: Scalable Typography */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-500/20 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-950/10 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`p-2 rounded-lg ${
                  settings.highContrast
                    ? 'bg-[#ffe600] text-black'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <Type className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Scalable Typography</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fluid, responsive type architecture adhering to user zoom levels up
              to 200% without horizontal layout clipping.
            </p>
          </div>

          {/* Feature 5: Tabular Data Alternative */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-500/20 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-950/10 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`p-2 rounded-lg ${
                  settings.highContrast
                    ? 'bg-[#ffe600] text-black'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <Table className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Data Tables Alternative</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accessible HTML tables with semantic headers and numerical data for
              direct screen reader readout and export.
            </p>
          </div>

          {/* Feature 6: Reduced Motion */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-500/20 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-950/10 backdrop-blur-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div
                className={`p-2 rounded-lg ${
                  settings.highContrast
                    ? 'bg-[#ffe600] text-black'
                    : 'bg-cyan-500/20 text-cyan-300'
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm">Reduced Motion Mode</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Suppresses rapid visual transitions, spinning planetary spheres, and
              pulsing rings for vestibular sensitivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

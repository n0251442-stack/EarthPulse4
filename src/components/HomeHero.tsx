import React, { useState } from 'react';
import { ViewMode } from '../types';
import { useAccessibility } from '../context/AccessibilityContext';
import { audioEngine } from '../services/audioEngine';
import { ArrowRight, Volume2, ShieldCheck, Accessibility, Play, Pause, Sparkles, ExternalLink } from 'lucide-react';

interface HomeHeroProps {
  onNavigate: (view: ViewMode) => void;
  onOpenAudioGuide?: () => void;
  onOpenDataTable?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onNavigate,
  onOpenAudioGuide,
  onOpenDataTable,
}) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const [playingPreview, setPlayingPreview] = useState<'1880' | '2025' | null>(null);

  const playQuickPreview = (year: '1880' | '2025') => {
    const anomaly = year === '1880' ? -0.16 : 1.25;
    setPlayingPreview(year);
    audioEngine.playDiscretePulse(anomaly, 0.8, settings.volume);
    announceToScreenReader(`Playing sonification preview for ${year}, temperature anomaly ${anomaly} degrees Celsius.`);
    setTimeout(() => {
      setPlayingPreview(null);
    }, 850);
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-transparent pt-16">
      {/* Background Layer: NASA Video & Space Atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {/* NASA Video Layer - Explicitly anchored to the RIGHT side of the screen */}
        <div className="absolute top-0 bottom-0 right-0 w-full md:w-3/5 overflow-hidden flex items-center justify-center">
          <video
            autoPlay
            loop
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-1000 ${
              settings.highContrast
                ? 'opacity-35 grayscale contrast-150'
                : 'opacity-90 brightness-105 contrast-110'
            }`}
          >
            <source src="/media/GISTEMP_stations_1080p60.mp4" type="video/mp4" />
            <source src="https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004961/GISTEMP_stations_1080p60.mp4" type="video/mp4" />
          </video>
          {/* Radial soft blend so video fades naturally into the black background on the left */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-black/20 to-black" />
          {/* Extra readability scrim on phone stacked viewports */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black md:hidden" />
        </div>
      </div>

      {/* Main Hero Content - Positioned cleanly on the LEFT side */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-20 md:pt-24 w-full flex flex-col md:flex-row items-center justify-between gap-8 text-left" dir="ltr">
        <div className="max-w-xl space-y-5 sm:space-y-6 flex flex-col items-start ml-0 mr-auto">
          {/* Main Title: Exact styling with glowing cyan highlight on 'that deserves to be heard.' */}
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.2] text-left ${
              settings.highContrast ? 'text-white' : 'text-white'
            }`}
          >
            <span>The Earth has a story</span>
            <br />
            <span
              className={
                settings.highContrast
                  ? 'text-[#ffe600] underline'
                  : 'text-cyan-400 drop-shadow-[0_0_25px_rgba(6,182,212,0.6)]'
              }
            >
              that deserves to be heard.
            </span>
          </h1>

          {/* Subtitle text in English */}
          <p
            className={`text-base sm:text-lg leading-relaxed text-left ${
              settings.highContrast ? 'text-slate-200' : 'text-slate-300/90 font-light'
            }`}
          >
            Explore our planet’s changes through scientific data, visualizations,
            and interactive sonification. An experience designed to be
            accessible and understandable for everyone.
          </p>

          {/* Pill Action Button: 'Start Exploring ->' in Transparent Glassmorphic Style */}
          <div className="pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`group inline-flex items-center gap-3 px-8 py-3.5 rounded-full text-base font-bold tracking-wide transition-all duration-300 focus-visible:outline-none ${
                settings.highContrast
                  ? 'bg-black text-[#ffe600] border-2 border-[#ffe600] hover:bg-yellow-400/20 shadow-none'
                  : 'bg-transparent text-cyan-300 border-2 border-cyan-400 hover:bg-cyan-400/15 hover:text-white hover:border-cyan-300 hover:shadow-[0_0_28px_rgba(6,182,212,0.45)] backdrop-blur-sm'
              }`}
            >
              <span>Start Exploring</span>
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Key Feature Cards (Bottom Row - Completely Transparent Glassmorphic Style) */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-20 lg:pb-12 w-full" dir="ltr">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Listen to the Data (Sound waves) */}
          <div
            className={`p-6 rounded-2xl border transition-all text-center flex flex-col items-center justify-center ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-400/25 hover:border-cyan-300/60 hover:bg-cyan-500/[0.04]'
            }`}
          >
            {/* Audio Waveform Graphic */}
            <div className="mb-4 flex items-center justify-center gap-1 h-8 text-cyan-400">
              <span className="w-1 h-3 bg-cyan-400 rounded-full" />
              <span className="w-1 h-5 bg-cyan-400 rounded-full" />
              <span className="w-1 h-8 bg-cyan-400 rounded-full" />
              <span className="w-1 h-5 bg-cyan-400 rounded-full" />
              <span className="w-1 h-3 bg-cyan-400 rounded-full" />
            </div>
            <h3
              className={`text-base font-bold mb-1.5 ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              Listen to the Data
            </h3>
            <p
              className={`text-xs leading-relaxed ${
                settings.highContrast ? 'text-slate-300' : 'text-slate-300/80'
              }`}
            >
              Transform complex scientific changes into meaningful sounds.
            </p>
          </div>

          {/* Card 2: Designed for Everyone (Accessibility Icon in Circle) */}
          <div
            className={`p-6 rounded-2xl border transition-all text-center flex flex-col items-center justify-center ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-400/25 hover:border-cyan-300/60 hover:bg-cyan-500/[0.04]'
            }`}
          >
            {/* Universal Access Circular Icon */}
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center mb-4 text-cyan-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-cyan-400"
              >
                <circle cx="12" cy="5" r="2" />
                <path d="m9 20 3-6 3 6" />
                <path d="m6 8 6 2 6-2" />
                <path d="M12 10v4" />
              </svg>
            </div>
            <h3
              className={`text-base font-bold mb-1.5 ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              Designed for Everyone
            </h3>
            <p
              className={`text-xs leading-relaxed ${
                settings.highContrast ? 'text-slate-300' : 'text-slate-300/80'
              }`}
            >
              Clear navigation and full screen reader accessibility.
            </p>
          </div>

          {/* Card 3: Authentic NASA Data (NASA Insignia Logo) */}
          <div
            className={`p-6 rounded-2xl border transition-all text-center flex flex-col items-center justify-center ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-white'
                : 'bg-transparent border-cyan-400/25 hover:border-cyan-300/60 hover:bg-cyan-500/[0.04]'
            }`}
          >
            {/* NASA Meatball Insignia */}
            <div className="w-9 h-9 rounded-full bg-[#0b3d91] flex items-center justify-center mb-3.5 relative overflow-hidden shadow-[0_0_14px_rgba(11,61,145,0.7)]">
              {/* Red Chevron Vector */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black tracking-tighter text-white font-sans">
                  NASA
                </span>
              </div>
              <span className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full opacity-80" />
              <span className="absolute bottom-1 left-2 w-0.5 h-0.5 bg-white rounded-full opacity-60" />
            </div>
            <h3
              className={`text-base font-bold mb-1.5 ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              Authentic NASA Data
            </h3>
            <p
              className={`text-xs leading-relaxed ${
                settings.highContrast ? 'text-slate-300' : 'text-slate-300/80'
              }`}
            >
              Trusted scientific records from NASA GISTEMP and satellites.
            </p>
          </div>
        </div>

        {/* Bottom Bar: 100% Transparent, no dividing border, cosmic stars flowing behind */}
        <div className="mt-8 sm:mt-12 pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs font-mono text-slate-400 bg-transparent text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
            <span
              className={`font-bold font-sans ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-slate-200'
              }`}
            >
              EarthPulse
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-sans text-slate-400/90">NASA-inspired scientific data sonification</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            {onOpenAudioGuide && (
              <button
                onClick={onOpenAudioGuide}
                className="hover:underline hover:text-cyan-400 text-slate-400 transition-colors"
              >
                Listening Guide
              </button>
            )}
            <span aria-hidden="true" className="text-slate-600">·</span>
            {onOpenDataTable && (
              <button
                onClick={onOpenDataTable}
                className="hover:underline hover:text-cyan-400 text-slate-400 transition-colors"
              >
                Tabular Data
              </button>
            )}
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
      </div>
    </div>
  );
};

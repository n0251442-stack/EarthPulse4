import React, { useState } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { audioEngine } from '../services/audioEngine';
import { X, Headphones, Play, Pause, Volume2, Info, CheckCircle2 } from 'lucide-react';

interface AudioGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioGuideModal: React.FC<AudioGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings } = useAccessibility();
  const [activeTestAnomaly, setActiveTestAnomaly] = useState<number | null>(null);

  if (!isOpen) return null;

  const testNotes = [
    { label: 'Cool Era (1890)', anomaly: -0.36, desc: '🎹 G#3 (207.7 Hz) — 4 semitones below Middle C, indicating cooler planetary baseline' },
    { label: 'Baseline Average (1950s)', anomaly: 0.0, desc: '🎹 Middle C (C4 / 261.6 Hz) — Neutral 1951–1980 baseline reference' },
    { label: 'Early Warming (1980)', anomaly: +0.27, desc: '🎹 D#4 (311.1 Hz) — 3 piano keys up, start of modern warming acceleration' },
    { label: 'Record High (2024)', anomaly: +1.28, desc: '🎹 C#5 (554.4 Hz) — 13 piano keys up, over a full octave above Middle C!' },
  ];

  const handlePlayTest = (anomaly: number) => {
    setActiveTestAnomaly(anomaly);
    audioEngine.playDiscretePulse(anomaly, 0.9, settings.volume);
    setTimeout(() => {
      setActiveTestAnomaly(null);
    }, 950);
  };

  const handleSpeakSample = () => {
    audioEngine.speakGuidance(
      'Welcome to EarthPulse 4. The Earth has a story that must be told. You will embark on a special and unique experience that brings together Earth science and art in a truly one-of-a-kind journey. Enjoy!',
      true
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-2xl border flex flex-col shadow-2xl overflow-hidden ${
          settings.highContrast
            ? 'bg-black border-2 border-[#ffe600] text-white'
            : 'bg-black/95 backdrop-blur-xl border-cyan-500/30 text-slate-100 shadow-[0_0_50px_rgba(6,182,212,0.2)]'
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                settings.highContrast
                  ? 'bg-[#ffe600] text-black'
                  : 'bg-cyan-500/20 text-cyan-300'
              }`}
            >
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 id="audio-guide-title" className="text-lg sm:text-xl font-bold tracking-tight">
                Listening Guide & Data Sonification
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Scientific principles behind translating NASA data into acoustic signals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close audio guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-sm">
          {/* Scientific Explanation */}
          <div className="space-y-3 leading-relaxed text-slate-300 text-xs sm:text-sm">
            <h3
              className={`text-base font-bold ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-white'
              }`}
            >
              How Does EarthPulse Sonification Work?
            </h3>
            <p>
              Data sonification converts numerical scientific measurements into sound waves.
              Rather than merely looking at a chart, sonification allows listeners to intuitively perceive
              scale, rapid shifts, and long-term momentum through auditory perception.
            </p>
            <ul className="space-y-2 pt-1 font-mono text-xs">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">●</span>
                <span><strong>Pitch Mapping:</strong> Every 1.0°C temperature anomaly corresponds to a musical shift of one octave.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">●</span>
                <span><strong>Harmonic Timbre:</strong> Warmer temperatures introduce subtle harmonic distortion and brighter upper frequencies.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400">●</span>
                <span><strong>Milestone Voice Synthesis:</strong> Integrated speech synthesis speaks historical climate milestones automatically during playback.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Tone Palette Tester */}
          <div>
            <h3
              className={`text-sm font-bold uppercase tracking-wider mb-3 ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-300'
              }`}
            >
              Interactive Tone Palette Test
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {testNotes.map((note) => (
                <button
                  key={note.label}
                  onClick={() => handlePlayTest(note.anomaly)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    settings.highContrast
                      ? 'bg-black border-[#ffe600] text-white hover:bg-[#ffe600]/10'
                      : 'bg-slate-900/80 border-slate-700 hover:border-cyan-500 hover:bg-cyan-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">{note.label}</span>
                    <span className="font-mono text-xs text-cyan-400 font-semibold">
                      {note.anomaly > 0 ? `+${note.anomaly}` : note.anomaly}°C
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                    {note.desc}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-medium pt-1">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{activeTestAnomaly === note.anomaly ? 'Playing...' : 'Play Sample Tone'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Spoken Narration Test Button */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${
              settings.highContrast
                ? 'bg-black border-[#ffe600]'
                : 'bg-cyan-950/30 border-cyan-800/60'
            }`}
          >
            <div>
              <h4 className="font-bold text-xs">Test Spoken Narration</h4>
              <p className="text-[11px] text-slate-400">
                Verifies your browser&apos;s Web Speech synthesis engine.
              </p>
            </div>
            <button
              onClick={handleSpeakSample}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors shrink-0 ${
                settings.highContrast
                  ? 'bg-[#ffe600] text-black border-[#ffe600]'
                  : 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Voice</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-black/20">
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-colors ${
              settings.highContrast
                ? 'bg-[#ffe600] text-black font-bold'
                : 'bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400'
            }`}
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

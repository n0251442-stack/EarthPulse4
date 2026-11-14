import React, { useState, useEffect } from 'react';
import { audioEngine, getPianoNoteForAnomaly, getNoteNameFromMidi } from '../services/audioEngine';
import { useAccessibility } from '../context/AccessibilityContext';
import { Volume2, Sparkles, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { GISTEMP_DATA } from '../data/earthData';

interface InteractivePianoKeyboardProps {
  currentAnomaly: number;
  currentYear?: number;
  onSelectYear?: (year: number) => void;
  onPlayNote?: (midi: number) => void;
  isCompact?: boolean;
}

interface WhiteKeyDef {
  midi: number;
  note: string;
  hasBlack: boolean;
  blackMidi?: number;
  blackNote?: string;
  label?: string;
  anomalyRef?: number;
}

// 19 White Keys from C3 (MIDI 48) to G5 (MIDI 79)
const PIANO_WHITE_KEYS: WhiteKeyDef[] = [
  // Octave 3 (Deep Cool historical baselines)
  { midi: 48, note: 'C3', hasBlack: true, blackMidi: 49, blackNote: 'C#3', label: 'C3', anomalyRef: -0.40 },
  { midi: 50, note: 'D3', hasBlack: true, blackMidi: 51, blackNote: 'D#3', label: 'D3', anomalyRef: -0.30 },
  { midi: 52, note: 'E3', hasBlack: false, label: 'E3', anomalyRef: -0.20 },
  { midi: 53, note: 'F3', hasBlack: true, blackMidi: 54, blackNote: 'F#3', label: 'F3', anomalyRef: -0.15 },
  { midi: 55, note: 'G3', hasBlack: true, blackMidi: 56, blackNote: 'G#3', label: 'G3', anomalyRef: -0.10 },
  { midi: 57, note: 'A3', hasBlack: true, blackMidi: 58, blackNote: 'A#3', label: 'A3', anomalyRef: -0.05 },
  { midi: 59, note: 'B3', hasBlack: false, label: 'B3', anomalyRef: -0.02 },

  // Octave 4 (1951-1980 Baseline & Moderate 20th Century Warming)
  { midi: 60, note: 'C4', hasBlack: true, blackMidi: 61, blackNote: 'C#4', label: 'C4 (0°C)', anomalyRef: 0.00 },
  { midi: 62, note: 'D4', hasBlack: true, blackMidi: 63, blackNote: 'D#4', label: 'D4', anomalyRef: +0.20 },
  { midi: 64, note: 'E4', hasBlack: false, label: 'E4', anomalyRef: +0.40 },
  { midi: 65, note: 'F4', hasBlack: true, blackMidi: 66, blackNote: 'F#4', label: 'F4', anomalyRef: +0.55 },
  { midi: 67, note: 'G4', hasBlack: true, blackMidi: 68, blackNote: 'G#4', label: 'G4', anomalyRef: +0.70 },
  { midi: 69, note: 'A4', hasBlack: true, blackMidi: 70, blackNote: 'A#4', label: 'A4', anomalyRef: +0.85 },
  { midi: 71, note: 'B4', hasBlack: false, label: 'B4', anomalyRef: +1.00 },

  // Octave 5 (Modern 21st Century Heat Waves & Record Peaks)
  { midi: 72, note: 'C5', hasBlack: true, blackMidi: 73, blackNote: 'C#5', label: 'C5 (+1.1°C)', anomalyRef: +1.10 },
  { midi: 74, note: 'D5', hasBlack: true, blackMidi: 75, blackNote: 'D#5', label: 'D5', anomalyRef: +1.18 },
  { midi: 76, note: 'E5', hasBlack: false, label: 'E5 (+1.25°C)', anomalyRef: +1.25 },
  { midi: 77, note: 'F5', hasBlack: true, blackMidi: 78, blackNote: 'F#5', label: 'F5', anomalyRef: +1.35 },
  { midi: 79, note: 'G5', hasBlack: false, label: 'G5', anomalyRef: +1.45 },
];

export const InteractivePianoKeyboard: React.FC<InteractivePianoKeyboardProps> = ({
  currentAnomaly,
  currentYear,
  onSelectYear,
  onPlayNote,
}) => {
  const { settings, announceToScreenReader } = useAccessibility();
  const [pressedMidi, setPressedMidi] = useState<number | null>(null);
  const [lastPlayedInfo, setLastPlayedInfo] = useState<{
    note: string;
    freq: number;
    yearMatch?: number;
  } | null>(null);
  const [showNoteLabels, setShowNoteLabels] = useState<boolean>(true);

  // Active chord midis for current anomaly
  const currentPiano = getPianoNoteForAnomaly(currentAnomaly);
  const currentLeadNote = currentPiano.note;

  const handlePlayKey = (midi: number) => {
    setPressedMidi(midi);
    if (onPlayNote) {
      onPlayNote(midi);
    } else {
      audioEngine.playMidiKey(midi, 1.3, settings.volume);
    }
    const { note, freq } = getNoteNameFromMidi(midi);

    // Find closest historical year matching this note's tier
    const matchingData = GISTEMP_DATA.find((d) => {
      const p = getPianoNoteForAnomaly(d.anomaly);
      return p.note === note;
    });

    setLastPlayedInfo({
      note,
      freq,
      yearMatch: matchingData?.year,
    });

    announceToScreenReader(`Played piano note ${note}, frequency ${freq} Hertz.`);

    setTimeout(() => {
      setPressedMidi(null);
    }, 280);
  };

  const handleJumpToYear = (year: number) => {
    if (onSelectYear) {
      onSelectYear(year);
      announceToScreenReader(`Jumped timeline to year ${year}.`);
    }
  };

  return (
    <div className="w-full select-none" dir="ltr">
      {/* Piano Grand Console Casing Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-neutral-950 rounded-t-xl border border-b-0 border-cyan-500/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Music className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-mono font-bold text-white tracking-wider uppercase">
            Concert Grand Piano Sonifier
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            C3 – G5 (3 Octaves)
          </span>
        </div>

        {/* Status / Active Note Indicator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {lastPlayedInfo ? (
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-cyan-300 font-bold">
                {lastPlayedInfo.note} ({lastPlayedInfo.freq} Hz)
              </span>
              {lastPlayedInfo.yearMatch && onSelectYear && (
                <button
                  onClick={() => handleJumpToYear(lastPlayedInfo.yearMatch!)}
                  className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition-colors"
                  title={`Jump to year ${lastPlayedInfo.yearMatch}`}
                >
                  Jump to {lastPlayedInfo.yearMatch}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
              <span className="text-slate-400">Current Key:</span>
              <span
                className={`font-bold ${
                  currentAnomaly > 0.8
                    ? 'text-red-400'
                    : currentAnomaly > 0.2
                    ? 'text-amber-400'
                    : 'text-cyan-400'
                }`}
              >
                {currentPiano.note} ({currentPiano.freq} Hz)
              </span>
            </div>
          )}

          <button
            onClick={() => setShowNoteLabels(!showNoteLabels)}
            className="text-[10px] font-mono px-2 py-1 rounded border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-colors"
          >
            {showNoteLabels ? 'Hide Labels' : 'Show Labels'}
          </button>
        </div>
      </div>

      {/* Piano Keyboard Bed (Horizontal touch-scroll on phone, full-width on sm+) */}
      <div className="w-full overflow-x-auto bg-black rounded-b-xl border border-cyan-500/30 shadow-[0_12px_30px_rgba(0,0,0,0.85)]">
        <div className="relative min-w-[600px] sm:min-w-0 w-full h-36 sm:h-44 p-1.5 sm:p-2 overflow-hidden">
          {/* Felt Damper Rail (Gold/Crimson Grand Piano Felt Strip) */}
          <div className="absolute top-1.5 left-2 right-2 h-1 bg-gradient-to-r from-red-900 via-amber-700 to-red-900 rounded-full z-30 opacity-90 shadow-sm" />

          {/* White Keys Flex Container */}
          <div className="flex w-full h-full relative">
          {PIANO_WHITE_KEYS.map((wk, idx) => {
            const isLeadActive = currentLeadNote === wk.note;
            const isUserPressed = pressedMidi === wk.midi;
            const isMiddleC = wk.note === 'C4';

            // Glow color based on temperature
            const activeGlow =
              currentAnomaly > 0.8
                ? 'bg-gradient-to-t from-red-500/30 via-red-200 to-white text-red-950 shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                : currentAnomaly > 0.2
                ? 'bg-gradient-to-t from-amber-400/30 via-amber-100 to-white text-amber-950 shadow-[0_0_18px_rgba(245,158,11,0.6)]'
                : 'bg-gradient-to-t from-cyan-400/30 via-cyan-100 to-white text-cyan-950 shadow-[0_0_18px_rgba(6,182,212,0.6)]';

            return (
              <div
                key={wk.midi}
                className="relative flex-1 h-full first:rounded-bl-md last:rounded-br-md"
              >
                {/* 1. White Key Button */}
                <button
                  type="button"
                  onClick={() => handlePlayKey(wk.midi)}
                  aria-label={`Piano key ${wk.note}`}
                  className={`w-full h-full rounded-b-md transition-all duration-75 flex flex-col justify-end items-center pb-2 cursor-pointer border-r border-slate-400/40 last:border-r-0 select-none ${
                    isUserPressed || isLeadActive
                      ? `${activeGlow} translate-y-1`
                      : 'bg-gradient-to-b from-[#ffffff] via-[#f1f3f5] to-[#dcdfe4] text-slate-800 hover:from-[#f8f9fa] hover:to-[#ced4da] shadow-[inset_0_-4px_4px_rgba(0,0,0,0.15),0_3px_5px_rgba(0,0,0,0.3)]'
                  } ${
                    isMiddleC
                      ? 'border-b-2 border-b-cyan-500'
                      : ''
                  }`}
                >
                  {/* Active Indicator Pulse Ring */}
                  {isLeadActive && (
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping mb-1" />
                  )}

                  {/* Note Label */}
                  {showNoteLabels && (
                    <span
                      className={`text-[9px] sm:text-[10px] font-mono font-bold leading-none ${
                        isLeadActive ? 'font-black' : 'text-slate-600'
                      }`}
                    >
                      {wk.note}
                    </span>
                  )}
                  {isMiddleC && (
                    <span className="text-[7px] font-mono uppercase text-cyan-600 font-extrabold tracking-tighter">
                      Baseline
                    </span>
                  )}
                </button>

                {/* 2. Black Key (If present on this white key) */}
                {wk.hasBlack && wk.blackMidi && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayKey(wk.blackMidi!);
                    }}
                    aria-label={`Piano key ${wk.blackNote}`}
                    className={`absolute -right-[30%] top-0 w-[60%] h-[62%] z-20 rounded-b-md transition-all duration-75 flex flex-col justify-end items-center pb-1.5 cursor-pointer select-none shadow-[0_4px_8px_rgba(0,0,0,0.8),inset_0_-2px_2px_rgba(255,255,255,0.1)] ${
                      pressedMidi === wk.blackMidi || currentLeadNote === wk.blackNote
                        ? 'bg-gradient-to-b from-cyan-400 to-cyan-700 text-slate-950 translate-y-0.5 shadow-[0_0_15px_rgba(6,182,212,0.8)]'
                        : 'bg-gradient-to-b from-[#24272c] via-[#15171a] to-[#070809] text-slate-300 hover:from-[#343a40] hover:to-[#111315]'
                    }`}
                  >
                    {showNoteLabels && (
                      <span className="text-[7px] sm:text-[8px] font-mono font-medium text-slate-300 opacity-80 leading-none">
                        {wk.blackNote?.replace(/\d/, '')}
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* Climate Sonification Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-black rounded-b-lg border-t border-cyan-500/15 text-[10px] font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span>Low C3–G3: Cold Pre-Industrial (-0.4°C)</span>
          </span>
          <span className="hidden sm:flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ffe600] inline-block" />
            <span>Middle C4: 1951–1980 Baseline (0.0°C)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span>High C5–E5: Anthropocene Record (+1.25°C)</span>
          </span>
        </div>
        <span className="text-slate-400 italic">
          <span className="sm:hidden">Swipe keys ↔ · </span>Tap or click any key to play
        </span>
      </div>
    </div>
  );
};

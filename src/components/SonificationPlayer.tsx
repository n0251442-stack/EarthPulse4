import React, { useState, useEffect, useRef } from 'react';
import { TemperatureDataPoint } from '../types';
import { GISTEMP_DATA } from '../data/earthData';
import { useAccessibility } from '../context/AccessibilityContext';
import {
  audioEngine,
  anomalyToExactFrequency,
  anomalyToPianoKey,
  AudioMode,
  SonificationSource,
} from '../services/audioEngine';
import { nasaDataService, ValidatedRecord } from '../services/nasaDataService';
import { InteractivePianoKeyboard } from './InteractivePianoKeyboard';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic,
  Activity,
  Music,
  Sliders,
} from 'lucide-react';

interface SonificationPlayerProps {
  currentData: TemperatureDataPoint;
  onSelectYear: (year: number) => void;
  onOpenAudioGuide: () => void;
}

export const SonificationPlayer: React.FC<SonificationPlayerProps> = ({
  currentData,
  onSelectYear,
  onOpenAudioGuide,
}) => {
  const { settings, updateSetting, announceToScreenReader } = useAccessibility();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(settings.soundSpeed || 1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showPiano, setShowPiano] = useState<boolean>(true);
  const [audioMode, setAudioMode] = useState<AudioMode>('musical');
  const [sonifSource, setSonifSource] = useState<SonificationSource>('nasaJD');
  const [validatedRec, setValidatedRec] = useState<ValidatedRecord | null>(null);

  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndex = GISTEMP_DATA.findIndex((d) => d.year === currentData.year);
  const totalYears = GISTEMP_DATA.length;

  const currentYearRef = useRef<number>(currentData.year);
  currentYearRef.current = currentData.year;

  // Sync mode & source to audioEngine
  useEffect(() => {
    audioEngine.setMode(audioMode);
  }, [audioMode]);

  useEffect(() => {
    audioEngine.setSource(sonifSource);
  }, [sonifSource]);

  // Load validated dual-source record for current year
  useEffect(() => {
    const rec = nasaDataService.getValidatedRecordByYear(currentData.year);
    if (rec) {
      setValidatedRec(rec);
    }
  }, [currentData.year]);

  // Determine effective anomaly based on active source
  const getEffectiveAnomaly = (yearData: TemperatureDataPoint): number => {
    if (!validatedRec || validatedRec.year !== yearData.year) {
      const rec = nasaDataService.getValidatedRecordByYear(yearData.year);
      if (rec) {
        if (sonifSource === 'userNoSmoothing') return rec.userNoSmoothing;
        if (sonifSource === 'userLowess5') return rec.userLowess5;
        return rec.nasaJD;
      }
    } else {
      if (sonifSource === 'userNoSmoothing') return validatedRec.userNoSmoothing;
      if (sonifSource === 'userLowess5') return validatedRec.userLowess5;
      return validatedRec.nasaJD;
    }
    return yearData.anomaly;
  };

  const effectiveAnomaly = getEffectiveAnomaly(currentData);
  const exactFrequency = anomalyToExactFrequency(effectiveAnomaly);
  const pianoKeyInfo = anomalyToPianoKey(effectiveAnomaly);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      audioEngine.stopSonification();
      return;
    }

    if (settings.sonificationEnabled) {
      audioEngine.startSonification(effectiveAnomaly, isMuted ? 0 : settings.volume);
    }

    const intervalMs = Math.round(550 / speed);

    playTimerRef.current = setInterval(() => {
      const nextIdx = GISTEMP_DATA.findIndex((d) => d.year === currentYearRef.current) + 1;
      if (nextIdx >= GISTEMP_DATA.length) {
        setIsPlaying(false);
        audioEngine.stopSonification();
        announceToScreenReader('Completed timeline playback to 2025.');
        return;
      }
      const nextData = GISTEMP_DATA[nextIdx];
      const nextEffectiveAnomaly = getEffectiveAnomaly(nextData);

      // Play sonification pulse
      const isFiveYearMark = nextData.year % 5 === 0 || nextData.year === 2025;
      if (settings.sonificationEnabled && (isFiveYearMark || audioMode === 'scientific')) {
        audioEngine.playDiscretePulse(nextEffectiveAnomaly, 0.85, isMuted ? 0 : settings.volume);
      }

      // Spoken narrative in English for 5-year marks or milestones
      if (settings.audioGuide && isFiveYearMark) {
        let speechText = '';
        if (nextEffectiveAnomaly === 0) {
          speechText = `Year ${nextData.year}. Baseline zero degrees Celsius.`;
        } else if (nextEffectiveAnomaly > 0) {
          speechText = `Year ${nextData.year}. Plus ${nextEffectiveAnomaly.toFixed(2)} degrees.`;
        } else {
          speechText = `Year ${nextData.year}. Minus ${Math.abs(nextEffectiveAnomaly).toFixed(2)} degrees.`;
        }
        if (nextData.milestone && (nextData.year === 1998 || nextData.year === 2016 || nextData.year === 2023 || nextData.year === 2024 || nextData.year === 2025)) {
          speechText += ` ${nextData.milestone}`;
        }
        audioEngine.speakGuidance(speechText);
      }

      onSelectYear(nextData.year);
    }, intervalMs);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, speed, settings.sonificationEnabled, settings.audioGuide, isMuted, settings.volume, audioMode, sonifSource, onSelectYear]);

  // When current year changes manually, play auditory feedback
  useEffect(() => {
    if (settings.sonificationEnabled && !isPlaying) {
      audioEngine.playDiscretePulse(effectiveAnomaly, 0.45, isMuted ? 0 : settings.volume);
    }
  }, [currentData.year, effectiveAnomaly]);

  const togglePlay = () => {
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    announceToScreenReader(
      nextPlay ? `Playing timeline sonification from ${currentData.year}.` : 'Paused timeline playback.'
    );
  };

  const handleStepPrev = () => {
    const prevIdx = Math.max(0, currentIndex - 1);
    const target = GISTEMP_DATA[prevIdx].year;
    onSelectYear(target);
    announceToScreenReader(`Year ${target}, anomaly ${GISTEMP_DATA[prevIdx].anomaly}°C`);
  };

  const handleStepNext = () => {
    const nextIdx = Math.min(GISTEMP_DATA.length - 1, currentIndex + 1);
    const target = GISTEMP_DATA[nextIdx].year;
    onSelectYear(target);
    announceToScreenReader(`Year ${target}, anomaly ${GISTEMP_DATA[nextIdx].anomaly}°C`);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetYear = parseInt(e.target.value, 10);
    onSelectYear(targetYear);
  };

  const cycleSpeed = () => {
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setSpeed(newSpeed);
    updateSetting('soundSpeed', newSpeed);
    announceToScreenReader(`Playback speed set to ${newSpeed}x`);
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioEngine.setMute(nextMute);
    announceToScreenReader(nextMute ? 'Audio muted.' : 'Audio unmuted.');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateSetting('volume', val);
    audioEngine.setVolume(val);
    if (isMuted && val > 0) {
      setIsMuted(false);
      audioEngine.setMute(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Timeline and Audio Sonification Console"
      className={`w-full rounded-2xl border transition-all ${
        settings.highContrast
          ? 'bg-black border-2 border-[#ffe600] text-white'
          : 'bg-black/90 backdrop-blur-xl border-cyan-500/30 text-slate-100 shadow-[0_10px_35px_rgba(0,0,0,0.85)]'
      } p-3 sm:p-5 flex flex-col gap-3.5 sm:gap-4`}
    >
      {/* Top Scrubber Rail & Decade Markers */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold">1880</span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <span className="text-[11px] text-slate-400 hidden md:inline">GISTEMP series begins</span>
          </span>

          {/* Current Year Badge with Note and Calibrated Anomaly */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold border transition-colors ${
              currentData.anomaly >= 1.0
                ? 'bg-rose-950/70 border-rose-500/70 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : currentData.anomaly > 0
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                : 'bg-blue-950/60 border-blue-500/60 text-blue-300'
            }`}
          >
            <span>{currentData.year}</span>
            <span className="text-slate-400">·</span>
            <span>🎹 {pianoKeyInfo.note}</span>
            <span className="text-slate-400">·</span>
            <span>({effectiveAnomaly > 0 ? '+' : ''}{effectiveAnomaly.toFixed(2)}°C)</span>
            <span className="text-slate-400 text-[10px] hidden sm:inline">[{Math.round(exactFrequency)} Hz]</span>
          </div>

          <span className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px] hidden md:inline">Modern Records</span>
            <span className="text-slate-600 hidden md:inline">·</span>
            <span className="text-slate-300 font-bold">2025</span>
          </span>
        </div>

        {/* Scrubber slider */}
        <div className="relative w-full pt-1">
          <input
            type="range"
            min={1880}
            max={2025}
            step={1}
            value={currentData.year}
            onChange={handleScrubberChange}
            aria-label="Scientific Timeline Year"
            aria-valuemin={1880}
            aria-valuemax={2025}
            aria-valuenow={currentData.year}
            aria-valuetext={`Year ${currentData.year}, temperature anomaly ${effectiveAnomaly.toFixed(2)} degrees Celsius, tone ${pianoKeyInfo.note}`}
            className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              settings.highContrast
                ? 'accent-[#ffe600] bg-slate-900'
                : 'accent-cyan-400 bg-slate-800 focus-visible:ring-cyan-400'
            }`}
          />

          {/* Decade Sub-ticks along the track */}
          <div className="w-full flex justify-between px-1 pt-1.5 pointer-events-none">
            {Array.from({ length: 15 }, (_, i) => 1880 + i * 10).map((tickYear) => (
              <div
                key={tickYear}
                className={`w-0.5 h-1.5 rounded-full ${
                  tickYear <= currentData.year
                    ? settings.highContrast
                      ? 'bg-[#ffe600]'
                      : 'bg-cyan-400'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Control Bar: Transport, Modes, Sources, Piano Toggle, Volume */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pt-1">
        {/* Left: Transport buttons & Year timecode */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleStepPrev}
            disabled={currentIndex === 0}
            aria-label="Previous year"
            className={`p-2 rounded-lg border transition-colors disabled:opacity-30 ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-slate-900/80 border-cyan-900 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause timeline sonification' : 'Play timeline sonification'}
            className={`p-3 rounded-full transition-all flex items-center justify-center shadow-lg ${
              settings.highContrast
                ? 'bg-[#ffe600] text-black hover:bg-yellow-300'
                : 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleStepNext}
            disabled={currentIndex === GISTEMP_DATA.length - 1}
            aria-label="Next year"
            className={`p-2 rounded-lg border transition-colors disabled:opacity-30 ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-slate-900/80 border-cyan-900 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="ml-1 sm:ml-2 font-mono text-xs tabular-nums text-slate-300">
            <span
              className={`text-sm font-bold ${
                settings.highContrast ? 'text-[#ffe600]' : 'text-cyan-300'
              }`}
            >
              {currentData.year}
            </span>
            <span className="text-slate-400 ml-1.5 hidden sm:inline">
              ({String(Math.floor((currentIndex / totalYears) * 5)).padStart(2, '0')}:
              {String(Math.floor(((currentIndex / totalYears) * 300) % 60)).padStart(2, '0')} / 05:00)
            </span>
          </div>
        </div>

        {/* Center: Three Audio Modes & Source Selection */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {/* Audio Experience Modes Segmented Control */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg">
            <button
              onClick={() => {
                setAudioMode('musical');
                announceToScreenReader('Switched to Musical Grand Piano mode.');
              }}
              className={`px-2 sm:px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                audioMode === 'musical'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Acoustic Grand Piano harmonic soundboard mode"
            >
              <Music className="w-3.5 h-3.5" />
              <span>Musical Piano</span>
            </button>

            <button
              onClick={() => {
                setAudioMode('scientific');
                announceToScreenReader('Switched to Scientific Calibrated Sonification mode.');
              }}
              className={`px-2 sm:px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                audioMode === 'scientific'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Continuous calibrated mathematical tone (f = 261.63 * 2^(Anomaly/1.2))"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Scientific (Hz)</span>
            </button>

            <button
              onClick={() => {
                const nextAudioGuide = !settings.audioGuide;
                updateSetting('audioGuide', nextAudioGuide);
                announceToScreenReader(nextAudioGuide ? 'Spoken narration enabled.' : 'Spoken narration disabled.');
              }}
              className={`px-2 sm:px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                settings.audioGuide
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="English spoken audio narration of year and temperatures"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Narration</span>
            </button>
          </div>

          {/* Scientific Mode Data Source Selector */}
          {audioMode === 'scientific' && (
            <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono">
              <span className="text-[10px] text-slate-500 uppercase mr-1">Source:</span>
              <button
                onClick={() => setSonifSource('nasaJD')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${
                  sonifSource === 'nasaJD' ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                NASA J-D
              </button>
              <button
                onClick={() => setSonifSource('userNoSmoothing')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${
                  sonifSource === 'userNoSmoothing' ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                User Ref
              </button>
              <button
                onClick={() => setSonifSource('userLowess5')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${
                  sonifSource === 'userLowess5' ? 'bg-cyan-900/60 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lowess(5)
              </button>
            </div>
          )}

          {/* Piano Keyboard Visibility Toggle */}
          <button
            onClick={() => {
              setShowPiano((prev) => !prev);
              audioEngine.playDiscretePulse(effectiveAnomaly, 0.9, isMuted ? 0 : settings.volume);
              announceToScreenReader(
                `Interactive piano ${!showPiano ? 'shown' : 'hidden'}. Current note ${pianoKeyInfo.note} (${pianoKeyInfo.freq} Hz).`
              );
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 border transition-all ${
              showPiano
                ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900/90 text-cyan-200 border-cyan-700/60 hover:bg-cyan-950/80 hover:border-cyan-400'
            }`}
            title={`Toggle Real Piano Keyboard (Current note: ${pianoKeyInfo.note})`}
            aria-label={`Current piano note: ${pianoKeyInfo.note}, ${pianoKeyInfo.freq} Hz. Toggle interactive piano keyboard.`}
          >
            <span>🎹</span>
            <span className="font-bold text-white">{pianoKeyInfo.note}</span>
            <span className="text-[10px] text-slate-400">({Math.round(exactFrequency)} Hz)</span>
            <span className="text-[10px] font-sans font-semibold text-cyan-300 ml-0.5">
              {showPiano ? '▲ Hide' : '▼ Keyboard'}
            </span>
          </button>
        </div>

        {/* Right: Volume & Playback Speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || settings.volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : settings.volume}
              onChange={handleVolumeChange}
              aria-label="Sonification Volume"
              className={`w-16 h-1.5 rounded-lg appearance-none cursor-pointer ${
                settings.highContrast ? 'accent-[#ffe600] bg-slate-800' : 'accent-cyan-400 bg-slate-800'
              }`}
            />
          </div>

          <button
            onClick={cycleSpeed}
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-colors ${
              settings.highContrast
                ? 'bg-black border-[#ffe600] text-[#ffe600] hover:bg-[#ffe600] hover:text-black'
                : 'bg-slate-900 border-cyan-900 text-cyan-300 hover:border-cyan-600'
            }`}
            title="Cycle Playback Speed"
            aria-label={`Playback speed: ${speed}x`}
          >
            {speed.toFixed(1)}x
          </button>
        </div>
      </div>

      {/* Interactive Acoustic Piano Keyboard Display (Expandable) */}
      {showPiano && (
        <div className="pt-2 border-t border-slate-800/80">
          <InteractivePianoKeyboard
            currentAnomaly={effectiveAnomaly}
            currentYear={currentData.year}
            onPlayNote={(midi: number) => {
              audioEngine.playMidiKey(midi, 1.25, isMuted ? 0 : settings.volume);
            }}
          />
        </div>
      )}
    </div>
  );
};

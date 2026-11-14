/**
 * EarthPulse Audio Engine — Scientific Sonification & Acoustic Piano Synthesis
 * 
 * Sonification Formula:
 *   f = 261.625565 * 2^(Anomaly / 1.2)
 * 
 * Calibration:
 * - 0.00°C Anomaly (1951–1980 baseline) = Middle C (C4, 261.625565 Hz)
 * - +1.20°C Warming                     = High C (C5, 523.251130 Hz) — Exactly 1 full octave!
 * - -0.50°C Historical Cooling          = G3 (195.998 Hz)
 * - Sensitivity: Exactly 0.10°C of temperature change per equal-tempered semitone (2^(0.1/1.2) = 2^(1/12)).
 * 
 * Three Distinct Audio Modes:
 * 1. 'musical': Harmonic Concert Grand Piano soundboard synthesis with warm acoustic voicing.
 * 2. 'scientific': Exact mathematical frequency sonification with selectable source (NASA J-D vs User No_Smoothing vs Lowess(5)).
 * 3. 'narration': Spoken English audio guide with historical context and milestone commentary.
 */

export type AudioMode = 'musical' | 'scientific' | 'narration';
export type SonificationSource = 'nasaJD' | 'userNoSmoothing' | 'userLowess5';

export interface PianoNoteInfo {
  note: string;
  midi: number;
  freq: number;
  exactFreq: number;
  semitones: number;
  scaleDegree: string;
  chordNotes: { freq: number; gainRatio: number; delay: number; pan: number }[];
  description: string;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Calculates the exact continuous scientific frequency for a given temperature anomaly.
 * Formula: f = 261.625565 * 2^(Anomaly / 1.2)
 */
export function anomalyToExactFrequency(anomaly: number): number {
  return 261.625565 * Math.pow(2, anomaly / 1.2);
}

/**
 * Converts a MIDI number to a standard note name (e.g. 60 -> "C4", 61 -> "C#4")
 */
export function getNoteNameFromMidi(midi: number): { note: string; freq: number; octave: number; isBlack: boolean } {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  const freq = Math.round(440 * Math.pow(2, (midi - 69) / 12) * 100) / 100;
  const isBlack = name.includes('#');
  return { note: `${name}${octave}`, freq, octave, isBlack };
}

/**
 * Maps an anomaly to the nearest chromatic piano note using 0.1°C per semitone.
 */
export function anomalyToPianoKey(anomaly: number): { note: string; midi: number; freq: number; exactFreq: number; semitones: number } {
  const exactFreq = anomalyToExactFrequency(anomaly);
  // Semitones relative to Middle C (C4 = 60)
  const semitones = Math.round((anomaly / 1.2) * 12);
  const midi = Math.max(21, Math.min(108, 60 + semitones)); // Clamped to standard 88-key piano (A0 to C8)
  const info = getNoteNameFromMidi(midi);

  return {
    note: info.note,
    midi,
    freq: info.freq,
    exactFreq: Math.round(exactFreq * 100) / 100,
    semitones,
  };
}

// Harmonious tiers for the Concert Grand Piano Mode
const HARMONIC_TIERS: {
  maxAnomaly: number;
  name: string;
  rootMidi: number;
  midis: number[];
  desc: string;
}[] = [
  {
    maxAnomaly: -0.35,
    name: 'Deep Cool Baseline',
    rootMidi: 43, // G2
    midis: [43, 50, 55, 59], // G2, D3, G3, B3
    desc: 'Deep peaceful bass resonance of historical cool periods',
  },
  {
    maxAnomaly: -0.20,
    name: 'Sub-Zero Baseline',
    rootMidi: 45, // A2
    midis: [45, 52, 57, 60], // A2, E3, A3, C4
    desc: 'Cool pre-industrial baseline reflection',
  },
  {
    maxAnomaly: -0.05,
    name: 'Pre-Industrial Mean',
    rootMidi: 48, // C3
    midis: [48, 55, 60, 64], // C3, G3, C4, E4
    desc: 'Cool stable planetary average',
  },
  {
    maxAnomaly: +0.10,
    name: '1951–1980 Baseline (C4 Anchor)',
    rootMidi: 60, // C4
    midis: [48, 55, 64, 67], // C3, G3, E4, G4
    desc: 'Neutral 1951–1980 baseline reference (Middle C anchor = 261.63 Hz)',
  },
  {
    maxAnomaly: +0.25,
    name: 'Mild Early Warming',
    rootMidi: 62, // D4
    midis: [50, 57, 62, 66], // D3, A3, D4, F#4
    desc: 'Gentle warmth starting to lift above baseline',
  },
  {
    maxAnomaly: +0.45,
    name: 'Noticeable Warming',
    rootMidi: 64, // E4
    midis: [52, 59, 64, 67], // E3, B3, E4, G4
    desc: 'Rising thermal trajectory, uplifting harmonic tier',
  },
  {
    maxAnomaly: +0.70,
    name: 'Accelerating Heat',
    rootMidi: 67, // G4
    midis: [55, 62, 67, 71], // G3, D4, G4, B4
    desc: 'Accelerating planetary warming tier',
  },
  {
    maxAnomaly: +0.95,
    name: 'High Thermal Shift',
    rootMidi: 69, // A4
    midis: [57, 64, 69, 72], // A3, E4, A4, C5
    desc: 'Intense thermal rise, bright tenor melody',
  },
  {
    maxAnomaly: +1.15,
    name: 'Extreme Warming Surge',
    rootMidi: 72, // C5
    midis: [60, 67, 72, 76], // C4, G4, C5, E5 (Full octave above baseline)
    desc: 'Severe modern warming acceleration, full octave above baseline',
  },
  {
    maxAnomaly: 99.0,
    name: 'Record Modern Peak',
    rootMidi: 76, // E5
    midis: [60, 67, 76, 79], // C4, G4, E5, G5
    desc: 'Unprecedented modern record heat, apex treble luster',
  },
];

export function getPianoNoteForAnomaly(anomaly: number): PianoNoteInfo {
  const keyInfo = anomalyToPianoKey(anomaly);
  const tier = HARMONIC_TIERS.find((t) => anomaly <= t.maxAnomaly) || HARMONIC_TIERS[HARMONIC_TIERS.length - 1];

  const chordNotes = tier.midis.map((midi, i) => {
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const isLead = i === tier.midis.length - 1;
    const isBass = i === 0;
    const gainRatio = isLead ? 1.0 : isBass ? 0.75 : 0.55;
    const delay = i * 0.028;
    const pan = -0.3 + (i / (tier.midis.length - 1)) * 0.6;
    return { freq, gainRatio, delay, pan };
  });

  return {
    note: keyInfo.note,
    midi: keyInfo.midi,
    freq: keyInfo.freq,
    exactFreq: keyInfo.exactFreq,
    semitones: keyInfo.semitones,
    scaleDegree: tier.name,
    chordNotes,
    description: `${tier.name} (${anomaly > 0 ? '+' : ''}${anomaly.toFixed(2)}°C) — ${tier.desc}`,
  };
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.5;
  private activeMode: AudioMode = 'musical';
  private activeSource: SonificationSource = 'nasaJD';
  private isSynthesizing: boolean = false;
  private pianoWave: PeriodicWave | null = null;
  private activeVoices: { osc: OscillatorNode; gain: GainNode; stopTime: number }[] = [];
  
  // Continuous scientific oscillator
  private scientificOsc: OscillatorNode | null = null;
  private scientificSubOsc: OscillatorNode | null = null;
  private scientificGain: GainNode | null = null;
  private scientificFilter: BiquadFilterNode | null = null;

  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private speechWatchdog: number | null = null;
  private cachedVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        try {
          const v = window.speechSynthesis.getVoices();
          if (v && v.length > 0) {
            this.cachedVoices = v;
          }
        } catch {}
      };
      loadVoices();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      }
    }
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.initPianoWave(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    try {
      this.initContext();
    } catch {}
  }

  private initPianoWave(ctx: AudioContext): void {
    if (this.pianoWave) return;
    try {
      const real = new Float32Array([
        0,     // DC
        1.00,  // Fundamental
        0.55,  // Octave
        0.28,  // Natural 5th
        0.14,  // Double octave
        0.07,  // Major 3rd
        0.035, // 6th harmonic
        0.018, // 7th harmonic
        0.009, // Sparkle
      ]);
      const imag = new Float32Array(real.length);
      this.pianoWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    } catch {
      this.pianoWave = null;
    }
  }

  public setMode(mode: AudioMode): void {
    this.activeMode = mode;
    if (mode !== 'scientific') {
      this.stopScientificContinuous();
    }
  }

  public getMode(): AudioMode {
    return this.activeMode;
  }

  public setSource(source: SonificationSource): void {
    this.activeSource = source;
  }

  public getSource(): SonificationSource {
    return this.activeSource;
  }

  public anomalyToFrequency(anomaly: number): number {
    return anomalyToExactFrequency(anomaly);
  }

  /**
   * Mode A: Plays an authentic acoustic piano note/chord for the anomaly.
   */
  public playMusicalPulse(anomaly: number, duration: number = 1.35, volume: number = 0.5): void {
    if (this.isMuted) return;

    try {
      const ctx = this.initContext();
      const noteInfo = getPianoNoteForAnomaly(anomaly);
      const now = ctx.currentTime;
      const masterVol = Math.max(0, Math.min(1, volume)) * 0.24;

      while (this.activeVoices.length > 12) {
        const oldVoice = this.activeVoices.shift();
        if (oldVoice) {
          try {
            oldVoice.gain.gain.cancelScheduledValues(now);
            oldVoice.gain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
            oldVoice.osc.stop(now + 0.06);
          } catch {}
        }
      }

      noteInfo.chordNotes.forEach(({ freq, gainRatio, delay, pan }) => {
        const noteStart = now + delay;
        const voiceVol = masterVol * gainRatio;

        const keyGain = ctx.createGain();
        keyGain.gain.setValueAtTime(0.0001, noteStart);
        keyGain.gain.linearRampToValueAtTime(voiceVol, noteStart + 0.009);
        keyGain.gain.exponentialRampToValueAtTime(voiceVol * 0.72, noteStart + 0.12);
        keyGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const initialCutoff = Math.min(3800, freq * 3.8);
        const warmBodyCutoff = Math.max(380, freq * 1.4);
        filter.frequency.setValueAtTime(initialCutoff, noteStart);
        filter.frequency.exponentialRampToValueAtTime(warmBodyCutoff, noteStart + 0.4);
        filter.Q.setValueAtTime(0.55, noteStart);

        let panner: StereoPannerNode | null = null;
        if (typeof ctx.createStereoPanner === 'function') {
          panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(pan, noteStart);
        }

        const osc = ctx.createOscillator();
        if (this.pianoWave) {
          osc.setPeriodicWave(this.pianoWave);
        } else {
          osc.type = 'sine';
        }
        osc.frequency.setValueAtTime(freq, noteStart);

        // Hammer knock transient
        const hammerOsc = ctx.createOscillator();
        hammerOsc.type = 'sine';
        hammerOsc.frequency.setValueAtTime(Math.min(120, freq * 0.45), noteStart);
        const hammerGain = ctx.createGain();
        hammerGain.gain.setValueAtTime(voiceVol * 0.14, noteStart);
        hammerGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.022);

        hammerOsc.connect(hammerGain);
        hammerGain.connect(filter);

        osc.connect(filter);
        filter.connect(keyGain);

        if (panner) {
          keyGain.connect(panner);
          panner.connect(ctx.destination);
        } else {
          keyGain.connect(ctx.destination);
        }

        const stopTime = noteStart + duration + 0.05;
        osc.start(noteStart);
        hammerOsc.start(noteStart);
        hammerOsc.stop(noteStart + 0.025);
        osc.stop(stopTime);

        this.activeVoices.push({ osc, gain: keyGain, stopTime });

        setTimeout(() => {
          const vIdx = this.activeVoices.findIndex((v) => v.osc === osc);
          if (vIdx !== -1) this.activeVoices.splice(vIdx, 1);
        }, (duration + 0.2) * 1000);
      });
    } catch {}
  }

  /**
   * Mode B: Scientific Sonification using calibrated continuous frequency f = 261.625565 * 2^(Anomaly/1.2)
   */
  public playScientificTone(anomaly: number, duration: number = 0.85, volume: number = 0.5): void {
    if (this.isMuted) return;

    try {
      const ctx = this.initContext();
      const freq = anomalyToExactFrequency(anomaly);
      const now = ctx.currentTime;
      const vol = Math.max(0, Math.min(1, volume)) * 0.22;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      // Add a subtle second harmonic for warmth
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.linearRampToValueAtTime(vol * 0.25, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      osc2.connect(gain2);
      gain.connect(ctx.destination);
      gain2.connect(ctx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + duration);
      osc2.stop(now + duration);
    } catch {}
  }

  private stopScientificContinuous(): void {
    if (this.scientificGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.scientificGain.gain.cancelScheduledValues(now);
        this.scientificGain.gain.linearRampToValueAtTime(0.0001, now + 0.05);
      } catch {}
    }
  }

  /**
   * Universal trigger during timeline playback matching the active mode.
   */
  public playDiscretePulse(anomaly: number, duration: number = 1.0, volume: number = 0.5): void {
    if (this.isMuted) return;

    if (this.activeMode === 'scientific') {
      this.playScientificTone(anomaly, duration, volume);
    } else {
      this.playMusicalPulse(anomaly, duration, volume);
    }
  }

  public startSonification(anomaly: number, volume: number = 0.5): void {
    this.masterVolume = volume;
    this.isSynthesizing = true;
    this.playDiscretePulse(anomaly, 0.85, volume);
  }

  public updateFrequency(anomaly: number): void {
    if (!this.isSynthesizing || this.isMuted) return;
    this.playDiscretePulse(anomaly, 0.75, this.masterVolume);
  }

  public stopSonification(): void {
    this.isSynthesizing = false;
    this.stopScientificContinuous();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeVoices.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
        osc.stop(now + 0.09);
      } catch {}
    });
    this.activeVoices = [];
  }

  /**
   * Plays a single physical piano key by MIDI number (A0=21 to C8=108).
   */
  public playMidiKey(midi: number, duration: number = 1.25, volume: number = 0.6): void {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const masterVol = Math.max(0, Math.min(1, volume)) * 0.28;

      const keyGain = ctx.createGain();
      keyGain.gain.setValueAtTime(0.0001, now);
      keyGain.gain.linearRampToValueAtTime(masterVol, now + 0.008);
      keyGain.gain.exponentialRampToValueAtTime(masterVol * 0.72, now + 0.12);
      keyGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const initialCutoff = Math.min(4200, freq * 4.0);
      const warmCutoff = Math.max(350, freq * 1.5);
      filter.frequency.setValueAtTime(initialCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(warmCutoff, now + 0.35);
      filter.Q.setValueAtTime(0.55, now);

      let panner: StereoPannerNode | null = null;
      if (typeof ctx.createStereoPanner === 'function') {
        panner = ctx.createStereoPanner();
        const panVal = Math.max(-0.6, Math.min(0.6, ((midi - 60) / 24) * 0.8));
        panner.pan.setValueAtTime(panVal, now);
      }

      const osc = ctx.createOscillator();
      if (this.pianoWave) {
        osc.setPeriodicWave(this.pianoWave);
      } else {
        osc.type = 'sine';
      }
      osc.frequency.setValueAtTime(freq, now);

      const hammerOsc = ctx.createOscillator();
      hammerOsc.type = 'sine';
      hammerOsc.frequency.setValueAtTime(Math.min(120, freq * 0.45), now);
      const hammerGain = ctx.createGain();
      hammerGain.gain.setValueAtTime(masterVol * 0.14, now);
      hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      hammerOsc.connect(hammerGain);
      hammerGain.connect(filter);

      osc.connect(filter);
      filter.connect(keyGain);

      if (panner) {
        keyGain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        keyGain.connect(ctx.destination);
      }

      osc.start(now);
      hammerOsc.start(now);
      osc.stop(now + duration + 0.05);
      hammerOsc.stop(now + 0.03);

      this.activeVoices.push({ osc, gain: keyGain, stopTime: now + duration });
    } catch {}
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopSonification();
      this.stopSpeaking();
    }
  }

  /**
   * Spoken narrative guidance using Web Speech Synthesis.
   * Strictly in English (en-US), respecting user instruction "لا امجليزى مش عربى".
   */
  public speakGuidance(
    text: string,
    force: boolean = false,
    onBlocked?: () => void,
    onStarted?: () => void
  ): void {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    if (!force && this.lastSpokenText === text && now - this.lastSpokenTime < 1800) {
      return;
    }

    try {
      const synth = window.speechSynthesis;
      if (this.speechWatchdog !== null) {
        window.clearTimeout(this.speechWatchdog);
        this.speechWatchdog = null;
      }

      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
      if (synth.paused) {
        synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      utterance.volume = Math.min(1, Math.max(0.25, this.masterVolume * 1.6));

      const voices = this.cachedVoices.length > 0 ? this.cachedVoices : synth.getVoices();
      if (voices && voices.length > 0) {
        this.cachedVoices = voices;
        const preferredEn =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.toLowerCase().includes('male') ||
                v.name.toLowerCase().includes('david') ||
                v.name.toLowerCase().includes('guy') ||
                v.name.toLowerCase().includes('natural') ||
                v.name.toLowerCase().includes('google us english'))
          ) || voices.find((v) => v.lang.startsWith('en'));
        if (preferredEn) utterance.voice = preferredEn;
      }

      let didStart = false;
      let settled = false;

      const clearWatchdog = () => {
        if (this.speechWatchdog !== null) {
          window.clearTimeout(this.speechWatchdog);
          this.speechWatchdog = null;
        }
      };

      utterance.onstart = () => {
        didStart = true;
        settled = true;
        clearWatchdog();
        onStarted?.();
      };

      utterance.onend = () => {
        settled = true;
        clearWatchdog();
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
      };

      utterance.onerror = (event) => {
        settled = true;
        clearWatchdog();
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
        if (
          !didStart &&
          (event.error === 'not-allowed' ||
            event.error === 'audio-hardware' ||
            event.error === 'synthesis-failed' ||
            event.error === 'audio-busy') &&
          onBlocked
        ) {
          onBlocked();
        }
      };

      this.activeUtterance = utterance;
      this.lastSpokenText = text;
      this.lastSpokenTime = now;
      synth.speak(utterance);

      // Watchdog: if Chrome silently ignored unprompted speak(), report blocked so gesture retry fires
      this.speechWatchdog = window.setTimeout(() => {
        this.speechWatchdog = null;
        if (!didStart && !settled && !synth.speaking && !synth.pending) {
          if (this.activeUtterance === utterance) {
            this.activeUtterance = null;
          }
          onBlocked?.();
        }
      }, 700);
    } catch {
      onBlocked?.();
    }
  }

  public stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
}

export const audioEngine = new AudioEngine();

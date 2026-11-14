/**
 * Real-Time Interactive Map Piano Sonification Engine
 *
 * Dynamically maps NASA GISTEMP v4 gridded temperature anomalies (°C)
 * to acoustic grand-piano frequencies via a consistent logarithmic scale:
 *
 *   x_clipped = max(-4, min(4, x))
 *   f = 440 * 2^(x_clipped / 4)
 *
 * Uses a fixed pool of reusable Web Audio nodes (zero per-mousemove node allocation)
 * with anti-click envelopes, natural piano damper release, and strict silence
 * on missing (_FillValue / null / NaN / ocean in Land-Only) cells.
 */

export const AUDIO_CLIP_MIN_C = -4;
export const AUDIO_CLIP_MAX_C = 4;
export const REFERENCE_A4_HZ = 440;
export const DEFAULT_NETCDF_FILL_VALUE = 32767;

export interface GridCellLookupResult {
  latIdx: number;
  lonIdx: number;
  lat: number;
  lon: number;
  value: number | null;
}

export interface GridLookupSliceLike {
  latCount: number;
  lonCount: number;
  fillValue?: number;
  values: Array<number | null>;
}

export interface GridLookupMetadataLike {
  lat: number[];
  lon: number[];
}

/**
 * Validates that a temperature anomaly measurement represents an authentic,
 * finite observation rather than missing data, NaN, Infinity, or NetCDF _FillValue.
 */
export function isValidTemperatureAnomaly(
  value: unknown,
  fillValue: number = DEFAULT_NETCDF_FILL_VALUE
): value is number {
  if (typeof value !== 'number') return false;
  if (!Number.isFinite(value)) return false;
  if (value === fillValue) return false;
  if (Math.abs(value) >= 9999) return false;
  return true;
}

/**
 * Clips temperature anomaly exclusively for logarithmic piano pitch mapping.
 * Never mutates or alters displayed scientific measurements.
 */
export function clipAnomalyForAudio(anomaly: number): number {
  return Math.max(AUDIO_CLIP_MIN_C, Math.min(AUDIO_CLIP_MAX_C, anomaly));
}

/**
 * Converts a NASA temperature anomaly (°C) to piano frequency (Hz):
 *   x_clipped = max(-4, min(4, x))
 *   f = 440 * 2^(x_clipped / 4)
 *
 * Returns null (silence) when anomaly is missing or invalid.
 */
export function temperatureAnomalyToPianoFrequency(
  anomaly: number | null | undefined,
  fillValue: number = DEFAULT_NETCDF_FILL_VALUE
): number | null {
  if (!isValidTemperatureAnomaly(anomaly, fillValue)) {
    return null;
  }
  const clipped = clipAnomalyForAudio(anomaly);
  return REFERENCE_A4_HZ * Math.pow(2, clipped / 4);
}

/**
 * Maps normalized canvas pointer coordinates (relX in [0,1), relY in [0,1))
 * to exact 2°x2° NASA GISTEMP NetCDF grid indices and anomaly value.
 * Respects NetCDF South-to-North lat ordering (-89..+89) vs top-down Canvas Y.
 */
export function lookupNetCdfGridCell(
  relX: number,
  relY: number,
  slice: GridLookupSliceLike,
  metadata: GridLookupMetadataLike
): GridCellLookupResult | null {
  if (slice.latCount <= 0 || slice.lonCount <= 0) return null;

  const clampedX = Math.max(0, Math.min(0.999999, relX));
  const clampedY = Math.max(0, Math.min(0.999999, relY));

  const lonIdx = Math.floor(clampedX * slice.lonCount);
  const canvasRow = Math.floor(clampedY * slice.latCount);
  const latIdx = slice.latCount - 1 - canvasRow;

  const lat = metadata.lat[latIdx] ?? -89 + latIdx * 2;
  const lon = metadata.lon[lonIdx] ?? -179 + lonIdx * 2;
  const rawVal = slice.values[latIdx * slice.lonCount + lonIdx];
  const fillVal = slice.fillValue ?? DEFAULT_NETCDF_FILL_VALUE;
  const value = isValidTemperatureAnomaly(rawVal, fillVal) ? rawVal : null;

  return { latIdx, lonIdx, lat, lon, value };
}

interface PianoVoiceSlot {
  oscMain: OscillatorNode;
  oscUnison: OscillatorNode;
  oscOvertone: OscillatorNode;
  keyFilter: BiquadFilterNode;
  voiceGain: GainNode;
  overtoneGain: GainNode;
  lastPlayedAt: number;
}

const VOICE_POOL_SIZE = 4;
const MIN_TRIGGER_INTERVAL_MS = 45;

export class MapPianoEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bodyFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private pianoWave: PeriodicWave | null = null;
  private slots: PianoVoiceSlot[] = [];
  private nextSlotIdx: number = 0;

  private enabled: boolean = true;
  private volume: number = 0.65;
  private lastCellKey: string | null = null;
  private lastTriggerMs: number = 0;
  private lastFrequency: number | null = null;
  private pendingTimer: number | null = null;
  private pendingRequest: {
    anomaly: number | null;
    cellKey: string;
    fillValue: number;
  } | null = null;

  private ensureGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      const ctx = new AudioCtxClass();
      this.ctx = ctx;

      // Custom acoustic piano harmonic spectrum (warm fundamental + decaying partials)
      const real = new Float32Array([
        0,     // DC
        1.0,   // Fundamental
        0.58,  // 2nd harmonic (octave)
        0.34,  // 3rd harmonic (octave + 5th)
        0.19,  // 4th harmonic
        0.10,  // 5th harmonic
        0.052, // 6th harmonic
        0.026, // 7th harmonic
        0.012, // 8th harmonic
        0.005, // Soft top partial
      ]);
      const imag = new Float32Array(real.length);
      this.pianoWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = 'lowshelf';
      bodyFilter.frequency.setValueAtTime(210, ctx.currentTime);
      bodyFilter.gain.setValueAtTime(2.5, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0, ctx.currentTime);

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-16, ctx.currentTime);
      compressor.knee.setValueAtTime(18, ctx.currentTime);
      compressor.ratio.setValueAtTime(4, ctx.currentTime);
      compressor.attack.setValueAtTime(0.004, ctx.currentTime);
      compressor.release.setValueAtTime(0.18, ctx.currentTime);

      bodyFilter.connect(masterGain);
      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      this.bodyFilter = bodyFilter;
      this.masterGain = masterGain;
      this.compressor = compressor;
      this.slots = [];

      // Pre-allocate reusable voice pool once (zero node allocation per mouse movement)
      for (let i = 0; i < VOICE_POOL_SIZE; i++) {
        const oscMain = ctx.createOscillator();
        oscMain.setPeriodicWave(this.pianoWave);
        oscMain.frequency.setValueAtTime(REFERENCE_A4_HZ, ctx.currentTime);

        const oscUnison = ctx.createOscillator();
        oscUnison.type = 'triangle';
        oscUnison.frequency.setValueAtTime(REFERENCE_A4_HZ * 1.0012, ctx.currentTime);

        const oscOvertone = ctx.createOscillator();
        oscOvertone.type = 'sine';
        oscOvertone.frequency.setValueAtTime(REFERENCE_A4_HZ * 2, ctx.currentTime);

        const unisonMix = ctx.createGain();
        unisonMix.gain.setValueAtTime(0.28, ctx.currentTime);

        const keyFilter = ctx.createBiquadFilter();
        keyFilter.type = 'lowpass';
        keyFilter.frequency.setValueAtTime(2400, ctx.currentTime);
        keyFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        const voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(0.0001, ctx.currentTime);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.0001, ctx.currentTime);

        oscMain.connect(keyFilter);
        oscUnison.connect(unisonMix);
        unisonMix.connect(keyFilter);
        keyFilter.connect(voiceGain);
        voiceGain.connect(bodyFilter);

        oscOvertone.connect(overtoneGain);
        overtoneGain.connect(bodyFilter);

        oscMain.start();
        oscUnison.start();
        oscOvertone.start();

        this.slots.push({
          oscMain,
          oscUnison,
          oscOvertone,
          keyFilter,
          voiceGain,
          overtoneGain,
          lastPlayedAt: 0,
        });
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureGraph();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearPending();
      this.releaseAllNotes();
      this.lastCellKey = null;
      this.lastFrequency = null;
    } else {
      this.unlock();
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(this.volume, now, 0.025);
      }
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.enabled ? this.volume : 0, now, 0.025);
    }
    if (this.volume === 0) {
      this.releaseAllNotes();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  private clearPending(): void {
    if (this.pendingTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingRequest = null;
  }

  /**
   * Smoothly damps all active piano voices to silence without clicks or pops.
   */
  public releaseAllNotes(): void {
    this.clearPending();
    if (!this.ctx || this.ctx.state === 'closed') return;
    const now = this.ctx.currentTime;

    for (const slot of this.slots) {
      try {
        slot.voiceGain.gain.cancelScheduledValues(now);
        slot.voiceGain.gain.setTargetAtTime(0.0001, now, 0.022);
        slot.overtoneGain.gain.cancelScheduledValues(now);
        slot.overtoneGain.gain.setTargetAtTime(0.0001, now, 0.015);
      } catch {}
    }
  }

  /**
   * Plays or smoothly transitions to the piano note for the hovered NASA grid cell.
   * Returns the calculated frequency in Hz (or null if silent / missing / disabled).
   */
  public handleHoveredCell(
    anomaly: number | null | undefined,
    cellKey: string,
    fillValue: number = DEFAULT_NETCDF_FILL_VALUE
  ): number | null {
    const freq = temperatureAnomalyToPianoFrequency(anomaly, fillValue);

    if (!this.enabled || this.volume <= 0) {
      return null;
    }

    if (freq === null) {
      this.clearPending();
      if (this.lastFrequency !== null) {
        this.releaseAllNotes();
        this.lastFrequency = null;
      }
      this.lastCellKey = cellKey;
      return null;
    }

    if (cellKey === this.lastCellKey && this.lastFrequency !== null) {
      return freq;
    }

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = nowMs - this.lastTriggerMs;

    if (elapsed < MIN_TRIGGER_INTERVAL_MS) {
      this.pendingRequest = { anomaly: anomaly ?? null, cellKey, fillValue };
      if (this.pendingTimer === null && typeof window !== 'undefined') {
        const waitMs = Math.max(8, MIN_TRIGGER_INTERVAL_MS - elapsed);
        this.pendingTimer = window.setTimeout(() => {
          this.pendingTimer = null;
          const req = this.pendingRequest;
          this.pendingRequest = null;
          if (req && this.enabled) {
            this.playResolvedNote(req.anomaly, req.cellKey, req.fillValue);
          }
        }, waitMs);
      }
      return freq;
    }

    this.clearPending();
    return this.playResolvedNote(anomaly ?? null, cellKey, fillValue);
  }

  private playResolvedNote(
    anomaly: number | null,
    cellKey: string,
    fillValue: number
  ): number | null {
    const freq = temperatureAnomalyToPianoFrequency(anomaly, fillValue);
    if (!this.enabled || this.volume <= 0 || freq === null) {
      this.releaseAllNotes();
      this.lastFrequency = null;
      this.lastCellKey = cellKey;
      return null;
    }

    const ctx = this.ensureGraph();
    if (!ctx || this.slots.length === 0) {
      return freq;
    }

    const now = ctx.currentTime;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Ensure master gain reflects active state
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, now, 0.02);
    }

    // Damp previously active voices smoothly (natural partial-pedal piano overlap)
    const chosenIdx = this.nextSlotIdx;
    this.nextSlotIdx = (this.nextSlotIdx + 1) % this.slots.length;
    const slot = this.slots[chosenIdx];

    for (let i = 0; i < this.slots.length; i++) {
      if (i === chosenIdx) continue;
      const other = this.slots[i];
      if (other.lastPlayedAt > 0) {
        other.voiceGain.gain.cancelScheduledValues(now);
        other.voiceGain.gain.setTargetAtTime(0.0001, now, 0.045);
        other.overtoneGain.gain.cancelScheduledValues(now);
        other.overtoneGain.gain.setTargetAtTime(0.0001, now, 0.018);
      }
    }

    // Micro fade before retuning prevents waveform-jump clicks
    slot.voiceGain.gain.cancelScheduledValues(now);
    slot.voiceGain.gain.setTargetAtTime(0.0001, now, 0.002);
    slot.overtoneGain.gain.cancelScheduledValues(now);
    slot.overtoneGain.gain.setTargetAtTime(0.0001, now, 0.002);

    const strikeTime = now + 0.006;
    slot.oscMain.frequency.setValueAtTime(freq, strikeTime);
    slot.oscUnison.frequency.setValueAtTime(freq * 1.0012, strikeTime);
    slot.oscOvertone.frequency.setValueAtTime(freq * 2.0, strikeTime);

    // Dynamic lowpass sweep mimics physical felt hammer & acoustic string harmonic decay
    slot.keyFilter.frequency.cancelScheduledValues(now);
    slot.keyFilter.frequency.setValueAtTime(Math.min(11500, freq * 6.5), strikeTime);
    slot.keyFilter.frequency.exponentialRampToValueAtTime(
      Math.max(460, freq * 2.0),
      strikeTime + 0.85
    );

    // Acoustic piano strike + natural wooden sustain envelope
    slot.voiceGain.gain.setValueAtTime(0.0001, strikeTime);
    slot.voiceGain.gain.linearRampToValueAtTime(0.36, strikeTime + 0.012);
    slot.voiceGain.gain.exponentialRampToValueAtTime(0.17, strikeTime + 0.22);
    slot.voiceGain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + 1.45);

    // Subtle percussive octave hammer transient
    slot.overtoneGain.gain.setValueAtTime(0.0001, strikeTime);
    slot.overtoneGain.gain.linearRampToValueAtTime(0.11, strikeTime + 0.008);
    slot.overtoneGain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + 0.14);

    slot.lastPlayedAt = nowMs;
    this.lastTriggerMs = nowMs;
    this.lastCellKey = cellKey;
    this.lastFrequency = freq;

    return freq;
  }

  public dispose(): void {
    this.clearPending();
    for (const slot of this.slots) {
      try {
        slot.oscMain.stop();
        slot.oscUnison.stop();
        slot.oscOvertone.stop();
        slot.oscMain.disconnect();
        slot.oscUnison.disconnect();
        slot.oscOvertone.disconnect();
        slot.keyFilter.disconnect();
        slot.voiceGain.disconnect();
        slot.overtoneGain.disconnect();
      } catch {}
    }
    this.slots = [];
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
    this.masterGain = null;
    this.bodyFilter = null;
    this.compressor = null;
    this.pianoWave = null;
    this.lastCellKey = null;
    this.lastFrequency = null;
  }
}

export const mapPianoEngine = new MapPianoEngine();

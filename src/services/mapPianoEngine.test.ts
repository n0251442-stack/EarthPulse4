/**
 * Automated Scientific Validation Suite for MapPianoEngine
 * Covers all 15 specification tests (frequency math, clipping isolation,
 * NetCDF coordinate indexing, missing/ocean silence, timeline sync, and audio lifecycle).
 *
 * Run with: npx tsx src/services/mapPianoEngine.test.ts
 */

import assert from 'node:assert/strict';
import {
  MapPianoEngine,
  clipAnomalyForAudio,
  isValidTemperatureAnomaly,
  lookupNetCdfGridCell,
  temperatureAnomalyToPianoFrequency,
} from './mapPianoEngine';

function createMockAudioEnvironment() {
  let createdOscillators = 0;
  let closed = false;
  const scheduledFreqs: Array<{ freq: number; time: number }> = [];
  const gainTargets: Array<{ target: number; time: number }> = [];

  class MockAudioParam {
    value = 0;
    setValueAtTime(v: number, t: number) {
      this.value = v;
      if (v > 50 && v < 5000) {
        scheduledFreqs.push({ freq: v, time: t });
      }
    }
    setTargetAtTime(v: number, t: number) {
      this.value = v;
      gainTargets.push({ target: v, time: t });
    }
    linearRampToValueAtTime(v: number) {
      this.value = v;
    }
    exponentialRampToValueAtTime(v: number) {
      this.value = v;
    }
    cancelScheduledValues() {}
  }

  class MockAudioNode {
    connect() {
      return this;
    }
    disconnect() {}
  }

  class MockOscillator extends MockAudioNode {
    type = 'sine';
    frequency = new MockAudioParam();
    constructor() {
      super();
      createdOscillators++;
    }
    setPeriodicWave() {}
    start() {}
    stop() {}
  }

  class MockGain extends MockAudioNode {
    gain = new MockAudioParam();
  }

  class MockFilter extends MockAudioNode {
    type = 'lowpass';
    frequency = new MockAudioParam();
    Q = new MockAudioParam();
    gain = new MockAudioParam();
  }

  class MockCompressor extends MockAudioNode {
    threshold = new MockAudioParam();
    knee = new MockAudioParam();
    ratio = new MockAudioParam();
    attack = new MockAudioParam();
    release = new MockAudioParam();
  }

  class MockAudioContext {
    state: 'running' | 'suspended' | 'closed' = 'running';
    currentTime = 1.0;
    destination = new MockAudioNode();
    createPeriodicWave() {
      return {};
    }
    createOscillator() {
      return new MockOscillator();
    }
    createGain() {
      return new MockGain();
    }
    createBiquadFilter() {
      return new MockFilter();
    }
    createDynamicsCompressor() {
      return new MockCompressor();
    }
    resume() {
      this.state = 'running';
      return Promise.resolve();
    }
    close() {
      closed = true;
      this.state = 'closed';
      return Promise.resolve();
    }
  }

  (globalThis as unknown as { window: unknown }).window = {
    AudioContext: MockAudioContext,
    setTimeout,
    clearTimeout,
  };

  return {
    getCreatedOscillators: () => createdOscillators,
    getScheduledFreqs: () => scheduledFreqs,
    getGainTargets: () => gainTargets,
    isClosed: () => closed,
  };
}

function approxEqual(actual: number | null, expected: number, tolerance = 0.01) {
  assert.notEqual(actual, null, `Expected frequency ~${expected}, received null`);
  assert.ok(
    Math.abs((actual as number) - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} Hz of ${expected}`
  );
}

// 1-5: Exact Logarithmic Frequency Mapping Tests
approxEqual(temperatureAnomalyToPianoFrequency(-4), 220, 0.001);
approxEqual(temperatureAnomalyToPianoFrequency(-2), 311.13, 0.01);
approxEqual(temperatureAnomalyToPianoFrequency(0), 440, 0.001);
approxEqual(temperatureAnomalyToPianoFrequency(2), 622.25, 0.01);
approxEqual(temperatureAnomalyToPianoFrequency(4), 880, 0.001);

// 6-7: Audio-only clipping above +4°C and below -4°C without modifying NASA values
const rawHighAnomaly = 6.75;
const rawLowAnomaly = -5.8;
assert.equal(clipAnomalyForAudio(rawHighAnomaly), 4);
assert.equal(clipAnomalyForAudio(rawLowAnomaly), -4);
approxEqual(temperatureAnomalyToPianoFrequency(rawHighAnomaly), 880, 0.001);
approxEqual(temperatureAnomalyToPianoFrequency(rawLowAnomaly), 220, 0.001);
assert.equal(rawHighAnomaly, 6.75);
assert.equal(rawLowAnomaly, -5.8);

// 8-9: Missing data, NaN, Infinity, NetCDF _FillValue (32767), and Land-Only ocean cells
assert.equal(temperatureAnomalyToPianoFrequency(null), null);
assert.equal(temperatureAnomalyToPianoFrequency(undefined), null);
assert.equal(temperatureAnomalyToPianoFrequency(Number.NaN), null);
assert.equal(temperatureAnomalyToPianoFrequency(Infinity), null);
assert.equal(temperatureAnomalyToPianoFrequency(-Infinity), null);
assert.equal(temperatureAnomalyToPianoFrequency(32767), null);
assert.equal(isValidTemperatureAnomaly(32767, 32767), false);

// 12: Exact NetCDF 2°x2° grid coordinate indexing (South->North lat, West->East lon)
const lat = Array.from({ length: 90 }, (_, i) => -89 + i * 2);
const lon = Array.from({ length: 180 }, (_, i) => -179 + i * 2);

const janValues = new Array<number | null>(90 * 180).fill(null);
// Put an observed Arctic warming cell at North-East corner (lat=+89 => latIdx=89, lon=+179 => lonIdx=179)
janValues[89 * 180 + 179] = 3.25;
// Put an Antarctic cooling cell near South-West (lat=-89 => latIdx=0, lon=-179 => lonIdx=0)
janValues[0 * 180 + 0] = -2.0;
// Put an equatorial cell at (lat=1 => latIdx=45, lon=1 => lonIdx=90)
janValues[45 * 180 + 90] = 0.0;
// Keep Pacific Ocean cell in Land-Only slice as null (_FillValue)
janValues[45 * 180 + 20] = null;

// Top-right on canvas (relY near 0, relX near 0.999) => latIdx=89 (+89°), lonIdx=179 (+179°)
const neCell = lookupNetCdfGridCell(0.998, 0.001, { latCount: 90, lonCount: 180, fillValue: 32767, values: janValues }, { lat, lon });
assert.deepEqual(neCell, { latIdx: 89, lonIdx: 179, lat: 89, lon: 179, value: 3.25 });

// Bottom-left on canvas (relY near 0.999, relX near 0.001) => latIdx=0 (-89°), lonIdx=0 (-179°)
const swCell = lookupNetCdfGridCell(0.001, 0.998, { latCount: 90, lonCount: 180, fillValue: 32767, values: janValues }, { lat, lon });
assert.deepEqual(swCell, { latIdx: 0, lonIdx: 0, lat: -89, lon: -179, value: -2.0 });

// Land-Only ocean cell returns null anomaly and silent frequency
const oceanCell = lookupNetCdfGridCell(20.5 / 180, 44.5 / 90, { latCount: 90, lonCount: 180, fillValue: 32767, values: janValues }, { lat, lon });
assert.equal(oceanCell?.value, null);
assert.equal(temperatureAnomalyToPianoFrequency(oceanCell?.value), null);

// 10-15: Web Audio Piano Engine Lifecycle, Node Reuse, Pitch Changes, Month/Year Sync, Mouse Leave, and Disable
const mockEnv = createMockAudioEnvironment();
const engine = new MapPianoEngine();

// Move across cell 1 (-2°C => 311.13 Hz)
const freq1 = engine.handleHoveredCell(swCell!.value, 'land-only:2025:1:0:0', 32767);
approxEqual(freq1, 311.13, 0.01);
const initialOscCount = mockEnv.getCreatedOscillators();
assert.ok(initialOscCount > 0, 'Voice pool oscillators created once');

// Hovering within same cell key must deduplicate without creating new oscillators
const freq1Repeat = engine.handleHoveredCell(swCell!.value, 'land-only:2025:1:0:0', 32767);
approxEqual(freq1Repeat, 311.13, 0.01);
assert.equal(mockEnv.getCreatedOscillators(), initialOscCount);

// Wait past 45ms throttle and move to +3.25°C cell (pitch changes & zero new oscillators!)
setTimeout(() => {
  const freq2 = engine.handleHoveredCell(neCell!.value, 'land-only:2025:1:89:179', 32767);
  approxEqual(freq2, 440 * Math.pow(2, 3.25 / 4), 0.01);
  assert.notEqual(freq2, freq1);
  assert.equal(mockEnv.getCreatedOscillators(), initialOscCount, 'Zero oscillator churn on mousemove');

  setTimeout(() => {
    // Month/Year change updates value for same coordinates (2025-02 has +4.0°C at same NE cell)
    const freqNextMonth = engine.handleHoveredCell(4.0, 'land-only:2025:2:89:179', 32767);
    approxEqual(freqNextMonth, 880, 0.001);

    // Moving over missing/ocean cell returns null and silences audio
    const oceanFreq = engine.handleHoveredCell(null, 'land-only:2025:2:45:20', 32767);
    assert.equal(oceanFreq, null);

    // Leaving map releases all notes smoothly
    engine.releaseAllNotes();
    const recentTargets = mockEnv.getGainTargets().slice(-4);
    assert.ok(recentTargets.some((g) => g.target <= 0.0001));

    // Disabling audio silences engine while coordinate lookup still works identically
    engine.setEnabled(false);
    assert.equal(engine.handleHoveredCell(2.0, 'land-only:2025:2:45:90', 32767), null);
    assert.equal(
      lookupNetCdfGridCell(0.998, 0.001, { latCount: 90, lonCount: 180, fillValue: 32767, values: janValues }, { lat, lon })?.value,
      3.25
    );

    engine.dispose();
    assert.equal(mockEnv.isClosed(), true);
    console.log('ALL 15 SCIENTIFIC PIANO SONIFICATION TESTS PASSED');
  }, 60);
}, 60);
